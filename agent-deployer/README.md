# EVM Agent Deployer

> **Note**: This is the EVM version of the agent deployer. For the newer Solana implementation with custom bot support and AI code generation, see [`solana-agents/deployer/`](../solana-agents/deployer/).

A service for deploying EVM agents on AWS App Runner with automated deployment and configuration.

## Features

- Deploy EVM agents to AWS App Runner
- **Real-time log monitoring** with WebSocket streaming
- **REST API for log retrieval** with configurable line limits
- API key authentication for secure access
- Modular code structure for maintainability
- Integration with Polygon blockchain and EVM-compatible networks
- Automated environment variable configuration
- Docker containerization for consistent deployment
- CloudWatch Logs integration for comprehensive monitoring

## Project Structure

```
evm-agent-deployer/
├── index.js          # Main server with routes and authentication
├── deploy.js         # EVM agent deployment logic
├── logs.js           # Log monitoring and real-time streaming
├── constants.js      # EVM baseline code template
├── package.json      # Dependencies and scripts
└── README.md         # This file
```

## API Endpoints

### Authentication

All endpoints require API key authentication via the `x-api-key` header:

```bash
curl -H "x-api-key: YOUR_API_KEY" http://localhost:3000/endpoint
```

### Deploy EVM Agent

```
POST /deploy-agent
```

**Request Body:**

```json
{
  "agentId": "unique-agent-id",
  "ownerAddress": "0x1234567890abcdef1234567890abcdef12345678"
}
```

**Response:**

```json
{
  "agentUrl": "https://evm-agent-xxx.us-east-1.awsapprunner.com"
}
```

### Monitor Agent Logs

```
GET /logs/:agentId
```

**Query Parameters:**

- `lines` (optional): Number of log lines to return (default: 500)

