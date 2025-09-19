import os
import json
import logging
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('solana_trader.log')
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI(
    title="Solana Trader API",
    description="API for Solana trading agent code generation and baseline function creation",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CodeRequest(BaseModel):
    prompt: str
    history: Optional[List[str]] = Field(default_factory=list)

class PromptRequest(BaseModel):
    prompt: str
    history: Optional[List[str]] = Field(default_factory=list)

@app.get("/")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy", 
        "blockchain": "Solana", 
        "network": "mainnet-beta",
        "description": "Solana Trading Agent Code Generation API"
    }

@app.post("/code", summary="Generate Solana trading agent code")
async def generate_code(request: CodeRequest):
    """
    Generate JavaScript code for a Solana trading agent based on the provided prompt.
    
    Args:
        request: CodeRequest containing the prompt and optional history
        
    Returns:
        Dict containing the generated code, bot type, description, and complete function
    """
    logger.info(f"Generating Solana code for prompt: {request.prompt[:100]}...")
    
    try:
        from coder import code
        result = code(prompt=request.prompt)
        logger.info("Solana code generation completed successfully")
        return result
    except Exception as e:
        logger.error(f"Error generating Solana code: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/prompt", summary="Evaluate and improve a Solana trading agent prompt")
async def process_prompt(request: PromptRequest):
    """
    Process a Solana trading agent prompt, evaluate it, and provide improvement suggestions.
    
    Args:
        request: PromptRequest containing the prompt and optional history
        
    Returns:
        Dict containing the evaluation results and improvement suggestions
    """
    logger.info(f"Processing Solana prompt request: {request.prompt[:100]}...")
    
    try:
        from prompt import improve_prompt
        result = improve_prompt(prompt=request.prompt, history=request.history)
        logger.info("Solana prompt processing completed successfully")
        return result
    except Exception as e:
        logger.error(f"Error processing Solana prompt: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tokens", summary="Get popular Solana tokens")
async def get_tokens():
    """
    Get the list of popular Solana tokens.
    
    Returns:
        Dict containing popular token information
    """
    try:
        from variables import POPULAR_TOKENS
        return {
            "success": True,
            "tokens": POPULAR_TOKENS,
            "blockchain": "Solana",
            "network": "mainnet-beta",
            "note": "This is a subset of popular tokens. Jupiter API provides access to all Solana tokens."
        }
    except Exception as e:
        logger.error(f"Error getting tokens: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status", summary="Get API status")
async def get_status():
    """
    Get the current status of the Solana Trader API.
    
    Returns:
        Dict containing API status information
    """
    return {
        "status": "healthy",
        "blockchain": "Solana",
        "network": "mainnet-beta",
        "supported_operations": [
            "token_swap",
            "token_transfer", 
            "price_monitoring",
            "scheduled_trading",
            "balance_checking"
        ],
        "bot_types": [
            "dca",      # Dollar Cost Averaging with scheduling
            "range"     # Price-based range trading
        ],
        "endpoints": {
            "POST /code": "Generate Solana trading agent code",
            "POST /prompt": "Evaluate and improve trading agent prompts",
            "GET /tokens": "Get popular Solana tokens",
            "GET /status": "Get API status"
        },
        "features": [
            "Jupiter integration for token swaps",
            "Privy wallet management",
            "Price monitoring and alerts",
            "Scheduled execution (DCA)",
            "Continuous monitoring (Range)",
            "Comprehensive error handling",
            "Real-time status updates"
        ]
    }

@app.get("/templates", summary="Get baseline function templates")
async def get_templates():
    """
    Get the available baseline function templates.
    
    Returns:
        Dict containing template information
    """
    try:
        from variables import BASELINE_DCA_TEMPLATE, BASELINE_RANGE_TEMPLATE
        return {
            "success": True,
            "templates": {
                "dca": {
                    "name": "DCA (Dollar Cost Averaging)",
                    "description": "Scheduled trading with regular intervals or specific times",
                    "features": ["Scheduled execution", "Immediate execution", "Balance monitoring"],
                    "template": BASELINE_DCA_TEMPLATE
                },
                "range": {
                    "name": "Range/Price Monitoring",
                    "description": "Continuous price monitoring with conditional execution",
                    "features": ["Price monitoring", "Conditional execution", "Real-time alerts"],
                    "template": BASELINE_RANGE_TEMPLATE
                }
            }
        }
    except Exception as e:
        logger.error(f"Error getting templates: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/examples", summary="Get example prompts and generated code")
async def get_examples():
    """
    Get example prompts and their generated code for reference.
    
    Returns:
        Dict containing example prompts and code
    """
    examples = [
        {
            "prompt": "Create a DCA bot that buys 0.01 SOL worth of USDC every day at 9 AM UTC",
            "botType": "dca",
            "description": "Daily DCA purchase with scheduled execution",
            "features": ["Scheduled trading", "Time-based execution", "Balance checking"]
        },
        {
            "prompt": "Create a range bot that swaps 1 USDC to SOL when SOL price drops below $100",
            "botType": "range", 
            "description": "Price-triggered swap with continuous monitoring",
            "features": ["Price monitoring", "Conditional execution", "Real-time alerts"]
        },
        {
            "prompt": "Swap 0.5 SOL to BTC immediately",
            "botType": "range",
            "description": "Immediate token swap execution",
            "features": ["Immediate execution", "Balance validation", "Error handling"]
        },
        {
            "prompt": "Create a DCA bot that buys 10 USDC worth of ETH every 6 hours",
            "botType": "dca",
            "description": "High-frequency DCA with interval-based execution",
            "features": ["Interval scheduling", "Automated execution", "Balance monitoring"]
        }
    ]
    
    return {
        "success": True,
        "examples": examples,
        "note": "These are example prompts. The actual generated code will vary based on the specific requirements."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
