# 🤖 Solana Trading Agent

A comprehensive Solana trading agent with automated swaps, scheduled execution, fund withdrawal, and real-time monitoring via web interface.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start the agent
node baseline.js
```

The agent will start with:
- 📡 **Web Server**: `http://localhost:3000`
- 📊 **Log Interface**: `http://localhost:3000/html`
- 💸 **Withdraw API**: `POST http://localhost:3000/withdraw`

## 🏗️ Architecture

### Core Files
- **`baseline.js`** - Main application with trading logic and server
- **`wallet.js`** - Wallet operations and balance management
- **`trading.js`** - Jupiter swap integration and market data
- **`scheduler.js`** - Automated execution scheduling
- **`logger.js`** - Logging system and web server

## 📋 Features

### 🔄 **Automated Trading**
- **Jupiter Integration**: Optimized swaps with 1.5% slippage tolerance
- **Smart Scheduling**: Execute trades at intervals or specific times
- **Balance Monitoring**: Automatic balance checks and validation
- **Error Recovery**: Robust error handling and retry logic

### 💸 **Fund Management**
- **Withdraw Functions**: Transfer any token to any Solana address
- **Safety Checks**: Balance validation and SOL rent protection
- **API Endpoints**: REST API for programmatic withdrawals
- **Transaction Tracking**: Complete audit trail with signatures

### 📊 **Real-time Monitoring**
- **Web Interface**: Beautiful terminal-style log viewer
- **Auto-refresh**: Updates every 5 seconds
- **JSON API**: Programmatic access to all logs
- **Mobile Responsive**: Works on all devices

## 🔧 Configuration

### Environment Variables
Create a `.env` file with:
```bash
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret
WALLET_ID=your_wallet_id
LOG_SERVER_PORT=3000  # Optional, defaults to 3000
```

### Trading Configuration
Edit `baseline.js` to configure:
```javascript
// Example: Schedule SOL → USDC swap every 30 minutes
baselineFunction(ownerAddress, 'SOL', 'USDC', 0.0001, {
  type: 'interval',
  value: '30m'
});

// Example: Execute at specific times
baselineFunction(ownerAddress, 'USDC', 'SOL', 0.01, {
  type: 'times',
  value: '09:30,15:30,21:00'
});
```

## 📡 API Endpoints

### **GET /** - View Logs (JSON)
```bash
curl http://localhost:3000/
```

### **GET /html** - Web Interface
Open `http://localhost:3000/html` in browser

### **POST /withdraw** - Withdraw Funds
```bash
curl -X POST http://localhost:3000/withdraw \
  -H "Content-Type: application/json" \
  -d '{
    "tokenSymbol": "SOL",
    "destinationAddress": "SOLANA_ADDRESS_HERE",
    "amount": 0.001
  }'
```

#### Withdraw Parameters:
- `tokenSymbol` (string): Token to withdraw ('SOL', 'USDC', etc.)
- `destinationAddress` (string): Valid Solana address
- `amount` (number): Amount to withdraw
- `withdrawAll` (boolean): Set true to withdraw all available tokens

#### Response:
```json
{
  "success": true,
  "signature": "TRANSACTION_SIGNATURE",
  "amount": 0.001,
  "token": "SOL",
  "from": "SOURCE_WALLET",
  "to": "DESTINATION_ADDRESS",
  "timestamp": "2025-09-10T23:50:24.266Z"
}
```

### **GET /health** - Health Check
```bash
curl http://localhost:3000/health
```

### **POST /clear** - Clear Logs
```bash
curl -X POST http://localhost:3000/clear
```

## 🛠️ Core Functions

### Trading Functions
```javascript
import { baselineFunction, executeSwapJupiter } from './baseline.js';

// Immediate swap
await baselineFunction(ownerAddress, 'USDC', 'SOL', 0.01);

// Scheduled swap
await baselineFunction(ownerAddress, 'SOL', 'USDC', 0.001, {
  type: 'interval',
  value: '1h'
});
```

### Withdrawal Functions
```javascript
import { withdrawFunds, withdrawAllFunds } from './baseline.js';

// Withdraw specific amount
const result = await withdrawFunds(
  ownerAddress, 
  'SOL', 
  'DESTINATION_ADDRESS', 
  0.001
);

// Withdraw all tokens
const result = await withdrawAllFunds(
  ownerAddress,
  'USDC', 
  'DESTINATION_ADDRESS'
);
```

