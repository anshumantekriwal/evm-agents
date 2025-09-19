# 🤖 Solana Trading Agents

A comprehensive suite of Solana trading agents with automated swaps, price monitoring, scheduled execution, real-time monitoring, and status tracking via web interface.

## 🎯 Bot Types

### 📈 **DCA Bot** (`baseline-dca.js`)
Dollar Cost Averaging bot for scheduled, regular trading:
- **Schedule-based execution**: Trades at regular intervals or specific times
- **Flexible timing**: Support for intervals (30m, 1h) or UTC times
- **Immediate execution**: Optional immediate start
- **Perfect for**: Regular investment strategies, automated DCA

### 🎯 **Range Bot** (`baseline-range.js`)  
Price-based trading bot that monitors market conditions:
- **Real-time price monitoring**: Checks prices every 30 seconds
- **Condition-based execution**: Trades when price thresholds are met
- **Above/below triggers**: Configurable price conditions
- **Perfect for**: Market timing, price-based strategies, limit orders

## 🤔 Choosing Your Bot Type

| Feature | DCA Bot | Range Bot |
|---------|---------|-----------|
| **Execution Trigger** | Time/Schedule | Price Conditions |
| **Frequency** | Configurable intervals | Every 30 seconds (monitoring) |
| **Use Case** | Regular investing | Market timing |
| **Configuration** | Schedule options | Price thresholds |
| **Best For** | DCA strategies, automated investing | Limit orders, price alerts |

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start the agent (server.js is the main entry point)
node server.js
# or
npm start
```

The agent will start with:
- 📡 **Web Server**: `http://localhost:3000`
- 📊 **Dashboard**: `http://localhost:3000/html`
- 📈 **Status API**: `http://localhost:3000/status`
- 📝 **Logs API**: `http://localhost:3000/`

## 🏗️ Architecture

### Core Files
- **`server.js`** - Main entry point, web server and API endpoints
- **`baseline-dca.js`** - DCA bot with scheduled trading logic
- **`baseline-range.js`** - Range bot with price monitoring logic
- **`wallet.js`** - Wallet operations and balance management  
- **`trading.js`** - Jupiter swaps, transfers, and market data
- **`scheduler.js`** - Interval and time-based scheduling (DCA bot)
- **`logger.js`** - Logging and status management

## 📋 Features

### 🔄 **Automated Trading**
- **Jupiter Integration**: Optimized swaps with 1.5% slippage tolerance
- **Dual Bot Types**: DCA (scheduled) and Range (price-based) trading strategies
- **Smart Scheduling**: Execute trades at intervals or specific UTC times (DCA)
- **Price Monitoring**: Real-time price tracking with 30-second intervals (Range)
- **Balance Monitoring**: Automatic balance checks and validation
- **Error Recovery**: Robust error handling and retry logic

### 💸 **Universal Transfers**
- **Multi-token Support**: Transfer SOL and any SPL token
- **Automatic Account Creation**: Creates associated token accounts as needed
- **Safety Checks**: Balance validation and proper decimal handling
- **Transaction Confirmation**: Complete audit trail with signatures

### 📊 **Real-time Monitoring**
- **Modern Web Dashboard**: Beautiful glass-morphism interface with gradient backgrounds
- **Status Tracking**: Real-time execution status with detailed timing and countdown
- **Auto-refresh**: Updates every 10 seconds for optimal performance
- **Enhanced Status Display**: Next execution prominently featured with last execution details
- **JSON APIs**: Programmatic access to logs and status

## 🔧 Configuration

### Environment Variables
Create a `.env` file with:
```bash
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret
WALLET_ID=your_wallet_id
SERVER_PORT=3000  # Optional, defaults to 3000
API_KEY=your_secure_api_key  # For withdrawal endpoint protection
```

### Trading Configuration
Edit `server.js` to configure trading parameters and bot type:

**DCA Bot Configuration:**
```javascript
// In server.js - startBaselineExecution function
const botType = 'dca';
const config = {
    ownerAddress: "your_owner_address",
    fromToken: 'USDC',
    toToken: 'SOL',
    amount: 0.01,
    scheduleOptions: {
        type: 'interval',
        value: 30000, // milliseconds (30 seconds)
        executeImmediately: true
    }
};
```

