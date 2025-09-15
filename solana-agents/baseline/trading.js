import { VersionedTransaction, PublicKey, SystemProgram, TransactionMessage } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createTransferInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import fetch from 'node-fetch';
import { privy, connection } from './wallet.js';

// Global cache for Jupiter tokens (shared across all operations)
let jupiterTokensCache = null;
let jupiterTokensCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// =============================
// ======= Token Utilities =======
// =============================

// Optimized Jupiter token fetcher (shared across all functions)
export async function getJupiterTokens() {
    const now = Date.now();
    if (!jupiterTokensCache || (now - jupiterTokensCacheTime) > CACHE_DURATION) {
        try {
            const response = await fetch('https://token.jup.ag/all', { timeout: 5000 });
            if (response.ok) {
                jupiterTokensCache = await response.json();
                jupiterTokensCacheTime = now;
            }
        } catch (error) {
            console.log('Failed to update Jupiter cache:', error.message);
            if (!jupiterTokensCache) throw new Error('Unable to fetch token list from Jupiter API');
        }
    }
    return jupiterTokensCache;
}

export async function getTokenMetadata(mintAddress) {
    try {
        const tokens = await getJupiterTokens();
        const token = tokens.find(t => t.address === mintAddress);
        
        if (token) {
            return {
                name: token.name || 'Unknown',
                symbol: token.symbol || 'Unknown',
                decimals: token.decimals,
                logoURI: token.logoURI || ''
            };
        }
        
        // Fallback: Try Solana RPC metadata
        const mintPublicKey = new PublicKey(mintAddress);
        try {
            const accountInfo = await connection.getAccountInfo(mintPublicKey);
            if (accountInfo) {
                return {
                    name: `Token ${mintAddress.slice(0, 8)}...`,
                    symbol: 'SPL',
                    decimals: accountInfo.data[44] || 0,
                    logoURI: ''
                };
            }
        } catch (rpcError) {
            console.log('RPC metadata fetch failed, using defaults');
        }
        
        // Final fallback
        return {
            name: `Token ${mintAddress.slice(0, 8)}...`,
            symbol: 'SPL',
            decimals: 0,
            logoURI: ''
        };
    } catch (error) {
        console.error('Error fetching token metadata:', error);
        return {
            name: `Token ${mintAddress.slice(0, 8)}...`,
            symbol: 'SPL',
            decimals: 0,
            logoURI: ''
        };
    }
}

