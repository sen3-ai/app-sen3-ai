const crypto = require('crypto');

// Test addresses
const testAddresses = {
  // Known contract addresses
  contract: '0xA0b86a33E6441b8c4C8C1C1C1C1C1C1C1C1C1C1C', // Example contract address
  // Known EOA addresses
  eoa: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', // Example EOA address
  // Invalid address
  invalid: '0xinvalid'
};

async function testContractVerification() {
  console.log('Testing Contract Verification...\n');

  // Test 1: Check if we have API keys configured
  console.log('1. Checking API key configuration...');
  try {
    const { ContractVerifier } = require('./dist/providers/ContractVerifier');
    const verifier = new ContractVerifier();
    
    if (verifier.hasApiKeys()) {
      console.log('✅ API keys are configured');
      console.log('Available chains:', verifier.getAvailableChains());
    } else {
      console.log('❌ No API keys configured');
      console.log('Please set at least one of: ETHERSCAN_API_KEY, POLYGONSCAN_API_KEY, or BSCSCAN_API_KEY');
      return;
    }
  } catch (error) {
    console.log('❌ Error initializing ContractVerifier:', error.message);
    return;
  }

  // Test 2: Test with a known contract address
  console.log('\n2. Testing with known contract address...');
  try {
    const { ContractVerifier } = require('./dist/providers/ContractVerifier');
    const verifier = new ContractVerifier();
    
    const isContract = await verifier.isContractAddress('0xf75e354c5edc8efed9b59ee9f67a80845ade7d0c');
    console.log('Is contract:', isContract);
    
    if (isContract) {
      console.log('✅ Contract verification working');
    } else {
      console.log('❌ Address not detected as contract');
    }
  } catch (error) {
    console.log('❌ Error testing contract address:', error.message);
  }

  // Test 3: Test with a known EOA address
  console.log('\n3. Testing with known EOA address...');
  try {
    const { ContractVerifier } = require('./dist/providers/ContractVerifier');
    const verifier = new ContractVerifier();
    
    const isContract = await verifier.isContractAddress('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
    console.log('Is contract:', isContract);
    
    if (!isContract) {
      console.log('✅ EOA correctly identified as non-contract');
    } else {
      console.log('❌ EOA incorrectly identified as contract');
    }
  } catch (error) {
    console.log('❌ Error testing EOA address:', error.message);
  }

  // Test 4: Test validation method
  console.log('\n4. Testing validation method...');
  try {
    const { ContractVerifier } = require('./dist/providers/ContractVerifier');
    const verifier = new ContractVerifier();
    
    // This should throw an error for EOA
    await verifier.validateContractAddress('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
    console.log('❌ Validation should have failed for EOA');
  } catch (error) {
    console.log('✅ Validation correctly rejected EOA:', error.message);
  }
}

// Run the test
testContractVerification().catch(console.error); 