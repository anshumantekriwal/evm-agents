# 🚀 Solana Agent Deployer

A service for deploying Solana trading agents on AWS App Runner with automated deployment and configuration.

## Features

- Deploy Solana trading agents to AWS App Runner
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

#### SwapConfig Parameters

- **`fromToken`** (string): Source token symbol (e.g., 'SOL', 'USDC')
- **`toToken`** (string): Destination token symbol (e.g., 'SOL', 'USDC')
- **`amount`** (number): Amount to trade
- **`scheduleType`** (string): Either 'interval' or 'times'
- **`scheduleValue`** (string|number|array): Schedule configuration (see examples below)
- **`executeImmediately`** (boolean): Execute immediately on start (default: true)

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
