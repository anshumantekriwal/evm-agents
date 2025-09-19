# 🤖 EVM Trading Agent Code Generation API

> **Note**: This is the EVM version of the code generation system. For the newer Solana implementation with enhanced AI capabilities, see [`solana-agents/code-generation/`](../solana-agents/code-generation/).

## Overview

This API provides code generation capabilities for EVM-based trading agents, specifically designed for Polygon mainnet (Chain ID 137). It follows the same pattern as the Kadena trading agent system but is adapted for EVM blockchains.

## Features

- **Prompt Evaluation**: Evaluate and improve trading agent prompts
- **Code Generation**: Generate JavaScript code for trading agents
- **Token Support**: Full support for Polygon tokens using the existing `tokens.json`
- **Syntax Checking**: Automatic JavaScript syntax validation
- **Code Guardrails**: AI-powered code correction and refinement
- **LiFi Integration**: Cross-chain and same-chain swap capabilities

## Architecture

```
User Request → Prompt Evaluation → Code Generation → Syntax Check → Guardrails → Final Code
```

### Components

- **`variables.py`**: Contains all constants, API documentation, and baseline templates
- **`prompt.py`**: Handles prompt evaluation and improvement
- **`coder.py`**: Generates and validates JavaScript code
- **`api.py`**: FastAPI server with REST endpoints

## Setup

### Prerequisites

- Python 3.8+
- OpenAI API key
- Access to the baseline `tokens.json` file

### Installation

1. Clone the repository and navigate to the `evm-codegen` directory:

```bash
cd evm-codegen
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create a `.env` file with your OpenAI API key:

```bash
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env
```

4. Ensure the `baseline/tokens.json` file is accessible (should be in the parent directory)

### Running the API

```bash
python api.py
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Health Check

```http
GET /
```

Returns basic health status and blockchain information.

### Prompt Evaluation

```http
POST /prompt
Content-Type: application/json

{
  "prompt": "Create a DCA agent that buys POL every day",
  "history": []
}
```

Evaluates a trading agent prompt and provides improvement suggestions.

### Code Generation

```http
POST /code
Content-Type: application/json

{
  "prompt": "Create a DCA agent that buys POL every day",
  "history": []
}
```

Generates JavaScript code for the trading agent.

### Get Tokens

```http
GET /tokens
```

Returns available tokens for EVM blockchains.

### API Status

```http
GET /status
```

Returns detailed API status and supported operations.

## Usage Examples

### Example 1: Simple DCA Agent

**Prompt:**

```
Create a DCA (Dollar Cost Averaging) agent that buys 10 USDC.e worth of POL every day at 9 AM UTC.
```

**Generated Code:**

```javascript
async function baselineFunction() {
  try {
    // 1. Create or get wallet
    console.log("Creating wallet...");
    const wallet = await createWallet();
    console.log("Wallet created successfully:", wallet.address);

    // 2. Load current balances
    const balances = await getBalances(wallet.address);
    console.log("Current balances:", balances);

    // 3. Create transaction
    console.log("Creating transaction...");

    // ENTER AI CODE HERE
    const transaction = await swap({
      tokenInAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC.e
      tokenOutAddress: "0x0000000000000000000000000000000000000000", // POL
      account: wallet.address,
      amountIn: "10.0",
      chainId: "137",
    });
    // END AI CODE

    console.log("Transaction created:", transaction);
    // ... rest of the function
  } catch (error) {
    console.error("Error in baseline function:", error);
    throw error;
  }
}
```

### Example 2: Price Monitoring Agent

**Prompt:**

```
Create an agent that monitors POL price and sells 50% of holdings if price drops below $0.8.
```

## Token Support

The system uses the existing `baseline/tokens.json` file which contains comprehensive token information for Polygon mainnet, including:

- **Native Token**: POL (0x0000000000000000000000000000000000000000)
- **Stablecoins**: USDC.e, USDT, DAI
- **Major Tokens**: WETH, WBTC, BNB, SOL
- **DeFi Tokens**: Various DeFi protocol tokens

## Supported Operations

### Token Transfers

- Transfer any token between addresses
- Support for native POL and ERC-20 tokens
- Gas estimation and optimization

### Token Swaps

- Same-chain swaps using LiFi
- Cross-chain swaps (if needed)
- Slippage protection
- Price impact calculation

### Price Quotes

- Real-time price feeds
- Token value calculations
- Market data integration

## Code Generation Process

1. **Prompt Analysis**: Parse user requirements and validate token addresses
2. **Strategy Planning**: Create step-by-step execution plan
3. **Code Generation**: Generate JavaScript code using OpenAI
4. **Syntax Validation**: Check for JavaScript syntax errors
5. **Linting**: Perform basic code quality checks
6. **Guardrails**: AI-powered code correction and refinement
7. **Final Output**: Return validated and corrected code

## Error Handling

The API includes comprehensive error handling:

- **Syntax Errors**: Automatic detection and correction
- **Token Validation**: Verify token addresses and symbols
- **API Errors**: Graceful handling of external API failures
- **Code Quality**: Linting and best practice enforcement

## Development

### Adding New Tokens

Tokens are managed through the `baseline/tokens.json` file. To add new tokens:

1. Add token information to `tokens.json`
2. Include chain ID, address, symbol, name, and decimals
3. The system will automatically recognize new tokens

### Extending Functionality

To add new operations:

1. Update `TRANSACTIONS_CODE` in `variables.py`
2. Add corresponding API documentation
3. Update the coder prompt with new examples
4. Test with the API endpoints

## Security Considerations

- API keys are stored in environment variables
- No sensitive data is logged
- Input validation on all endpoints
- Rate limiting should be implemented in production

## Production Deployment

For production deployment:

1. Use a production WSGI server (Gunicorn)
2. Implement proper logging and monitoring
3. Add rate limiting and authentication
4. Use environment-specific configuration
5. Set up health checks and alerting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is part of the Xade AI trading agent platform.
