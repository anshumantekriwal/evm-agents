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
        logging.FileHandler('evm_trader.log')
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI(
    title="EVM Trader API",
    description="API for EVM trading agent code generation and prompt improvement",
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

class PromptRequest(BaseModel):
    prompt: str
    history: Optional[List[str]] = Field(default_factory=list)

class CodeRequest(BaseModel):
    prompt: str
    history: Optional[List[str]] = Field(default_factory=list)

@app.get("/")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "blockchain": "EVM", "primary_chain": "Polygon"}

# @app.post("/prompt", summary="Evaluate and improve a trading agent prompt")
# async def process_prompt(request: PromptRequest):
#     """
#     Process a trading agent prompt, evaluate it, and provide improvement suggestions.
    
#     Args:
#         request: PromptRequest containing the prompt and optional history
        
#     Returns:
#         Dict containing the evaluation results and improvement suggestions
#     """
#     logger.info(f"Processing prompt request: {request.prompt[:100]}...")
    
#     try:
#         from prompt import improve_prompt
#         result = improve_prompt(prompt=request.prompt, history=request.history)
#         logger.info("Prompt processing completed successfully")
#         return result
#     except Exception as e:
#         logger.error(f"Error processing prompt: {str(e)}", exc_info=True)
#         raise HTTPException(status_code=500, detail=str(e))

@app.post("/code", summary="Generate code for a trading agent")
async def generate_code(request: CodeRequest):
    """
    Generate JavaScript code for a trading agent based on the provided prompt.
    
    Args:
        request: CodeRequest containing the prompt and optional history
        
    Returns:
        Dict containing the generated code and execution interval
    """
    logger.info(f"Generating code for prompt: {request.prompt[:100]}...")
    
    try:
        from coder import code
        result = code(prompt=request.prompt)
        logger.info("Code generation completed successfully")
        return result
    except Exception as e:
        logger.error(f"Error generating code: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# @app.get("/tokens", summary="Get available tokens")
# async def get_tokens():
#     """
#     Get the list of available tokens for EVM blockchains.
    
#     Returns:
#         Dict containing token information
#     """
#     try:
#         from variables import TOKENS
#         return {
#             "success": True,
#             "tokens": TOKENS,
#             "supported_chains": ["137"],  # Polygon mainnet
#             "primary_chain": "137"
#         }
#     except Exception as e:
#         logger.error(f"Error getting tokens: {str(e)}", exc_info=True)
#         raise HTTPException(status_code=500, detail=str(e))

@app.get("/status", summary="Get API status")
async def get_status():
    """
    Get the current status of the EVM Trader API.
    
    Returns:
        Dict containing API status information
    """
    return {
        "status": "healthy",
        "blockchain": "EVM",
        "primary_chain": "Polygon (137)",
        "supported_operations": [
            "token_transfer",
            "token_swap",
            "price_quotes"
        ],
        "endpoints": {
            "POST /prompt": "Evaluate and improve trading agent prompts",
            "POST /code": "Generate trading agent code",
            "GET /tokens": "Get available tokens",
            "GET /status": "Get API status"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 