**Example:**

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "http://localhost:3000/logs/my-agent?lines=1000"
```

**Response:**

```json
{
  "logs": {
    "logGroupName": "/aws/apprunner/evm-my-agent/application",
    "events": [
      {
        "timestamp": 1704110400000,
        "message": "Agent started successfully",
        "logStreamName": "..."
      }
    ],
    "totalEvents": 500,
    "timestamp": "2024-01-01T12:00:00.000Z",
    "requestedLines": 500
  }
}
```

### Real-time Log Streaming (WebSocket)

```
ws://localhost:3000/logs-stream/:agentId?apiKey=YOUR_API_KEY&lines=500
```

**Query Parameters:**

- `apiKey` (required): Your API key for authentication
- `lines` (optional): Number of initial log lines to return (default: 500)

**Message Types:**

1. **Initial logs:**

```json
{
  "type": "initial",
  "logs": {
    "logGroupName": "/aws/apprunner/evm-my-agent/application",
    "events": [...],
    "totalEvents": 500
  }
}
```

2. **New log updates (every 5 seconds):**

```json
{
  "type": "update",
  "events": [
    {
      "timestamp": 1704110400000,
      "message": "New log message",
      "logStreamName": "..."
    }
  ],
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Health Check

```
GET /
```

**Response:**

```
EVM Agent Deployer is live
```

## Environment Variables

Required environment variables:

- `AWS_REGION`: AWS region for deployment
- `AWS_ACCOUNT_ID`: AWS account ID
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `API_KEY`: API key for authentication (e.g., "Xade_dev1")
- `PRIVY_APP_ID`: Privy application ID
- `PRIVY_APP_SECRET`: Privy application secret
- `TATUM_API_KEY`: Tatum API key for blockchain data
- `PORT`: Server port (default: 3000)

## Installation

```bash
npm install
```

## Usage

```bash
npm start
```

The server will start on port 3000 (or the port specified in the PORT environment variable).

## API Usage Examples

```bash
# Deploy an EVM agent
curl -X POST -H "x-api-key: Xade_dev1" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "my-evm-agent",
    "ownerAddress": "0x1234567890abcdef1234567890abcdef12345678"
  }' \
  http://localhost:3000/deploy-agent

# Monitor agent logs (latest 500 lines)
curl -H "x-api-key: Xade_dev1" \
  http://localhost:3000/logs/my-evm-agent

# Monitor agent logs (custom number of lines)
curl -H "x-api-key: Xade_dev1" \
  "http://localhost:3000/logs/my-evm-agent?lines=1000"

# Check server health
curl -H "x-api-key: Xade_dev1" http://localhost:3000/
```

### WebSocket Usage Examples

**JavaScript (Browser/Node.js):**
```javascript
const ws = new WebSocket('ws://localhost:3000/logs-stream/my-evm-agent?apiKey=Xade_dev1&lines=500');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'initial') {
    console.log('Initial logs:', data.logs.totalEvents, 'events');
  } else if (data.type === 'update') {
    console.log('New logs:', data.events.length, 'new events');
  } else if (data.error) {
    console.error('Error:', data.error);
  }
};

ws.onopen = () => console.log('WebSocket connected');
ws.onerror = (error) => console.error('WebSocket error:', error);
```

**Postman:**
1. Create a new WebSocket request
2. URL: `ws://localhost:3000/logs-stream/my-evm-agent?apiKey=Xade_dev1&lines=500`
3. Click "Connect"
4. Monitor real-time log messages in the Messages panel
```

## EVM Agent Features

The deployed EVM agents include:

### Core Functionality

- **Trading**: Automated token swapping using LiFi protocol
- **Wallet Management**: Secure wallet creation and management using Privy
- **Balance Monitoring**: Real-time balance tracking for POL and ERC-20 tokens
- **Status Monitoring**: Live status updates with phase tracking

### API Endpoints (on deployed agents)

- `GET /status`: Current agent status and trading information
- `GET /logs`: Recent agent logs
- `POST /withdraw`: Withdraw funds to owner address
- `POST /start`: Start baseline manually (if not auto-started)

### Supported Networks

- Polygon (137)
- Ethereum mainnet
- Other EVM-compatible networks

### Token Support

- POL (Polygon native token)
- ERC-20 tokens
- Comprehensive token list with metadata

## IAM Permissions

Your IAM user needs the following permissions:

- `apprunner:*` - For App Runner service management
- `ecr:*` - For ECR repository management
- `logs:*` - For CloudWatch Logs access
- `iam:PassRole` - For App Runner service role

## Agent Deployment

The service automatically deploys EVM agents to AWS App Runner, making them accessible via HTTPS endpoints. Each agent runs the baseline EVM trading functionality with the specified owner address.

## Code Architecture

### Modular Design

The codebase is organized into focused modules:

- **`index.js`**: Express server, authentication middleware, and route definitions
- **`deploy.js`**: EVM agent deployment logic using AWS App Runner and ECR
- **`logs.js`**: Log viewing functionality with CloudWatch integration
- **`constants.js`**: EVM baseline code template with trading and wallet functionality

### Key Features

- **Dynamic Log Group Discovery**: Automatically finds the correct CloudWatch log group names
- **EVM Integration**: Built-in support for Ethereum Virtual Machine networks
- **Trading Capabilities**: Automated token swapping and portfolio management
- **Real-time Monitoring**: Live status and log streaming capabilities

## Security

- API key authentication for all endpoints
- Secure environment variable handling
- Encrypted wallet operations using Privy
- AWS IAM role-based access control

## Troubleshooting

### Common Issues

1. **Deploy fails with ECR authentication error**

   - Ensure AWS credentials are properly configured
   - Check IAM permissions for ECR access

2. **Agent logs not showing**

   - Wait a few minutes for the service to fully start
   - Check if the App Runner service is in "RUNNING" status
   - Verify the agent ID exists and has generated logs

3. **WebSocket connection fails**

   - Ensure the URL format is correct: `ws://localhost:3000/logs-stream/agentId?apiKey=YOUR_API_KEY`
   - Check that the API key is valid and included in the query parameters
   - Verify the agent ID exists in the URL path
   - Restart the server if WebSocket connections are not working

4. **Real-time logs not updating**

   - Check that the agent is actively generating logs
   - WebSocket polls for new logs every 5 seconds
   - Verify CloudWatch Logs permissions are configured correctly

5. **Docker build fails**
   - Ensure Docker daemon is running
   - Check available disk space in /tmp directory

### Getting Help

For issues or questions:

1. Check the CloudWatch logs for detailed error messages
2. Use the debug endpoints to troubleshoot log group issues
3. Verify all required environment variables are set