**Range Bot Configuration:**
```javascript
// In server.js - startBaselineExecution function  
const botType = 'range';
const config = {
    ownerAddress: "your_owner_address",
    fromToken: 'USDC',
    toToken: 'SOL',
    amount: 0.01,
    tokenToMonitor: 'SOL',        // Token to watch
    tokenToMonitorPrice: 100,     // Target price ($100)
    above: true                   // Execute when SOL > $100
};
```

## 🧪 Test Mode

The system currently runs in **TEST MODE** with simplified logic for setup verification:

- ✅ **Real wallet creation/retrieval**
- ✅ **Real balance monitoring** 
- ✅ **Real scheduling system**
- ✅ **Real status updates with enhanced display**
- 🧪 **Simulated trading execution** (no actual swaps)
- 🧪 **Mock transaction results**

### Test Mode Features:
- **Safe Testing**: No real trades executed
- **Full System Verification**: Tests all components except actual swaps
- **Realistic Simulation**: 6-step mock trading process (~8.5 seconds)
- **Enhanced Status Tracking**: Complete status updates with next execution countdown
- **Schedule Testing**: Verifies both interval and time-based scheduling
- **Modern UI**: Beautiful web dashboard for monitoring

### Switching to Production:
To enable real trading, uncomment the trading logic in `baseline.js` and comment out the test logic.

## 📡 API Endpoints

### **GET /** - View Logs (JSON)
```bash
curl http://localhost:3000/
```

### **GET /status** - System Status (JSON)
```bash
curl http://localhost:3000/status
```
Returns current execution status with schedule timing information.

### **GET /html** - Web Dashboard
Open `http://localhost:3000/html` in browser for real-time dashboard.

### **GET /health** - Health Check
```bash
curl http://localhost:3000/health
```

### **POST /clear** - Clear Logs
```bash
curl -X POST http://localhost:3000/clear
```

### **POST /withdraw** - Withdraw Funds (Protected)
```bash
curl -X POST http://localhost:3000/withdraw \
  -H "x-api-key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"amount": 0.01}'
```
Requires `API_KEY` environment variable for authentication.

## 🛠️ Function Reference

### **baseline-dca.js**

#### `baselineFunction(ownerAddress, fromToken, toToken, amount, scheduleOptions)`
DCA bot with scheduled trading execution.
- **Parameters:**
  - `ownerAddress` (string): Wallet owner address
  - `fromToken` (string): Source token symbol (e.g., 'SOL', 'USDC')
  - `toToken` (string): Destination token symbol
  - `amount` (number): Amount to swap
  - `scheduleOptions` (object, optional): Scheduling configuration
- **Returns:** Execution result with schedule info if applicable

**Schedule Options:**
```javascript
// Interval scheduling
{
  type: 'interval',
  value: 30000, // milliseconds
  executeImmediately: true // optional
}

// Time-based scheduling  
{
  type: 'times',
  value: ['09:30', '15:30'] // UTC times in HH:MM format
}
```

### **baseline-range.js**

#### `baselineFunction(ownerAddress, fromToken, toToken, amount, tokenToMonitor, tokenToMonitorPrice, above)`
Range bot with price-based trading execution (runs every 30 seconds).
- **Parameters:**
  - `ownerAddress` (string): Wallet owner address
  - `fromToken` (string): Source token symbol (e.g., 'SOL', 'USDC')
  - `toToken` (string): Destination token symbol
  - `amount` (number): Amount to swap
  - `tokenToMonitor` (string): Token symbol to monitor for price conditions
  - `tokenToMonitorPrice` (number): Target price threshold
  - `above` (boolean): True for above price condition, false for below
- **Returns:** Execution result with continuous monitoring info

**Price Monitoring Examples:**
```javascript
// Execute when SOL price goes above $100
baselineFunction(ownerAddress, 'USDC', 'SOL', 0.01, 'SOL', 100, true);

// Execute when BTC price drops below $50,000
baselineFunction(ownerAddress, 'SOL', 'BTC', 1, 'BTC', 50000, false);
```

### **wallet.js**

#### `createWallet(ownerAddress)`
Creates a new Solana wallet using Privy.
- **Parameters:** `ownerAddress` (string): Owner address for the wallet
- **Returns:** `{walletId, walletAddress}`

#### `getWallet(walletId)`
Retrieves an existing wallet by ID.
- **Parameters:** `walletId` (string): Wallet ID to retrieve
- **Returns:** `{walletId, walletAddress}`

