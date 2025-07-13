#!/usr/bin/env python3
"""
Test script for the EVM Trading Agent Code Generation API
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
        print(f"Response: {response.json()}")
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
        print(f"Supported chains: {data.get('supported_chains', [])}")
        print(f"Primary chain: {data.get('primary_chain', 'N/A')}")
        return True
    except Exception as e:
        print(f"❌ Tokens endpoint failed: {e}")
        return False

def test_prompt_evaluation():
    """Test the prompt evaluation endpoint"""
    print("\n🔍 Testing prompt evaluation...")
    try:
        prompt_data = {
            "prompt": "Create a DCA agent that buys 10 USDC.e worth of POL every day at 9 AM UTC",
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

def test_code_generation():
    """Test the code generation endpoint"""
    print("\n🔍 Testing code generation...")
    try:
        code_data = {
            "prompt": "Create a DCA agent that buys 10 USDC.e worth of POL every day at 9 AM UTC",
            "history": []
        }
        response = requests.post(f"{BASE_URL}/code", json=code_data)
        print(f"✅ Code generation: {response.status_code}")
        data = response.json()
        
        if 'error' in data:
            print(f"❌ Code generation error: {data['error']}")
            return False
            
        print("✅ Code generated successfully")
        print(f"Code length: {len(data.get('code', ''))} characters")
        print(f"Interval length: {len(data.get('interval', ''))} characters")
        return True
    except Exception as e:
        print(f"❌ Code generation failed: {e}")
        return False

def test_api_status():
    """Test the API status endpoint"""
    print("\n🔍 Testing API status...")
    try:
        response = requests.get(f"{BASE_URL}/status")
        print(f"✅ API status: {response.status_code}")
        data = response.json()
        print(f"Blockchain: {data.get('blockchain', 'N/A')}")
        print(f"Primary chain: {data.get('primary_chain', 'N/A')}")
        print(f"Supported operations: {data.get('supported_operations', [])}")
        return True
    except Exception as e:
        print(f"❌ API status failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting EVM Trading Agent API Tests\n")
    
    tests = [
        test_health_check,
        test_get_tokens,
        test_prompt_evaluation,
        test_code_generation,
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
        print("🎉 All tests passed! The API is working correctly.")
    else:
        print("⚠️  Some tests failed. Please check the API setup.")

if __name__ == "__main__":
    main() 