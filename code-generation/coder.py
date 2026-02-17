import os
import json
import re
from typing import Dict, Any, Tuple
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema import HumanMessage, SystemMessage
import esprima
from dotenv import load_dotenv
from variables import TRANSACTIONS_CODE, TRANSACTIONS_USAGE, HELPER_FUNCTIONS, BASELINE_JS, CODER_PROMPT, STATUS_FORMAT

# Load environment variables from .env file
load_dotenv()

# Validate OpenAI API key
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError(
        "OPENAI_API_KEY environment variable is required. "
        "Please set it in your .env file."
    )
os.environ["OPENAI_API_KEY"] = api_key


def _syntax_check(js_code: str) -> str | None:
    """Parse with esprima to catch syntax errors."""
    print("🔍 Running syntax check…")
    try:
        esprima.parseScript(js_code)
        print("✅ Syntax looks good")
        return None
    except Exception as e:
        err = str(e).split("\n")[0]
        print(f"❌ Syntax error: {err}")
        return err
    
def _lint_check(js_code: str) -> str | None:
    """
    Shallow lint via regex:
      - const reassignment
      - missing await in async functions
      - suspicious comparison operators
    """
    print("🔍 Running lint check…")
    errors = []

    # 1) const reassignment
    for const_match in re.finditer(r'\bconst\s+([A-Za-z_$][0-9A-Za-z_$]*)', js_code):
        name = const_match.group(1)
        # look for a second assignment to that name
        # ignore the declaration line
        rest = js_code[const_match.end():]
        if re.search(rf'\b{name}\s*=', rest):
            errors.append(f"Cannot reassign const `{name}`")

    # 2) missing await for async calls
    async_funcs = re.findall(r'async function\s+([A-Za-z_$][0-9A-Za-z_$]*)', js_code)
    for fn in async_funcs:
        # if the function is invoked but never awaited
        calls = re.findall(rf'\b{fn}\(', js_code)
        awaited = re.findall(rf'await\s+{fn}\(', js_code)
        if calls and not awaited:
            errors.append(f"Missing `await` for `{fn}()` call")

    # 3) wrong comparison direction (e.g. `>` instead of `<`) — heuristic
    # If both `price > number` and `price < number` appear, warn
    if "price" in js_code:
        gt = bool(re.search(r'\bprice\W*>\W*\d', js_code))
        lt = bool(re.search(r'\bprice\W*<\W*\d', js_code))
        if gt and lt:
            errors.append("Suspicious: both `price > x` and `price < y` found")

    if errors:
        print(f"❌ Lint issues found ({len(errors)}):", errors)
        return "\n".join(errors)
    print("✅ Lint looks good (shallow checks)")
    return None


def _invoke_guardrail(original: dict, syntax_err: str | None, lint_err: str | None) -> dict:
    print("🤖 Invoking guardrail model…")
    guard = ChatOpenAI(model="gpt-4o")
    system = SystemMessage(
"""
You are a JavaScript code specialist whose sole job is to correct and refine trading-agent snippets for EVM blockchains.

You will receive JSON with these fields:
  • code       — the body of an async function baselineFunction()

You may also receive:
  • syntax_errors — a string describing any parser errors
  • lint_errors   — a string describing any lint warnings

Your job is to ensure that there are no errors in the code or logic and correct any issues/mistakes.
Do not change the code unnecessarily, but fix any issues/mistakes.
Ignore any undefined-reference errors (those functions live elsewhere).
For any linting errors, consider whether the error is significant enough to break the code. If it is, fix it. If it is not, ignore it.

If there are no errors, simply return the original code.
If there are errors, fix them and return the corrected code.

Ensure baselineFunction() is exported either as `export async function baselineFunction(ownerAddress)` or `export baselineFunction`. Ensure no default exports.
Output valid JSON with **only** `code` field.
Do NOT include any markdown, comments, or extra keys—just the JSON.

Output Format:
```json
{
  "code": "<corrected baselineFunction()>"
}
```
"""
    )
    human = HumanMessage(
        f"Here is the code:\n```js\n{original['code']}\n```\n\n"
        f"Syntax errors: {syntax_err or 'None'}\n"
        f"Lint errors: {lint_err or 'None'}\n\n"
    )
    resp = guard.invoke([system, human]).content.strip()
    # strip markdown fences if present
    if resp.startswith("```"):
        resp = resp.strip("```json").strip("```").strip()
    return json.loads(resp)


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
    
    if 'code' not in parsed_output:
        return False, "Missing 'code' key in output"
    
    if not parsed_output['code']:
        return False, "Code field is empty"
    
    # Basic validation that it's JavaScript code
    code = parsed_output['code']
    if not code.strip().startswith('//') and not code.strip().startswith('export'):
        return False, "Code doesn't appear to be valid JavaScript"
    
    return True, "Output validation passed"


