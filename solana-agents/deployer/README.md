# 🚀 Solana Agent Deployer

A service for deploying Solana trading agents on AWS App Runner with automated deployment and configuration.

## Features

- Deploy Solana trading agents to AWS App Runner
- **Three Bot Types**: DCA (Dollar Cost Averaging), Range (Price-based), and Custom (AI-generated) trading bots
- **AI-powered code generation** for custom trading strategies using natural language
- **REST API for log retrieval** with configurable line limits
- API key authentication for secure access
- Modular code structure for maintainability
- Integration with Solana blockchain and Jupiter DEX
- Automated environment variable configuration
- Docker containerization for consistent deployment
- CloudWatch Logs integration for comprehensive monitoring

## Project Structure

```
deployer/
├── index.js          # Main server with routes and authentication
├── deploy.js         # Solana agent deployment logic
├── logs.js           # Log monitoring and retrieval
├── package.json      # Dependencies and scripts
├── .env.example      # Environment variables template
└── README.md         # This file
```

## Environment Variables

Copy the provided environment variables to a `.env` file in the deployer directory:

```bash
AWS_ACCESS_KEY_ID=AKIA342M7CZUD6HCLDLK
AWS_SECRET_ACCESS_KEY=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
AWS_ACCOUNT_ID=817815819880
AWS_REGION=us-east-1
API_KEY=Commune_dev1
PRIVY_APP_ID=cmc8paqbp0015l80n6y1ev5tl
PRIVY_APP_SECRET=T2saVvb5a1xuWcHiYUUCbtNiW8NZKCkEAzVpCbsHamcjG8DLo4AUkJBNBk6Tnsr4xQo6vAzLcaybkv4aD8qszFu
TATUM_API_KEY=t-685416fddafd7c2b4fded01f-161401077fa44c29995907ea
VITE_SUPABASE_URL=https://wbsnlpviggcnwqfyfobh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indic25scHZpZ2djbndxZnlmb2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODc2NTcwNiwiZXhwIjoyMDU0MzQxNzA2fQ.tr6PqbiAXQYSQSpG2wS6I4DZfV1Gc3dLXYhKwBrJLS0
MOBULA_API_KEY=e26c7e73-d918-44d9-9de3-7cbe55b63b99
```

## Installation

```bash
# Install dependencies
npm install

# Start the deployer service
npm start
```

The service will run on port 3001 by default.

## Bot Types

### DCA Bot (`botType: 'dca'`)
Dollar Cost Averaging bot that executes trades on a scheduled basis:
- **Schedule-based**: Executes trades at regular intervals or specific times
- **Configurable timing**: Supports interval (e.g., every 30 minutes) or specific UTC times
- **Immediate execution**: Optional immediate execution on startup

### Range Bot (`botType: 'range'`)
Price-based trading bot that monitors token prices and executes trades when conditions are met:
- **Price monitoring**: Continuously monitors a specified token's price every 30 seconds
- **Condition-based**: Executes trades when price goes above or below a threshold
- **Real-time**: Responds to market conditions in real-time

### Custom Bot (`botType: 'custom'`)
AI-generated trading bot that creates custom trading logic based on natural language prompts:
- **AI-powered**: Uses code generation API to create custom baseline functions
- **Natural language**: Accepts plain English descriptions of trading strategies
- **Flexible**: Can handle complex multi-condition trading scenarios (scheduled + price monitoring + Twitter triggers)
- **Automated**: Generates, validates, and deploys code without manual intervention
- **Intelligent execution**: Automatically detects execution patterns (immediate, scheduled, price-monitoring, hybrid)
- **No runtime dependencies**: Generated code is baked into the container for maximum reliability

## API Endpoints

### Authentication

All endpoints require API key authentication via the `x-api-key` header:

```bash
curl -H "x-api-key: Commune_dev1" http://localhost:3001/endpoint
```

### Deploy Solana Agent

```
POST /deploy-agent
```

**Request Body:**

```json
{
  "agentId": "my-trading-bot-001",
  "ownerAddress": "5NGqPDeoEfpxwq8bKHkMaSyLXDeR7YmsxSyMbXA5yKSQ",
  "botType": "dca",
  "swapConfig": {
    "fromToken": "SOL",
    "toToken": "USDC", 
    "amount": 0.0001,
    "scheduleType": "interval",
    "scheduleValue": "30m",
    "executeImmediately": true
  }
}
```

