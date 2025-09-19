import dotenv from "dotenv";
import { 
    getOrCreateWallet, 
    getBalances, 
    createWallet,
    getWallet
} from './wallet.js';
import { 
    swap, 
    transfer,
    checkTokenAccountExists, 
    getTokenMintAddress,
    marketData, 
    price, 
    twitter 
} from './trading.js';
import { 
    scheduleInterval, 
    scheduleTimes, 
    stopSchedule, 
    stopAllSchedules, 
    getActiveSchedules,
    getScheduleInfo 
} from './scheduler.js';
import { logger, updateStatus, updateScheduleStatus } from './logger.js';

dotenv.config();

// Configuration
const ownerAddress = "5NGqPDeoEfpxwq8bKHkMaSyLXDeR7YmsxSyMbXA5yKSQ";

// =============================
// ======= BALANCE MONITORING =======
// =============================

/**
 * Wait for wallet to have minimum SOL balance before proceeding
 * 
 * @param {string} walletAddress - Wallet address to monitor
 * @param {number} minimumSOL - Minimum SOL balance required (default: 0.005)
 * @returns {Promise<number>} Current balance when threshold is met
 */
async function waitForBalance(walletAddress, minimumSOL = 0.005) {
    updateStatus('balance_check', `Checking wallet balance (minimum required: ${minimumSOL} SOL)`, null, { 
        minimumRequired: minimumSOL,
        walletAddress 
    });
    
    while (true) {
        try {
            const balances = await getBalances(walletAddress);
            console.log('All balances:', JSON.stringify(balances));
            logger.log('All balances:', JSON.stringify(balances));
            const solBalance = balances.allBalances.find(token => token.symbol === 'SOL');
            const currentBalance = solBalance ? solBalance.uiAmount : 0;
            
            if (currentBalance >= minimumSOL) {
                updateStatus('balance_ready', `Wallet balance sufficient: ${currentBalance.toFixed(6)} SOL`, true, { 
                    currentBalance,
                    minimumRequired: minimumSOL,
                    walletAddress 
                });
                logger.log(`✅ Wallet balance ready: ${currentBalance.toFixed(6)} SOL (required: ${minimumSOL} SOL)`);
                return currentBalance;
            } else {
                updateStatus('balance_insufficient', `Waiting for sufficient balance: ${currentBalance.toFixed(6)} SOL (need ${minimumSOL} SOL)`, null, { 
                    currentBalance,
                    minimumRequired: minimumSOL,
                    shortfall: minimumSOL - currentBalance,
                    walletAddress 
                });
                logger.log(`⏳ Insufficient balance: ${currentBalance.toFixed(6)} SOL (need ${minimumSOL} SOL). Checking again in 1 minute...`);
                
                // Wait 1 minute before checking again
                await new Promise(resolve => setTimeout(resolve, 60000));
            }
        } catch (error) {
            updateStatus('balance_error', `Error checking balance: ${error.message}`, false, { 
                error: error.message,
                walletAddress 
            });
            logger.error(`❌ Error checking balance: ${error.message}`);
            
            // Wait 1 minute before retrying
            await new Promise(resolve => setTimeout(resolve, 60000));
        }
    }
}

// =============================
// ======= PRICE MONITORING =======
// =============================

/**
 * Check if the monitored token price meets the specified condition
 * @param {string} tokenToMonitor - Token symbol to monitor
 * @param {number} targetPrice - Target price to compare against
 * @param {boolean} above - True for above condition, false for below
 * @param {string} walletAddress - Wallet address for logging context
 * @returns {Object} Price check result with current price and condition status
 */
