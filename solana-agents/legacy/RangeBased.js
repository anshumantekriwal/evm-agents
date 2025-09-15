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
// ======= Range-Based Trading Bot =======
// =============================

/**
 * Range-based trading bot for Solana
 * Monitors a trigger token's price and executes trades when it crosses thresholds
 * @param {string} fromTokenSymbol - Token to sell (e.g., 'SOL')
 * @param {string} toTokenSymbol - Token to buy (e.g., 'USDC')
 * @param {number} tradeAmount - Amount of fromToken to swap
 * @param {string} triggerTokenSymbol - Token to monitor for price changes (e.g., 'BTC')
 * @param {number} priceThreshold - Price threshold to trigger trades
 * @param {string} condition - 'above' or 'below' the threshold
 * @param {string} ownerAddress - Optional owner address for wallet creation
 */
export async function rangeBasedBot(
    fromTokenSymbol, 
    toTokenSymbol, 
    tradeAmount, 
    triggerTokenSymbol, 
    priceThreshold, 
    condition, 
    ownerAddress = null
) {
    console.log(`Starting Range-Based Bot:`);
    console.log(`- Trade: ${tradeAmount} ${fromTokenSymbol} -> ${toTokenSymbol}`);
    console.log(`- Trigger: When ${triggerTokenSymbol} is ${condition} $${priceThreshold}`);
    console.log(`- Execution: Every 1 minute`);
    
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
    console.log(`Monitoring: ${triggerTokenSymbol} price`);
    
    // Track trade history to avoid duplicate trades
    const tradeHistory = new Set();
    let lastTradeTime = 0;
    const minTradeInterval = 5 * 60 * 1000; // 5 minutes minimum between trades
    
    // Start monitoring every minute
    const intervalId = setInterval(async () => {
        try {
            const currentTime = Date.now();
            console.log(`\n--- Checking conditions at ${new Date().toISOString()} ---`);
            
            // Get current price of trigger token
            const triggerPrice = await price(triggerTokenSymbol);
            console.log(`Current ${triggerTokenSymbol} price: $${triggerPrice}`);
            
            // Check if condition is met
            let shouldTrade = false;
            if (condition === 'above' && triggerPrice > priceThreshold) {
                shouldTrade = true;
                console.log(`✅ ${triggerTokenSymbol} price ($${triggerPrice}) is ABOVE threshold ($${priceThreshold})`);
            } else if (condition === 'below' && triggerPrice < priceThreshold) {
                shouldTrade = true;
                console.log(`✅ ${triggerTokenSymbol} price ($${triggerPrice}) is BELOW threshold ($${priceThreshold})`);
            } else {
                console.log(`❌ Condition not met: ${triggerTokenSymbol} price ($${triggerPrice}) is not ${condition} $${priceThreshold}`);
            }
            
            // Check if we should execute trade
            if (shouldTrade) {
                // Check minimum time between trades
                if (currentTime - lastTradeTime < minTradeInterval) {
                    console.log(`⏳ Too soon since last trade. Waiting ${Math.ceil((minTradeInterval - (currentTime - lastTradeTime)) / 1000)}s more`);
                    return;
                }
                
                // Check wallet balance
                const currentBalances = await getBalances(wallet.walletAddress);
                const fromTokenBalance = currentBalances.allBalances.find(
                    token => token.symbol === fromTokenSymbol || token.mint === fromTokenInfo.address
                );
                
                if (!fromTokenBalance || fromTokenBalance.uiAmount < tradeAmount) {
                    console.log(`❌ Insufficient ${fromTokenSymbol} balance. Required: ${tradeAmount}, Available: ${fromTokenBalance?.uiAmount || 0}`);
                    return;
                }
                
                // Get current market data
                const fromTokenPrice = await price(fromTokenSymbol);
                const toTokenPrice = await price(toTokenSymbol);
                
                console.log(`Current prices: ${fromTokenSymbol} = $${fromTokenPrice}, ${toTokenSymbol} = $${toTokenPrice}`);
                
                // Execute swap
                console.log(`🔄 Executing trade: ${tradeAmount} ${fromTokenSymbol} -> ${toTokenSymbol}`);
                const swapResult = await swap(fromTokenSymbol, toTokenSymbol, tradeAmount, wallet.walletAddress);
                
                if (swapResult.success) {
                    console.log(`Swap quote received successfully`);
                    
                    // Sign and submit transaction
                    const txData = swapResult.quote.transactionRequest;
                    const { hash } = await privy.walletApi.solana.signAndSendTransaction({
                        walletId: wallet.walletId,
                        caip2: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', // Mainnet
                        transaction: txData,
                    });
                    
                    console.log(`✅ Range-based trade executed successfully!`);
                    console.log(`Transaction hash: ${hash}`);
                    console.log(`Trigger: ${triggerTokenSymbol} price $${triggerPrice} was ${condition} $${priceThreshold}`);
                    
                    // Update trade tracking
                    lastTradeTime = currentTime;
                    tradeHistory.add(hash);
                    
                    // Log updated balances
                    const updatedBalances = await getBalances(wallet.walletAddress);
                    console.log("Updated balances:", updatedBalances.allBalances);
                    
                } else {
                    console.log(`❌ Swap failed: ${swapResult.error}`);
                }
            }
            
        } catch (error) {
            console.error(`❌ Error in range-based bot:`, error.message);
        }
    }, 60 * 1000); // Execute every minute
    
    console.log(`Range-based bot started! Monitoring every minute. Press Ctrl+C to stop.`);
    
    // Return bot control object
    return {
        intervalId,
        wallet,
        fromToken: fromTokenInfo,
        toToken: toTokenInfo,
        triggerToken: triggerTokenSymbol,
        threshold: priceThreshold,
        condition,
        tradeHistory: Array.from(tradeHistory),
        stop: () => {
            clearInterval(intervalId);
            console.log('Range-based bot stopped');
        },
        getStatus: () => ({
            isRunning: true,
            wallet: wallet.walletAddress,
            triggerToken: triggerTokenSymbol,
            threshold: priceThreshold,
            condition,
            tradesExecuted: tradeHistory.size,
            lastTradeTime: lastTradeTime ? new Date(lastTradeTime).toISOString() : null
        })
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
 * Get wallet balances
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
                symbol: 'SPL',
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
 * Get token price using Mobula API
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
 * Execute swap using LiFi API
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

// Example 1: Buy USDC with SOL when BTC is above $100,000
// const bot1 = await rangeBasedBot('SOL', 'USDC', 0.1, 'BTC', 100000, 'above');

// Example 2: Buy SOL with USDC when ETH is below $3,000
// const bot2 = await rangeBasedBot('USDC', 'SOL', 10, 'ETH', 3000, 'below');

// Example 3: Buy USDC with SOL when SOL is above $200
// const bot3 = await rangeBasedBot('SOL', 'USDC', 0.5, 'SOL', 200, 'above');

// To stop: bot1.stop();
// To check status: console.log(bot1.getStatus());

export default rangeBasedBot;
