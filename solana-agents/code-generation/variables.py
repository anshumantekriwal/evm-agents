import os
import json
from typing import Dict, List, Any, Optional, Union, Tuple

# =============================
# ======= SOLANA TRADING FUNCTIONS =======
# =============================

TRANSACTIONS_CODE = """
/**
 * @description JavaScript client for Solana blockchain trading operations
 * 
 * This module provides functions to interact with Solana blockchain through Jupiter API,
 * allowing token swaps, transfers, and market data retrieval.
 */

/**
 * Swap one token for another using Jupiter
 * 
 * @param {string} walletId - Privy wallet ID
 * @param {string} fromTokenSymbol - Symbol of input token (e.g., 'SOL', 'USDC')
 * @param {string} toTokenSymbol - Symbol of output token
 * @param {number} fromAmount - Amount to swap (in normal format)
 * @param {string} walletAddress - Wallet address
 * @param {Object} options - Optional swap parameters
 * @param {number} options.slippageBps - Slippage in basis points (default: 150 = 1.5%)
 * @param {string} options.priorityFee - Priority fee setting ('auto', 'low', 'medium', 'high')
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {boolean} options.confirmTransaction - Whether to confirm transaction (default: true)
 * @returns {Promise<Object>} Swap result containing:
 *   - success: Boolean indicating success
 *   - signature: Transaction signature if successful
 *   - error: Error message if failed
 *   - swapResult: Detailed swap information
 */
async function swap(walletId, fromTokenSymbol, toTokenSymbol, fromAmount, walletAddress, options = {})

/**
 * Transfer tokens between addresses
 * 
 * @param {string} walletId - Privy wallet ID
 * @param {string} toAddress - Recipient address
 * @param {string} tokenSymbol - Token symbol to transfer ('SOL' for native)
 * @param {number} amount - Amount to transfer
 * @param {string} walletAddress - Sender wallet address
 * @returns {Promise<Object>} Transfer result containing:
 *   - success: Boolean indicating success
 *   - signature: Transaction signature if successful
 *   - error: Error message if failed
 */
async function transfer(walletId, toAddress, tokenSymbol, amount, walletAddress)

/**
 * Get token mint address by symbol
 * 
 * @param {string} symbol - Token symbol (e.g., 'USDC', 'SOL')
 * @returns {Promise<Object>} Result containing:
 *   - success: Boolean indicating success
 *   - mintAddress: Token mint address if found
 *   - tokenInfo: Token metadata (name, symbol, decimals, logoURI)
 *   - error: Error message if failed
 */
async function getTokenMintAddress(symbol)

/**
 * Check if token account exists for a wallet
 * 
 * @param {string} walletAddress - Wallet address to check
 * @param {string} mintAddress - Token mint address
 * @returns {Promise<boolean>} True if token account exists
 */
async function checkTokenAccountExists(walletAddress, mintAddress)
"""

TRANSACTIONS_USAGE = """
// Example 1: Swap SOL to USDC
const swapResult = await swap(
  wallet.walletId,     // Wallet ID from Privy
  'SOL',               // From token
  'USDC',              // To token
  0.1,                 // Amount (0.1 SOL)
  wallet.walletAddress, // Wallet address
  { slippageBps: 200 } // 2% slippage
);

if (swapResult.success) {
  logger.log(`✅ Swap successful: ${swapResult.signature}`);
} else {
  logger.error(`❌ Swap failed: ${swapResult.error}`);
}

// Example 2: Transfer SOL
const transferResult = await transfer(
  wallet.walletId,
  'RecipientAddressHere',
  'SOL',
  0.01,
  wallet.walletAddress
);

// Example 3: Get token mint address
const tokenInfo = await getTokenMintAddress('USDC');
if (tokenInfo.success) {
  console.log(`USDC mint: ${tokenInfo.mintAddress}`);
}
"""