async function checkPriceCondition(tokenToMonitor, targetPrice, above, walletAddress = null) {
    try {
        updateStatus('price_check', `Checking ${tokenToMonitor} price condition...`, null, { 
            tokenToMonitor, 
            targetPrice, 
            condition: above ? 'above' : 'below',
            walletAddress 
        });
        
        logger.log(`📊 Checking ${tokenToMonitor} price condition: ${above ? 'above' : 'below'} $${targetPrice}`);
        
        // Get current price
        const priceResult = await price(tokenToMonitor);
        
        // Handle both error object format and direct price value
        let currentPrice;
        if (typeof priceResult === 'object' && priceResult.success === false) {
            updateStatus('price_error', `Failed to get ${tokenToMonitor} price`, false, { 
                tokenToMonitor, 
                error: priceResult.error,
                walletAddress 
            });
            logger.error(`❌ Failed to get ${tokenToMonitor} price: ${priceResult.error}`);
            return {
                success: false,
                error: `Failed to get ${tokenToMonitor} price: ${priceResult.error}`,
                conditionMet: false
            };
        } else if (typeof priceResult === 'number') {
            // Direct price value returned
            currentPrice = priceResult;
        } else if (typeof priceResult === 'object' && priceResult.price) {
            // Price object with price property
            currentPrice = priceResult.price;
        } else {
            updateStatus('price_error', `Invalid price format for ${tokenToMonitor}`, false, { 
                tokenToMonitor, 
                priceResult,
                walletAddress 
            });
            logger.error(`❌ Invalid price format for ${tokenToMonitor}: ${JSON.stringify(priceResult)}`);
            return {
                success: false,
                error: `Invalid price format for ${tokenToMonitor}`,
                conditionMet: false
            };
        }
        
        const conditionMet = above ? currentPrice >= targetPrice : currentPrice <= targetPrice;
        const conditionText = above ? 'above' : 'below';
        
        if (conditionMet) {
            updateStatus('price_condition_met', `Price condition satisfied: ${tokenToMonitor} is ${conditionText} target`, true, { 
                tokenToMonitor, 
                currentPrice, 
                targetPrice, 
                condition: conditionText,
                walletAddress 
            });
            logger.log(`✅ Price condition satisfied: ${tokenToMonitor} $${currentPrice} is ${conditionText} target $${targetPrice}`);
        } else {
            updateStatus('price_condition_waiting', `Price threshold not reached: ${tokenToMonitor} $${currentPrice} (target: ${conditionText} $${targetPrice})`, null, { 
                tokenToMonitor, 
                currentPrice, 
                targetPrice, 
                condition: conditionText,
                difference: above ? targetPrice - currentPrice : currentPrice - targetPrice,
                walletAddress 
            });
            logger.log(`⏳ Price condition not met: ${tokenToMonitor} $${currentPrice} (need ${conditionText} $${targetPrice})`);
        }
        
        return {
            success: true,
            conditionMet,
            currentPrice,
            targetPrice,
            condition: conditionText
        };
        
    } catch (error) {
        updateStatus('price_error', `Error checking price condition: ${error.message}`, false, { 
            tokenToMonitor, 
            error: error.message,
            walletAddress 
        });
        logger.error(`❌ Error checking price condition: ${error.message}`);
        return {
            success: false,
            error: error.message,
            conditionMet: false
        };
    }
}

// =============================
// ======= SCHEDULED EXECUTION HELPER =======
// =============================

/**
 * Create scheduled execution for DCA strategies
 * @param {string} ownerAddress - Wallet owner address
 * @param {string} fromToken - Source token symbol
 * @param {string} toToken - Destination token symbol
 * @param {number} amount - Amount to trade
 * @param {Object} scheduleOptions - Schedule configuration
 * @returns {Object} Schedule result with ID and description
 */
function createScheduledExecution(ownerAddress, fromToken, toToken, amount, scheduleOptions) {
    // Create the execution function that calls baselineFunction for immediate execution
    const executionFunction = () => baselineFunction(ownerAddress, {
        fromToken,
        toToken,
        amount,
        executionType: 'immediate'
    });
    
    let scheduleId;
    let scheduleDescription;
    
    if (scheduleOptions.type === 'interval') {
        const intervalMs = typeof scheduleOptions.value === 'number' && scheduleOptions.value > 0 ? scheduleOptions.value : null;
        if (!intervalMs) {
            throw new Error('Invalid interval format. Use milliseconds (e.g., 30000 for 30s)');
        }
        
        const executeImmediately = scheduleOptions.executeImmediately || false;
        scheduleId = scheduleInterval(executionFunction, intervalMs, executeImmediately);
        scheduleDescription = `Every ${intervalMs}ms${executeImmediately ? ' (immediate start)' : ''}`;
        
    } else if (scheduleOptions.type === 'times') {
        const times = scheduleOptions.times;
        const timezone = scheduleOptions.timezone || 'UTC';
        
        if (!Array.isArray(times) || times.length === 0) {
            throw new Error('Invalid times format. Use array of time strings (e.g., ["09:00", "15:30"])');
        }
        
        scheduleId = scheduleTimes(executionFunction, times, timezone);
        scheduleDescription = `At ${times.join(', ')} (${timezone})`;
        
    } else {
        throw new Error('Invalid schedule type. Use "interval" or "times"');
    }
    
    logger.log(`📅 Created schedule: ${scheduleDescription}`);
    
    return {
        scheduleId,
        description: scheduleDescription,
        nextExecution: new Date(Date.now() + (scheduleOptions.type === 'interval' ? scheduleOptions.value : 0)).toISOString()
    };
}

