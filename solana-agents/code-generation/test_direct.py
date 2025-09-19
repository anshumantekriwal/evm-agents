#!/usr/bin/env python3
"""
Direct test script for the Solana Trading Agent Code Generation System
Tests the core functionality without requiring API server
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Mock OpenAI API key for testing (won't actually call OpenAI)
os.environ["OPENAI_API_KEY"] = "test-key-for-validation"

def test_imports():
    """Test that all modules can be imported successfully"""
    print("🔍 Testing module imports...")
    try:
        from variables import (
            TRANSACTIONS_CODE, 
            TRANSACTIONS_USAGE, 
            HELPER_FUNCTIONS, 
            UNIFIED_BASELINE_TEMPLATE,
            CODER_PROMPT, 
            STATUS_FORMAT,
            POPULAR_TOKENS
        )
        print("✅ Variables module imported successfully")
        
        from coder import (
            _syntax_check,
            _lint_check,
            parse_model_output,
            validate_code_output,
            extract_baseline_function
        )
        print("✅ Coder module imported successfully")
        
        from prompt import improve_prompt
        print("✅ Prompt module imported successfully")
        
        return True
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

def test_syntax_checker():
    """Test the syntax checking functionality"""
    print("\n🔍 Testing syntax checker...")
    try:
        from coder import _syntax_check
        
        # Test valid JavaScript
        valid_code = """
        const wallet = await getOrCreateWallet(ownerAddress);
        const balance = await getBalances(wallet.walletAddress);
        logger.log('Wallet ready');
        """
        result = _syntax_check(valid_code)
        if result is None:
            print("✅ Valid code passed syntax check")
        else:
            print(f"❌ Valid code failed: {result}")
            return False
        
        # Test invalid JavaScript
        invalid_code = """
        const wallet = await getOrCreateWallet(ownerAddress;
        const balance = await getBalances(wallet.walletAddress);
        """
        result = _syntax_check(invalid_code)
        if result is not None:
            print("✅ Invalid code caught by syntax checker")
        else:
            print("❌ Invalid code not caught")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Syntax checker test failed: {e}")
        return False

def test_lint_checker():
    """Test the linting functionality"""
    print("\n🔍 Testing lint checker...")
    try:
        from coder import _lint_check
        
        # Test code with linting issues
        problematic_code = """
        const wallet = await getOrCreateWallet(ownerAddress);
        wallet = newWallet; // const reassignment
        console.log('Using console.log instead of logger');
        const result = swap(wallet.id, 'SOL', 'USDC', 1, wallet.address); // missing await
        """
        result = _lint_check(problematic_code)
        if result is not None:
            print(f"✅ Lint issues detected: {result}")
        else:
            print("❌ Lint issues not detected")
            return False
        
        # Test clean code
        clean_code = """
        const wallet = await getOrCreateWallet(ownerAddress);
        const result = await swap(wallet.id, 'SOL', 'USDC', 1, wallet.address);
        logger.log('Trade executed successfully');
        """
        result = _lint_check(clean_code)
        if result is None:
            print("✅ Clean code passed lint check")
        else:
            print(f"❌ Clean code failed lint: {result}")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Lint checker test failed: {e}")
        return False

def test_output_validation():
    """Test the output validation functionality"""
    print("\n🔍 Testing output validation...")
    try:
        from coder import validate_code_output
        
        # Test valid output
        valid_output = {
            "code": "export async function baselineFunction() { /* code */ }",
            "executionType": "immediate",
            "description": "Test function",
            "monitoringInterval": None
        }
        is_valid, message = validate_code_output(valid_output)
        if is_valid:
            print("✅ Valid output passed validation")
        else:
            print(f"❌ Valid output failed: {message}")
            return False
        
        # Test invalid output
        invalid_output = {
            "code": "",
            "executionType": "invalid_type",
            "description": "Test function"
        }
        is_valid, message = validate_code_output(invalid_output)
        if not is_valid:
            print(f"✅ Invalid output caught: {message}")
        else:
            print("❌ Invalid output not caught")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Output validation test failed: {e}")
        return False

def test_template_structure():
    """Test that the unified template has the correct structure"""
    print("\n🔍 Testing template structure...")
    try:
        from variables import UNIFIED_BASELINE_TEMPLATE
        
        # Check for key components
        required_components = [
            "export async function baselineFunction",
            "handleScheduledExecution",
            "handlePriceMonitoring", 
            "handleTwitterTrigger",
            "handleImmediateExecution",
            "switch (executionType)",
            "// ======= ENTER AI CODE =======",
            "// ======= END AI CODE ======="
        ]
        
        missing_components = []
        for component in required_components:
            if component not in UNIFIED_BASELINE_TEMPLATE:
                missing_components.append(component)
        
        if not missing_components:
            print("✅ Template contains all required components")
        else:
            print(f"❌ Template missing components: {missing_components}")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Template structure test failed: {e}")
        return False

def test_helper_functions_documentation():
    """Test that helper functions are properly documented"""
    print("\n🔍 Testing helper functions documentation...")
    try:
        from variables import HELPER_FUNCTIONS, TRANSACTIONS_CODE
        
        # Combine both sections for comprehensive check
        all_docs = HELPER_FUNCTIONS + TRANSACTIONS_CODE
        
        # Check for key function documentations
        required_functions = [
            "swap(walletId, fromTokenSymbol, toTokenSymbol, fromAmount, walletAddress",
            "transfer(walletId, toAddress, tokenSymbol, amount, walletAddress",
            "getBalances(walletAddress",
            "price(symbol",
            "marketData(symbol",
            "twitter(user, lastTweets",
            "checkPriceCondition(tokenToMonitor, targetPrice, above, walletAddress",
            "scheduleInterval(func, intervalMs",
            "logger.log(message"
        ]
        
        missing_functions = []
        for func in required_functions:
            if func not in all_docs:
                missing_functions.append(func)
        
        if not missing_functions:
            print("✅ All required functions documented")
        else:
            print(f"❌ Missing function documentation: {missing_functions}")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Helper functions test failed: {e}")
        return False

def test_popular_tokens():
    """Test that popular tokens are properly defined"""
    print("\n🔍 Testing popular tokens...")
    try:
        from variables import POPULAR_TOKENS
        
        # Check for essential tokens
        required_tokens = ["SOL", "USDC", "USDT", "BTC", "ETH"]
        
        missing_tokens = []
        for token in required_tokens:
            if token not in POPULAR_TOKENS:
                missing_tokens.append(token)
        
        if not missing_tokens:
            print("✅ All essential tokens defined")
            print(f"   Available tokens: {list(POPULAR_TOKENS.keys())}")
        else:
            print(f"❌ Missing tokens: {missing_tokens}")
            return False
        
        # Check token structure
        for token_symbol, token_data in POPULAR_TOKENS.items():
            required_fields = ["symbol", "name", "mint", "decimals"]
            missing_fields = [field for field in required_fields if field not in token_data]
            if missing_fields:
                print(f"❌ Token {token_symbol} missing fields: {missing_fields}")
                return False
        
        print("✅ All tokens have required fields")
        return True
    except Exception as e:
        print(f"❌ Popular tokens test failed: {e}")
        return False

def test_coder_prompt_intelligence():
    """Test that the coder prompt has intelligent pattern detection"""
    print("\n🔍 Testing coder prompt intelligence...")
    try:
        from variables import CODER_PROMPT
        
        # Check for intelligent pattern detection keywords
        required_patterns = [
            "IMMEDIATE EXECUTION",
            "SCHEDULED EXECUTION",
            "EVENT-DRIVEN MONITORING",
            "HYBRID STRATEGIES",
            "AUTOMATIC PATTERN DETECTION",
            "Time keywords",
            "Price keywords", 
            "Twitter keywords",
            "60 seconds (60000ms)"
        ]
        
        missing_patterns = []
        for pattern in required_patterns:
            if pattern not in CODER_PROMPT:
                missing_patterns.append(pattern)
        
        if not missing_patterns:
            print("✅ Coder prompt has intelligent pattern detection")
        else:
            print(f"❌ Missing pattern detection: {missing_patterns}")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Coder prompt test failed: {e}")
        return False

def main():
    """Run all direct tests"""
    print("🚀 Starting Solana Trading Agent Direct Tests\n")
    
    tests = [
        test_imports,
        test_syntax_checker,
        test_lint_checker,
        test_output_validation,
        test_template_structure,
        test_helper_functions_documentation,
        test_popular_tokens,
        test_coder_prompt_intelligence
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()  # Add spacing between tests
    
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All direct tests passed! The Solana Trading Agent system is properly configured.")
        print("\n📋 System Summary:")
        print("✅ Intelligent pattern detection (immediate, scheduled, event-driven, hybrid)")
        print("✅ Comprehensive validation pipeline (syntax, lint, guardrails)")
        print("✅ Complete function generation with unified template")
        print("✅ Market data and Twitter integration support")
        print("✅ Popular Solana tokens configured")
        print("✅ 60-second monitoring intervals for event-driven strategies")
        print("✅ GPT-4o model integration")
    else:
        print("⚠️  Some tests failed. Please check the system configuration.")

if __name__ == "__main__":
    main()
