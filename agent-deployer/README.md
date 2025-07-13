# EVM Agent Deployer

A service for deploying EVM agents on AWS App Runner with automated deployment and configuration.

## Features

- Deploy EVM agents to AWS App Runner
- API key authentication for secure access
- Modular code structure for maintainability
- Integration with Polygon blockchain and EVM-compatible networks
- Automated environment variable configuration
- Docker containerization for consistent deployment

## Project Structure

```
evm-agent-deployer/
├── index.js          # Main server with routes and authentication
├── deploy.js         # EVM agent deployment logic
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

# Check server health
curl -H "x-api-key: Xade_dev1" http://localhost:3000/
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

3. **Docker build fails**
   - Ensure Docker daemon is running
   - Check available disk space in /tmp directory

### Getting Help

For issues or questions:

1. Check the CloudWatch logs for detailed error messages
2. Use the debug endpoints to troubleshoot log group issues
3. Verify all required environment variables are set
