# 🤖 Solana Trading Agent Code Generation API

## Overview

This API provides intelligent code generation capabilities for Solana-based trading agents. It automatically detects trading patterns and generates complete baseline functions that can handle immediate execution, scheduled trading (DCA), price monitoring, Twitter triggers, and hybrid strategies.

## Features

- **Intelligent Pattern Detection**: Automatically determines execution type from user prompts
- **Complete Code Generation**: Generates full baseline functions, not just snippets
- **Multi-Strategy Support**: Handles immediate, scheduled, event-driven, and hybrid trading strategies
- **Comprehensive Validation**: Syntax checking, linting, and AI-powered guardrails
- **Jupiter Integration**: Full support for Solana token swaps via Jupiter
- **Price & Market Data**: Real-time price monitoring and market data integration
- **Twitter Integration**: Twitter-based trading triggers with keyword filtering
- **Scheduling System**: Advanced scheduling for DCA and time-based strategies

## Architecture

```
User Prompt → Pattern Detection → Code Generation → Validation → Guardrails → Complete Baseline Function
```

### Components

- **`variables.py`**: Contains all constants, API documentation, templates, and prompts
- **`coder.py`**: Intelligent code generation and validation logic
- **`prompt.py`**: Prompt evaluation and improvement system
- **`api.py`**: FastAPI server with REST endpoints

## Setup

### Prerequisites

- Python 3.8+
- OpenAI API key
- Access to Solana mainnet

### Installation

1. Navigate to the code-generation directory:

```bash
cd solana-agents/code-generation
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create a `.env` file with your OpenAI API key:

```bash
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env
```

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

### Code Generation

```http
POST /code
Content-Type: application/json

{
  "prompt": "Create a DCA bot that buys 10 USDC worth of SOL every day at 9 AM UTC",
  "history": []
}
```

Generates a complete baseline function for the trading strategy.

**Response:**
```json
{
  "code": "export async function baselineFunction(ownerAddress, config = {}) { ... }",
  "executionType": "scheduled",
  "description": "Daily DCA of 10 USDC into SOL at 9 AM UTC",
  "monitoringInterval": null,
  "completeFunction": "..."
}
```

### Prompt Evaluation

```http
POST /prompt
Content-Type: application/json

