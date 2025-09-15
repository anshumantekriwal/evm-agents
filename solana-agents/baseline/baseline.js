import dotenv from "dotenv";
import { 
    getOrCreateWallet, 
    getBalances, 
    checkTokenAccountExists, 
    getTokenMintAddress,
    transfer,
    createWallet,
    getWallet
} from './wallet.js';
import { 
    executeSwapJupiter, 
    swap, 
    marketData, 
    price, 
    twitter 
} from './trading.js';
import { 
    parseScheduleConfig, 
    startScheduledExecution, 
    stopScheduledExecution, 
    stopAllSchedules, 
    getScheduleStatus, 
    displayScheduleStatus, 
    getSchedulingInput 
} from './scheduler.js';
import { logger, createLogServer } from './logger.js';

dotenv.config();

// =============================
// ======= Configuration =======
// =============================

const ownerAddress = "5NGqPDeoEfpxwq8bKHkMaSyLXDeR7YmsxSyMbXA5yKSQ";

// =============================
// ======= Core Baseline Function =======
// =============================

/**
 * Core baseline function that executes the trading logic
 * This is the internal function that performs the actual swap
 */
async function baselineFunctionCore(ownerAddress, fromToken, toToken, amount) {
    logger.log(`🔄 Starting swap: ${amount} ${fromToken} → ${toToken}`);
    
    // Wallet Creation
    const wallet = await getOrCreateWallet(ownerAddress);
    logger.log(`💼 Wallet loaded: ${wallet.walletAddress.slice(0, 8)}...${wallet.walletAddress.slice(-8)}`);
    
    // Get Balances
    logger.log('📊 Checking wallet balances...');
    const balances = await getBalances(wallet.walletAddress);
    logger.log(`💰 Found ${balances.allBalances.length} tokens in wallet`);
    
    // Check if fromToken exists and get balance in one pass
    const fromTokenUpper = fromToken.toUpperCase();
    const tokenObj = balances.allBalances.find(
        token => token.symbol && token.symbol.toUpperCase() === fromTokenUpper
    );

    if (!tokenObj) {
        logger.log(`❌ No ${fromToken} found in wallet`);
        return { success: false, error: `Wallet does not have ${fromToken}` };
    } else if (tokenObj.uiAmount >= amount) {
        logger.log(`✅ Sufficient ${fromToken} balance: ${tokenObj.uiAmount} (need: ${amount})`);

        logger.log(`🔍 Looking up ${toToken} token address...`);
        const toTokenResult = await getTokenMintAddress(toToken);
        
        if (!toTokenResult.success) {
            logger.log(`❌ Could not find ${toToken} token: ${toTokenResult.error}`);
            return { success: false, error: `Failed to get mint address for ${toToken}: ${toTokenResult.error}` };
        }
        
        const toTokenMintAddress = toTokenResult.mintAddress;
        logger.log(`✅ ${toToken} token found`);

        // Check if destination token account exists (affects rent requirements)
        logger.log(`🔍 Checking if you have a ${toToken} account...`);
        const accountExists = await checkTokenAccountExists(wallet.walletAddress, toTokenMintAddress);
        if (accountExists) {
            logger.log(`✅ ${toToken} account ready`);
        } else {
            logger.log(`⚠️  First ${toToken} transaction - account will be created`);
        }
        
        // Check SOL requirements (even if account exists, Jupiter may need wSOL account)
        const minRequiredSOL = 0.0021; // Minimum for any Jupiter swap (2.1 mSOL)
        if (fromTokenUpper === 'SOL' && tokenObj.uiAmount < minRequiredSOL) {
            logger.log(`❌ Not enough SOL for swap fees`);
            logger.log(`💰 Current balance: ${tokenObj.uiAmount} SOL`);
            logger.log(`🎯 Minimum needed: ${minRequiredSOL} SOL`);
            logger.log(`📈 Please add ${(minRequiredSOL - tokenObj.uiAmount).toFixed(6)} SOL to continue`);
            return { success: false, error: `Insufficient SOL for Jupiter swap operations. Need ${(minRequiredSOL - tokenObj.uiAmount).toFixed(6)} SOL more` };
        }
        
        // Execute optimized Jupiter swap with custom options
        logger.log(`🚀 Executing swap: ${amount} ${fromToken} → ${toToken}`);
        logger.log('⚙️  Using 1.5% slippage tolerance with auto priority fees');
        const swapOptions = {
            slippageBps: 150, // 1.5% slippage tolerance
            priorityFee: 'auto',
            maxRetries: 2,
            confirmTransaction: true
        };
        const swapResult = await executeSwapJupiter(wallet.walletId, fromToken, toToken, amount, wallet.walletAddress, swapOptions);
        
        if (swapResult.success) {
            logger.log(`✅ Swap completed successfully!`);
            if (swapResult.signature) {
                logger.log(`📋 Transaction: ${swapResult.signature}`);
            }
        } else {
            logger.log(`❌ Swap failed: ${swapResult.error || 'Unknown error'}`);
        }
        return swapResult;
    } else {
        const errorMsg = `Insufficient ${fromToken} balance. Available: ${tokenObj.uiAmount}, required: ${amount}`;
        logger.log(`❌ ${errorMsg}`);
        return { success: false, error: errorMsg };
    }
}

