# 🤖 EVM & Solana Trading Agents

A comprehensive suite of automated trading agents for EVM-compatible blockchains and Solana, featuring AI-powered code generation, automated deployment, and intelligent trading strategies.

## 🏗️ Project Structure

### 🟣 **Solana Agents** (`solana-agents/`) - **Latest & Recommended**
Advanced Solana trading agents with AI-powered custom bot generation:

- **[`baseline/`](solana-agents/baseline/)** - Trading agent execution engine with DCA, Range, and Custom bots
- **[`deployer/`](solana-agents/deployer/)** - AWS deployment service with custom bot support
- **[`code-generation/`](solana-agents/code-generation/)** - AI code generation API for custom trading strategies

### 🔷 **EVM Agents** (`agent-deployer/`, `baseline/`, `code-generation/`) - **Legacy**
Original EVM-based trading agents for Polygon and other EVM chains:

- **[`agent-deployer/`](agent-deployer/)** - EVM agent deployment service
- **[`baseline/`](baseline/)** - EVM trading agent execution
- **[`code-generation/`](code-generation/)** - EVM code generation API

### 🌐 **Frontend** (`frontend/`)
React-based web interface for agent management and deployment.

## 🚀 Quick Start

### Solana Agents (Recommended)

```bash
# 1. Start the baseline execution engine
cd solana-agents/baseline
pnpm install
node server.js

# 2. Start the code generation API
cd ../code-generation
pip install -r requirements.txt
python api.py

# 3. Start the deployer service
cd ../deployer
npm install
node index.js
```

### Custom Bot Deployment

Deploy AI-generated custom trading bots using natural language:

```bash
curl -X POST "http://localhost:8080/deploy-agent" \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "agentId": "my-custom-bot",
    "ownerAddress": "your-solana-address",
    "botType": "custom",
    "swapConfig": {
      "prompt": "Buy 0.1 SOL with USDC every hour if Bitcoin is above $50000"
    }
  }'
```

## 🤖 Bot Types

| Type | Description | Use Case | Complexity |
|------|-------------|----------|------------|
| **DCA** | Dollar Cost Averaging with scheduled execution | Regular investing, automated DCA | Simple |
| **Range** | Price-based trading with condition monitoring | Market timing, limit orders | Medium |
| **Custom** | AI-generated strategies from natural language | Complex multi-condition strategies | High |

## 🔧 Features

### Solana Agents
- ✅ **AI-Powered Code Generation** - Natural language to trading strategies
- ✅ **Three Bot Types** - DCA, Range, and Custom bots
- ✅ **Intelligent Execution** - Automatic pattern detection (immediate, scheduled, price-monitoring, hybrid)
- ✅ **Jupiter Integration** - Optimized Solana token swaps
- ✅ **Twitter Integration** - Tweet-triggered trading strategies
- ✅ **AWS Deployment** - Automated containerized deployment
- ✅ **Real-time Monitoring** - Web dashboard and API endpoints

### EVM Agents (Legacy)
- ✅ **Polygon Integration** - EVM-compatible trading
- ✅ **LiFi Integration** - Cross-chain swaps
- ✅ **Basic Code Generation** - Template-based code generation
- ✅ **AWS Deployment** - Containerized deployment

## 📊 Architecture

### Solana System Architecture
```
User Prompt → AI Code Generation → Deployer Integration → Container Deployment → Trading Execution
```

### Key Components
- **Code Generation API**: Converts natural language to executable trading strategies
- **Deployer Service**: Handles AWS deployment and container management  
- **Baseline Engine**: Executes trading strategies with real-time monitoring
- **Web Dashboard**: Provides real-time status and log monitoring

## 🔗 Links

- **Solana Baseline**: http://localhost:3000 (execution engine)
- **Code Generation API**: http://localhost:8000 (AI code generation)
- **Deployer Service**: http://localhost:8080 (deployment management)
- **Frontend**: http://localhost:5173 (web interface)

## 📚 Documentation

- [Solana Baseline README](solana-agents/baseline/README.md) - Execution engine documentation
- [Solana Deployer README](solana-agents/deployer/README.md) - Deployment service documentation  
- [Code Generation README](solana-agents/code-generation/README.md) - AI code generation documentation
- [EVM Agent Deployer README](agent-deployer/README.md) - Legacy EVM deployment
- [Frontend README](frontend/README.md) - Web interface documentation

## 🚀 Migration from EVM to Solana

The Solana implementation offers significant advantages over the EVM version:

- **AI-Powered**: Natural language trading strategy generation
- **More Bot Types**: Custom bots in addition to DCA and Range
- **Better Performance**: Optimized for Solana's speed and low fees
- **Enhanced Features**: Twitter integration, hybrid strategies, intelligent execution

For new projects, use the **Solana agents** (`solana-agents/`) instead of the legacy EVM system.

---

**Built with ❤️ for the DeFi community**
