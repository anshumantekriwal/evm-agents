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
import { logger, updateStatus } from './logger.js';

dotenv.config();

// Configuration
const ownerAddress = "5NGqPDeoEfpxwq8bKHkMaSyLXDeR7YmsxSyMbXA5yKSQ";

// =============================
// ======= PRICE MONITORING =======
// =============================

/**
 * Check if the monitored token price meets the specified condition
 * @param {string} tokenToMonitor - Token symbol to monitor
 * @param {number} targetPrice - Target price to compare against
 * @param {boolean} above - True for above condition, false for below
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
            logger.log(`⏳ Price threshold not reached: ${tokenToMonitor} $${currentPrice} (target: ${conditionText} $${targetPrice})`);
        }
        
        return {
            success: true,
            currentPrice,
            targetPrice,
            conditionMet,
            condition: conditionText
        };
        
    } catch (error) {
        updateStatus('price_check_error', `Error checking price condition: ${error.message}`, false, { 
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

/**
 * Wait for price condition to be met with 30-second intervals
 * @param {string} tokenToMonitor - Token symbol to monitor
 * @param {number} targetPrice - Target price to compare against
 * @param {boolean} above - True for above condition, false for below
 * @param {number} maxWaitTime - Maximum time to wait in milliseconds (default: 24 hours)
 * @returns {Object} Final price check result
 */