#### `getOrCreateWallet(ownerAddress)`
Smart wallet management - uses existing wallet from env or creates new one.
- **Parameters:** `ownerAddress` (string): Owner address
- **Returns:** `{walletId, walletAddress}`

#### `getBalances(walletAddress)`
Fetches all token balances for a wallet.
- **Parameters:** `walletAddress` (string): Wallet address to check
- **Returns:** `{allBalances: [...]}` with SOL and SPL token balances

### **trading.js**

#### `swap(walletId, fromTokenSymbol, toTokenSymbol, fromAmount, walletAddress, options)`
Execute token swap using Jupiter aggregator.
- **Parameters:**
  - `walletId` (string): Privy wallet ID
  - `fromTokenSymbol` (string): Source token symbol
  - `toTokenSymbol` (string): Destination token symbol  
  - `fromAmount` (number): Amount to swap
  - `walletAddress` (string): Wallet address
  - `options` (object): Swap options (slippage, priority fee, etc.)
- **Returns:** Swap result with transaction signature and details

#### `transfer(walletId, fromWalletAddress, toAddress, tokenSymbol, amount)`
Universal transfer function for SOL and SPL tokens.
- **Parameters:**
  - `walletId` (string): Privy wallet ID
  - `fromWalletAddress` (string): Source wallet address
  - `toAddress` (string): Destination address
  - `tokenSymbol` (string): Token to transfer ('SOL', 'USDC', etc.)
  - `amount` (number): Amount to transfer
- **Returns:** Transfer result with transaction signature

#### `getJupiterTokens()`
Fetches and caches Jupiter token list (5-minute cache).
- **Returns:** Array of token information

#### `getTokenMetadata(mintAddress)`
Gets token metadata by mint address.
- **Parameters:** `mintAddress` (string): Token mint address
- **Returns:** Token metadata (name, symbol, decimals, logoURI)

#### `getTokenMintAddress(symbol)`
Finds mint address for a token symbol.
- **Parameters:** `symbol` (string): Token symbol
- **Returns:** `{success, mintAddress, tokenInfo}`

#### `checkTokenAccountExists(walletAddress, mintAddress)`
Checks if a token account exists for a wallet.
- **Parameters:** 
  - `walletAddress` (string): Wallet address
  - `mintAddress` (string): Token mint address
- **Returns:** Boolean indicating account existence

#### `marketData(symbol)`
Fetches market data for a token symbol.
- **Parameters:** `symbol` (string): Token symbol
- **Returns:** Market data including price and 24h change

#### `price(symbol)`
Gets current price for a token symbol.
- **Parameters:** `symbol` (string): Token symbol
- **Returns:** Current price or error

#### `twitter(user, lastTweets)`
Fetches recent tweets for a user and compares with previous tweets.
- **Parameters:**
  - `user` (string): Twitter username
  - `lastTweets` (array): Previous tweets for comparison
- **Returns:** `{hasNewTweet, newTweet, currentTweets}`

### **scheduler.js**

#### `scheduleInterval(executeFunction, intervalMs, executeImmediately)`
Schedule function execution at regular intervals.
- **Parameters:**
  - `executeFunction` (function): Function to execute
  - `intervalMs` (number): Interval in milliseconds
  - `executeImmediately` (boolean): Execute once immediately when starting
- **Returns:** Schedule ID for management

#### `scheduleTimes(executeFunction, times)`
Schedule function execution at specific UTC times daily.
- **Parameters:**
  - `executeFunction` (function): Function to execute
  - `times` (array): Array of time strings in "HH:MM" format (UTC)
- **Returns:** Schedule ID for management

#### `stopSchedule(scheduleId)`
Stop a specific scheduled execution.
- **Parameters:** `scheduleId` (string): Schedule ID to stop
- **Returns:** Boolean success status

#### `stopAllSchedules()`
Stop all active schedules.
- **Returns:** Number of schedules stopped

#### `getActiveSchedules()`
Get list of all active schedules.
- **Returns:** Array of schedule information

#### `getScheduleInfo()`
Get detailed schedule information with timing calculations.
- **Returns:** Array of detailed schedule info including next execution times

### **logger.js**

#### `logger.log(message, level)`
Log a message with specified level.
- **Parameters:**
  - `message` (string): Message to log
  - `level` (string): Log level ('info', 'warn', 'error')

#### `logger.error(message)` / `logger.warn(message)` / `logger.info(message)`
Convenience methods for different log levels.

