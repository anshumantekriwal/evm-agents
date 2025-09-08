import { PrivyClient } from "@privy-io/server-auth";
import {
    PublicKey,
    SystemProgram,
    VersionedTransaction,
    TransactionMessage,
    Connection,
    clusterApiUrl,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fetch from 'node-fetch';
import dotenv from "dotenv";

dotenv.config();

const privy = new PrivyClient(process.env.PRIVY_APP_ID, process.env.PRIVY_APP_SECRET);

// =============================
// ======= DCA Trading Function =======
// =============================

/**
 * Dollar Cost Averaging function for Solana
 * @param {string} fromTokenSymbol - Symbol of token to sell (e.g., 'SOL')
 * @param {string} toTokenSymbol - Symbol of token to buy (e.g., 'USDC')
 * @param {number} amount - Amount of fromToken to swap each interval
 * @param {number} intervalMinutes - Interval in minutes between trades
 * @param {string} ownerAddress - Optional owner address for wallet creation
 */
export async function dcaFunction(fromTokenSymbol, toTokenSymbol, amount, intervalMinutes, ownerAddress = null) {
    console.log(`Starting DCA: ${amount} ${fromTokenSymbol} -> ${toTokenSymbol} every ${intervalMinutes} minutes`);
    
    // Create or get wallet
    const wallet = await getOrCreateWallet(ownerAddress);
    console.log(`Using wallet: ${wallet.walletAddress}`);
    
    // Get initial balances
    const initialBalances = await getBalances(wallet.walletAddress);
    console.log("Initial balances:", initialBalances.allBalances);
    
    // Find token addresses and metadata
    const fromTokenInfo = await findTokenBySymbol(fromTokenSymbol);
    const toTokenInfo = await findTokenBySymbol(toTokenSymbol);
    
    if (!fromTokenInfo) {
        throw new Error(`Token '${fromTokenSymbol}' not found`);
    }
    if (!toTokenInfo) {
        throw new Error(`Token '${toTokenSymbol}' not found`);
    }
    
    console.log(`From token: ${fromTokenInfo.symbol} (${fromTokenInfo.address})`);
    console.log(`To token: ${toTokenInfo.symbol} (${toTokenInfo.address})`);
    
    // Start DCA interval
    const intervalId = setInterval(async () => {
        try {
            console.log(`\n--- Executing DCA trade at ${new Date().toISOString()} ---`);
            
            // Check current balances
            const currentBalances = await getBalances(wallet.walletAddress);
            const fromTokenBalance = currentBalances.allBalances.find(
                token => token.symbol === fromTokenSymbol || token.mint === fromTokenInfo.address
            );
            
            if (!fromTokenBalance || fromTokenBalance.uiAmount < amount) {
                console.log(`Insufficient ${fromTokenSymbol} balance. Required: ${amount}, Available: ${fromTokenBalance?.uiAmount || 0}`);
                return;
            }
            
            // Get current market data
            const fromTokenPrice = await price(fromTokenSymbol);
            const toTokenPrice = await price(toTokenSymbol);
            
            console.log(`Current prices: ${fromTokenSymbol} = $${fromTokenPrice}, ${toTokenSymbol} = $${toTokenPrice}`);
            
            // Execute swap
            const swapResult = await swap(fromTokenSymbol, toTokenSymbol, amount, wallet.walletAddress);
            
            if (swapResult.success) {
                console.log(`Swap quote received successfully`);
                
                // Sign and submit transaction
                const txData = swapResult.quote.transactionRequest;
                const { hash } = await privy.walletApi.solana.signAndSendTransaction({
                    walletId: wallet.walletId,
                    caip2: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', // Mainnet
                    transaction: txData,
                });
                
                console.log(`✅ DCA trade executed successfully! Transaction hash: ${hash}`);
                
                // Log updated balances
                const updatedBalances = await getBalances(wallet.walletAddress);
                console.log("Updated balances:", updatedBalances.allBalances);
                
            } else {
                console.log(`❌ Swap failed: ${swapResult.error}`);
            }
            
        } catch (error) {
            console.error(`❌ Error executing DCA trade:`, error.message);
        }
    }, intervalMinutes * 60 * 1000);
    
    console.log(`DCA started! Will execute every ${intervalMinutes} minutes. Press Ctrl+C to stop.`);
    
    // Return interval ID for potential cleanup
    return {
        intervalId,
        wallet,
        fromToken: fromTokenInfo,
        toToken: toTokenInfo,
        stop: () => clearInterval(intervalId)
    };
}

// =============================
// ======= Helper Functions =======
// =============================

/**
 * Create or get existing wallet
 */
async function getOrCreateWallet(ownerAddress) {
    if (process.env.WALLET_ID) {
        console.log("Using existing wallet from environment");
        const wallet = await privy.walletApi.getWallet({id: process.env.WALLET_ID});
        return { walletId: wallet.id, walletAddress: wallet.address };
    } else {
        console.log("Creating new wallet");
        const wallet = await privy.walletApi.createWallet({
            chainType: "solana",
            ownerAddress: ownerAddress || "5NGqPDeoEfpxwq8bKHkMaSyLXDeR7YmsxSyMbXA5yKSQ",
        });
        return { walletId: wallet.id, walletAddress: wallet.address };
    }
}

/**
 * Find token by symbol using Jupiter API
 */
async function findTokenBySymbol(symbol) {
    try {
        const jupiterUrl = `https://token.jup.ag/all`;
        const response = await fetch(jupiterUrl);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch token list: ${response.status}`);
        }
        
        const tokens = await response.json();
        const token = tokens.find(t => 
            t.symbol.toUpperCase() === symbol.toUpperCase()
        );
        
        if (!token) {
            return null;
        }
        
        return {
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            logoURI: token.logoURI
        };
    } catch (error) {
        console.error(`Error finding token ${symbol}:`, error);
        return null;
    }
}

/**
 * Get wallet balances (simplified version from baseline.js)
 */
async function getBalances(walletAddress) {
    const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    const publicKey = new PublicKey(walletAddress);
    
    try {
        const [solBalance, tokenAccounts] = await Promise.all([
            connection.getBalance(publicKey),
            connection.getParsedTokenAccountsByOwner(publicKey, {
                programId: TOKEN_PROGRAM_ID
            })
        ]);
        
        const tokenBalances = tokenAccounts.value.map(account => {
            const { tokenAmount, mint } = account.account.data.parsed.info;
            return {
                mint,
                tokenAmount: tokenAmount.amount,
                decimals: tokenAmount.decimals,
                uiAmount: tokenAmount.uiAmount,
                symbol: 'SPL', // Simplified for DCA
                name: `Token ${mint.slice(0, 8)}...`
            };
        });
        
        const solBalanceFormatted = {
            mint: 'SOL',
            tokenAmount: solBalance.toString(),
            decimals: 9,
            uiAmount: solBalance / 1e9,
            name: 'Solana',
            symbol: 'SOL',
        };

        return {
            allBalances: [solBalanceFormatted, ...tokenBalances]
        };
    } catch (error) {
        console.error('Error fetching balances:', error);
        throw error;
    }
}

/**
 * Get token price using Mobula API (from baseline.js)
 */
async function price(symbol) {
    try {
        const url = `https://explorer-api.mobula.io/api/1/market/data?shouldFetchPriceChange=24h&symbol=${symbol.toUpperCase()}`;
        
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
        return data['data']['price'];
        
    } catch (error) {
        console.error('Failed to get price:', error);
        throw error;
    }
}

/**
 * Execute swap using LiFi API (simplified from baseline.js)
 */
async function swap(fromTokenSymbol, toTokenSymbol, fromAmount, walletAddress) {
    try {
        // Find tokens by symbol
        const fromTokenInfo = await findTokenBySymbol(fromTokenSymbol);
        const toTokenInfo = await findTokenBySymbol(toTokenSymbol);
        
        if (!fromTokenInfo || !toTokenInfo) {
            throw new Error('Token not found');
        }
        
        const fromToken = fromTokenInfo.address;
        const toToken = toTokenInfo.address;
        const fromTokenDecimals = fromTokenInfo.decimals;
        
        // Convert human-readable amount to raw amount
        const rawAmount = Math.floor(fromAmount * Math.pow(10, fromTokenDecimals));
        
        const url = `https://li.quest/v1/quote?fromChain=SOL&toChain=SOL&fromToken=${fromToken}&toToken=${toToken}&fromAddress=${walletAddress}&toAddress=${walletAddress}&fromAmount=${rawAmount}`;
        
        const quoteResponse = await fetch(url, {
            method: 'GET',
            headers: {
                'accept': 'application/json'
            }
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
// ======= Example Usage =======
// =============================

// Example: DCA 0.1 SOL to USDC every 30 minutes
// const dca = await dcaFunction('SOL', 'USDC', 0.1, 30);
// 
// To stop: dca.stop();

export default dcaFunction;