**DCA Bot Example:**
```json
{
  "agentId": "my-dca-bot",
  "ownerAddress": "5NGqPDeoEfpxwq8bKHkMaSyLXDeR7YmsxSyMbXA5yKSQ",
  "botType": "dca",
  "swapConfig": {
    "fromToken": "USDC",
    "toToken": "SOL",
    "amount": 0.01,
    "scheduleType": "interval",
    "scheduleValue": "30m",
    "executeImmediately": true
  }
}
```

**Range Bot Example:**
```json
{
  "agentId": "my-range-bot",
  "ownerAddress": "5NGqPDeoEfpxwq8bKHkMaSyLXDeR7YmsxSyMbXA5yKSQ",
  "botType": "range",
  "swapConfig": {
    "fromToken": "USDC",
    "toToken": "SOL",
    "amount": 0.01,
    "tokenToMonitor": "SOL",
    "tokenToMonitorPrice": 100,
    "above": true
  }
}
```

### Custom Bot Example

```json
{
  "agentId": "my-custom-ai-bot",
  "ownerAddress": "5NGqPDeoEfpxwq8bKHkMaSyLXDeR7YmsxSyMbXA5yKSQ",
  "botType": "custom",
  "swapConfig": {
    "prompt": "Buy 0.1 SOL with USDC every hour if Bitcoin is above $50000 and Ethereum is above $3000",
    "history": []
  }
}
```

#### Parameters

**Common Parameters:**
- **`botType`** (string): Bot type - 'dca', 'range', or 'custom' (default: 'dca')
- **`fromToken`** (string): Source token symbol (e.g., 'SOL', 'USDC')
- **`toToken`** (string): Destination token symbol (e.g., 'SOL', 'USDC')
- **`amount`** (number): Amount to trade

**DCA Bot Parameters:**
- **`scheduleType`** (string): Either 'interval' or 'times'
- **`scheduleValue`** (string|number|array): Schedule configuration (see examples below)
- **`executeImmediately`** (boolean): Execute immediately on start (default: true)

**Range Bot Parameters:**
- **`tokenToMonitor`** (string): Token symbol to monitor for price conditions
- **`tokenToMonitorPrice`** (number): Target price threshold
- **`above`** (boolean): True for above price condition, false for below (default: true)

**Custom Bot Parameters:**
- **`prompt`** (string): Natural language description of the trading strategy
- **`history`** (array, optional): Conversation history for context (default: [])

## Custom Bot Architecture

### Deployment Flow
1. **Code Generation**: Deployer calls AI code generation API at `https://evm-agents-vb2f.onrender.com/code` with user's natural language prompt
2. **Code Validation**: Generated code is cleaned, validated, and checked for proper exports
3. **File Integration**: Generated `baselineFunction` is appended to `baseline.js` in build directory
4. **Containerization**: Docker container is built with the custom code baked in
5. **Deployment**: Container is deployed to AWS App Runner with no external dependencies

### Execution Flow
1. **Server Startup**: Custom bot server starts with `botType: 'custom'`
2. **Function Import**: Pre-generated `baselineFunction` is imported from `baseline.js`
3. **Strategy Execution**: Function executes with intelligent pattern detection:
   - **Immediate**: Executes trade immediately
   - **Scheduled**: Sets up recurring trades (DCA)
   - **Price Monitoring**: Monitors price conditions every minute
   - **Twitter Trigger**: Monitors Twitter for keyword triggers
   - **Hybrid**: Combines multiple execution patterns

### Supported Trading Strategies
- Simple swaps (e.g., "Swap 0.1 SOL to USDC immediately")
- Scheduled DCA (e.g., "Buy 0.01 SOL with USDC every hour")
- Price-based trading (e.g., "Buy SOL when Bitcoin is above $50000")
- Twitter-triggered trades (e.g., "Buy SOL when @elonmusk tweets about crypto")
- Complex hybrid strategies (e.g., "Buy 0.1 SOL every hour if Bitcoin > $50k and Ethereum > $3k")

#### Schedule Examples

**Interval-based Trading:**
```json
{
  "scheduleType": "interval",
  "scheduleValue": "30m",        // String format: '30s', '5m', '1h'
  "executeImmediately": true
}
```

```json
{
  "scheduleType": "interval", 
  "scheduleValue": 1800000,      // Milliseconds (30 minutes)
  "executeImmediately": false
}
```

**Time-based Trading:**
```json
{
  "scheduleType": "times",
  "scheduleValue": ["09:30", "15:30"],  // UTC times
  "executeImmediately": false
}
```

**Response:**

```json
{
  "success": true,
  "agentUrl": "https://abc123.us-east-1.awsapprunner.com",
  "agentId": "my-trading-bot-001",
  "message": "Solana agent deployed successfully"
}
```