### Wallet Functions
```javascript
import { getBalances, getOrCreateWallet } from './baseline.js';

// Get wallet
const wallet = await getOrCreateWallet(ownerAddress);

// Check balances
const balances = await getBalances(wallet.walletAddress);
console.log(balances.allBalances);
```

## 📅 Scheduling Options

### Interval-based
```javascript
// Every 30 minutes
{ type: 'interval', value: '30m' }

// Every 2 hours 30 minutes  
{ type: 'interval', value: '2h30m' }

// Every 45 seconds
{ type: 'interval', value: '45s' }
```

### Time-based
```javascript
// Single time (24-hour format)
{ type: 'times', value: '09:30' }

// Multiple times
{ type: 'times', value: '09:30,15:30,21:00' }

// AM/PM format
{ type: 'times', value: '9:30 AM,3:30 PM,9:00 PM' }
```

## 🛡️ Safety Features

### **Automatic Protections**
- ✅ **SOL Rent Reserve**: Keeps minimum 0.001 SOL for account rent
- ✅ **Balance Validation**: Verifies sufficient funds before operations
- ✅ **Address Validation**: Ensures valid Solana address format
- ✅ **Slippage Protection**: 1.5% slippage tolerance on swaps
- ✅ **Rate Limit Handling**: Graceful handling of RPC rate limits

### **Error Handling**
- ✅ **Retry Logic**: Automatic retries for failed transactions
- ✅ **Detailed Logging**: Complete audit trail of all operations
- ✅ **Graceful Failures**: Proper error messages and status codes
- ✅ **Transaction Confirmation**: All operations confirmed before success

## 📊 Monitoring & Logs

### Web Interface Features
- 🔄 **Auto-refresh**: Updates every 5 seconds
- 🎨 **Terminal Theme**: Dark theme with color-coded log levels
- 📱 **Mobile Responsive**: Works on all devices
- 🔍 **Real-time Search**: Filter logs by content
- 📈 **Statistics**: Total logs and last updated timestamp

### Log Levels
- **Info** (Green): Normal operations and status updates
- **Warn** (Yellow): Warnings and important notices
- **Error** (Red): Errors and failed operations

## 🚨 Troubleshooting

### Common Issues

**429 Rate Limit Errors**
- Reduce swap frequency in scheduled operations
- Wait a few minutes before retrying
- Consider using different RPC endpoints

**Insufficient Balance Errors**
- Check wallet balances via web interface
- Ensure sufficient SOL for transaction fees
- Verify token symbols are correct

**Address Validation Errors**
- Ensure Solana addresses are 32+ characters
- Use base58 encoded addresses only
- Verify address format is correct

### Debug Mode
View detailed logs at `http://localhost:3000/html` for real-time debugging.

## 🔗 Integration Examples

### Webhook Integration
```javascript
// Monitor for successful swaps
fetch('http://localhost:3000/')
  .then(res => res.json())
  .then(data => {
    const successfulSwaps = data.logs.filter(log => 
      log.message.includes('Swap completed successfully')
    );
    // Process successful swaps
  });
```

### Automated Withdrawals
```javascript
// Withdraw profits daily
setInterval(async () => {
  const result = await fetch('http://localhost:3000/withdraw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tokenSymbol: 'USDC',
      destinationAddress: 'YOUR_COLD_WALLET',
      withdrawAll: true
    })
  });
  console.log('Daily withdrawal:', await result.json());
}, 24 * 60 * 60 * 1000); // 24 hours
```

## 📈 Performance

- **Memory Efficient**: Keeps last 1000 logs in memory
- **Fast API**: Sub-100ms response times for most endpoints
- **Optimized Swaps**: Jupiter integration with best route finding
- **Minimal Dependencies**: Lightweight with essential packages only

## 🔒 Security

- **No Private Keys**: Uses Privy for secure key management
- **Environment Variables**: Sensitive data in .env files
- **Input Validation**: All API inputs validated and sanitized
- **Rate Limiting**: Built-in protection against abuse

## 📝 License

MIT License - Feel free to use and modify for your projects.

---

**🌐 Access Points:**
- **Web Interface**: `http://localhost:3000/html`
- **JSON API**: `http://localhost:3000/`
- **Withdraw API**: `POST http://localhost:3000/withdraw`
- **Health Check**: `http://localhost:3000/health`