async function waitForPriceCondition(tokenToMonitor, targetPrice, above, maxWaitTime = 24 * 60 * 60 * 1000, walletAddress = null) {
    const startTime = Date.now();
    const checkInterval = 30000; // 30 seconds
    
    updateStatus('price_monitoring_start', `Starting price monitoring for ${tokenToMonitor}`, null, { 
        tokenToMonitor, 
        targetPrice, 
        condition: above ? 'above' : 'below',
        checkInterval: '30 seconds',
        maxWaitTime: `${maxWaitTime / (60 * 60 * 1000)} hours`,
        walletAddress
    });
    
    logger.log(`🎯 Starting price monitoring: ${tokenToMonitor} ${above ? 'above' : 'below'} $${targetPrice}`);
    logger.log(`⏰ Checking every 30 seconds...`);
    
    while (Date.now() - startTime < maxWaitTime) {
        const priceCheck = await checkPriceCondition(tokenToMonitor, targetPrice, above, walletAddress);
        
        if (!priceCheck.success) {
            // If there's an error getting price, wait and retry
            logger.log(`⚠️  Price check failed, retrying in 30 seconds...`);
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            continue;
        }
        
        if (priceCheck.conditionMet) {
            updateStatus('price_condition_achieved', `Price condition achieved after monitoring`, true, { 
                tokenToMonitor, 
                finalPrice: priceCheck.currentPrice,
                targetPrice,
                condition: priceCheck.condition,
                monitoringDuration: `${Math.round((Date.now() - startTime) / 1000)} seconds`,
                walletAddress
            });
            logger.log(`🎉 Price condition achieved! Proceeding with trade execution...`);
            return priceCheck;
        }
        
        // Wait 30 seconds before next check
        await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    // Timeout reached
    updateStatus('price_monitoring_timeout', `Price monitoring timeout reached`, false, { 
        tokenToMonitor, 
        targetPrice,
        condition: above ? 'above' : 'below',
        maxWaitTime: `${maxWaitTime / (60 * 60 * 1000)} hours`,
        walletAddress
    });
    logger.log(`⏰ Price monitoring timeout reached after ${maxWaitTime / (60 * 60 * 1000)} hours`);
    
    return {
        success: true,
        conditionMet: false,
        timeout: true,
        error: 'Price monitoring timeout reached'
    };
}

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


// =============================
// ======= MAIN BASELINE FUNCTION =======
// =============================

/**
 * Main baseline function - generalized trading function with price monitoring (runs every 30 seconds)
 * @param {string} ownerAddress - Wallet owner address
 * @param {string} fromToken - Source token symbol
 * @param {string} toToken - Destination token symbol
 * @param {number} amount - Amount to swap
 * @param {string} tokenToMonitor - Optional token symbol to monitor price for
 * @param {number} tokenToMonitorPrice - Optional target price to monitor
 * @param {boolean} above - Optional boolean: true for above price, false for below price
 * @returns {Object} Execution result
 */
export async function baselineFunction(ownerAddress, fromToken, toToken, amount, tokenToMonitor = null, tokenToMonitorPrice = null, above = true) {
    // Initialize with wallet creation/loading
    updateStatus('initializing', 'Initializing baseline function...', null, { 
        ownerAddress, fromToken, toToken, amount,
        executionType: 'continuous_monitoring',
        priceMonitoring: tokenToMonitor ? { tokenToMonitor, tokenToMonitorPrice, above } : null
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
        
        // Start continuous monitoring with 30-second intervals
        updateStatus('continuous_monitoring_start', 'Starting continuous price monitoring and trading...', null, { 
            ownerAddress, fromToken, toToken, amount,
            walletAddress: wallet.walletAddress,
            priceMonitoring: tokenToMonitor ? { tokenToMonitor, tokenToMonitorPrice, above } : null,
            interval: '30 seconds'
        });
        logger.log('🔄 Starting continuous monitoring with 30-second intervals...');
        
        // Create the trading execution function
        const executeTrading = async () => {
            try {
                // =============================
                // ======= TRADING EXECUTION STARTS HERE =======
                // =============================

                updateStatus('execution_start', `Starting trading execution: ${amount} ${fromToken} → ${toToken}`, null, { 
                    fromToken, toToken, amount, ownerAddress,
                    walletAddress: wallet.walletAddress,
                    priceMonitoring: tokenToMonitor ? { tokenToMonitor, tokenToMonitorPrice, above } : null
                });
                
                // Check price condition if monitoring is enabled
                if (tokenToMonitor && tokenToMonitorPrice !== null) {
                    logger.log(`🎯 Checking ${tokenToMonitor} price condition...`);
                    
                    const priceCheck = await checkPriceCondition(tokenToMonitor, tokenToMonitorPrice, above, wallet.walletAddress);
                    
                    if (!priceCheck.success) {
                        logger.log(`⚠️  Price check failed: ${priceCheck.error}`);
                        return { success: false, skipped: true, reason: `Price check failed: ${priceCheck.error}` };
                    }
                    
                    if (!priceCheck.conditionMet) {
                        logger.log(`⏳ Price threshold not reached: ${tokenToMonitor} $${priceCheck.currentPrice} (target: ${priceCheck.condition} $${priceCheck.targetPrice})`);
                        return { 
                            success: false, 
                            skipped: true, 
                            reason: 'Desired price threshold not reached',
                            priceInfo: {
                                tokenToMonitor,
                                currentPrice: priceCheck.currentPrice,
                                targetPrice: tokenToMonitorPrice,
                                condition: above ? 'above' : 'below'
                            }
                        };
                    }
                    
                    logger.log(`✅ Price condition satisfied, proceeding with trade execution...`);
                }
                
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
                        error: `Wallet does not have ${fromToken}`
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
                        error: errorMsg
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
                        error: `Failed to get mint address for ${toToken}: ${toTokenResult.error}`
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
                        error: `Insufficient SOL for Jupiter swap operations. Need ${needed} SOL more`
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
                
                return swapResult;
                
            } catch (error) {
                logger.error(`❌ Trading execution error: ${error.message}`);
                return { success: false, error: error.message };
            }
        };
        
        // Start the continuous monitoring loop
        const monitoringInterval = setInterval(async () => {
            try {
                const result = await executeTrading();
                if (result.skipped) {
                    // Just log the skip, don't stop the monitoring
                    logger.log(`⏭️  Execution cycle skipped: ${result.reason}`);
                } else if (result.success) {
                    logger.log(`🎉 Trading cycle completed successfully!`);
                } else {
                    logger.log(`⚠️  Trading cycle failed: ${result.error}`);
                }
            } catch (error) {
                logger.error(`❌ Monitoring cycle error: ${error.message}`);
            }
        }, 30000); // 30 seconds
        
        // Execute immediately on start
        logger.log('🚀 Executing initial trading cycle...');
        const initialResult = await executeTrading();
        
        updateStatus('continuous_monitoring_active', 'Continuous monitoring active (30-second intervals)', true, { 
            ownerAddress, fromToken, toToken, amount,
            walletAddress: wallet.walletAddress,
            priceMonitoring: tokenToMonitor ? { tokenToMonitor, tokenToMonitorPrice, above } : null,
            interval: '30 seconds',
            initialExecution: initialResult
        });
        
        logger.log('✅ Continuous monitoring started - checking every 30 seconds');
        logger.log('🛑 To stop monitoring, use stopAllSchedules() or terminate the process');
        
        return {
            success: true,
            executionType: 'continuous_monitoring',
            interval: '30 seconds',
            initialExecution: initialResult,
            monitoringInterval,
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

// // Will check SOL price every 30 seconds and only execute trade if SOL > $100
// await baselineFunction(
//     ownerAddress, 
//     "USDC", 
//     "SOL", 
//     0.001,
//     "SOL",    // monitor SOL price
//     100,      // target price $100
//     true      // above condition
// );

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
    
    // Price monitoring operations
    checkPriceCondition,
    waitForPriceCondition,
    
    // Logging
    logger, 
    
    // Configuration
    ownerAddress
};