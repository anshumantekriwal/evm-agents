#!/usr/bin/env python3
"""
Test script for the Solana Trading Agent Code Generation API
"""

import requests
import json
import time

# API base URL
BASE_URL = "http://localhost:8000"

def test_health_check():
    """Test the health check endpoint"""
    print("🔍 Testing health check...")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"✅ Health check: {response.status_code}")
        data = response.json()
        print(f"Response: {data}")
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_get_tokens():
    """Test the tokens endpoint"""
    print("\n🔍 Testing tokens endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/tokens")
        print(f"✅ Tokens endpoint: {response.status_code}")
        data = response.json()
        print(f"Blockchain: {data.get('blockchain', 'N/A')}")
        print(f"Network: {data.get('network', 'N/A')}")
        print(f"Token count: {len(data.get('tokens', {}))}")
        return True
    except Exception as e:
        print(f"❌ Tokens endpoint failed: {e}")
        return False

def test_prompt_evaluation():
    """Test the prompt evaluation endpoint"""
    print("\n🔍 Testing prompt evaluation...")
    try:
        prompt_data = {
            "prompt": "Create a DCA bot that buys 10 USDC worth of SOL every day at 9 AM UTC",
            "history": []
        }
        response = requests.post(f"{BASE_URL}/prompt", json=prompt_data)
        print(f"✅ Prompt evaluation: {response.status_code}")
        data = response.json()
        print(f"Rating: {data.get('response', {}).get('rating', 'N/A')}")
        print(f"Justification: {data.get('response', {}).get('justification', 'N/A')}")
        return True
    except Exception as e:
        print(f"❌ Prompt evaluation failed: {e}")
        return False

def test_code_generation_immediate():
    """Test immediate execution code generation"""
    print("\n🔍 Testing immediate execution code generation...")
    try:
        code_data = {
            "prompt": "Swap 1 SOL to USDC immediately",
            "history": []
        }
        response = requests.post(f"{BASE_URL}/code", json=code_data)
        print(f"✅ Code generation: {response.status_code}")
        data = response.json()
        
        if 'error' in data:
            print(f"❌ Code generation error: {data['error']}")
            return False
            
        print("✅ Code generated successfully")
        print(f"Execution Type: {data.get('executionType', 'N/A')}")
        print(f"Description: {data.get('description', 'N/A')}")
        print(f"Code length: {len(data.get('code', ''))} characters")
        return True
    except Exception as e:
        print(f"❌ Code generation failed: {e}")
        return False

def test_code_generation_scheduled():
    """Test scheduled execution code generation"""
    print("\n🔍 Testing scheduled execution code generation...")
    try:
        code_data = {
            "prompt": "DCA 10 USDC into SOL every day at 9 AM UTC",
            "history": []
        }
        response = requests.post(f"{BASE_URL}/code", json=code_data)
        print(f"✅ Code generation: {response.status_code}")
        data = response.json()
        
        if 'error' in data:
            print(f"❌ Code generation error: {data['error']}")
            return False
            
        print("✅ Code generated successfully")
        print(f"Execution Type: {data.get('executionType', 'N/A')}")
        print(f"Description: {data.get('description', 'N/A')}")
        print(f"Monitoring Interval: {data.get('monitoringInterval', 'N/A')}")
        return True
    except Exception as e:
        print(f"❌ Code generation failed: {e}")
        return False

def test_code_generation_price_monitoring():
    """Test price monitoring code generation"""
    print("\n🔍 Testing price monitoring code generation...")
    try:
        code_data = {
            "prompt": "Buy 0.01 SOL worth of BTC when SOL price goes above $150",
            "history": []
        }
        response = requests.post(f"{BASE_URL}/code", json=code_data)
        print(f"✅ Code generation: {response.status_code}")
        data = response.json()
        
        if 'error' in data:
            print(f"❌ Code generation error: {data['error']}")
            return False
            
        print("✅ Code generated successfully")
        print(f"Execution Type: {data.get('executionType', 'N/A')}")
        print(f"Description: {data.get('description', 'N/A')}")
        print(f"Monitoring Interval: {data.get('monitoringInterval', 'N/A')}")
        return True
    except Exception as e:
        print(f"❌ Code generation failed: {e}")
        return False

def test_code_generation_twitter():
    """Test Twitter trigger code generation"""
    print("\n🔍 Testing Twitter trigger code generation...")
    try:
        code_data = {
            "prompt": "Swap 5 USDC to SOL when @elonmusk tweets about crypto",
            "history": []
        }
        response = requests.post(f"{BASE_URL}/code", json=code_data)
        print(f"✅ Code generation: {response.status_code}")
        data = response.json()
        
        if 'error' in data:
            print(f"❌ Code generation error: {data['error']}")
            return False
            
        print("✅ Code generated successfully")
        print(f"Execution Type: {data.get('executionType', 'N/A')}")
        print(f"Description: {data.get('description', 'N/A')}")
        print(f"Monitoring Interval: {data.get('monitoringInterval', 'N/A')}")
        return True
    except Exception as e:
        print(f"❌ Code generation failed: {e}")
        return False

def test_get_templates():
    """Test the templates endpoint"""
    print("\n🔍 Testing templates endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/templates")
        print(f"✅ Templates endpoint: {response.status_code}")
        data = response.json()
        templates = data.get('templates', {})
        print(f"Available templates: {list(templates.keys())}")
        return True
    except Exception as e:
        print(f"❌ Templates endpoint failed: {e}")
        return False

def test_get_examples():
    """Test the examples endpoint"""
    print("\n🔍 Testing examples endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/examples")
        print(f"✅ Examples endpoint: {response.status_code}")
        data = response.json()
        examples = data.get('examples', [])
        print(f"Example count: {len(examples)}")
        return True
    except Exception as e:
        print(f"❌ Examples endpoint failed: {e}")
        return False

def test_api_status():
    """Test the API status endpoint"""
    print("\n🔍 Testing API status...")
    try:
        response = requests.get(f"{BASE_URL}/status")
        print(f"✅ API status: {response.status_code}")
        data = response.json()
        print(f"Blockchain: {data.get('blockchain', 'N/A')}")
        print(f"Network: {data.get('network', 'N/A')}")
        print(f"Supported operations: {len(data.get('supported_operations', []))}")
        print(f"Bot types: {data.get('bot_types', [])}")
        return True
    except Exception as e:
        print(f"❌ API status failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting Solana Trading Agent API Tests\n")
    
    tests = [
        test_health_check,
        test_get_tokens,
        test_prompt_evaluation,
        test_code_generation_immediate,
        test_code_generation_scheduled,
        test_code_generation_price_monitoring,
        test_code_generation_twitter,
        test_get_templates,
        test_get_examples,
        test_api_status
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        time.sleep(1)  # Small delay between tests
    
    print(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The Solana Trading Agent API is working correctly.")
    else:
        print("⚠️  Some tests failed. Please check the API setup.")

if __name__ == "__main__":
    main()