/**
 * Enhanced baseline function with optional scheduling support
 * @param {string} ownerAddress - Wallet owner address
 * @param {string} fromToken - Source token symbol
 * @param {string} toToken - Destination token symbol
 * @param {number} amount - Amount to swap
 * @param {Object} scheduleOptions - Optional scheduling configuration
 * @returns {Object} Execution result with schedule info if applicable
 */
export async function baselineFunction(ownerAddress, fromToken, toToken, amount, scheduleOptions = null) {
    // If no scheduling options, execute immediately (backward compatibility)
    if (!scheduleOptions) {
        logger.log('🚀 Executing swap immediately...');
        const result = await baselineFunctionCore(ownerAddress, fromToken, toToken, amount);
        return { 
            ...result,
            executionType: 'immediate',
            timestamp: new Date().toISOString()
        };
    }
    
    // Parse and validate schedule configuration
    const scheduleConfig = parseScheduleConfig(scheduleOptions.type, scheduleOptions.value);
    
    if (!scheduleConfig.isValid) {
        logger.log('❌ Invalid schedule format');
        logger.log('📝 Valid examples:');
        logger.log('   Intervals: "30m", "1h", "2h30m", "45s"');
        logger.log('   Times: "09:30", "14:00,18:30", "9:30 AM,2:30 PM"');
        return { 
            success: false, 
            error: 'Invalid schedule configuration',
            examples: {
                interval: ['30m', '1h', '2h30m', '45s'],
                times: ['09:30', '14:00,18:30', '9:30 AM,2:30 PM']
            }
        };
    }
    
    // Start scheduled execution
    const scheduleId = startScheduledExecution(
        { ownerAddress, fromToken, toToken, amount },
        scheduleConfig,
        baselineFunctionCore
    );
    
    return {
        success: true,
        executionType: 'scheduled',
        scheduleId,
        scheduleDescription: scheduleConfig.description,
        timestamp: new Date().toISOString()
    };
}

// =============================
// ======= Withdraw Function =======
// =============================

/**
 * Withdraw funds from the wallet to any given address
 * @param {string} ownerAddress - Wallet owner address
 * @param {string} tokenSymbol - Token symbol to withdraw (e.g., 'SOL', 'USDC')
 * @param {string} destinationAddress - Address to send funds to
 * @param {number} amount - Amount to withdraw
 * @returns {Object} Withdrawal result
 */
