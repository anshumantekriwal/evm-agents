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
// ======= Twitter-Based Trading Bot =======
// =============================

/**
 * Twitter-based trading bot for Solana
 * Monitors a specific user's tweets and executes trades when they post
 * @param {string} fromTokenSymbol - Token to sell (e.g., 'SOL')
 * @param {string} toTokenSymbol - Token to buy (e.g., 'USDC')
 * @param {number} tradeAmount - Amount of fromToken to swap
 * @param {string} twitterUsername - Twitter username to monitor (without @)
 * @param {string} ownerAddress - Optional owner address for wallet creation
 */
export async function tweetBasedBot(
    fromTokenSymbol, 
    toTokenSymbol, 
    tradeAmount, 
    twitterUsername, 
    ownerAddress = null
) {
    console.log(`Starting Twitter-Based Bot:`);
    console.log(`- Trade: ${tradeAmount} ${fromTokenSymbol} -> ${toTokenSymbol}`);
    console.log(`- Monitoring: @${twitterUsername} tweets`);
    console.log(`- Execution: Every 2 minutes`);
    
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
    console.log(`Monitoring: @${twitterUsername} for new tweets`);
    
    // Track processed tweets to avoid duplicate trades
    const processedTweets = new Set();
    let lastTweets = []; // Store last known tweets for comparison
    
    // Start monitoring every 2 minutes
    const intervalId = setInterval(async () => {
        try {
            console.log(`\n--- Checking @${twitterUsername} tweets at ${new Date().toISOString()} ---`);
            
            // Check for new tweets using the Twitter function from baseline.js
            const tweetResult = await twitter(twitterUsername, lastTweets);
            
            if (tweetResult.error) {
                console.log(`❌ Error fetching tweets: ${tweetResult.error}`);
                return;
            }
            
            // Update lastTweets with current tweets
            lastTweets = tweetResult.currentTweets || [];
            
            // Check if there's a new tweet
            if (tweetResult.hasNewTweet && tweetResult.newTweet) {
                const newTweet = tweetResult.newTweet;
                const tweetId = newTweet.id || newTweet.text; // Use ID or text as unique identifier
                
                // Check if we've already processed this tweet
                if (processedTweets.has(tweetId)) {
                    console.log(`⏭️ Tweet already processed: ${tweetId}`);
                    return;
                }
                
                console.log(`🐦 New tweet detected from @${twitterUsername}:`);
                console.log(`Tweet ID: ${tweetId}`);
                console.log(`Content: ${newTweet.text || 'No text content'}`);
                console.log(`Timestamp: ${newTweet.created_at || 'Unknown'}`);
                
                // Check wallet balance before trading
                const currentBalances = await getBalances(wallet.walletAddress);
                const fromTokenBalance = currentBalances.allBalances.find(
                    token => token.symbol === fromTokenSymbol || token.mint === fromTokenInfo.address
                );
                
                if (!fromTokenBalance || fromTokenBalance.uiAmount < tradeAmount) {
                    console.log(`❌ Insufficient ${fromTokenSymbol} balance. Required: ${tradeAmount}, Available: ${fromTokenBalance?.uiAmount || 0}`);
                    processedTweets.add(tweetId); // Mark as processed even if we can't trade
                    return;
                }
                
                // Get current market data
                const fromTokenPrice = await price(fromTokenSymbol);
                const toTokenPrice = await price(toTokenSymbol);
                
                console.log(`Current prices: ${fromTokenSymbol} = $${fromTokenPrice}, ${toTokenSymbol} = $${toTokenPrice}`);
                
                // Execute trade
                console.log(`🔄 Executing trade triggered by @${twitterUsername}'s tweet:`);
                console.log(`Trade: ${tradeAmount} ${fromTokenSymbol} -> ${toTokenSymbol}`);
                
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
                    
                    console.log(`✅ Tweet-triggered trade executed successfully!`);
                    console.log(`Transaction hash: ${hash}`);
                    console.log(`Triggered by tweet: ${newTweet.text?.substring(0, 100)}...`);
                    
                    // Mark tweet as processed
                    processedTweets.add(tweetId);
                    
                    // Log updated balances
                    const updatedBalances = await getBalances(wallet.walletAddress);
                    console.log("Updated balances:", updatedBalances.allBalances);
                    
                } else {
                    console.log(`❌ Swap failed: ${swapResult.error}`);
                    processedTweets.add(tweetId); // Mark as processed even if swap failed
                }
                
            } else {
                console.log(`📭 No new tweets from @${twitterUsername}`);
            }
            
        } catch (error) {
            console.error(`❌ Error in tweet-based bot:`, error.message);
        }
    }, 2 * 60 * 1000); // Check every 2 minutes
    
    console.log(`Twitter-based bot started! Monitoring @${twitterUsername} every 2 minutes. Press Ctrl+C to stop.`);
    
    // Return bot control object
    return {
        intervalId,
        wallet,
        fromToken: fromTokenInfo,
        toToken: toTokenInfo,
        twitterUsername,
        processedTweets: Array.from(processedTweets),
        stop: () => {
            clearInterval(intervalId);
            console.log('Twitter-based bot stopped');
        },
        getStatus: () => ({
            isRunning: true,
            wallet: wallet.walletAddress,
            twitterUsername,
            tradesExecuted: processedTweets.size,
            processedTweets: Array.from(processedTweets),
            lastCheck: new Date().toISOString()
        })
    };
}

// =============================
// ======= Twitter Function (from baseline.js) =======
// =============================

/**
 * Twitter function from baseline.js - monitors tweets for changes
 */
async function twitter(user, lastTweets = []) {
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
        const currentTweets = data.data || []; // Extract tweets from data array
        
        // Compare current tweets with inputted lastTweets
        let hasNewTweet = false;
        let newTweet = null;
        
        if (lastTweets.length === 0) {
            // No previous tweets provided, return current tweets without marking as new
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
                break; // Return the first new tweet found
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

// Example: Buy USDC with SOL when Elon Musk tweets
// const bot1 = await tweetBasedBot('SOL', 'USDC', 0.1, 'elonmusk');

// Example: Buy SOL with USDC when Vitalik tweets
// const bot2 = await tweetBasedBot('USDC', 'SOL', 10, 'VitalikButerin');

// Example: Buy USDC with SOL when any crypto influencer tweets
// const bot3 = await tweetBasedBot('SOL', 'USDC', 0.5, 'cz_binance');

// To stop: bot1.stop();
// To check status: console.log(bot1.getStatus());

export default tweetBasedBot;
