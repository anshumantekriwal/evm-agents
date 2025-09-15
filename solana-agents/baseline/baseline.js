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
        logger.log(`💼 Wallet initialized: ${wallet.walletAddress.slice(0, 8)}...${wallet.walletAddress.slice(-8)}`);
        
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
                fromToken, toToken, amount, ownerAddress 
            });
            
            // Wait for minimum balance
            await waitForBalance(wallet.walletAddress, 0.001);
            
            // Get current balances for trading
            updateStatus('trading_balance_check', 'Checking trading balances...', null, { 
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
            updateStatus('token_lookup', `Looking up ${toToken} token address...`, null, { toToken });
            logger.log(`🔍 Looking up ${toToken} token address...`);
            const toTokenResult = await getTokenMintAddress(toToken);
            
            if (!toTokenResult.success) {
                updateStatus('trading_error', `Could not find ${toToken} token`, false, { 
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
                    signature: swapResult.signature,
                    amount, fromToken, toToken
                });
                logger.log(`✅ Trading execution completed successfully!`);
                if (swapResult.signature) {
                    logger.log(`📋 Transaction: ${swapResult.signature}`);
                }
            } else {
                updateStatus('trading_error', 'Trading execution failed', false, { 
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
            ownerAddress, fromToken, toToken, amount
        });
        
        if (!scheduleOptions.type || !scheduleOptions.value) {
            updateStatus('scheduling_error', 'Invalid schedule configuration', false, { 
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
            ownerAddress, fromToken, toToken, amount
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