// =============================
// ======= UTILITY FUNCTIONS =======
// =============================

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the specified time
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Deep merge two objects
 * @param {Object} base - Base object
 * @param {Object} extra - Object to merge into base
 * @returns {Object} Merged object
 */
function deepMerge(base, extra) {
    if (!extra || typeof extra !== 'object') return base;
    const out = Array.isArray(base) ? [...base] : { ...base };
    for (const k of Object.keys(extra)) {
        const bv = base?.[k];
        const ev = extra[k];
        if (bv && typeof bv === 'object' && !Array.isArray(bv) && ev && typeof ev === 'object' && !Array.isArray(ev)) {
            out[k] = deepMerge(bv, ev);
        } else {
            out[k] = ev;
        }
    }
    return out;
}

/**
 * Check if a token symbol is a USD stablecoin
 * @param {string} symbol - Token symbol
 * @returns {boolean} True if it's a stablecoin
 */
function isStable(symbol) {
    return ['USDC', 'USDT'].includes((symbol || '').toUpperCase());
}

/**
 * Get UI amount for a specific token from balance object
 * @param {Object} balancesObj - Balance object from getBalances()
 * @param {string} symbol - Token symbol to find
 * @returns {number} UI amount or 0 if not found
 */
function getUiAmount(balancesObj, symbol) {
    try {
        const list = balancesObj?.allBalances || [];
        const s = (symbol || '').toUpperCase();
        const found = list.find(b => (b.symbol || b.name || '').toUpperCase() === s || (s === 'SOL' && (b.mint === 'SOL')));
        return found?.uiAmount ? Number(found.uiAmount) : 0;
    } catch (e) {
        return 0;
    }
}

/**
 * Resolve execution type from configuration
 * @param {Object} cfg - Configuration object
 * @returns {string} Execution type
 */
function resolveExecutionType(cfg) {
    if (cfg.executionType) return cfg.executionType;
    const hasSchedule = !!cfg.schedule;
    const hasPrice = !!cfg.priceMonitoring;
    const hasTwitter = !!cfg.twitterTrigger;
    if (hasSchedule && hasPrice) return 'hybrid';
    if (hasSchedule) return 'scheduled';
    if (hasPrice) return 'price_monitoring';
    if (hasTwitter) return 'twitter_trigger';
    return 'immediate';
}

// =============================
// ======= EXPORTS =======
// =============================

// Export all functions that generated code might need
export {
    // Wallet functions
    getOrCreateWallet,
    getBalances,
    createWallet,
    getWallet,
    
    // Trading functions
    swap,
    transfer,
    checkTokenAccountExists,
    getTokenMintAddress,
    marketData,
    price,
    twitter,
    
    // Scheduling functions
    scheduleInterval,
    scheduleTimes,
    stopSchedule,
    stopAllSchedules,
    getActiveSchedules,
    getScheduleInfo,
    
    // Logging functions
    logger,
    updateStatus,
    updateScheduleStatus,
    
    // Helper functions
    waitForBalance,
    checkPriceCondition,
    createScheduledExecution,
    sleep,
    deepMerge,
    isStable,
    getUiAmount,
    resolveExecutionType,
    
    // Configuration
    ownerAddress
};

// =============================
// ======= GENERATED CODE SECTION =======
// =============================

// 🤖 GENERATED BASELINE FUNCTIONS WILL BE APPENDED BELOW THIS LINE
// The code generation API will add complete baseline functions here
// Each function will be exported and ready to use

