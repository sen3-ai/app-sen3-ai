const { DexScreenerProvider } = require('./dist/src/providers/DexScreenerProvider');
const { Config } = require('./dist/src/config/Config');

// Set environment to production to enable real API calls
process.env.NODE_ENV = 'production';

async function testDexScreenerProvider() {
  try {
    console.log('🔍 Testing DexScreenerProvider with real API call');
    console.log('===============================================');
    
    // Get config instance
    const config = Config.getInstance();
    
    // Create DexScreener provider
    const dexscreenerProvider = new DexScreenerProvider();
    
    // Test address
    const testAddress = '0xe2a59d5e33c6540e18aaa46bf98917ac3158db0d';
    const chain = 'bsc';
    
    console.log(`\n📝 Searching for address: ${testAddress}`);
    console.log(`🌐 Chain: ${chain}`);
    console.log(`⏰ Time: ${new Date().toLocaleString()}`);
    
    // Make the API call
    const result = await dexscreenerProvider.fetch(testAddress, chain);
    
    console.log('\n✅ DexScreenerProvider Response:');
    console.log('================================');
    console.log(JSON.stringify(result, null, 2));
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`- Token Name: ${result.tokenName}`);
    console.log(`- Token Symbol: ${result.tokenSymbol}`);
    console.log(`- Price USD: $${result.priceUsd}`);
    console.log(`- Volume 24h: $${result.volume24h}`);
    console.log(`- Liquidity USD: $${result.liquidityUsd}`);
    console.log(`- Market Cap: $${result.marketCap}`);
    console.log(`- Risk Score: ${result.riskScore}/100`);
    console.log(`- Risk Level: ${result.riskLevel}`);
    console.log(`- Tags: ${result.tags.join(', ')}`);
    console.log(`- DEX: ${result.dexId}`);
    console.log(`- Pair Address: ${result.pairAddress}`);
    
  } catch (error) {
    console.error('\n❌ Error testing DexScreenerProvider:', error.message);
  }
}

// Run the test
testDexScreenerProvider(); 