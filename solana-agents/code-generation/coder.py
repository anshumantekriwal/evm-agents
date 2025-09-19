import os
import json
from typing import Dict, Any
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
import re
import esprima
from langchain.schema import HumanMessage, SystemMessage
from dotenv import load_dotenv
from variables import (
    TRANSACTIONS_CODE, 
    TRANSACTIONS_USAGE, 
    HELPER_FUNCTIONS, 
    UNIFIED_BASELINE_TEMPLATE,
    CODER_PROMPT, 
    STATUS_FORMAT
)

# Load environment variables
load_dotenv()

# Get OpenAI API key from environment variables
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")


def _syntax_check(js_code: str) -> str | None:
    """Parse with esprima to catch syntax errors."""
    print("🔍 Running syntax check…")
    try:
        # First try to parse as-is (for complete functions)
        try:
            esprima.parseScript(js_code)
            print("✅ Syntax looks good")
            return None
        except:
            # If that fails, try wrapping in an async function
            wrapped_code = f"async function testFunction() {{\n{js_code}\n}}"
            esprima.parseScript(wrapped_code)
            print("✅ Syntax looks good")
            return None
    except Exception as e:
        err = str(e).split("\n")[0]
        print(f"❌ Syntax error: {err}")
        return err


def _lint_check(js_code: str) -> str | None:
    """
    Shallow lint via regex for common JavaScript issues:
    - const reassignment
    - missing await in async functions
    - suspicious comparison operators
    - undefined variables (basic check)
    """
    print("🔍 Running lint check…")
    errors = []

    # 1) const reassignment
    for const_match in re.finditer(r'\bconst\s+([A-Za-z_$][0-9A-Za-z_$]*)', js_code):
        name = const_match.group(1)
        # look for a second assignment to that name
        rest = js_code[const_match.end():]
        if re.search(rf'\b{name}\s*=', rest):
            errors.append(f"Cannot reassign const `{name}`")

    # 2) missing await for async calls (common patterns)
    async_patterns = [
        r'\bswap\(',
        r'\btransfer\(',
        r'\bgetBalances\(',
        r'\bprice\(',
        r'\bmarketData\(',
        r'\bgetTokenMintAddress\(',
        r'\bcheckPriceCondition\(',
        r'\bwaitForBalance\('
    ]
    
    for pattern in async_patterns:
        calls = re.findall(pattern, js_code)
        awaited = re.findall(rf'await\s+{pattern}', js_code)
        if len(calls) > len(awaited):
            func_name = pattern.replace(r'\b', '').replace(r'\(', '')
            errors.append(f"Missing `await` for `{func_name}()` call")

    # 3) Check for proper error handling
    if 'try' in js_code and 'catch' not in js_code:
        errors.append("Found `try` block without corresponding `catch`")

    # 4) Check for logger usage instead of console.log
    if 'console.log' in js_code:
        errors.append("Use `logger.log()` instead of `console.log()`")

    if errors:
        print(f"❌ Lint issues found ({len(errors)}):", errors)
        return "\n".join(errors)
    print("✅ Lint looks good (shallow checks)")
    return None


def _invoke_guardrail(original: dict, syntax_err: str | None, lint_err: str | None) -> dict:
    """AI-powered code correction and refinement."""
    print("🤖 Invoking guardrail model…")
    guard = ChatOpenAI(model="gpt-5")
    system = SystemMessage(
"""
You are a Solana JavaScript code specialist whose sole job is to correct and refine trading-agent code snippets.

You will receive JSON with these fields:
  • code       — Complete baseline function JavaScript code for Solana trading operations
  • executionType — "immediate", "scheduled", "price_monitoring", "twitter_trigger", or "hybrid"
  • description — Description of what the function does
  • monitoringInterval — Interval in milliseconds (if applicable)

You may also receive:
  • syntax_errors — String describing any parser errors
  • lint_errors   — String describing any lint warnings

Your job is to ensure that there are no errors in the code or logic and correct any issues/mistakes.
Do not change the code unnecessarily, but fix any issues/mistakes.
Ignore any undefined-reference errors for functions like swap(), getBalances(), logger.log(), etc. (those functions are pre-defined).

For any linting errors, consider whether the error is significant enough to break the code. If it is, fix it. If it is not, ignore it.

If there are no errors, simply return the original code.
If there are errors, fix them and return the corrected code.

IMPORTANT RULES:
- The code should be a COMPLETE baseline function
- Include proper function signature: export async function baselineFunction(ownerAddress, config = {})
- Include all necessary helper functions and logic
- Ensure proper error handling with try-catch blocks
- Use logger.log() and logger.error() for logging
- Use updateStatus() for status updates
- Use await for all async operations
- Make sure intervals are appropriate (60000ms for event-driven monitoring)
- ALWAYS export the function (never use default exports)
- ALWAYS use balances.allBalances when accessing balance data from getBalances()

Output valid JSON with the same structure as input.
Do NOT include any markdown, comments, or extra keys—just the JSON.

Output Format:
```json
{{
  "code": "<corrected complete baseline function>",
  "executionType": "<execution type>",
  "description": "<description of what the function does>",
  "monitoringInterval": <interval in ms or null>
}}
```
"""
    )
    human = HumanMessage(
        f"Here is the code to review:\n```js\n{original['code']}\n```\n\n"
        f"Execution Type: {original.get('executionType', 'unknown')}\n"
        f"Description: {original.get('description', 'No description')}\n"
        f"Monitoring Interval: {original.get('monitoringInterval', 'None')}\n\n"
        f"Syntax errors: {syntax_err or 'None'}\n"
        f"Lint errors: {lint_err or 'None'}\n\n"
    )
    resp = guard.invoke([system, human]).content.strip()
    
    # Strip markdown fences if present
    if resp.startswith("```"):
        resp = resp.strip("```json").strip("```").strip()
    
    try:
        return json.loads(resp)
    except json.JSONDecodeError:
        print("⚠️ Guardrail returned invalid JSON, using original")
        return original