async function withdrawFunds(ownerAddress, tokenSymbol, destinationAddress, amount) {
    try {
        logger.log(`💸 Starting withdrawal: ${amount} ${tokenSymbol} → ${destinationAddress.slice(0, 8)}...${destinationAddress.slice(-8)}`);
        
        // Validate destination address format (basic check)
        if (!destinationAddress || destinationAddress.length < 32) {
            const error = 'Invalid destination address format';
            logger.error(`❌ ${error}`);
            return { success: false, error };
        }
        
        // Get wallet
        const wallet = await getOrCreateWallet(ownerAddress);
        logger.log(`💼 Source wallet: ${wallet.walletAddress.slice(0, 8)}...${wallet.walletAddress.slice(-8)}`);
        
        // Check balances
        logger.log('📊 Checking wallet balances...');
        const balances = await getBalances(wallet.walletAddress);
        logger.log(`💰 Found ${balances.allBalances.length} tokens in wallet`);
        
        // Find the token to withdraw
        const tokenUpper = tokenSymbol.toUpperCase();
        const tokenObj = balances.allBalances.find(
            token => token.symbol && token.symbol.toUpperCase() === tokenUpper
        );
        
        if (!tokenObj) {
            const error = `Token ${tokenSymbol} not found in wallet`;
            logger.error(`❌ ${error}`);
            return { success: false, error };
        }
        
        if (tokenObj.uiAmount < amount) {
            const error = `Insufficient ${tokenSymbol} balance. Available: ${tokenObj.uiAmount}, requested: ${amount}`;
            logger.error(`❌ ${error}`);
            return { success: false, error };
        }
        
        logger.log(`✅ Sufficient ${tokenSymbol} balance: ${tokenObj.uiAmount} (withdrawing: ${amount})`);
        
        // For SOL, check minimum balance requirements
        if (tokenUpper === 'SOL') {
            const minRequiredSOL = 0.001; // Keep minimum for rent
            const remainingBalance = tokenObj.uiAmount - amount;
            if (remainingBalance < minRequiredSOL) {
                const maxWithdrawable = tokenObj.uiAmount - minRequiredSOL;
                logger.warn(`⚠️  Warning: Leaving less than ${minRequiredSOL} SOL may affect account operations`);
                logger.log(`💡 Maximum safe withdrawal: ${maxWithdrawable.toFixed(6)} SOL`);
            }
        }
        
        // Execute transfer
        logger.log(`🚀 Executing transfer: ${amount} ${tokenSymbol} to ${destinationAddress.slice(0, 8)}...${destinationAddress.slice(-8)}`);
        
        const transferResult = await transfer(
            wallet.walletId,
            destinationAddress,
            amount,
            wallet.walletAddress
        );
        
        if (transferResult.success) {
            logger.log(`✅ Withdrawal completed successfully!`);
            if (transferResult.signature) {
                logger.log(`📋 Transaction signature: ${transferResult.signature}`);
            }
            
            return {
                success: true,
                signature: transferResult.signature,
                amount,
                token: tokenSymbol,
                from: wallet.walletAddress,
                to: destinationAddress,
                timestamp: new Date().toISOString()
            };
        } else {
            const error = `Transfer failed: ${transferResult.error || 'Unknown error'}`;
            logger.error(`❌ ${error}`);
            return { success: false, error };
        }
        
    } catch (error) {
        const errorMsg = `Withdrawal error: ${error.message}`;
        logger.error(`❌ ${errorMsg}`);
        return { success: false, error: errorMsg };
    }
}

/**
 * Withdraw all available funds of a specific token
 * @param {string} ownerAddress - Wallet owner address  
 * @param {string} tokenSymbol - Token symbol to withdraw completely
 * @param {string} destinationAddress - Address to send funds to
 * @returns {Object} Withdrawal result
 */