#### `updateStatus(stage, message, success, details, scheduleInfo)`
Update system status with execution stage and details.
- **Parameters:**
  - `stage` (string): Current execution stage
  - `message` (string): Status message
  - `success` (boolean|null): Success status
  - `details` (object): Additional details
  - `scheduleInfo` (object): Schedule information

#### `getStatus()`
Get current system status.
- **Returns:** Current status object with stage, message, timing, and schedule info

#### `resetStatus()`
Reset status to idle state.

#### `updateScheduleStatus(scheduleInfo)`
Update schedule information in current status.
- **Parameters:** `scheduleInfo` (object): Schedule timing information

### **server.js**

#### `startBaselineExecution(config, botType)`
Initiates baseline trading execution with specified bot type and configuration.
- **Parameters:** 
  - `config` (object): Trading configuration
  - `botType` (string): Bot type - 'dca' or 'range'
- **Returns:** Execution result from respective baselineFunction

#### Main Server Setup
The server automatically:
- Starts Express web server on specified port
- Initializes all API endpoints
- Begins baseline execution upon server startup
- Handles graceful shutdown and error recovery

## 📅 Bot Execution Systems

### DCA Bot - Scheduling System

#### Interval-based Execution
```javascript
// Every 30 seconds with immediate execution
{
  type: 'interval',
  value: 30000,
  executeImmediately: true
}

// Every 5 minutes, wait for first interval
{
  type: 'interval', 
  value: 300000,
  executeImmediately: false
}
```

#### Time-based Execution (UTC)
```javascript
// Single daily execution at 9:30 AM UTC
{
  type: 'times',
  value: ['09:30']
}

// Multiple daily executions
{
  type: 'times',
  value: ['09:30', '15:30', '21:00']
}
```

### Range Bot - Price Monitoring System

#### Continuous Price Monitoring
```javascript
// Monitor SOL price, execute when above $100
baselineFunction(ownerAddress, 'USDC', 'SOL', 0.01, 'SOL', 100, true);

// Monitor ETH price, execute when below $2000
baselineFunction(ownerAddress, 'SOL', 'ETH', 0.5, 'ETH', 2000, false);
```

**Key Features:**
- **30-second intervals**: Checks price every 30 seconds automatically
- **Real-time execution**: Trades immediately when price condition is met
- **Continuous monitoring**: Runs indefinitely until stopped
- **Price threshold logic**: Supports both above and below conditions

### Status Information

The status system provides real-time information about:

**For DCA Bot (Scheduled Execution):**
- Time until next execution (e.g., "Next execution in: 4m 25s")
- Interval duration in milliseconds
- Whether immediate execution is enabled
- Schedule type and configuration

**For Range Bot (Price Monitoring):**
- Current monitored token price
- Target price threshold and condition (above/below)
- Time since last price check
- Execution status (waiting/condition met/skipped)

**For Time-based Schedules (DCA only):**
- Next execution time in UTC (e.g., "Next execution at: 15:30:00 UTC")
- All configured execution times
- Automatic rollover to next day

## 🔄 Enhanced Status System

The status system has been significantly improved to provide comprehensive monitoring:

### **Primary Focus: Next Execution**
- **Prominent countdown display** with large, easy-to-read timers
- **Real-time updates** every 5 seconds between executions
- **Detailed schedule information** including type, interval, and configuration
- **Current timestamp** always displayed for reference

### **Secondary Info: Last Execution**
- **Complete execution details** preserved after each run
- **Success/failure status** with color-coded indicators
- **Execution duration** and timestamp information
- **Transaction details** including signatures and trade information
- **Error details** if execution fails

### **Status API Enhancements**
- **Comprehensive JSON response** with all timing and execution data
- **Structured data format** for easy programmatic access
- **Real-time schedule calculations** for accurate countdown timers
- **Historical execution data** maintained between runs

## 🛡️ Safety Features

### **Automatic Protections**
- ✅ **SOL Rent Reserve**: Keeps minimum 0.001 SOL for account rent
- ✅ **Balance Validation**: Verifies sufficient funds before operations
- ✅ **Address Validation**: Ensures valid Solana address format
- ✅ **Slippage Protection**: 1.5% slippage tolerance on swaps
- ✅ **Account Creation**: Automatically creates associated token accounts

### **Error Handling**
- ✅ **Retry Logic**: Automatic retries for failed transactions
- ✅ **Detailed Logging**: Complete audit trail of all operations
- ✅ **Graceful Failures**: Proper error messages and status codes
- ✅ **Transaction Confirmation**: All operations confirmed before success

