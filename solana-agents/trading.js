import { VersionedTransaction } from '@solana/web3.js';
import fetch from 'node-fetch';
import { getJupiterTokens, privy } from './wallet.js';

// =============================
// ======= Swap Operations =======
// =============================

export async function swap(fromTokenSymbol, toTokenSymbol, fromAmount, walletAddress) {
    try {
        const tokens = await getJupiterTokens();
        
        // Find tokens by symbol
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
        
        console.log(`Swapping ${fromAmount} ${fromTokenSymbol} to ${toTokenSymbol}`);
        console.log(`From token: ${fromToken} (${fromTokenDecimals} decimals)`);
        console.log(`To token: ${toToken}`);
        
        // Convert human-readable amount to raw amount
        const rawAmount = Math.floor(fromAmount * Math.pow(10, fromTokenDecimals));
        
        console.log(`Converting ${fromAmount} ${fromTokenSymbol} (${fromTokenDecimals} decimals) to ${rawAmount} raw units`);
        
        const url = `https://li.quest/v1/quote?fromChain=SOL&toChain=SOL&fromToken=${fromToken}&toToken=${toToken}&fromAddress=${walletAddress}&toAddress=${walletAddress}&fromAmount=${rawAmount}`;
        
        const quoteResponse = await fetch(url, {
            method: 'GET',
            headers: { 'accept': 'application/json' }
        });
        
        if (!quoteResponse.ok) {
            throw new Error(`HTTP error! status: ${quoteResponse.status}`);
        }
        
        const quote = await quoteResponse.json();
        return { success: true, quote };
    } catch (error) {
        console.error('Failed to get swap quote:', error);
        return { success: false, error: error.message };
    }
}

// =============================
// ======= Execute Swap (Optimized) =======
// =============================

export async function executeSwapJupiter(walletId, fromTokenSymbol, toTokenSymbol, fromAmount, walletAddress, options = {}) {
    try {
        const startTime = Date.now();
        console.log(`🚀 Optimized Jupiter swap: ${fromAmount} ${fromTokenSymbol} → ${toTokenSymbol}`);
        
        // Default options with smart defaults
        const {
            slippageBps = 100, // 1% slippage (more reasonable than 0.5%)
            priorityFee = 'auto', // Let Jupiter optimize
            maxRetries = 3,
            confirmTransaction = true
        } = options;
        
        // Use shared Jupiter token cache
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
        
        // Convert with proper precision handling
        const rawAmount = BigInt(Math.floor(fromAmount * Math.pow(10, fromTokenDecimals)));
        
        console.log(`📊 Token details: ${fromToken} (${fromTokenDecimals} decimals) → ${toToken}`);
        
        // Optimized quote request with better parameters
        const quoteParams = new URLSearchParams({
            inputMint: fromToken,
            outputMint: toToken,
            amount: rawAmount.toString(),
            slippageBps: slippageBps.toString(),
            onlyDirectRoutes: 'false', // Allow multi-hop for better rates
            asLegacyTransaction: 'false', // Use versioned transactions
            maxAccounts: '64', // Optimize for compute units
            minimizeSlippage: 'true'
        });
        
        // Get quote with timeout and retry logic
        let quoteData;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const quoteResponse = await fetch(`https://quote-api.jup.ag/v6/quote?${quoteParams}`, {
                    timeout: 10000 // 10 second timeout
                });
                
                if (!quoteResponse.ok) {
                    const errorText = await quoteResponse.text();
                    throw new Error(`Quote API error ${quoteResponse.status}: ${errorText}`);
                }
                
                quoteData = await quoteResponse.json();
                
                if (!quoteData.outAmount || quoteData.outAmount === '0') {
                    throw new Error('No valid route found for this swap');
                }
                
                break; // Success, exit retry loop
            } catch (error) {
                console.log(`⚠️  Quote attempt ${attempt}/${maxRetries} failed: ${error.message}`);
                if (attempt === maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
            }
        }
        
        // Calculate expected output in human-readable format
        const expectedOutput = parseFloat(quoteData.outAmount) / Math.pow(10, toTokenInfo.decimals);
        const priceImpact = quoteData.priceImpactPct || 0;
        
        console.log(`💰 Expected output: ${expectedOutput.toFixed(6)} ${toTokenSymbol} (Impact: ${priceImpact}%)`);
        
        // Optimized swap transaction request
        const swapPayload = {
            quoteResponse: quoteData,
            userPublicKey: walletAddress,
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: priorityFee,
            dynamicSlippage: { // Enable dynamic slippage for better execution
                maxBps: Math.max(slippageBps, 300) // At least 3% max
            }
        };
        
        // Get swap transaction with retry logic
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
                    timeout: 15000 // 15 second timeout
                });
                
                if (!swapResponse.ok) {
                    const errorText = await swapResponse.text();
                    throw new Error(`Swap API error ${swapResponse.status}: ${errorText}`);
                }
                
                swapData = await swapResponse.json();
                
                if (!swapData.swapTransaction) {
                    throw new Error('No swap transaction received from Jupiter');
                }
                
                break; // Success, exit retry loop
            } catch (error) {
                console.log(`⚠️  Swap transaction attempt ${attempt}/${maxRetries} failed: ${error.message}`);
                if (attempt === maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
            }
        }
        
        console.log(`⚡ Transaction prepared in ${Date.now() - startTime}ms`);
        
        // Deserialize and send transaction
        const transactionBuffer = Buffer.from(swapData.swapTransaction, 'base64');
        const transaction = VersionedTransaction.deserialize(transactionBuffer);
        
        console.log(`📤 Signing and sending transaction...`);
        
        // Sign and send with Privy
        const { hash } = await privy.walletApi.solana.signAndSendTransaction({
            walletId: walletId,
            caip2: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            transaction: transaction,
        });
        
        console.log(`✅ Transaction sent: ${hash}`);
        
        // Optional: Wait for confirmation
        if (confirmTransaction) {
            console.log(`⏳ Confirming transaction...`);
            try {
                const { connection } = await import('./wallet.js');
                const confirmation = await connection.confirmTransaction(hash, 'confirmed');
                
                if (confirmation.value.err) {
                    console.log(`❌ Transaction failed: ${confirmation.value.err}`);
                } else {
                    console.log(`✅ Transaction confirmed!`);
                }
            } catch (confirmError) {
                console.log(`⚠️  Confirmation check failed: ${confirmError.message}`);
                // Don't fail the whole operation for confirmation issues
            }
        }
        
        const totalTime = Date.now() - startTime;
        console.log(`🎉 Swap completed in ${totalTime}ms`);
        
        return { 
            success: true, 
            hash,
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
        
        // Enhanced error reporting
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
