import os
import json
from typing import Dict, List, Any, Optional, Union, Tuple

# LangChain imports
from langchain.agents import Tool, AgentExecutor, create_openai_functions_agent
from langchain.memory import ConversationBufferMemory
from langchain.schema import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory

# Set your OpenAI API key
from dotenv import load_dotenv
from variables import POPULAR_TOKENS

# Load environment variables from .env file
load_dotenv()

# Get OpenAI API key from environment variables
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")


OUTPUT_FORMAT = {
  "rating": "<1–10>",
  "justification": "<one-sentence explanation of your score>",
  "questions": [
    "Question 1…",
    "Question 2…",
    "..."
  ]
}

def improve_prompt(prompt: str, history: List[str] = None) -> Dict[str, Any]:

    model = ChatOpenAI(model="gpt-5")

    if history is None:
        history = []

    formatted_history = "\n".join(history) if history else "No previous conversation"

    prompt_template = ChatPromptTemplate.from_messages([
    ("system", """
You are <Agent S0>, a Solana trading agent launcher created by Xade for Solana blockchain.

You are tasked with helping users create prompts to launch trading agents on Solana blockchain.

You will be called repeatedly until the prompt is acceptable. Each time you receive:
  - A full draft of the user's system prompt (their new version or their previous one along with answers to your questions)
  - Any previous dialogue about the prompt
  - The same context inputs:
    - Agent Name
    - Agent Description
    - Trading Strategy

Based on the same, you will assign a rating to the prompt on a scale of 1-10.
Additionally, you will provide a list of questions that the user should address with the prompt.
     
Previous Dialogue:
{HISTORY}

Here are some resources to help you in your task:
  1. Documentation for Popular Tokens:
    {TOKENS}
  This documentation contains information about popular tokens on Solana, so you can validate any token symbols the user provides.
  2. Blockchain Information:
  The agent will be working on the Solana blockchain (mainnet-beta). The DEX used will be Jupiter for token swaps. Do not ask questions about this.

When you are provided the prompt:
1. Evaluate the draft prompt for clarity and fitness to its specific strategy. (A simple swap requires very few parameters, while a complex Twitter-triggered DCA agent requires many parameters)
2. Assign a score (1–10) based only on clarity of intent and requirements. Do NOT be strict with the score.
3. Justify your score in one concise sentence.  
4. Ask only the follow-up questions necessary to fill gaps that may not allow generation of code to autonomously execute the trading position.

INTELLIGENT STRATEGY DETECTION:
The system can automatically detect and handle these execution patterns:
- **IMMEDIATE EXECUTION**: Simple swaps, transfers, one-time operations
- **SCHEDULED EXECUTION (DCA)**: Time-based recurring operations (daily, weekly, monthly, specific times)
- **EVENT-DRIVEN MONITORING**: Price monitoring, Twitter triggers, market conditions (checked every 1 minute)
- **HYBRID STRATEGIES**: Combinations of the above

Focus your questions on:
- Token symbols and amounts (if not clear)
- Specific conditions for event-driven strategies
- Time specifications for scheduled strategies
- Risk parameters and limits
- Any ambiguous requirements

Output Format: 
> - Output Structured JSON with only the following keys:
> - rating (number between 1 and 10)
> - justification (one sentence explanation of your score)
> - questions (list of questions)

> **Notes:**
> - Authentication and transaction signing is handled automatically; omit related questions.  
> - All execution-failure handling and error recovery is handled automatically. Do not bother the user with such issues.
> - Limit questions to the clarity of the prompt and strategy requirements.
> - Avoid over-engineering: for simple strategies, skip irrelevant details.  
> - Be consistent with your ratings.
> - The system is intelligent and can auto-detect execution patterns, so focus on strategy-specific details.
"""),
    ("human", "{input}")
])
    
    formatted_prompt = prompt_template.format(
        input=prompt, 
        HISTORY=formatted_history, 
        TOKENS=json.dumps(POPULAR_TOKENS, indent=2)
    )
    
    response = model.invoke(formatted_prompt).content

    print(response)
    
    # Handle JSON response wrapped in markdown code blocks
    if response.startswith('```json'):
        response = response.replace('```json', '').replace('```', '').strip()
    elif response.startswith('```'):
        response = response.replace('```', '').strip()
    
    result = json.loads(response)
    
    history.extend([
        "Human: "+formatted_prompt,
        "AI: "+str(result)
    ])

    return {
        "response": result,
        "history": history
    }
