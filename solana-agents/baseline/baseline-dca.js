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
// import {checkPriceCondition} from './baseline-range.js';
import { logger, updateStatus, updateScheduleStatus } from './logger.js';

dotenv.config();

// Configuration
const ownerAddress = "5NGqPDeoEfpxwq8bKHkMaSyLXDeR7YmsxSyMbXA5yKSQ";

// =============================
// ======= BALANCE MONITORING =======
// =============================

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


function createScheduledExecution(ownerAddress, fromToken, toToken, amount, scheduleOptions) {
    // Create the execution function that calls baselineFunction for immediate execution
    const executionFunction = () => baselineFunction(ownerAddress, fromToken, toToken, amount);
    
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
        const times = Array.isArray(scheduleOptions.value) ? scheduleOptions.value : [scheduleOptions.value];
        scheduleId = scheduleTimes(executionFunction, times);
        scheduleDescription = `At ${times.join(', ')} UTC`;
        
    } else {
        throw new Error('Schedule type must be "interval" or "times"');
    }
    
    // Update status with schedule info
    const scheduleInfo = getScheduleInfo();
    const currentSchedule = scheduleInfo.find(s => s.id === scheduleId);
    if (currentSchedule) {
        updateScheduleStatus(currentSchedule);
    }
    
    return { scheduleId, scheduleDescription };
}


// =============================
// ======= MAIN BASELINE FUNCTION =======
// =============================

/**
 * Main baseline function - generalized trading function with optional scheduling
 * @param {string} ownerAddress - Wallet owner address
 * @param {string} fromToken - Source token symbol
 * @param {string} toToken - Destination token symbol
 * @param {number} amount - Amount to swap
 * @param {Object} scheduleOptions - Optional scheduling configuration
 * @returns {Object} Execution result with schedule info if applicable
 */