HELPER_FUNCTIONS = """
// Wallet Operations
/**
 * Create a new Solana wallet using Privy
 * 
 * @param {string} ownerAddress - Owner address for the wallet
 * @returns {Promise<Object>} Wallet object with:
 *   - walletId: Privy wallet ID
 *   - walletAddress: Solana wallet address
 */
async function createWallet(ownerAddress)

/**
 * Get existing wallet by ID
 * 
 * @param {string} walletId - Privy wallet ID
 * @returns {Promise<Object>} Wallet object with walletId and walletAddress
 */
async function getWallet(walletId)

/**
 * Get or create wallet (checks environment for existing wallet ID)
 * 
 * @param {string} ownerAddress - Owner address for new wallet creation
 * @returns {Promise<Object>} Wallet object with walletId and walletAddress
 */
async function getOrCreateWallet(ownerAddress)

// Balance Operations
/**
 * Get all token balances for a wallet address
 * 
 * @param {string} walletAddress - Wallet address to check
 * @returns {Promise<Object>} Balance object containing:
 *   - allBalances: Array of token balance objects, each with:
 *     - mint: Token mint address ('SOL' for native)
 *     - tokenAmount: Raw token amount as string
 *     - decimals: Token decimals
 *     - uiAmount: Human-readable amount
 *     - name: Token name
 *     - symbol: Token symbol
 *     - logoURI: Token logo URL
 * 
 * @example
 * const balances = await getBalances(walletAddress);
 * const solBalance = balances.allBalances.find(token => token.symbol === 'SOL');
 * const usdcBalance = balances.allBalances.find(token => token.symbol === 'USDC');
 * console.log(`SOL: ${solBalance?.uiAmount || 0}, USDC: ${usdcBalance?.uiAmount || 0}`);
 */
async function getBalances(walletAddress)

/**
 * Wait for wallet to have minimum SOL balance before proceeding
 * 
 * @param {string} walletAddress - Wallet address to monitor
 * @param {number} minimumSOL - Minimum SOL balance required (default: 0.005)
 * @returns {Promise<number>} Current balance when threshold is met
 */
async function waitForBalance(walletAddress, minimumSOL = 0.005)

// Market Data Operations
/**
 * Get current price for a token using Mobula API
 * 
 * @param {string} symbol - Token symbol (e.g., 'SOL', 'BTC', 'ETH')
 * @returns {Promise<number|Object>} Returns:
 *   - On success: Current price in USD (number)
 *   - On error: { success: false, error: "error message" }
 * 
 * @example
 * const solPrice = await price('SOL');
 * if (typeof solPrice === 'number') {
 *   console.log(`SOL price: $${solPrice}`);
 * } else {
 *   console.error(`Error: ${solPrice.error}`);
 * }
 */
async function price(symbol)

/**
 * Get comprehensive market data for a token using Mobula API
 * 
 * @param {string} symbol - Token symbol (e.g., 'SOL', 'BTC', 'ETH')
 * @returns {Promise<Object>} Returns market data object with:
 *   - price: Current price in USD (number)
 *   - volume: 24h trading volume (number)
 *   - market_cap: Market capitalization (number)
 *   - price_change_24h: 24h price change percentage (number)
 *   - volume_change_24h: 24h volume change percentage (number)
 *   - liquidity: Current liquidity (number)
 *   - ath: All-time high price (number)
 *   - atl: All-time low price (number)
 *   - rank: Market cap rank (number)
 *   - total_supply: Total token supply (number)
 *   - circulating_supply: Circulating supply (number)
 *   - On error: { success: false, error: "error message" }
 * 
 * @example
 * const btcData = await marketData('BTC');
 * if (btcData.success !== false) {
 *   console.log(`BTC: $${btcData.price}, 24h change: ${btcData.price_change_24h}%`);
 * }
 */
async function marketData(symbol)

/**
 * Check if token price meets specified condition (used for range trading)
 * 
 * @param {string} tokenToMonitor - Token symbol to monitor
 * @param {number} targetPrice - Target price to compare against
 * @param {boolean} above - True for above condition, false for below
 * @param {string} walletAddress - Wallet address for logging context
 * @returns {Promise<Object>} Returns:
 *   - success: Boolean indicating if price check succeeded
 *   - conditionMet: Boolean indicating if price condition is satisfied
 *   - currentPrice: Current token price (number)
 *   - targetPrice: Target price that was checked against
 *   - error: Error message if failed
 * 
 * @example
 * const priceCheck = await checkPriceCondition('SOL', 100, true, walletAddress);
 * if (priceCheck.success && priceCheck.conditionMet) {
 *   console.log(`SOL price $${priceCheck.currentPrice} is above target $100`);
 * }
 */
async function checkPriceCondition(tokenToMonitor, targetPrice, above, walletAddress)

// Twitter Operations
/**
 * Fetch recent tweets from a Twitter user and check for new tweets
 * 
 * @param {string} user - Twitter username (without @)
 * @param {Array<Object>} lastTweets - Array of previous tweets to compare against
 * @returns {Promise<Object>} Returns:
 *   - hasNewTweet: Boolean indicating if there are new tweets
 *   - newTweet: Object containing the newest tweet (if any), with:
 *     - id: Tweet ID
 *     - text: Tweet content
 *     - created_at: Tweet timestamp
 *     - author: Author information
 *   - currentTweets: Array of current tweets (up to 5)
 *   - username: The username that was checked
 *   - error: Error message if failed
 * 
 * @example
 * const twitterData = await twitter('elonmusk', []);
 * if (twitterData.hasNewTweet) {
 *   console.log(`New tweet from @${twitterData.username}: ${twitterData.newTweet.text}`);
 * }
 */
async function twitter(user, lastTweets = [])

// Scheduling Operations (for DCA bots)
/**
 * Schedule function execution at regular intervals
 * 
 * @param {Function} func - Function to execute
 * @param {number} intervalMs - Interval in milliseconds
 * @param {boolean} executeImmediately - Whether to execute immediately
 * @returns {string} Schedule ID for management
 */
function scheduleInterval(func, intervalMs, executeImmediately = false)

/**
 * Schedule function execution at specific times
 * 
 * @param {Function} func - Function to execute
 * @param {Array<string>} times - Array of time strings (e.g., ['09:00', '15:30'])
 * @param {string} timezone - Timezone (default: 'UTC')
 * @returns {string} Schedule ID for management
 */
function scheduleTimes(func, times, timezone = 'UTC')

/**
 * Stop a specific schedule
 * 
 * @param {string} scheduleId - Schedule ID to stop
 * @returns {boolean} True if successfully stopped
 */
function stopSchedule(scheduleId)

/**
 * Stop all active schedules
 * 
 * @returns {number} Number of schedules stopped
 */
function stopAllSchedules()

// Logging and Status Operations
/**
 * Log messages with different severity levels
 * 
 * @param {string} message - Message to log
 * @param {string} level - Log level: 'info', 'error', 'warn', 'success'
 */
function logger.log(message, level = 'info')
function logger.error(message)
function logger.warn(message)

/**
 * Update execution status for monitoring and debugging
 * 
 * @param {string} phase - Current execution phase
 * @param {string} message - Status message
 * @param {boolean|null} success - Success indicator (null for in-progress)
 * @param {Object} data - Additional status data
 */
function updateStatus(phase, message, success, data)
"""