{
  "prompt": "Buy SOL when price drops below $100",
  "history": []
}
```

Evaluates and provides improvement suggestions for trading prompts.

### Get Popular Tokens

```http
GET /tokens
```

Returns popular Solana tokens with mint addresses and metadata.

### Get Templates

```http
GET /templates
```

Returns available baseline function templates and their descriptions.

### Get Examples

```http
GET /examples
```

Returns example prompts and their expected outputs.

### API Status

```http
GET /status
```

Returns detailed API status and supported operations.

## Intelligent Execution Patterns

The system automatically detects and implements the appropriate execution pattern:

### 1. Immediate Execution
**Triggers:** "swap now", "buy immediately", "transfer"
**Behavior:** Executes immediately after wallet setup and balance check

**Example:**
```
"Swap 1 SOL to USDC now"
```

### 2. Scheduled Execution (DCA)
**Triggers:** "daily", "weekly", "monthly", "every X hours", "at 9 AM"
**Behavior:** Uses scheduling system for time-based recurring operations

**Examples:**
```
"Buy 10 USDC worth of SOL every day at 9 AM UTC"
"DCA 0.1 SOL into BTC weekly"
```

### 3. Event-Driven Monitoring (1-minute intervals)
**Triggers:** "when price", "above", "below", "tweets", "@username"
**Behavior:** Monitors conditions every 60 seconds and executes when met

**Examples:**
```
"Buy 0.01 SOL worth of BTC when SOL price goes above $150"
"Swap 1 USDC to SOL when @elonmusk tweets about crypto"
```

### 4. Hybrid Strategies
**Triggers:** Multiple conditions combined
**Behavior:** Combines scheduling with event monitoring

**Examples:**
```
"DCA 5 USDC into SOL daily, but only when SOL is below $120"
```

## Supported Operations

### Token Operations
- **Token Swaps**: Jupiter-powered swaps between any Solana tokens
- **Token Transfers**: Native SOL and SPL token transfers
- **Balance Checking**: Real-time wallet balance monitoring

### Market Data
- **Price Monitoring**: Real-time price feeds via Mobula API
- **Market Data**: Comprehensive market statistics and trends
- **Price Conditions**: Automated price threshold monitoring

### Social Integration
- **Twitter Monitoring**: Monitor Twitter accounts for new tweets
- **Keyword Filtering**: Filter tweets by specific keywords
- **Real-time Alerts**: Instant notifications for social triggers

### Scheduling
- **Interval Scheduling**: Execute at regular intervals
- **Time-based Scheduling**: Execute at specific times
- **Timezone Support**: Full timezone support for global users

## Code Generation Process

1. **Prompt Analysis**: Parse user requirements and identify execution pattern
2. **Pattern Detection**: Automatically determine immediate, scheduled, or event-driven
3. **Configuration Generation**: Create appropriate configuration objects
4. **Code Generation**: Generate complete baseline function using OpenAI
5. **Syntax Validation**: Check for JavaScript syntax errors using esprima
6. **Linting**: Perform code quality checks and common error detection
7. **Guardrails**: AI-powered code correction and refinement
8. **Final Output**: Return validated and corrected complete function

## Generated Function Structure

All generated functions follow this structure:

```javascript
export async function baselineFunction(ownerAddress, config = {}) {
    // Configuration extraction
    const { fromToken, toToken, amount, executionType, ... } = config;
    
    // Wallet initialization
    const wallet = await getOrCreateWallet(ownerAddress);
    await waitForBalance(wallet.walletAddress, 0.005);
    
    // Execution pattern handling
    switch (executionType) {
        case 'immediate':
            return await handleImmediateExecution(ownerAddress, wallet, config);
        case 'scheduled':
            return await handleScheduledExecution(ownerAddress, wallet, config);
        case 'price_monitoring':
            return await handlePriceMonitoring(ownerAddress, wallet, config);
        case 'twitter_trigger':
            return await handleTwitterTrigger(ownerAddress, wallet, config);
    }
}
```

## Error Handling

The API includes comprehensive error handling:

- **Syntax Errors**: Automatic detection and correction using esprima
- **Lint Errors**: Code quality checks and best practice enforcement
- **API Errors**: Graceful handling of external API failures
- **Validation Errors**: Input validation and sanitization
- **Runtime Errors**: Comprehensive try-catch blocks in generated code

## Usage Examples

### Simple Swap
```json
{
  "prompt": "Swap 1 SOL to USDC immediately"
}
```

**Generated:** Immediate execution function with balance checking and error handling.

### DCA Strategy
```json
{
  "prompt": "Buy 10 USDC worth of SOL every day at 9 AM UTC"
}
```

**Generated:** Scheduled execution function with daily timer at specific UTC time.

### Price Monitoring
```json
{
  "prompt": "Buy 0.01 SOL worth of BTC when SOL price goes above $150"
}
```

**Generated:** Price monitoring function that checks SOL price every 60 seconds.

### Twitter Trigger
```json
{
  "prompt": "Swap 5 USDC to SOL when @elonmusk tweets about Solana"
}
```

**Generated:** Twitter monitoring function that checks for new tweets every 60 seconds.

### Complex Strategy
```json
{
  "prompt": "DCA 20 USDC into BTC weekly, but only execute if BTC is below $45000"
}
```

**Generated:** Hybrid function combining weekly scheduling with price conditions.

## Development

### Adding New Execution Patterns

1. Update `INTELLIGENT EXECUTION PATTERNS` in `variables.py`
2. Add pattern detection keywords to `AUTOMATIC PATTERN DETECTION`
3. Implement handler function in the unified baseline template
4. Update validation logic in `coder.py`

### Extending Token Support

The system uses Jupiter's token list for comprehensive Solana token support. Popular tokens are cached in `POPULAR_TOKENS` for quick reference.

### Adding New APIs

1. Add API documentation to `HELPER_FUNCTIONS` in `variables.py`
2. Include usage examples in `TRANSACTIONS_USAGE`
3. Update the coder prompt with new capabilities
4. Test with various prompt scenarios

## Security Considerations

- API keys are stored in environment variables
- No sensitive data is logged
- Input validation on all endpoints
- Rate limiting should be implemented in production
- Generated code includes comprehensive error handling

## Production Deployment

For production deployment:

1. Use a production WSGI server (Gunicorn)
2. Implement proper logging and monitoring
3. Add rate limiting and authentication
4. Use environment-specific configuration
5. Set up health checks and alerting
6. Configure proper CORS policies

## Testing

Run the test suite:

```bash
python test_api.py
```

This will test all endpoints and validate the code generation pipeline.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is part of the Xade AI trading agent platform.

## Support

For support and questions, please refer to the main project documentation or create an issue in the repository.