export async function baselineFunction(ownerAddress, fromToken, toToken, amount, scheduleOptions = null) {
    // Initialize with wallet creation/loading
    updateStatus('initializing', 'Initializing baseline function...', null, { 
        ownerAddress, fromToken, toToken, amount,
        executionType: scheduleOptions ? 'scheduled' : 'immediate'
    });
    
    try {
        // Get or create wallet first
        updateStatus('wallet_init', 'Getting or creating wallet...', null, { ownerAddress });
        const wallet = await getOrCreateWallet(ownerAddress);
        
        // Store full wallet address in status and log it
        updateStatus('wallet_ready', 'Wallet ready for trading', true, { 
            ownerAddress, 
            walletAddress: wallet.walletAddress,
            walletId: wallet.walletId
        });
        logger.log(`💼 Wallet initialized: ${wallet.walletAddress}`);
        
        // If no scheduling options, execute immediately
        if (!scheduleOptions) {
            updateStatus('immediate_execution', 'Executing trading immediately...', null, { 
                ownerAddress, fromToken, toToken, amount,
                walletAddress: wallet.walletAddress
            });
            logger.log('🚀 Executing trading immediately...');
            
            // =============================
            // ======= TRADING EXECUTION STARTS HERE =======
            // =============================

            updateStatus('execution_start', `Starting trading execution: ${amount} ${fromToken} → ${toToken}`, null, { 
                fromToken, toToken, amount, ownerAddress,
                walletAddress: wallet.walletAddress
            });
            
            // Wait for minimum balance
            await waitForBalance(wallet.walletAddress, 0.001);
            
            // Get current balances for trading
            updateStatus('trading_balance_check', 'Checking trading balances...', null, { 
                ownerAddress,
                walletAddress: wallet.walletAddress,
                fromToken 
            });
            logger.log('📊 Checking wallet balances for trading...');
            const balances = await getBalances(wallet.walletAddress);
            logger.log(`💰 Found ${balances.allBalances.length} tokens in wallet`);
            
            // Check if fromToken exists and get balance
            const fromTokenUpper = fromToken.toUpperCase();
            const tokenObj = balances.allBalances.find(
                token => token.symbol && token.symbol.toUpperCase() === fromTokenUpper
            );

            if (!tokenObj) {
                updateStatus('trading_error', `No ${fromToken} found in wallet`, false, { 
                    ownerAddress,
                    walletAddress: wallet.walletAddress,
                    fromToken, 
                    availableTokens: balances.allBalances.map(t => t.symbol) 
                });
                logger.log(`❌ No ${fromToken} found in wallet`);
                return { 
                    success: false, 
                    error: `Wallet does not have ${fromToken}`,
                    executionType: 'immediate',
                    timestamp: new Date().toISOString()
                };
            } 
            
            if (tokenObj.uiAmount < amount) {
                const errorMsg = `Insufficient ${fromToken} balance. Available: ${tokenObj.uiAmount}, required: ${amount}`;
                updateStatus('trading_error', 'Insufficient trading balance', false, { 
                    ownerAddress,
                    walletAddress: wallet.walletAddress,
                    fromToken, 
                    available: tokenObj.uiAmount, 
                    required: amount 
                });
                logger.log(`❌ ${errorMsg}`);
                return { 
                    success: false, 
                    error: errorMsg,
                    executionType: 'immediate',
                    timestamp: new Date().toISOString()
                };
            }
            
            logger.log(`✅ Sufficient ${fromToken} balance: ${tokenObj.uiAmount} (need: ${amount})`);

            // Get destination token information
            updateStatus('token_lookup', `Looking up ${toToken} token address...`, null, { 
                ownerAddress,
                walletAddress: wallet.walletAddress,
                toToken 
            });
            logger.log(`🔍 Looking up ${toToken} token address...`);
            const toTokenResult = await getTokenMintAddress(toToken);
            
            if (!toTokenResult.success) {
                updateStatus('trading_error', `Could not find ${toToken} token`, false, { 
                    ownerAddress,
                    walletAddress: wallet.walletAddress,
                    toToken, 
                    error: toTokenResult.error 
                });
                logger.log(`❌ Could not find ${toToken} token: ${toTokenResult.error}`);
                return { 
                    success: false, 
                    error: `Failed to get mint address for ${toToken}: ${toTokenResult.error}`,
                    executionType: 'immediate',
                    timestamp: new Date().toISOString()
                };
            }
            
            const toTokenMintAddress = toTokenResult.mintAddress;
            logger.log(`✅ ${toToken} token found`);

            // Check if destination token account exists
            updateStatus('account_check', `Checking ${toToken} account...`, null, { 
                ownerAddress,
                walletAddress: wallet.walletAddress,
                toToken, 
                mintAddress: toTokenMintAddress 
            });
            logger.log(`🔍 Checking if you have a ${toToken} account...`);
            const accountExists = await checkTokenAccountExists(wallet.walletAddress, toTokenMintAddress);
            if (accountExists) {
                logger.log(`✅ ${toToken} account ready`);
            } else {
                logger.log(`⚠️  First ${toToken} transaction - account will be created`);
            }
            
            // Check SOL requirements for swap fees
            const minRequiredSOL = 0.0021; // Minimum for any Jupiter swap (2.1 mSOL)
            if (fromTokenUpper === 'SOL' && tokenObj.uiAmount < minRequiredSOL) {
                const needed = (minRequiredSOL - tokenObj.uiAmount).toFixed(6);
                updateStatus('trading_error', 'Insufficient SOL for swap fees', false, { 
                    ownerAddress,
                    walletAddress: wallet.walletAddress,
                    currentBalance: tokenObj.uiAmount, 
                    minRequired: minRequiredSOL, 
                    needed 
                });
                logger.log(`❌ Not enough SOL for swap fees`);
                logger.log(`💰 Current balance: ${tokenObj.uiAmount} SOL`);
                logger.log(`🎯 Minimum needed: ${minRequiredSOL} SOL`);
                logger.log(`📈 Please add ${needed} SOL to continue`);
                return { 
                    success: false, 
                    error: `Insufficient SOL for Jupiter swap operations. Need ${needed} SOL more`,
                    executionType: 'immediate',
                    timestamp: new Date().toISOString()
                };
            }
            
            // Execute swap
            updateStatus('swapping', `Executing swap: ${amount} ${fromToken} → ${toToken}`, null, { 
                ownerAddress,
                walletAddress: wallet.walletAddress,
                amount, fromToken, toToken, 
                slippage: '1.5%', 
                priorityFee: 'auto' 
            });
            logger.log(`🚀 Executing swap: ${amount} ${fromToken} → ${toToken}`);
            logger.log('⚙️  Using 1.5% slippage tolerance with auto priority fees');
            
            const swapOptions = {
                slippageBps: 150, // 1.5% slippage tolerance
                priorityFee: 'auto',
                maxRetries: 2,
                confirmTransaction: true
            };
            
            const swapResult = await swap(wallet.walletId, fromToken, toToken, amount, wallet.walletAddress, swapOptions);
            
            if (swapResult.success) {
                updateStatus('trading_success', 'Trading execution completed successfully!', true, { 
                    ownerAddress,
                    walletAddress: wallet.walletAddress,
                    signature: swapResult.signature,
                    amount, fromToken, toToken
                });
                logger.log(`✅ Trading execution completed successfully!`);
                if (swapResult.signature) {
                    logger.log(`📋 Transaction: ${swapResult.signature}`);
                }
            } else {
                updateStatus('trading_error', 'Trading execution failed', false, { 
                    ownerAddress,
                    walletAddress: wallet.walletAddress,
                    error: swapResult.error,
                    amount, fromToken, toToken
                });
                logger.log(`❌ Trading execution failed: ${swapResult.error || 'Unknown error'}`);
            }
            
            // =============================
            // ======= TRADING EXECUTION ENDS HERE =======
            // =============================
            
            return { 
                ...swapResult,
                executionType: 'immediate',
                timestamp: new Date().toISOString()
            };
        }
        
        // Validate schedule configuration
        updateStatus('scheduling', 'Setting up scheduled execution...', null, { 
            scheduleType: scheduleOptions.type, 
            scheduleValue: scheduleOptions.value,
            ownerAddress, fromToken, toToken, amount,
            walletAddress: wallet.walletAddress
        });
        
        if (!scheduleOptions.type || !scheduleOptions.value) {
            updateStatus('scheduling_error', 'Invalid schedule configuration', false, { 
                ownerAddress,
                walletAddress: wallet.walletAddress,
                scheduleOptions,
                required: 'type and value are required'
            });
            logger.log('❌ Invalid schedule configuration');
            return { 
                success: false, 
                error: 'Schedule type and value are required'
            };
        }
        
        // Create scheduled execution
        const { scheduleId, scheduleDescription } = createScheduledExecution(
            ownerAddress, fromToken, toToken, amount, scheduleOptions
        );
        
        updateStatus('scheduled', 'Scheduled execution started', true, { 
            scheduleId,
            scheduleDescription,
            ownerAddress, fromToken, toToken, amount,
            walletAddress: wallet.walletAddress
        });
        
        logger.log(`✅ Scheduled execution started: ${scheduleDescription}`);
        
        return {
            success: true,
            executionType: 'scheduled',
            scheduleId,
            scheduleDescription,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        updateStatus('initialization_error', `Baseline function failed: ${error.message}`, false, { 
            error: error.message,
            ownerAddress, fromToken, toToken, amount,
            walletAddress: wallet ? wallet.walletAddress : 'not_initialized'
        });
        logger.error(`❌ Baseline function failed: ${error.message}`);
        
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}



// Exports
export {
    // Wallet operations
    getOrCreateWallet,
    createWallet,
    getWallet,
    getBalances,
    
    // Trading operations
    swap,
    transfer,
    checkTokenAccountExists,
    getTokenMintAddress,
    marketData,
    price,
    twitter,
    
    // Scheduling operations
    scheduleInterval,
    scheduleTimes,
    stopSchedule,
    stopAllSchedules,
    getActiveSchedules,
    
    // Logging
    logger,
    
    // Configuration
    ownerAddress
};

// export async function Function(ownerAddress, config = {}) {
//     // Auto-detect and normalize configuration
//     const defaultConfig = {
//       // Defaults aligned to the user's request
//       fromToken: 'USDC',
//       toToken: 'SOL',
//       // targetToAmount allows buying an exact amount of the destination token using a stablecoin
//       targetToAmount: 0.0001, // Buy 0.0001 SOL
//       amount: null, // If set, uses exact-in swap of fromToken amount
//       schedule: {
//         type: 'interval',
//         intervalMs: 60000, // every 1 minute
//         executeImmediately: true
//       },
//       priceMonitoring: {
//         tokenToMonitor: 'BTC',
//         targetPrice: 13500,
//         above: true
//       },
//       twitterTrigger: null,
//       executionType: undefined // auto-detect
//     };
  
//     const merged = deepMerge(defaultConfig, config || {});
//     const executionType = resolveExecutionType(merged);
  
//     updateStatus('initializing', 'Initializing Solana trading baseline function...', null, {
//       ownerAddress,
//       config: merged,
//       executionType
//     });
  
//     try {
//       // Initialize wallet
//       updateStatus('wallet_init', 'Getting or creating wallet...', null, { ownerAddress });
//       const wallet = await getOrCreateWallet(ownerAddress);
//       logger.log(`Wallet ready: ${wallet.walletAddress}`);
  
//       // Ensure minimal SOL for fees
//       await waitForBalance(wallet.walletAddress, 0.001);
  
//       // Dispatch by execution type
//       switch (executionType) {
//         case 'hybrid':
//           return await handleHybridExecution(ownerAddress, wallet, merged);
//         case 'scheduled':
//           return await handleScheduledExecution(ownerAddress, wallet, merged);
//         case 'price_monitoring':
//           return await handlePriceMonitoring(ownerAddress, wallet, merged);
//         case 'twitter_trigger':
//           return await handleTwitterTrigger(ownerAddress, wallet, merged);
//         case 'immediate':
//         default:
//           return await handleImmediateExecution(ownerAddress, wallet, merged);
//       }
//     } catch (error) {
//       updateStatus('error', `Baseline function failed: ${error.message}`, false, {
//         error: error.message,
//         stack: error.stack
//       });
//       logger.error(`Baseline function failed: ${error.message}`);
//       throw error;
//     }
//   }
  
//   /* ------------------------------------------------------
//      Hybrid Execution: Scheduled DCA + Price Condition
//   ------------------------------------------------------ */
//   async function handleHybridExecution(ownerAddress, wallet, config) {
//     const { fromToken, toToken, amount, targetToAmount, schedule, priceMonitoring } = config;
//     const intervalMs = schedule?.intervalMs || 3600000; // default 1 hour
//     const execImmediately = !!schedule?.executeImmediately;
  
//     updateStatus('scheduling', 'Setting up hybrid strategy (scheduled + price condition)...', null, {
//       schedule,
//       priceMonitoring
//     });
  
//     const description = `Every ${Math.round(intervalMs / 60000)} min: if ${priceMonitoring.tokenToMonitor} ${priceMonitoring.above ? '>' : '<'} $${priceMonitoring.targetPrice}, buy ${targetToAmount ? targetToAmount + ' ' + toToken : amount + ' ' + toToken} using ${fromToken}`;
  
//     const scheduleId = scheduleInterval(async () => {
//       try {
//         // 1) Check price condition at execution time
//         const cond = await checkPriceCondition(
//           priceMonitoring.tokenToMonitor,
//           priceMonitoring.targetPrice,
//           !!priceMonitoring.above,
//           wallet.walletAddress
//         );
  
//         if (!cond.success) {
//           logger.error(`Price check failed: ${cond.error || 'unknown error'}`);
//           return;
//         }
  
//         logger.log(`${priceMonitoring.tokenToMonitor} price: $${cond.currentPrice} | Target: $${priceMonitoring.targetPrice} | Condition: ${priceMonitoring.above ? 'above' : 'below'} | Met: ${cond.conditionMet}`);
  
//         if (!cond.conditionMet) {
//           logger.log('Condition not met. Skipping this cycle.');
//           return;
//         }
  
//         // 2) Condition met -> execute trade
//         updateStatus('executing', 'Condition met. Executing scheduled trade...', null, {
//           fromToken,
//           toToken,
//           amount,
//           targetToAmount,
//           currentPrice: cond.currentPrice
//         });
  
//         let execResult;
//         if (targetToAmount && isStable(fromToken) && toToken) {
//           execResult = await buyExactToAmountWithStable(wallet, fromToken, toToken, targetToAmount);
//         } else if (amount) {
//           execResult = await executeSimpleSwap(wallet, fromToken, toToken, amount);
//         } else {
//           logger.log('No valid trade parameters provided. Skipping.');
//           return;
//         }
  
//         if (execResult?.success) {
//           updateStatus('completed', 'Hybrid scheduled trade executed successfully', true, {
//             executionType: 'hybrid',
//             signature: execResult.signature || null,
//             details: execResult
//           });
//           logger.log(`Trade successful${execResult.signature ? `: ${execResult.signature}` : ''}`);
//         } else {
//           updateStatus('error', 'Hybrid scheduled trade failed', false, { error: execResult?.error });
//           logger.error(`Trade failed: ${execResult?.error || 'Unknown error'}`);
//         }
//       } catch (err) {
//         logger.error(`Error in hybrid scheduled execution: ${err.message}`);
//         updateStatus('error', `Hybrid execution error: ${err.message}`, false, { error: err.message });
//       }
//     }, intervalMs, execImmediately);
  
//     updateStatus('scheduled', 'Hybrid strategy active', true, {
//       scheduleId,
//       description,
//       nextExecution: new Date(Date.now() + intervalMs).toISOString()
//     });
  
//     logger.log(`Hybrid schedule started: ${description}`);
//     return {
//       success: true,
//       executionType: 'hybrid',
//       scheduleId,
//       description,
//       message: 'Hybrid (scheduled + price condition) strategy started.'
//     };
//   }
  
//   /* ------------------------------------------------------
//      Scheduled DCA Execution
//   ------------------------------------------------------ */
//   async function handleScheduledExecution(ownerAddress, wallet, config) {
//     const { fromToken, toToken, amount, targetToAmount, schedule } = config;
//     const intervalMs = schedule?.intervalMs || 86400000; // default daily
//     const execImmediately = !!schedule?.executeImmediately;
  
//     const description = `Every ${Math.round(intervalMs / 60000)} min: buy ${targetToAmount ? targetToAmount + ' ' + toToken : amount + ' ' + toToken} using ${fromToken}`;
  
//     const scheduleId = scheduleInterval(async () => {
//       try {
//         updateStatus('executing', 'Executing scheduled trade...', null, { fromToken, toToken, amount, targetToAmount });
  
//         let execResult;
//         if (targetToAmount && isStable(fromToken) && toToken) {
//           execResult = await buyExactToAmountWithStable(wallet, fromToken, toToken, targetToAmount);
//         } else if (amount) {
//           execResult = await executeSimpleSwap(wallet, fromToken, toToken, amount);
//         } else {
//           logger.log('No valid trade parameters provided. Skipping.');
//           return;
//         }
  
//         if (execResult?.success) {
//           updateStatus('completed', 'Scheduled trade executed successfully', true, {
//             executionType: 'scheduled',
//             signature: execResult.signature || null,
//             details: execResult
//           });
//           logger.log(`Scheduled trade successful${execResult.signature ? `: ${execResult.signature}` : ''}`);
//         } else {
//           updateStatus('error', 'Scheduled trade failed', false, { error: execResult?.error });
//           logger.error(`Scheduled trade failed: ${execResult?.error || 'Unknown error'}`);
//         }
//       } catch (err) {
//         logger.error(`Error in scheduled execution: ${err.message}`);
//         updateStatus('error', `Scheduled execution error: ${err.message}`, false, { error: err.message });
//       }
//     }, intervalMs, execImmediately);
  
//     updateStatus('scheduled', 'Scheduled execution active', true, {
//       scheduleId,
//       description,
//       nextExecution: new Date(Date.now() + intervalMs).toISOString()
//     });
  
//     logger.log(`Scheduled execution started: ${description}`);
//     return {
//       success: true,
//       executionType: 'scheduled',
//       scheduleId,
//       description,
//       message: `DCA bot scheduled: ${description}`
//     };
//   }
  
//   /* ------------------------------------------------------
//      Price Monitoring Execution
//   ------------------------------------------------------ */
//   async function handlePriceMonitoring(ownerAddress, wallet, config) {
//     const { fromToken, toToken, amount, priceMonitoring } = config;
//     const { tokenToMonitor, targetPrice, above } = priceMonitoring || {};
  
//     updateStatus('monitoring', 'Starting continuous price monitoring...', null, {
//       tokenToMonitor,
//       targetPrice,
//       above,
//       monitoringInterval: '60 seconds'
//     });
  
//     logger.log(`Starting price monitoring: ${tokenToMonitor} ${above ? 'above' : 'below'} $${targetPrice}`);
  
//     const interval = setInterval(async () => {
//       try {
//         const priceCheck = await checkPriceCondition(tokenToMonitor, targetPrice, above, wallet.walletAddress);
//         if (priceCheck.success && priceCheck.conditionMet) {
//           logger.log('Price condition met! Executing trade...');
//           clearInterval(interval);
  
//           updateStatus('executing', 'Price condition met, executing trade...', null, {
//             currentPrice: priceCheck.currentPrice,
//             targetPrice,
//             condition: above ? 'above' : 'below'
//           });
  
//           const execResult = await executeSimpleSwap(wallet, fromToken, toToken, amount);
  
//           if (execResult?.success) {
//             updateStatus('completed', 'Price-triggered trade completed successfully', true, {
//               executionType: 'price_triggered',
//               signature: execResult.signature || null,
//               triggerPrice: priceCheck.currentPrice,
//               completedAt: new Date().toISOString()
//             });
//             logger.log(`Trade successful${execResult.signature ? `: ${execResult.signature}` : ''}`);
//           } else {
//             updateStatus('error', 'Price-triggered trade failed', false, { error: execResult?.error });
//             logger.error(`Trade failed: ${execResult?.error || 'Unknown error'}`);
//           }
//         }
//       } catch (error) {
//         logger.error(`Error in price monitoring: ${error.message}`);
//         updateStatus('monitoring_error', `Monitoring error: ${error.message}`, false, { error: error.message });
//       }
//     }, 60000);
  
//     return {
//       success: true,
//       executionType: 'price_monitoring',
//       monitoringActive: true,
//       message: 'Continuous price monitoring started'
//     };
//   }
  
//   /* ------------------------------------------------------
//      Twitter Trigger Execution
//   ------------------------------------------------------ */
//   async function handleTwitterTrigger(ownerAddress, wallet, config) {
//     const { fromToken, toToken, amount, twitterTrigger } = config;
//     const { username, keywords = [], checkInterval = 60000 } = twitterTrigger || {};
  
//     updateStatus('twitter_monitoring', 'Starting Twitter monitoring...', null, {
//       username,
//       keywords,
//       checkInterval
//     });
  
//     logger.log(`Starting Twitter monitoring for @${username} with keywords: ${keywords.join(', ')}`);
  
//     let lastTweets = [];
//     const interval = setInterval(async () => {
//       try {
//         const twitterData = await twitter(username, lastTweets);
//         if (twitterData.hasNewTweet) {
//           const newTweet = twitterData.newTweet;
//           logger.log(`New tweet from @${username}: ${newTweet.text.substring(0, 120)}...`);
  
//           let shouldTrigger = keywords.length === 0;
//           if (keywords.length > 0) {
//             shouldTrigger = keywords.some(k => newTweet.text.toLowerCase().includes(k.toLowerCase()));
//           }
  
//           if (shouldTrigger) {
//             clearInterval(interval);
//             updateStatus('executing', 'Twitter trigger activated, executing trade...', null, {
//               tweet: newTweet.text,
//               username,
//               triggeredKeywords: keywords
//             });
  
//             const execResult = await executeSimpleSwap(wallet, fromToken, toToken, amount);
//             if (execResult?.success) {
//               updateStatus('completed', 'Twitter-triggered trade completed successfully', true, {
//                 executionType: 'twitter_triggered',
//                 signature: execResult.signature || null,
//                 triggerTweet: newTweet.text,
//                 completedAt: new Date().toISOString()
//               });
//               logger.log(`Trade successful${execResult.signature ? `: ${execResult.signature}` : ''}`);
//             } else {
//               updateStatus('error', 'Twitter-triggered trade failed', false, { error: execResult?.error });
//               logger.error(`Trade failed: ${execResult?.error || 'Unknown error'}`);
//             }
//           }
//           lastTweets = twitterData.currentTweets;
//         }
//       } catch (error) {
//         logger.error(`Error in Twitter monitoring: ${error.message}`);
//         updateStatus('twitter_error', `Twitter monitoring error: ${error.message}`, false, { error: error.message });
//       }
//     }, checkInterval);
  
//     return {
//       success: true,
//       executionType: 'twitter_trigger',
//       monitoringActive: true,
//       message: `Twitter monitoring started for @${username}`
//     };
//   }
  
//   /* ------------------------------------------------------
//      Immediate Execution
//   ------------------------------------------------------ */
//   async function handleImmediateExecution(ownerAddress, wallet, config) {
//     const { fromToken, toToken, amount, targetToAmount } = config;
  
//     updateStatus('executing', 'Executing immediate trade...', null, { fromToken, toToken, amount, targetToAmount });
//     logger.log(`Immediate trade: ${amount ? amount + ' ' + fromToken + ' -> ' + toToken : (targetToAmount + ' ' + toToken + ' using ' + fromToken)}`);
  
//     let execResult;
//     if (targetToAmount && isStable(fromToken) && toToken) {
//       execResult = await buyExactToAmountWithStable(wallet, fromToken, toToken, targetToAmount);
//     } else if (amount) {
//       execResult = await executeSimpleSwap(wallet, fromToken, toToken, amount);
//     } else {
//       return {
//         success: false,
//         executionType: 'immediate',
//         error: 'No valid trade parameters provided (' + JSON.stringify({ fromToken, toToken, amount, targetToAmount }) + ')'
//       };
//     }
  
//     if (execResult?.success) {
//       updateStatus('completed', 'Immediate trading completed successfully', true, {
//         executionType: 'immediate',
//         signature: execResult.signature || null,
//         completedAt: new Date().toISOString()
//       });
//     } else {
//       updateStatus('error', 'Immediate trade failed', false, { error: execResult?.error });
//     }
  
//     return {
//       success: !!execResult?.success,
//       executionType: 'immediate',
//       message: execResult?.success ? 'Immediate execution completed successfully' : (execResult?.error || 'Immediate execution failed'),
//       signature: execResult?.signature || null
//     };
//   }
  
//   /* ------------------------------------------------------
//      Helper Functions
//   ------------------------------------------------------ */
//   async function executeSimpleSwap(wallet, fromToken, toToken, fromAmount, options = {}) {
//     try {
//       if (!fromToken || !toToken || !fromAmount || fromAmount <= 0) {
//         return { success: false, error: 'Invalid swap parameters' };
//       }
  
//       const res = await swap(
//         wallet.walletId,
//         fromToken,
//         toToken,
//         fromAmount,
//         wallet.walletAddress,
//         {
//           slippageBps: options.slippageBps ?? 200,
//           priorityFee: options.priorityFee ?? 'auto',
//           maxRetries: options.maxRetries ?? 3,
//           confirmTransaction: options.confirmTransaction ?? true
//         }
//       );
  
//       if (res.success) {
//         logger.log(`Swap successful: ${res.signature}`);
//         return { success: true, signature: res.signature, swapResult: res.swapResult };
//       }
//       return { success: false, error: res.error || 'Swap failed' };
//     } catch (e) {
//       return { success: false, error: e.message };
//     }
//   }
  
//   async function buyExactToAmountWithStable(wallet, fromStableSymbol, toTokenSymbol, targetToAmount) {
//     try {
//       if (!isStable(fromStableSymbol)) {
//         return { success: false, error: 'fromToken must be a USD stablecoin (USDC/USDT) for exact-out approximation' };
//       }
  
//       const balances = await getBalances(wallet.walletAddress);
//       const preSol = getUiAmount(balances, toTokenSymbol);
//       const stableBal = getUiAmount(balances, fromStableSymbol);
  
//       if (stableBal <= 0) {
//         return { success: false, error: `Insufficient ${fromStableSymbol} balance` };
//       }
  
//       const toTokenPrice = await price(toTokenSymbol);
//       if (typeof toTokenPrice !== 'number' || toTokenPrice <= 0) {
//         return { success: false, error: `Unable to fetch ${toTokenSymbol} price` };
//       }
  
//       // Primary attempt
//       const primaryBuffer = 0.02; // +2% buffer
//       let requiredStable = targetToAmount * toTokenPrice * (1 + primaryBuffer);
//       if (requiredStable > stableBal) {
//         return { success: false, error: `Insufficient ${fromStableSymbol}. Required ~${requiredStable.toFixed(2)}, available ${stableBal.toFixed(2)}` };
//       }
  
//       const firstSwap = await executeSimpleSwap(wallet, fromStableSymbol, toTokenSymbol, requiredStable, { slippageBps: 200 });
//       if (!firstSwap.success) return firstSwap;
  
//       const afterFirst = await getBalances(wallet.walletAddress);
//       const acquired1 = getUiAmount(afterFirst, toTokenSymbol) - preSol;
  
//       if (acquired1 >= targetToAmount) {
//         return { success: true, signature: firstSwap.signature, acquired: acquired1, attempts: 1 };
//       }
  
//       const remaining = targetToAmount - acquired1;
//       if (remaining <= 0) {
//         return { success: true, signature: firstSwap.signature, acquired: acquired1, attempts: 1 };
//       }
  
//       const stableAfter1 = getUiAmount(afterFirst, fromStableSymbol);
//       if (stableAfter1 <= 0) {
//         return { success: true, signature: firstSwap.signature, acquired: acquired1, attempts: 1, note: 'No stable left for top-up' };
//       }
  
//       const secondaryBuffer = 0.03;
//       let requiredStable2 = remaining * toTokenPrice * (1 + secondaryBuffer);
//       if (requiredStable2 > stableAfter1) requiredStable2 = stableAfter1;
//       if (requiredStable2 <= 0.5) {
//         return { success: true, signature: firstSwap.signature, acquired: acquired1, attempts: 1, note: 'Remaining too small for top-up' };
//       }
  
//       const secondSwap = await executeSimpleSwap(wallet, fromStableSymbol, toTokenSymbol, requiredStable2, { slippageBps: 200 });
//       if (!secondSwap.success) {
//         return { success: true, partial: true, signature: firstSwap.signature, acquired: acquired1, attempts: 1, note: 'Top-up failed' };
//       }
  
//       const afterSecond = await getBalances(wallet.walletAddress);
//     const finalAcquired = getUiAmount(afterSecond, toTokenSymbol) - preSol;

//     return {
//       success: true,
//       signature: secondSwap.signature,
//       acquired: finalAcquired,
//       attempts: 2
//     };
//   } catch (e) {
//     return { success: false, error: e.message };
//   }
// }

// /* ------------------------------------------------------
//    Utilities
// ------------------------------------------------------ */
// function isStable(symbol) {
//   return ['USDC', 'USDT'].includes(symbol?.toUpperCase());
// }

// function getUiAmount(balances, symbol) {
//   if (!balances || !symbol) return 0;
//   console.log(balances, symbol);
//   const entry = balances.allBalances.find(b => b.symbol?.toUpperCase() === symbol.toUpperCase());
//   return entry?.uiAmount || 0;
// }

// function deepMerge(target, source) {
//   if (!source) return target;
//   const output = { ...target };
//   for (const key of Object.keys(source)) {
//     if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
//       output[key] = deepMerge(target[key] || {}, source[key]);
//     } else {
//       output[key] = source[key];
//     }
//   }
//   return output;
// }

// function resolveExecutionType(config) {
//   const hasSchedule = !!config.schedule;
//   const hasPrice = !!config.priceMonitoring;
//   const hasTwitter = !!config.twitterTrigger;

//   if (hasSchedule && hasPrice) return 'hybrid';
//   if (hasSchedule) return 'scheduled';
//   if (hasPrice) return 'price_monitoring';
//   if (hasTwitter) return 'twitter_trigger';
//   return 'immediate';
// }
  
// // baselineFunction('5NGqPDeoEfpxwq8bKHkMaSyLXDeR7YmsxSyMbXA5yKSQ');