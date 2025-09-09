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
    // Wallet Creation
    const wallet = await getOrCreateWallet(ownerAddress);
    console.log(wallet);
    
    // Get Balances
    const balances = await getBalances(wallet.walletAddress);
    console.log(balances);
    
    // Check if fromToken exists and get balance in one pass
    const fromTokenUpper = fromToken.toUpperCase();
    const tokenObj = balances.allBalances.find(
        token => token.symbol && token.symbol.toUpperCase() === fromTokenUpper
    );

    if (!tokenObj) {
        console.log(`Wallet does not have ${fromToken}`);
        return { success: false, error: `Wallet does not have ${fromToken}` };
    } else if (tokenObj.uiAmount >= amount) {
        console.log(`Sufficient ${fromToken} balance: ${tokenObj.uiAmount} (required: ${amount})`);

        const toTokenResult = await getTokenMintAddress(toToken);
        console.log('Token mint address result:', toTokenResult);
        
        if (!toTokenResult.success) {
            console.log(`Failed to get mint address for ${toToken}: ${toTokenResult.error}`);
            return { success: false, error: `Failed to get mint address for ${toToken}: ${toTokenResult.error}` };
        }
        
        const toTokenMintAddress = toTokenResult.mintAddress;
        console.log('To token mint address:', toTokenMintAddress);

        // Check if destination token account exists (affects rent requirements)
        const accountExists = await checkTokenAccountExists(wallet.walletAddress, toTokenMintAddress);
        console.log(`${toToken} account exists: ${accountExists}`);
        
        // Check SOL requirements (even if account exists, Jupiter may need wSOL account)
        const minRequiredSOL = 0.0021; // Minimum for any Jupiter swap (2.1 mSOL)
        if (fromTokenUpper === 'SOL' && tokenObj.uiAmount < minRequiredSOL) {
            console.log(`❌ Insufficient SOL for Jupiter swap operations`);
            console.log(`💰 Current: ${tokenObj.uiAmount} SOL`);
            console.log(`🎯 Required: ~${minRequiredSOL} SOL (for fees + potential wSOL account)`);
            console.log(`📈 Need: ${(minRequiredSOL - tokenObj.uiAmount).toFixed(6)} SOL more`);
            return { success: false, error: `Insufficient SOL for Jupiter swap operations. Need ${(minRequiredSOL - tokenObj.uiAmount).toFixed(6)} SOL more` };
        }
        
        if (!accountExists) {
            console.log(`⚠️  Note: First-time ${toToken} swap, account will be created`);
        }

        // Execute optimized Jupiter swap with custom options
        console.log('Proceeding to execute optimized Jupiter swap...');
        const swapOptions = {
            slippageBps: 150, // 1.5% slippage tolerance
            priorityFee: 'auto',
            maxRetries: 2,
            confirmTransaction: true
        };
        const swapResult = await executeSwapJupiter(wallet.walletId, fromToken, toToken, amount, wallet.walletAddress, swapOptions);
        console.log('Optimized Jupiter swap result:', swapResult);
        return swapResult;
    } else {
        const errorMsg = `Insufficient ${fromToken} balance. Available: ${tokenObj.uiAmount}, required: ${amount}`;
        console.log(errorMsg);
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
        console.log('🚀 Executing baseline function immediately...');
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
        console.error('❌ Invalid schedule configuration');
        console.log('📝 Examples:');
        console.log('  Interval: "30m", "1h", "2h30m", "45s"');
        console.log('  Times: "09:30", "14:00,18:30", "9:30 AM,2:30 PM"');
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
// ======= Example Usage =======
// =============================

// Example 1: Execute immediately (original behavior)
// console.log('🚀 Example 1: Immediate execution');
// baselineFunction(ownerAddress, 'USDC', 'SOL', 0.01);

// Example 2: Schedule every 30 minutes
// console.log('\n🕐 Example 2: Scheduled execution every 30 minutes');
baselineFunction(ownerAddress, 'USDC', 'SOL', 0.01, {
  type: 'interval',
  value: '2m'
});

// Example 3: Schedule at specific times
// console.log('\n⏰ Example 3: Scheduled execution at specific times');
// baselineFunction(ownerAddress, 'USDC', 'SOL', 0.01, {
//   type: 'times',
//   value: '09:30,15:30,21:00'
// });

// Example 4: Schedule with AM/PM format
// console.log('\n🌅 Example 4: Scheduled execution with AM/PM times');
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
    ownerAddress
};