def parse_model_output(output_content):
    """
    Parse the model output to extract JSON response.
    Handles various output formats including markdown code blocks.
    """
    try:
        # Remove markdown code block formatting if present
        content = output_content.strip()
        
        # Check if content is wrapped in markdown code blocks
        if content.startswith('```json'):
            # Extract content between ```json and ```
            start_idx = content.find('```json') + 7
            end_idx = content.rfind('```')
            if end_idx > start_idx:
                content = content[start_idx:end_idx].strip()
        elif content.startswith('```'):
            # Extract content between ``` and ```
            start_idx = content.find('```') + 3
            end_idx = content.rfind('```')
            if end_idx > start_idx:
                content = content[start_idx:end_idx].strip()
        
        # Parse JSON
        parsed_json = json.loads(content)
        return parsed_json
        
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        print(f"Raw content: {output_content}")
        return None
    except Exception as e:
        print(f"Unexpected error parsing output: {e}")
        print(f"Raw content: {output_content}")
        return None


def validate_code_output(parsed_output):
    """
    Validate that the parsed output contains the expected structure.
    """
    if not parsed_output:
        return False, "No output to validate"
    
    if not isinstance(parsed_output, dict):
        return False, "Output is not a dictionary"
    
    required_keys = ['code', 'executionType', 'description']
    for key in required_keys:
        if key not in parsed_output:
            return False, f"Missing '{key}' key in output"
    
    if not parsed_output['code']:
        return False, "Code field is empty"
    
    valid_execution_types = ['immediate', 'scheduled', 'price_monitoring', 'twitter_trigger', 'hybrid']
    if parsed_output['executionType'] not in valid_execution_types:
        return False, f"Invalid executionType: {parsed_output['executionType']}. Must be one of {valid_execution_types}"
    
    return True, "Output validation passed"


def extract_baseline_function(complete_code: str) -> str:
    """
    Extract just the baseline function from the complete generated code.
    The AI now generates the complete function, so we just need to clean it up.
    """
    # Remove any markdown formatting if present
    code = complete_code.strip()
    if code.startswith('```javascript') or code.startswith('```js'):
        code = code.split('\n', 1)[1]
    if code.endswith('```'):
        code = code.rsplit('\n', 1)[0]
    
    return code.strip()


def code(prompt: str) -> Dict[str, Any]:
    """
    Generate Solana trading code based on user prompt.
    """
    model = ChatOpenAI(model="gpt-5")

    prompt_template = ChatPromptTemplate.from_messages([
        ("system", CODER_PROMPT),
        ("human", prompt)
    ])

    formatted_prompt = prompt_template.format(
        TRANSACTIONS_CODE=TRANSACTIONS_CODE,
        TRANSACTIONS_USAGE=TRANSACTIONS_USAGE,
        UNIFIED_BASELINE_TEMPLATE=UNIFIED_BASELINE_TEMPLATE,
        HELPER_FUNCTIONS=HELPER_FUNCTIONS,
        STATUS_FORMAT=STATUS_FORMAT,
    )

    print("🔄 Generating Solana trading strategy...")
    response = model.invoke(formatted_prompt).content

    print("📝 Parsing model response...")
    result = parse_model_output(response)
    
    if not result:
        return {"error": "Failed to parse model output", "raw": response}

    print("✅ Validating generated code...")
    is_valid, validation_message = validate_code_output(result)
    
    if not is_valid:
        return {"error": f"Validation failed: {validation_message}", "raw": response}

    complete_code = result.get("code", "")
    execution_type = result.get("executionType", "immediate")
    description = result.get("description", "")
    monitoring_interval = result.get("monitoringInterval", None)

    # 1. Syntax check on the complete function
    syntax_err = _syntax_check(complete_code)
    # 2. Shallow lint
    lint_err = _lint_check(complete_code)
    # 3. Run guardrail to fix issues
    final_result = _invoke_guardrail(result, syntax_err, lint_err)
    
    # Extract and clean the baseline function
    clean_function = extract_baseline_function(final_result.get("code", complete_code))
    
    print("🎉 Solana strategy generation completed successfully!")
    
    return {
        "code": clean_function,
        "executionType": final_result.get("executionType", execution_type),
        "description": final_result.get("description", description),
        "monitoringInterval": final_result.get("monitoringInterval", monitoring_interval),
        "completeFunction": clean_function  # For backward compatibility
    }