# =============================
# ======= UNIFIED BASELINE TEMPLATE =======
# =============================

UNIFIED_BASELINE_TEMPLATE = """
/**
 * Unified Solana Trading Baseline Function
 * Supports immediate execution, scheduled trading (DCA), price monitoring (Range), and Twitter-based triggers
 * 
 * @param {string} ownerAddress - Wallet owner address
 * @param {Object} config - Trading configuration object
 * @param {string} config.fromToken - Source token symbol
 * @param {string} config.toToken - Destination token symbol  
 * @param {number} config.amount - Amount to trade
 * @param {Object} config.schedule - Optional scheduling configuration
 * @param {Object} config.priceMonitoring - Optional price monitoring configuration
 * @param {Object} config.twitterTrigger - Optional Twitter trigger configuration
 * @param {string} config.executionType - 'immediate', 'scheduled', 'price_monitoring', 'twitter_trigger'
 */
export async function baselineFunction(ownerAddress, config = {}) {
    // Extract configuration with defaults
    const {
        fromToken,
        toToken, 
        amount,
        schedule = null,
        priceMonitoring = null,
        twitterTrigger = null,
        executionType = 'immediate'
    } = config;
    
    // Initialize with wallet creation/loading
    updateStatus('initializing', 'Initializing Solana trading baseline function...', null, { 
        ownerAddress, 
        config,
        executionType
    });
    
    try {
        // Get or create wallet first
        updateStatus('wallet_init', 'Getting or creating wallet...', null, { ownerAddress });
        const wallet = await getOrCreateWallet(ownerAddress);
        logger.log(`✅ Wallet ready: ${wallet.walletAddress}`);
        
        // Wait for sufficient balance
        await waitForBalance(wallet.walletAddress, 0.005); // Minimum 0.005 SOL
        
        // Handle different execution types
        switch (executionType) {
            case 'scheduled':
                return await handleScheduledExecution(ownerAddress, wallet, config);
                
            case 'price_monitoring':
                return await handlePriceMonitoring(ownerAddress, wallet, config);
                
            case 'twitter_trigger':
                return await handleTwitterTrigger(ownerAddress, wallet, config);
                
            case 'immediate':
            default:
                return await handleImmediateExecution(ownerAddress, wallet, config);
        }
        
    } catch (error) {
        updateStatus('error', `Baseline function failed: ${error.message}`, false, { 
            error: error.message,
            stack: error.stack
        });
        logger.error(`❌ Baseline function failed: ${error.message}`);
        throw error;
    }
}

// Handle scheduled execution (DCA)
async function handleScheduledExecution(ownerAddress, wallet, config) {
    const { fromToken, toToken, amount, schedule } = config;
    
    updateStatus('scheduling', 'Setting up scheduled execution...', null, { schedule });
    logger.log(`📅 Setting up scheduled execution: ${JSON.stringify(schedule)}`);
    
    const scheduleResult = createScheduledExecution(ownerAddress, fromToken, toToken, amount, schedule);
    
    updateStatus('scheduled', 'Scheduled execution active', true, { 
        scheduleId: scheduleResult.scheduleId,
        description: scheduleResult.description,
        nextExecution: scheduleResult.nextExecution
    });
    
    logger.log(`✅ Scheduled execution started: ${scheduleResult.description}`);
    return {
        success: true,
        executionType: 'scheduled',
        scheduleId: scheduleResult.scheduleId,
        description: scheduleResult.description,
        message: `DCA bot scheduled: ${scheduleResult.description}`
    };
}

// Handle price monitoring (Range)
async function handlePriceMonitoring(ownerAddress, wallet, config) {
    const { fromToken, toToken, amount, priceMonitoring } = config;
    const { tokenToMonitor, targetPrice, above } = priceMonitoring;
    
    updateStatus('monitoring', 'Starting continuous price monitoring...', null, { 
        tokenToMonitor, targetPrice, above,
        monitoringInterval: '30 seconds'
    });
    
    logger.log(`📊 Starting price monitoring: ${tokenToMonitor} ${above ? 'above' : 'below'} $${targetPrice}`);
    
    // Continuous monitoring loop (every 30 seconds)
    const monitoringInterval = setInterval(async () => {
        try {
            const priceCheck = await checkPriceCondition(tokenToMonitor, targetPrice, above, wallet.walletAddress);
            
            if (priceCheck.success && priceCheck.conditionMet) {
                logger.log(`🎯 Price condition met! Executing trade...`);
                clearInterval(monitoringInterval);
                
                updateStatus('executing', 'Price condition met, executing trade...', null, { 
                    currentPrice: priceCheck.currentPrice,
                    targetPrice: targetPrice,
                    condition: above ? 'above' : 'below'
                });
                
                // ======= ENTER AI CODE =======
                // AI-generated trading logic will be inserted here
                // =============================
                
                
                // =============================
                // ======= END AI CODE =======
                
                updateStatus('completed', 'Price-triggered trading completed successfully', true, { 
                    executionType: 'price_triggered',
                    triggerPrice: priceCheck.currentPrice,
                    completedAt: new Date().toISOString()
                });
            }
        } catch (error) {
            logger.error(`❌ Error in price monitoring: ${error.message}`);
            updateStatus('monitoring_error', `Monitoring error: ${error.message}`, false, { 
                error: error.message
            });
        }
    }, 30000); // 30 seconds
    
    return {
        success: true,
        executionType: 'price_monitoring',
        monitoringActive: true,
        message: 'Continuous price monitoring started'
    };
}

// Handle Twitter trigger
async function handleTwitterTrigger(ownerAddress, wallet, config) {
    const { fromToken, toToken, amount, twitterTrigger } = config;
    const { username, keywords = [], checkInterval = 60000 } = twitterTrigger;
    
    updateStatus('twitter_monitoring', 'Starting Twitter monitoring...', null, { 
        username, keywords, checkInterval
    });
    
    logger.log(`🐦 Starting Twitter monitoring for @${username} with keywords: ${keywords.join(', ')}`);
    
    let lastTweets = [];
    
    // Twitter monitoring loop
    const twitterInterval = setInterval(async () => {
        try {
            const twitterData = await twitter(username, lastTweets);
            
            if (twitterData.hasNewTweet) {
                const newTweet = twitterData.newTweet;
                logger.log(`📱 New tweet from @${username}: ${newTweet.text.substring(0, 100)}...`);
                
                // Check if tweet contains any keywords (if specified)
                let shouldTrigger = keywords.length === 0; // If no keywords, trigger on any new tweet
                
                if (keywords.length > 0) {
                    shouldTrigger = keywords.some(keyword => 
                        newTweet.text.toLowerCase().includes(keyword.toLowerCase())
                    );
                }
                
                if (shouldTrigger) {
                    logger.log(`🎯 Twitter trigger activated! Executing trade...`);
                    clearInterval(twitterInterval);
                    
                    updateStatus('executing', 'Twitter trigger activated, executing trade...', null, { 
                        tweet: newTweet.text,
                        username: username,
                        triggeredKeywords: keywords
                    });
                    
                    // ======= ENTER AI CODE =======
                    // AI-generated trading logic will be inserted here
                    // =============================
                    
                    
                    // =============================
                    // ======= END AI CODE =======
                    
                    updateStatus('completed', 'Twitter-triggered trading completed successfully', true, { 
                        executionType: 'twitter_triggered',
                        triggerTweet: newTweet.text,
                        completedAt: new Date().toISOString()
                    });
                }
                
                // Update last tweets for next check
                lastTweets = twitterData.currentTweets;
            }
        } catch (error) {
            logger.error(`❌ Error in Twitter monitoring: ${error.message}`);
            updateStatus('twitter_error', `Twitter monitoring error: ${error.message}`, false, { 
                error: error.message
            });
        }
    }, checkInterval);
    
    return {
        success: true,
        executionType: 'twitter_monitoring',
        monitoringActive: true,
        message: `Twitter monitoring started for @${username}`
    };
}

// Handle immediate execution
async function handleImmediateExecution(ownerAddress, wallet, config) {
    const { fromToken, toToken, amount } = config;
    
    updateStatus('executing', 'Executing immediate trade...', null, { fromToken, toToken, amount });
    logger.log(`🔄 Executing immediate trade: ${amount} ${fromToken} → ${toToken}`);
    
    // ======= ENTER AI CODE =======
    // AI-generated trading logic will be inserted here
    // =============================
    
    
    // =============================
    // ======= END AI CODE =======
    
    updateStatus('completed', 'Immediate trading completed successfully', true, { 
        executionType: 'immediate',
        completedAt: new Date().toISOString()
    });
    
    return {
        success: true,
        executionType: 'immediate',
        message: 'Immediate execution completed successfully'
    };
}
"""