export async function getTokenMintAddress(symbol) {
    try {
        const tokens = await getJupiterTokens();
        
        // Find token by symbol (case-insensitive)
        const token = tokens.find(t => 
            t.symbol && t.symbol.toUpperCase() === symbol.toUpperCase()
        );
        
        if (!token) {
            throw new Error(`Token with symbol '${symbol}' not found`);
        }
        
        return {
            success: true,
            mintAddress: token.address,
            tokenInfo: {
                name: token.name,
                symbol: token.symbol,
                decimals: token.decimals,
                logoURI: token.logoURI || ''
            }
        };
    } catch (error) {
        console.error('Failed to get token mint address:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

export async function checkTokenAccountExists(walletAddress, mintAddress) {
    try {
        const publicKey = new PublicKey(walletAddress);
        const mintPublicKey = new PublicKey(mintAddress);
        
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
            mint: mintPublicKey
        });
        
        return tokenAccounts.value.length > 0;
    } catch (error) {
        console.error('Error checking token account:', error);
        return false;
    }
}

// =============================
// ======= Swap Function =======
// =============================

export async function swap(walletId, fromTokenSymbol, toTokenSymbol, fromAmount, walletAddress, options = {}) {
    try {
        const startTime = Date.now();
        console.log(`🚀 Jupiter swap: ${fromAmount} ${fromTokenSymbol} → ${toTokenSymbol}`);
        
        // Default options
        const {
            slippageBps = 150, // 1.5% slippage
            priorityFee = 'auto',
            maxRetries = 3,
            confirmTransaction = true
        } = options;
        
        // Get token information
        const tokens = await getJupiterTokens();
        
        const fromTokenInfo = tokens.find(t => 
            t.symbol && t.symbol.toUpperCase() === fromTokenSymbol.toUpperCase()
        );
        const toTokenInfo = tokens.find(t => 
            t.symbol && t.symbol.toUpperCase() === toTokenSymbol.toUpperCase()
        );
        
        if (!fromTokenInfo || !toTokenInfo) {
            throw new Error(`Token not found: ${fromTokenSymbol} or ${toTokenSymbol}`);
        }
        
        const fromToken = fromTokenInfo.address;
        const toToken = toTokenInfo.address;
        const fromTokenDecimals = fromTokenInfo.decimals;
        
        // Convert amount to raw units
        const rawAmount = BigInt(Math.floor(fromAmount * Math.pow(10, fromTokenDecimals)));
        
        console.log(`📊 Token details: ${fromToken} (${fromTokenDecimals} decimals) → ${toToken}`);
        
        // Get quote from Jupiter
        const quoteParams = new URLSearchParams({
            inputMint: fromToken,
            outputMint: toToken,
            amount: rawAmount.toString(),
            slippageBps: slippageBps.toString(),
            onlyDirectRoutes: 'false',
            asLegacyTransaction: 'false',
            maxAccounts: '64',
            minimizeSlippage: 'true'
        });
        
        let quoteData;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const quoteResponse = await fetch(`https://quote-api.jup.ag/v6/quote?${quoteParams}`, {
                    timeout: 10000
                });
                
                if (!quoteResponse.ok) {
                    const errorText = await quoteResponse.text();
                    throw new Error(`Quote API error ${quoteResponse.status}: ${errorText}`);
                }
                
                quoteData = await quoteResponse.json();
                
                if (!quoteData.outAmount || quoteData.outAmount === '0') {
                    throw new Error('No valid route found for this swap');
                }
                
                break;
            } catch (error) {
                console.log(`⚠️  Quote attempt ${attempt}/${maxRetries} failed: ${error.message}`);
                if (attempt === maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
        
        // Calculate expected output
        const expectedOutput = parseFloat(quoteData.outAmount) / Math.pow(10, toTokenInfo.decimals);
        const priceImpact = quoteData.priceImpactPct || 0;
        
        console.log(`💰 Expected output: ${expectedOutput.toFixed(6)} ${toTokenSymbol} (Impact: ${priceImpact}%)`);
        
        // Get swap transaction
        const swapPayload = {
            quoteResponse: quoteData,
            userPublicKey: walletAddress,
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: priorityFee,
            dynamicSlippage: {
                maxBps: Math.max(slippageBps, 300)
            }
        };
        
        let swapData;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(swapPayload),
                    timeout: 15000
                });
                
                if (!swapResponse.ok) {
                    const errorText = await swapResponse.text();
                    throw new Error(`Swap API error ${swapResponse.status}: ${errorText}`);
                }
                
                swapData = await swapResponse.json();
                
                if (!swapData.swapTransaction) {
                    throw new Error('No swap transaction received from Jupiter');
                }
                
                break;
            } catch (error) {
                console.log(`⚠️  Swap transaction attempt ${attempt}/${maxRetries} failed: ${error.message}`);
                if (attempt === maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
        
        console.log(`⚡ Transaction prepared in ${Date.now() - startTime}ms`);
        
        // Sign and send transaction
        const transactionBuffer = Buffer.from(swapData.swapTransaction, 'base64');
        const transaction = VersionedTransaction.deserialize(transactionBuffer);
        
        console.log(`📤 Signing and sending transaction...`);
        
        const { hash } = await privy.walletApi.solana.signAndSendTransaction({
            walletId: walletId,
            caip2: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            transaction: transaction,
        });
        
        console.log(`✅ Transaction sent: ${hash}`);
        
        // Optional confirmation
        if (confirmTransaction) {
            console.log(`⏳ Confirming transaction...`);
            try {
                const confirmation = await connection.confirmTransaction(hash, 'confirmed');
                
                if (confirmation.value.err) {
                    console.log(`❌ Transaction failed: ${confirmation.value.err}`);
                } else {
                    console.log(`✅ Transaction confirmed!`);
                }
            } catch (confirmError) {
                console.log(`⚠️  Confirmation check failed: ${confirmError.message}`);
            }
        }
        
        const totalTime = Date.now() - startTime;
        console.log(`🎉 Swap completed in ${totalTime}ms`);
        
        return { 
            success: true, 
            signature: hash,
            fromAmount: rawAmount.toString(),
            estimatedToAmount: quoteData.outAmount,
            actualOutputAmount: expectedOutput,
            fromToken: fromTokenSymbol,
            toToken: toTokenSymbol,
            priceImpact: priceImpact,
            executionTime: totalTime,
            route: quoteData.routePlan || []
        };
        
    } catch (error) {
        console.error(`❌ Jupiter swap failed: ${error.message}`);
        
        let errorCategory = 'unknown';
        if (error.message.includes('insufficient')) errorCategory = 'insufficient_funds';
        else if (error.message.includes('slippage')) errorCategory = 'slippage_exceeded';
        else if (error.message.includes('timeout')) errorCategory = 'timeout';
        else if (error.message.includes('route')) errorCategory = 'no_route';
        
        return { 
            success: false, 
            error: error.message,
            errorCategory,
            timestamp: new Date().toISOString()
        };
    }
}

// =============================
// ======= Transfer Function =======
// =============================

export async function transfer(walletId, fromWalletAddress, toAddress, tokenSymbol, amount) {
    try {
        console.log(`🔄 Transfer: ${amount} ${tokenSymbol} from ${fromWalletAddress} to ${toAddress}`);
        
        const fromPublicKey = new PublicKey(fromWalletAddress);
        const toPublicKey = new PublicKey(toAddress);
        
        let instructions = [];
        let recentBlockhash;
        
        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        recentBlockhash = blockhash;
        
        if (tokenSymbol.toUpperCase() === 'SOL') {
            // SOL transfer
            const amountInLamports = Math.floor(amount * 1e9);
            console.log(`Transfer amount: ${amountInLamports} lamports (${amount} SOL)`);
            
            const instruction = SystemProgram.transfer({
                fromPubkey: fromPublicKey,
                toPubkey: toPublicKey,
                lamports: amountInLamports,
            });
            
            instructions.push(instruction);
            
        } else {
            // SPL Token transfer
            const tokenResult = await getTokenMintAddress(tokenSymbol);
            if (!tokenResult.success) {
                throw new Error(`Token ${tokenSymbol} not found: ${tokenResult.error}`);
            }
            
            const mintAddress = tokenResult.mintAddress;
            const tokenInfo = tokenResult.tokenInfo;
            const mintPublicKey = new PublicKey(mintAddress);
            
            // Convert amount to raw units
            const rawAmount = BigInt(Math.floor(amount * Math.pow(10, tokenInfo.decimals)));
            console.log(`Transfer amount: ${rawAmount} raw units (${amount} ${tokenSymbol})`);
            
            // Get associated token addresses
            const fromTokenAccount = await getAssociatedTokenAddress(mintPublicKey, fromPublicKey);
            const toTokenAccount = await getAssociatedTokenAddress(mintPublicKey, toPublicKey);
            
            // Check if destination token account exists
            const toAccountExists = await checkTokenAccountExists(toAddress, mintAddress);
            
            if (!toAccountExists) {
                console.log(`Creating associated token account for ${toAddress}`);
                const createAccountInstruction = createAssociatedTokenAccountInstruction(
                    fromPublicKey, // payer
                    toTokenAccount, // associated token account
                    toPublicKey, // owner
                    mintPublicKey // mint
                );
                instructions.push(createAccountInstruction);
            }
            
            // Create transfer instruction
            const transferInstruction = createTransferInstruction(
                fromTokenAccount, // source
                toTokenAccount, // destination
                fromPublicKey, // owner
                rawAmount // amount
            );
            instructions.push(transferInstruction);
        }
        
        // Create and send transaction
        const message = new TransactionMessage({
            payerKey: fromPublicKey,
            instructions: instructions,
            recentBlockhash: recentBlockhash,
        });
        
        const transaction = new VersionedTransaction(message.compileToV0Message());
        
        const { hash } = await privy.walletApi.solana.signAndSendTransaction({
            walletId: walletId,
            caip2: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            transaction: transaction,
        });
        
        console.log(`✅ Transfer transaction sent: ${hash}`);
        
        // Wait for confirmation
        try {
            const confirmation = await connection.confirmTransaction(hash, 'confirmed');
            if (confirmation.value.err) {
                console.log(`❌ Transfer failed: ${confirmation.value.err}`);
                return { success: false, error: `Transaction failed: ${confirmation.value.err}` };
            } else {
                console.log(`✅ Transfer confirmed!`);
            }
        } catch (confirmError) {
            console.log(`⚠️  Confirmation check failed: ${confirmError.message}`);
        }
        
        return { 
            success: true, 
            signature: hash,
            from: fromWalletAddress,
            to: toAddress,
            amount: amount,
            token: tokenSymbol,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('Transfer failed:', error);
        return { 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// =============================
// ======= Market Data =======
// =============================  

const MOBULA_BASE_URL = 'https://explorer-api.mobula.io/api/1/market/data';

export async function marketData(symbol) {
    try {
        const url = `${MOBULA_BASE_URL}?shouldFetchPriceChange=24h&symbol=${symbol.toUpperCase()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': process.env.MOBULA_API_KEY
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data['data'];
    } catch (error) {
        console.error('Failed to get market data:', error); 
        return { success: false, error: error.message };
    }
}
    
export async function price(symbol) {
    try {
        const data = await marketData(symbol);
        return data.success === false ? data : data.price;
    } catch (error) {
        console.error('Failed to get price:', error); 
        return { success: false, error: error.message };
    }
}

// =============================
// ======= Twitter Data =======
// =============================

export async function twitter(user, lastTweets = []) {
    try {
        const url = `https://twitter-agent-kz2u.onrender.com/api/tweets/${user}?count=5`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': process.env.TWITTER_API_KEY
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const currentTweets = data.data || [];
        
        // Compare current tweets with inputted lastTweets
        let hasNewTweet = false;
        let newTweet = null;
        
        if (lastTweets.length === 0) {
            return { hasNewTweet: false, newTweet: null, currentTweets };
        }
        
        // Check if there are new tweets by comparing tweet IDs or content
        for (const currentTweet of currentTweets) {
            const isNewTweet = !lastTweets.some(lastTweet => 
                (currentTweet.id && lastTweet.id && currentTweet.id === lastTweet.id) ||
                (currentTweet.text && lastTweet.text && currentTweet.text === lastTweet.text)
            );
            
            if (isNewTweet) {
                hasNewTweet = true;
                newTweet = currentTweet;
                break;
            }
        }
        
        return { 
            hasNewTweet, 
            newTweet, 
            currentTweets,
            username: user 
        };
    } catch (error) {
        console.error('Failed to fetch tweets:', error);
        return { 
            hasNewTweet: false, 
            newTweet: null, 
            error: error.message,
            username: user 
        };
    }
}