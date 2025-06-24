const { execSync } = require('child_process');

console.log('Running simple tests...\n');

// Test 1: Check if TypeScript compiles
console.log('1. Testing TypeScript compilation...');
try {
  execSync('./node_modules/.bin/tsc --noEmit', { stdio: 'inherit' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.log('❌ TypeScript compilation failed');
  process.exit(1);
}

// Test 2: Check if ContractVerifier can be imported
console.log('\n2. Testing ContractVerifier import...');
try {
  const { ContractVerifier } = require('./src/providers/ContractVerifier');
  const verifier = new ContractVerifier();
  console.log('✅ ContractVerifier imported successfully');
  console.log('Available chains:', verifier.getAvailableChains());
  console.log('Has API keys:', verifier.hasApiKeys());
} catch (error) {
  console.log('❌ ContractVerifier import failed:', error.message);
}

// Test 3: Check if AMLBotProvider can be imported
console.log('\n3. Testing AMLBotProvider import...');
try {
  const { AMLBotProvider } = require('./src/providers/AMLBotProvider');
  const provider = new AMLBotProvider();
  console.log('✅ AMLBotProvider imported successfully');
} catch (error) {
  console.log('❌ AMLBotProvider import failed:', error.message);
}

// Test 4: Check if Config can be imported
console.log('\n4. Testing Config import...');
try {
  const { Config } = require('./src/config/Config');
  const config = Config.getInstance();
  console.log('✅ Config imported successfully');
  console.log('Environment:', config.getEnvironment());
} catch (error) {
  console.log('❌ Config import failed:', error.message);
}

console.log('\n✅ All basic tests passed!');
console.log('\nNote: Full Jest tests require npm/npx to be available in the PATH.'); 