// Example of what will be added:
// export async function baselineFunction(ownerAddress, config = {}) {
//     // Generated trading logic here
// }

// =============================
// ======= GENERATED BASELINE FUNCTION =======
// =============================

// Sample generated baseline function for testing custom bot deployment
export async function baselineFunction(ownerAddress, config = {}) {
    // Auto-detect and normalize configuration
    const defaultConfig = {
      // Defaults aligned to the user's request
      fromToken: 'USDC',
      toToken: 'SOL',
      // targetToAmount allows buying an exact amount of the destination token using a stablecoin
      targetToAmount: 0.0001, // Buy 0.0001 SOL
      amount: null, // If set, uses exact-in swap of fromToken amount
      schedule: {
        type: 'interval',
        intervalMs: 600000, // every 1 minute
        executeImmediately: true
      },
      priceMonitoring: {
        tokenToMonitor: 'BTC',
        targetPrice: 13500,
        above: true
      },
      twitterTrigger: null,
      executionType: undefined // auto-detect
    };
  
    const merged = deepMerge(defaultConfig, config || {});
    const executionType = resolveExecutionType(merged);
  
    updateStatus('initializing', 'Initializing Solana trading baseline function...', null, {
      ownerAddress,
      config: merged,
      executionType
    });
  
    try {
      // Initialize wallet
      updateStatus('wallet_init', 'Getting or creating wallet...', null, { ownerAddress });
      const wallet = await getOrCreateWallet(ownerAddress);
      logger.log(`Wallet ready: ${wallet.walletAddress}`);
  
      // Ensure minimal SOL for fees
      await waitForBalance(wallet.walletAddress, 0.001);
  
      // Dispatch by execution type
      switch (executionType) {
        case 'hybrid':
          return await handleHybridExecution(ownerAddress, wallet, merged);
        case 'scheduled':
          return await handleScheduledExecution(ownerAddress, wallet, merged);
        case 'price_monitoring':
          return await handlePriceMonitoring(ownerAddress, wallet, merged);
        case 'twitter_trigger':
          return await handleTwitterTrigger(ownerAddress, wallet, merged);
        case 'immediate':
        default:
          return await handleImmediateExecution(ownerAddress, wallet, merged);
      }
    } catch (error) {
      updateStatus('error', `Baseline function failed: ${error.message}`, false, {
        error: error.message,
        stack: error.stack
      });
      logger.error(`Baseline function failed: ${error.message}`);
      throw error;
    }
  }
  
  /* ------------------------------------------------------
     Hybrid Execution: Scheduled DCA + Price Condition
  ------------------------------------------------------ */
  async function handleHybridExecution(ownerAddress, wallet, config) {
    const { fromToken, toToken, amount, targetToAmount, schedule, priceMonitoring } = config;
    const intervalMs = schedule?.intervalMs || 3600000; // default 1 hour
    const execImmediately = !!schedule?.executeImmediately;
  
    updateStatus('scheduling', 'Setting up hybrid strategy (scheduled + price condition)...', null, {
      schedule,
      priceMonitoring
    });
  
    const description = `Every ${Math.round(intervalMs / 60000)} min: if ${priceMonitoring.tokenToMonitor} ${priceMonitoring.above ? '>' : '<'} $${priceMonitoring.targetPrice}, buy ${targetToAmount ? targetToAmount + ' ' + toToken : amount + ' ' + toToken} using ${fromToken}`;
  
    const scheduleId = scheduleInterval(async () => {
      try {
        // 1) Check price condition at execution time
        const cond = await checkPriceCondition(
          priceMonitoring.tokenToMonitor,
          priceMonitoring.targetPrice,
          !!priceMonitoring.above,
          wallet.walletAddress
        );
  
        if (!cond.success) {
          logger.error(`Price check failed: ${cond.error || 'unknown error'}`);
          return;
        }
  
        logger.log(`${priceMonitoring.tokenToMonitor} price: $${cond.currentPrice} | Target: $${priceMonitoring.targetPrice} | Condition: ${priceMonitoring.above ? 'above' : 'below'} | Met: ${cond.conditionMet}`);
  
        if (!cond.conditionMet) {
          logger.log('Condition not met. Skipping this cycle.');
          return;
        }
  
        // 2) Condition met -> execute trade
        updateStatus('executing', 'Condition met. Executing scheduled trade...', null, {
          fromToken,
          toToken,
          amount,
          targetToAmount,
          currentPrice: cond.currentPrice
        });
  
        let execResult;
        if (targetToAmount && isStable(fromToken) && toToken) {
          execResult = await buyExactToAmountWithStable(wallet, fromToken, toToken, targetToAmount);
        } else if (amount) {
          execResult = await executeSimpleSwap(wallet, fromToken, toToken, amount);
        } else {
          logger.log('No valid trade parameters provided. Skipping.');
          return;
        }
  
        if (execResult?.success) {
          updateStatus('completed', 'Hybrid scheduled trade executed successfully', true, {
            executionType: 'hybrid',
            signature: execResult.signature || null,
            details: execResult
          });
          logger.log(`Trade successful${execResult.signature ? `: ${execResult.signature}` : ''}`);
        } else {
          updateStatus('error', 'Hybrid scheduled trade failed', false, { error: execResult?.error });
          logger.error(`Trade failed: ${execResult?.error || 'Unknown error'}`);
        }
      } catch (err) {
        logger.error(`Error in hybrid scheduled execution: ${err.message}`);
        updateStatus('error', `Hybrid execution error: ${err.message}`, false, { error: err.message });
      }
    }, intervalMs, execImmediately);
  
    updateStatus('scheduled', 'Hybrid strategy active', true, {
      scheduleId,
      description,
      nextExecution: new Date(Date.now() + intervalMs).toISOString()
    });
  
    logger.log(`Hybrid schedule started: ${description}`);
    return {
      success: true,
      executionType: 'hybrid',
      scheduleId,
      description,
      message: 'Hybrid (scheduled + price condition) strategy started.'
    };
  }
  
  /* ------------------------------------------------------
     Immediate Execution (simplified for testing)
  ------------------------------------------------------ */
  async function handleImmediateExecution(ownerAddress, wallet, config) {
    const { fromToken, toToken, amount, targetToAmount } = config;
  
    updateStatus('executing', 'Executing immediate trade...', null, { fromToken, toToken, amount, targetToAmount });
    logger.log(`Immediate trade: ${amount ? amount + ' ' + fromToken + ' -> ' + toToken : (targetToAmount + ' ' + toToken + ' using ' + fromToken)}`);
  
    // For testing, just return success without actual trading
    updateStatus('completed', 'Test execution completed successfully', true, {
      executionType: 'immediate',
      signature: 'test-signature-' + Date.now(),
      completedAt: new Date().toISOString()
    });
  
    return {
      success: true,
      executionType: 'immediate',
      message: 'Test execution completed successfully',
      signature: 'test-signature-' + Date.now()
    };
  }
  
  /* ------------------------------------------------------
     Helper Functions (simplified for testing)
  ------------------------------------------------------ */
  async function executeSimpleSwap(wallet, fromToken, toToken, fromAmount, options = {}) {
    // For testing, just return success
    logger.log(`Test swap: ${fromAmount} ${fromToken} -> ${toToken}`);
    return { success: true, signature: 'test-swap-' + Date.now() };
  }
  
  async function buyExactToAmountWithStable(wallet, fromStableSymbol, toTokenSymbol, targetToAmount) {
    // For testing, just return success
    logger.log(`Test buy exact: ${targetToAmount} ${toTokenSymbol} using ${fromStableSymbol}`);
    return { success: true, signature: 'test-buy-' + Date.now(), acquired: targetToAmount, attempts: 1 };
  }
  
  async function handleScheduledExecution(ownerAddress, wallet, config) {
    // Simplified for testing
    return { success: true, executionType: 'scheduled', message: 'Test scheduled execution' };
  }
  
  async function handlePriceMonitoring(ownerAddress, wallet, config) {
    // Simplified for testing
    return { success: true, executionType: 'price_monitoring', message: 'Test price monitoring' };
  }
  
  async function handleTwitterTrigger(ownerAddress, wallet, config) {
    // Simplified for testing
    return { success: true, executionType: 'twitter_trigger', message: 'Test Twitter trigger' };
  }
