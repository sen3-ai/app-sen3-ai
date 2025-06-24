const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testEndpoints() {
  console.log('Testing new endpoints...\n');

  // Test 1: Get supported chains
  console.log('1. Testing /chains endpoint...');
  try {
    const response = await fetch(`${BASE_URL}/chains`);
    const data = await response.json();
    
    if (data.result) {
      console.log('✅ /chains endpoint working');
      console.log('Supported chains:', data.data.supportedChains);
      console.log('Contract verification enabled:', data.data.contractVerificationEnabled);
    } else {
      console.log('❌ /chains endpoint failed:', data.reason);
    }
  } catch (error) {
    console.log('❌ Error calling /chains:', error.message);
  }

  // Test 2: Test risk endpoint with chain parameter
  console.log('\n2. Testing /risk endpoint with chain parameter...');
  try {
    const testAddress = '0xf75e354c5edc8efed9b59ee9f67a80845ade7d0c'; // Example contract address
    const response = await fetch(`${BASE_URL}/risk/${testAddress}?chain=ethereum`);
    const data = await response.json();
    
    if (data.result) {
      console.log('✅ Risk endpoint with chain parameter working');
      console.log('Risk score:', data.data.riskScore);
    } else {
      console.log('❌ Risk endpoint failed:', data.reason);
    }
  } catch (error) {
    console.log('❌ Error calling /risk with chain:', error.message);
  }

  // Test 3: Test risk endpoint without chain parameter (should use default)
  console.log('\n3. Testing /risk endpoint without chain parameter...');
  try {
    const testAddress = '0xf75e354c5edc8efed9b59ee9f67a80845ade7d0c';
    const response = await fetch(`${BASE_URL}/risk/${testAddress}`);
    const data = await response.json();
    
    if (data.result) {
      console.log('✅ Risk endpoint without chain parameter working');
      console.log('Risk score:', data.data.riskScore);
    } else {
      console.log('❌ Risk endpoint failed:', data.reason);
    }
  } catch (error) {
    console.log('❌ Error calling /risk without chain:', error.message);
  }

  // Test 4: Test with invalid chain
  console.log('\n4. Testing /risk endpoint with invalid chain...');
  try {
    const testAddress = '0xf75e354c5edc8efed9b59ee9f67a80845ade7d0c';
    const response = await fetch(`${BASE_URL}/risk/${testAddress}?chain=invalid_chain`);
    const data = await response.json();
    
    if (!data.result) {
      console.log('✅ Invalid chain correctly rejected:', data.reason);
    } else {
      console.log('❌ Invalid chain should have been rejected');
    }
  } catch (error) {
    console.log('❌ Error testing invalid chain:', error.message);
  }
}

// Run the test
testEndpoints().catch(console.error); 