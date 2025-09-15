#!/usr/bin/env node

/**
 * Test script for the Solana Agent Deployer
 * Demonstrates how to use the deployment API
 */

const API_BASE = 'http://localhost:3001';
const API_KEY = 'Commune_dev1';

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    console.log(`📡 ${options.method || 'GET'} ${endpoint}`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`📋 Response:`, JSON.stringify(data, null, 2));
    console.log('');
    
    return { response, data };
  } catch (error) {
    console.error(`❌ Request failed:`, error.message);
    return null;
  }
}

async function testDeployer() {
  console.log('🧪 Testing Solana Agent Deployer');
  console.log('=================================\n');

  // Test 1: Health Check
  console.log('📝 Test 1: Health Check');
  await makeRequest('/');

  // Test 2: Deploy Agent (will likely fail due to AWS limits)
  console.log('📝 Test 2: Deploy Agent');
  await makeRequest('/deploy-agent', {
    method: 'POST',
    body: JSON.stringify({
      agentId: 'test-trading-bot',
      ownerAddress: '5NGqPDeoEfpxwq8bKHkMaSyLXDeR7YmsxSyMbXA5yKSQ',
      swapConfig: {
        fromToken: 'SOL',
        toToken: 'USDC',
        amount: 0.0001,
        interval: '30m'
      }
    })
  });

  // Test 3: Get Logs
  console.log('📝 Test 3: Get Agent Logs');
  await makeRequest('/logs/test-trading-bot?lines=50');

  // Test 4: Check Status
  console.log('📝 Test 4: Check Agent Status');
  await makeRequest('/status/test-trading-bot');

  // Test 5: List Agents
  console.log('📝 Test 5: List Deployed Agents');
  await makeRequest('/agents');

  // Test 6: Authentication Test (should fail)
  console.log('📝 Test 6: Authentication Test (should fail)');
  await makeRequest('/', {
    headers: {
      'x-api-key': 'invalid-key'
    }
  });

  console.log('✅ All tests completed!');
}

// Add fetch polyfill for older Node.js versions
if (!globalThis.fetch) {
  console.log('⚠️  Installing fetch polyfill...');
  import('node-fetch').then(({ default: fetch }) => {
    globalThis.fetch = fetch;
    testDeployer().catch(console.error);
  });
} else {
  testDeployer().catch(console.error);
}