async function withdrawAllFunds(ownerAddress, tokenSymbol, destinationAddress) {
    try {
        logger.log(`💸 Starting complete withdrawal of ${tokenSymbol} → ${destinationAddress.slice(0, 8)}...${destinationAddress.slice(-8)}`);
        
        // Get wallet and balances
        const wallet = await getOrCreateWallet(ownerAddress);
        const balances = await getBalances(wallet.walletAddress);
        
        // Find the token
        const tokenUpper = tokenSymbol.toUpperCase();
        const tokenObj = balances.allBalances.find(
            token => token.symbol && token.symbol.toUpperCase() === tokenUpper
        );
        
        if (!tokenObj) {
            const error = `Token ${tokenSymbol} not found in wallet`;
            logger.error(`❌ ${error}`);
            return { success: false, error };
        }
        
        let withdrawAmount = tokenObj.uiAmount;
        
        // For SOL, leave minimum for rent
        if (tokenUpper === 'SOL') {
            const minRequiredSOL = 0.001;
            withdrawAmount = Math.max(0, tokenObj.uiAmount - minRequiredSOL);
            
            if (withdrawAmount <= 0) {
                const error = `Cannot withdraw SOL: need to keep minimum ${minRequiredSOL} SOL for rent`;
                logger.error(`❌ ${error}`);
                return { success: false, error };
            }
            
            logger.log(`💡 Withdrawing ${withdrawAmount.toFixed(6)} SOL (keeping ${minRequiredSOL} SOL for rent)`);
        }
        
        // Use the regular withdraw function
        return await withdrawFunds(ownerAddress, tokenSymbol, destinationAddress, withdrawAmount);
        
    } catch (error) {
        const errorMsg = `Complete withdrawal error: ${error.message}`;
        logger.error(`❌ ${errorMsg}`);
        return { success: false, error: errorMsg };
    }
}

// =============================
// ======= Server Setup =======
// =============================

// Start the log server with withdraw functionality
const LOG_SERVER_PORT = process.env.LOG_SERVER_PORT || 3000;
createLogServer(LOG_SERVER_PORT, {
    withdrawFunds,
    withdrawAllFunds,
    ownerAddress
});

// =============================
// ======= Example Usage =======
// =============================

baselineFunction(ownerAddress, 'USDC', 'SOL', 0.01, {
    type: 'interval',
    value: '30m'
  });
// Example 1: Execute immediately (original behavior)
// logger.log('🚀 Example 1: Immediate execution');
// baselineFunction(ownerAddress, 'USDC', 'SOL', 0.01);

// Example 2: Schedule every 30 minutes (with proper rate limiting)
// logger.log('\n🕐 Example 2: Scheduled execution every 30 minutes');

// Example 3: Schedule at specific times
// logger.log('\n⏰ Example 3: Scheduled execution at specific times');
// baselineFunction(ownerAddress, 'USDC', 'SOL', 0.01, {
//   type: 'times',
//   value: '09:30,15:30,21:00'
// });

// Example 4: Schedule with AM/PM format
// logger.log('\n🌅 Example 4: Scheduled execution with AM/PM times');
// baselineFunction(ownerAddress, 'USDC', 'SOL', 0.01, {
//   type: 'times',
//   value: '9:30 AM,3:30 PM,9:00 PM'
// });

// Uncomment one of the examples above to test
// For now, run immediate execution
// baselineFunction(ownerAddress, 'USDC', 'SOL', 0.01);

// =============================
// ======= Exports =======
// =============================

// Export all functions for external use
export {
    // Core function
    baselineFunctionCore,
    
    // Wallet operations
    getOrCreateWallet,
    createWallet,
    getWallet,
    getBalances,
    transfer,
    checkTokenAccountExists,
    getTokenMintAddress,
    
    // Trading operations
    executeSwapJupiter,
    swap,
    marketData,
    price,
    twitter,
    
    // Scheduling operations
    parseScheduleConfig,
    startScheduledExecution,
    stopScheduledExecution,
    stopAllSchedules,
    getScheduleStatus,
    displayScheduleStatus,
    getSchedulingInput,
    
    // Logging and server
    logger,
    createLogServer,
    
    // Withdrawal functions
    withdrawFunds,
    withdrawAllFunds,
    ownerAddress
};