STATUS_FORMAT = """
{
  "phase": "initializing",
  "walletAddress": null,
  "solBalance": 0,
  "lastMessage": "Starting...",
  "nextStep": "Creating wallet",
  "trades": [],
  "error": null,
  "isRunning": false,
  "executionType": "immediate",
  "scheduleInfo": null,
  "priceMonitoring": null
}
"""

# =============================
# ======= CODER PROMPT =======
# =============================

CODER_PROMPT = """
You are <Agent S1>, a Solana trading agent code generator created by Xade for Solana blockchain.

Your task is to generate a COMPLETE baseline function that intelligently handles all types of trading strategies on Solana.

You will be provided with a prompt containing all the information required to handle and execute the trading position.
You will have access to all the functions you may need to achieve this task.

KNOWLEDGE:
- You are working on Solana mainnet blockchain
- The native token is SOL
- Popular tokens include USDC, USDT, BTC, ETH, and many others available through Jupiter
- Use Jupiter for all token swaps
- The agent's wallet information is in the wallet variable:
  - wallet.walletId contains the Privy wallet ID
  - wallet.walletAddress contains the Solana wallet address

RESOURCES:
1. Trading Functions Documentation:
{TRANSACTIONS_CODE}
These functions are pre-defined and available for use.

2. Trading Usage Examples:
{TRANSACTIONS_USAGE}
Examples of how to use the trading functions.

3. Helper Functions:
{HELPER_FUNCTIONS}
Additional helper functions for wallet operations, balances, market data, and scheduling.

INTELLIGENT EXECUTION PATTERNS:
You must analyze the user's prompt and automatically determine the appropriate execution pattern:

1. **IMMEDIATE EXECUTION**: For simple swaps, transfers, or one-time operations
   - Execute immediately after wallet setup and balance check

2. **SCHEDULED EXECUTION (DCA)**: For time-based recurring operations
   - Daily/weekly/monthly purchases
   - Specific time executions (e.g., "every day at 9 AM")
   - Use scheduleInterval() or scheduleTimes() functions
   - Examples: "buy SOL every day", "DCA into BTC weekly"

3. **EVENT-DRIVEN MONITORING (1-minute intervals)**: For condition-based triggers
   - Price monitoring (above/below thresholds)
   - Twitter monitoring for new tweets/keywords
   - Market condition monitoring
   - Check conditions every 60 seconds (60000ms)
   - Examples: "when SOL > $100", "when @elonmusk tweets about crypto"

4. **HYBRID STRATEGIES**: Combining multiple patterns
   - DCA with price conditions
   - Twitter triggers with time constraints
   - Multi-condition logic

AUTOMATIC PATTERN DETECTION:
- **Time keywords**: "daily", "weekly", "monthly", "every X hours", "at 9 AM" → SCHEDULED
- **Price keywords**: "when price", "above", "below", "reaches", "drops to" → EVENT-DRIVEN (1-min)
- **Twitter keywords**: "tweets", "posts", "@username", "mentions" → EVENT-DRIVEN (1-min)
- **Immediate keywords**: "swap now", "buy immediately", "transfer" → IMMEDIATE
- **No time/condition keywords**: Default to IMMEDIATE

UNIFIED BASELINE TEMPLATE:
{UNIFIED_BASELINE_TEMPLATE}

INTELLIGENT CODE GENERATION RULES:
1. Analyze the prompt to determine execution pattern automatically
2. Generate the COMPLETE baseline function, not just code snippets
3. Include all necessary helper functions (handleScheduledExecution, handlePriceMonitoring, etc.)
4. Use appropriate intervals:
   - Event-driven monitoring: 60 seconds (60000ms)
   - Scheduled execution: Use user-specified intervals or defaults
5. Include comprehensive error handling and logging
6. Make the function fully autonomous
7. ALWAYS export the baselineFunction using: export async function baselineFunction(ownerAddress, config = {{}})
8. ALWAYS use balances.allBalances when accessing balance data from getBalances() function

EXECUTION WORKFLOW:
1. **Parse User Intent**: Identify tokens, amounts, conditions, timing
2. **Determine Pattern**: Immediate, Scheduled, or Event-driven
3. **Generate Configuration**: Create appropriate config object
4. **Implement Logic**: Write the complete baseline function
5. **Add Monitoring**: Include appropriate intervals and condition checks
6. **Error Handling**: Wrap all operations in try-catch blocks

STATUS UPDATES AND LOGGING:
- Use logger.log(message) for info logging
- Use logger.error(message) for error logging  
- Use updateStatus(phase, message, success, data) to track execution state
- Valid phases: "initializing", "wallet_init", "executing", "monitoring", "scheduled", "completed", "error"
- Include relevant info: prices, trade amounts, transaction signatures, error messages

OUTPUT FORMAT:
Return ONLY a structured JSON object with these keys:
- code: The COMPLETE baseline function code
- executionType: "immediate", "scheduled", "price_monitoring", "twitter_trigger", or "hybrid"
- description: Brief description of what the function does
- monitoringInterval: Interval in milliseconds (if applicable)

CORE PRINCIPLES:
- **Intelligence**: Automatically detect the right execution pattern
- **Autonomy**: Function must run completely independently
- **Resilience**: Comprehensive error handling and recovery
- **Efficiency**: Optimal intervals and resource usage
- **Transparency**: Clear logging and status updates
- **Export Requirement**: Always export the function with proper signature
- **Balance Format**: Always use balances.allBalances array for token data

Example Outputs:

For "Swap 1 SOL to USDC now":
```json
{{
  "code": "export async function baselineFunction(ownerAddress) {{ ... immediate execution logic ... }}",
  "executionType": "immediate",
  "description": "Immediately swaps 1 SOL to USDC",
  "monitoringInterval": null
}}
```

For "Buy 0.01 SOL worth of BTC when SOL price goes above $150":
```json
{{
  "code": "export async function baselineFunction(ownerAddress) {{ ... price monitoring logic with 60s intervals ... }}",
  "executionType": "price_monitoring", 
  "description": "Monitors SOL price and buys BTC when SOL > $150",
  "monitoringInterval": 60000
}}
```

For "DCA 10 USDC into SOL every day at 9 AM UTC":
```json
{{
  "code": "export async function baselineFunction(ownerAddress) {{ ... scheduled execution logic ... }}",
  "executionType": "scheduled",
  "description": "Daily DCA of 10 USDC into SOL at 9 AM UTC",
  "monitoringInterval": null
}}
```
"""

# =============================
# ======= TOKENS DATA =======
# =============================

# Popular Solana tokens for reference
POPULAR_TOKENS = {
    "SOL": {
        "symbol": "SOL",
        "name": "Solana",
        "mint": "So11111111111111111111111111111111111111112",
        "decimals": 9
    },
    "USDC": {
        "symbol": "USDC",
        "name": "USD Coin",
        "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "decimals": 6
    },
    "USDT": {
        "symbol": "USDT",
        "name": "Tether USD",
        "mint": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        "decimals": 6
    },
    "BTC": {
        "symbol": "BTC",
        "name": "Bitcoin",
        "mint": "9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E",
        "decimals": 6
    },
    "ETH": {
        "symbol": "ETH",
        "name": "Ethereum",
        "mint": "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
        "decimals": 8
    }
}