### Get Agent Logs

```
GET /logs/:agentId?lines=500
```

**Parameters:**
- `agentId` (path): Unique identifier for the deployed agent
- `lines` (query): Number of log lines to retrieve (default: 500)

**Response:**

```json
{
  "success": true,
  "logs": {
    "logGroupName": "/aws/apprunner/solana-agent-my-bot/application",
    "totalEvents": 150,
    "logs": [
      {
        "timestamp": "2025-09-10T23:50:24.266Z",
        "message": "🚀 Starting swap: 0.0001 SOL → USDC",
        "logStreamName": "application/abc123"
      }
    ],
    "retrievedAt": "2025-09-10T23:55:00.000Z"
  },
  "agentId": "my-trading-bot-001"
}
```

### Check Agent Status

```
GET /status/:agentId
```

**Response:**

```json
{
  "success": true,
  "agentId": "my-trading-bot-001",
  "status": "running",
  "message": "Agent is running normally"
}
```

### List Deployed Agents

```
GET /agents
```

**Response:**

```json
{
  "success": true,
  "agents": [
    {
      "agentId": "my-trading-bot-001",
      "status": "running",
      "deployedAt": "2025-09-10T23:45:00.000Z"
    }
  ]
}
```

### Health Check

```
GET /
```

**Response:**

```json
{
  "success": true,
  "message": "Solana Agent Deployer is live",
  "timestamp": "2025-09-10T23:55:00.000Z",
  "version": "1.0.0"
}
```

## Deployment Process

The deployer follows these steps:

1. **📁 Prepare Build**: Creates temporary directory with Solana agent files
2. **🔧 Configure Environment**: Sets up environment variables and agent configuration
3. **📝 Customize Code**: Modifies baseline.js with specific owner address and swap config
4. **🐳 Build Docker Image**: Creates containerized version of the agent
5. **📦 Push to ECR**: Uploads image to AWS Elastic Container Registry
6. **🚀 Deploy to App Runner**: Creates AWS App Runner service
7. **📊 Setup Monitoring**: Configures CloudWatch logs integration
8. **🧹 Cleanup**: Removes temporary build files

## Agent Configuration

Each deployed agent includes:

- **Trading Logic**: Automated SOL/USDC swaps via Jupiter DEX
- **Scheduling**: Configurable interval-based execution
- **Monitoring**: Real-time logging and web interface
- **API Endpoints**: Withdrawal and status endpoints
- **Safety Features**: Balance checks and rent protection

## Monitoring

Deployed agents provide:

- **CloudWatch Logs**: Centralized log aggregation
- **Health Checks**: Automatic service monitoring
- **API Access**: Programmatic log retrieval
- **Real-time Status**: Live agent status checking

## Error Handling

The deployer includes comprehensive error handling for:

- AWS authentication failures
- Docker build errors
- ECR push failures
- App Runner deployment issues
- Log retrieval problems

## Security

- **API Key Authentication**: All endpoints protected
- **Environment Isolation**: Each agent runs in isolated container
- **AWS IAM**: Proper permission management
- **Secure Secrets**: Environment variables for sensitive data

## Usage Examples

### Deploy a Simple Trading Bot

```bash
curl -X POST http://localhost:3001/deploy-agent \
  -H "Content-Type: application/json" \
  -H "x-api-key: Commune_dev1" \
  -d '{
    "agentId": "sol-usdc-bot",
    "ownerAddress": "5NGqPDeoEfpxwq8bKHkMaSyLXDeR7YmsxSyMbXA5yKSQ",
    "swapConfig": {
      "fromToken": "SOL",
      "toToken": "USDC",
      "amount": 0.001,
      "scheduleType": "interval",
      "scheduleValue": "1h",
      "executeImmediately": true
    }
  }'
```

### Monitor Agent Logs

```bash
curl -H "x-api-key: Commune_dev1" \
  "http://localhost:3001/logs/sol-usdc-bot?lines=100"
```

### Check Agent Status

```bash
curl -H "x-api-key: Commune_dev1" \
  "http://localhost:3001/status/sol-usdc-bot"
```

## Troubleshooting

### Common Issues

1. **AWS Authentication Errors**: Verify AWS credentials in `.env`
2. **Docker Build Failures**: Check Docker daemon is running
3. **ECR Push Errors**: Ensure AWS permissions for ECR access
4. **App Runner Deployment**: Verify account limits and quotas

### Debug Mode

Set `NODE_ENV=development` for verbose logging during deployment.

## License

MIT License - Feel free to use and modify for your projects.