## 📊 Monitoring & Status

### Modern Web Dashboard Features
- 🔄 **Auto-refresh**: Updates every 10 seconds for optimal performance
- 🎨 **Modern Design**: Glass-morphism cards with gradient backgrounds
- 📱 **Mobile Responsive**: Fully responsive design that works on all devices
- 🕰️ **Enhanced Schedule Display**: Large countdown timers and detailed next execution info
- 📈 **Status Tracking**: Current execution stage with prominent next execution display
- 📋 **Last Execution Details**: Complete information about previous executions
- 🎯 **Clean Typography**: Modern system fonts for better readability
- ✨ **Smooth Animations**: Hover effects and transitions for better UX

### Enhanced Status API Response
```json
{
  "status": "success",
  "data": {
    "stage": "waiting_next_execution",
    "message": "Next execution in: 9m 44s",
    "timestamp": "2025-09-15T04:27:42.715Z",
    "success": null,
    "details": {
      "currentTime": "2025-09-15T04:27:42.715Z",
      "scheduleType": "interval",
      "scheduleId": "interval_1",
      "intervalMs": 600000,
      "nextExecutionIn": 584996,
      "nextExecutionTime": "2025-09-15T04:37:27.711Z",
      "executeImmediately": true,
      "lastExecution": {
        "timestamp": "2025-09-15T04:27:36.301Z",
        "duration": "8.591s",
        "success": true,
        "details": {
          "signature": "TEST_MOCK_SIGNATURE_1757910456301",
          "fromAmount": 0.01,
          "toAmount": 0.010249999999999999,
          "fromToken": "USDC",
          "toToken": "SOL",
          "testMode": true
        }
      }
    }
  }
}
```

## 🚨 Troubleshooting

### Common Issues

**Test Mode Issues**
- Verify all environment variables are set correctly
- Check that wallet creation/retrieval works
- Monitor status API for execution progress
- Ensure scheduling parameters are valid

**Rate Limit Errors** (Production Mode)
- Reduce swap frequency in scheduled operations
- Wait a few minutes before retrying
- Consider using different RPC endpoints

**Insufficient Balance Errors**
- Check wallet balances via web interface
- Ensure sufficient SOL for transaction fees (minimum 0.005 SOL)
- Verify token symbols are correct

**Schedule Not Executing**
- Check status API for schedule information
- Verify UTC times are correct
- Ensure intervals are in milliseconds
- Monitor server logs for execution attempts

**Server Startup Issues**
- Verify `server.js` is the entry point
- Check that all dependencies are installed
- Ensure environment variables are properly configured
- Monitor console output for initialization errors

### Debug Mode
View detailed logs and status at `http://localhost:3000/html` for real-time debugging.

### Test Mode Verification
1. **Server Starts**: Check console for "🚀 Server running on port 3000"
2. **Baseline Execution**: Look for "🎯 Trading Config" and "🕰️ Schedule" logs
3. **Status Updates**: Monitor `/status` endpoint for execution progress with enhanced details
4. **Mock Trading**: Verify 6-step test execution completes with mock results (~8.5s)
5. **Schedule Timing**: Check that next execution countdown updates every 5 seconds
6. **Web Dashboard**: Visit `/html` to see the modern interface with real-time updates
7. **Last Execution**: Verify last execution details appear in status after first run

## 📈 Performance

- **Memory Efficient**: Keeps last 1000 logs in memory
- **Fast API**: Sub-100ms response times for most endpoints
- **Optimized Swaps**: Jupiter integration with best route finding
- **Token Caching**: 5-minute cache for Jupiter token list
- **Optimized Updates**: 10-second dashboard refresh, 5-second status updates
- **Modern UI**: Hardware-accelerated CSS with smooth animations
- **Efficient Scheduling**: Continuous status updates without blocking execution

## 🔒 Security

- **No Private Keys**: Uses Privy for secure key management
- **Environment Variables**: Sensitive data in .env files
- **Input Validation**: All API inputs validated and sanitized
- **Safe Transfers**: Automatic account creation and balance checks

## 📝 License

MIT License - Feel free to use and modify for your projects.

---

**🌐 Access Points:**
- **Web Dashboard**: `http://localhost:3000/html`
- **Status API**: `http://localhost:3000/status`
- **Logs API**: `http://localhost:3000/`
- **Health Check**: `http://localhost:3000/health`