def _validate_deployment_compatibility(code: str) -> Tuple[bool, str]:
    """
    Validate that generated code is compatible with deployment system.
    Checks for common issues that would cause deployment failures.
    """
    print("🔍 Validating deployment compatibility...")
    
    # Check 1: Correct export signature
    if 'export async function baselineFunction(ownerAddress)' not in code:
        return False, "Missing required export: 'export async function baselineFunction(ownerAddress)'"
    
    # Check 2: No default exports
    if 'export default' in code:
        return False, "Default exports not supported by deployment system"
    
    # Check 3: No ethers v5 API usage
    if 'ethers.utils' in code:
        return False, "Code uses ethers v5 API (ethers.utils.*). Use ethers v6 API instead (ethers.Interface)"
    
    # Check 4: Hex values for transaction amounts
    if re.search(r'value:\s*["\']0["\'](?![x])', code):
        return False, "Transaction value should be '0x0' (hex), not '0' (decimal)"
    
    # Check 5: Status updates present
    if 'updateStatus' not in code:
        return False, "Missing updateStatus() calls for monitoring"
    
    # Check 6: Logging present
    if 'log(' not in code:
        return False, "Missing log() calls for debugging"
    
    # Check 7: Correct trades array reference
    if re.search(r'trades:\s*\[.*?Array\.isArray\(trades\)', code):
        return False, "Using undefined 'trades' variable. Should use 'currentStatus.trades'"
    
    print("✅ Deployment compatibility validated")
    return True, "Code is deployment-ready"


def code(prompt: str) -> Dict[str, Any]:
    model = ChatOpenAI(model="gpt-4o-mini")

    prompt_template = ChatPromptTemplate.from_messages([
        ("system", CODER_PROMPT),
        ("human", prompt)
    ])

    formatted_prompt = prompt_template.format(
        TRANSACTIONS_CODE=TRANSACTIONS_CODE,
        TRANSACTIONS_USAGE=TRANSACTIONS_USAGE,
        BASELINE_JS=BASELINE_JS,
        HELPER_FUNCTIONS=HELPER_FUNCTIONS,
        STATUS_FORMAT=STATUS_FORMAT,
    )

    print("🔄 Generating trading strategy...")
    response = model.invoke(formatted_prompt).content

    print("📝 Parsing model response...")
    result = parse_model_output(response)
    
    if not result:
        return {"error": "Failed to parse model output", "raw": response}

    print("✅ Validating generated code...")
    is_valid, validation_message = validate_code_output(result)
    
    if not is_valid:
        return {"error": f"Validation failed: {validation_message}", "raw": response}

    code_str = result.get("code", "")

    # 1. Syntax check
    syntax_err = _syntax_check(code_str)
    # 2. Shallow lint
    lint_err = _lint_check(code_str)
    
    # 3. Only run guardrail if there are actual errors
    if syntax_err or lint_err:
        print("⚠️  Errors detected, running guardrail correction...")
        final = _invoke_guardrail(result, syntax_err, lint_err)
    else:
        print("✅ No errors detected, skipping guardrail")
        final = result
    
    # 4. Validate deployment compatibility
    is_valid, validation_msg = _validate_deployment_compatibility(final['code'])
    if not is_valid:
        print(f"❌ Deployment validation failed: {validation_msg}")
        return {
            "error": f"Generated code failed deployment validation: {validation_msg}",
            "code": final['code'],
            "validation_error": validation_msg
        }
    
    print("🎉 Strategy generation completed successfully!")
    return final 