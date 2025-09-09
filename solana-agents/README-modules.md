# 📁 Solana Agents - Modular Structure

The `baseline.js` file has been successfully split into 4 modular files for better maintainability and organization.

## 🗂️ File Structure

### 1. **`wallet.js`** - Wallet & Balance Operations
- **Purpose**: Handles all wallet-related operations and token management
- **Key Functions**:
  - `createWallet()` - Create new Privy wallet
  - `getWallet()` - Retrieve existing wallet
  - `getOrCreateWallet()` - Smart wallet creation/retrieval
  - `getBalances()` - Fetch all token balances
  - `transfer()` - SOL transfer operations
  - `getTokenMetadata()` - Token information lookup
  - `checkTokenAccountExists()` - Account existence verification
  - `getTokenMintAddress()` - Token mint address resolution
  - `getJupiterTokens()` - Cached Jupiter token list

### 2. **`trading.js`** - Trading & Market Operations
- **Purpose**: Handles all trading, swapping, and market data operations
- **Key Functions**:
  - `executeSwapJupiter()` - Optimized Jupiter swap execution
  - `swap()` - Basic swap quote functionality
  - `marketData()` - Fetch market data from Mobula API
  - `price()` - Get token price information
  - `twitter()` - Twitter data fetching and monitoring

### 3. **`scheduler.js`** - Scheduling System
- **Purpose**: Manages all scheduling functionality for automated execution
- **Key Functions**:
  - `parseScheduleConfig()` - Parse user schedule input
  - `startScheduledExecution()` - Start scheduled operations
  - `stopScheduledExecution()` - Stop specific schedule
  - `stopAllSchedules()` - Stop all active schedules
  - `getScheduleStatus()` - Get schedule status information
  - `displayScheduleStatus()` - Pretty-print schedule status
  - `getSchedulingInput()` - Interactive schedule configuration

### 4. **`baseline.js`** - Main Orchestration
- **Purpose**: Main entry point that imports and orchestrates all modules
- **Key Functions**:
  - `baselineFunction()` - Enhanced main function with scheduling support
  - `baselineFunctionCore()` - Core trading logic execution
  - Re-exports all functions from other modules

## 🚀 Usage Examples

### Import Individual Modules
```javascript
import { getBalances, createWallet } from './wallet.js';
import { executeSwapJupiter, price } from './trading.js';
import { startScheduledExecution } from './scheduler.js';
```

### Import Main Module (Recommended)
```javascript
import { baselineFunction, getBalances, executeSwapJupiter } from './baseline.js';

// Immediate execution
await baselineFunction(ownerAddress, 'USDC', 'SOL', 0.01);

// Scheduled execution
await baselineFunction(ownerAddress, 'USDC', 'SOL', 0.01, {
  type: 'interval',
  value: '30m'
});
```

### CommonJS Compatibility
```javascript
const { baselineFunction, getBalances } = require('./baseline.js');
```

## 🔧 Configuration

- **Environment Variables**: Same as before (`.env` file)
- **ES Modules**: Already configured in `package.json` with `"type": "module"`
- **Dependencies**: No changes to existing dependencies

## 📊 Benefits of Modular Structure

1. **🧩 Separation of Concerns**: Each module has a specific responsibility
2. **🔄 Reusability**: Functions can be imported individually as needed
3. **🛠️ Maintainability**: Easier to debug and modify specific functionality
4. **📈 Scalability**: Easy to add new features to specific modules
5. **🧪 Testability**: Individual modules can be tested in isolation
6. **📚 Documentation**: Clearer code organization and documentation

## 🔄 Migration Notes

- **Backward Compatibility**: The main `baselineFunction()` works exactly as before
- **Original File**: Backed up as `baseline-original.js`
- **No Breaking Changes**: All existing functionality preserved
- **Enhanced Features**: Same scheduling capabilities, now better organized

## 🎯 Module Dependencies

```
baseline.js (main)
├── wallet.js (wallet operations)
├── trading.js (trading operations)
└── scheduler.js (scheduling system)
```

## 🚀 Getting Started

1. **Use as before**: `node baseline.js` (no changes needed)
2. **Import specific modules**: Use ES6 imports for specific functionality
3. **Schedule operations**: Use the enhanced scheduling features
4. **Monitor schedules**: Use `displayScheduleStatus()` to track active schedules

The modular structure maintains full backward compatibility while providing better organization and enhanced functionality!
