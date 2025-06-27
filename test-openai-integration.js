const axios = require('axios');

async function testOpenAIIntegration() {
  try {
    console.log('🧪 Testing OpenAI Integration...\n');
    
    // Test 1: Health check
    console.log('1. Checking server health...');
    const healthResponse = await axios.get('http://localhost:3000/health');
    const processors = healthResponse.data.data.processors;
    console.log(`   ✅ Server is healthy. Available processors: ${processors.join(', ')}`);
    
    if (!processors.includes('openai')) {
      throw new Error('OpenAI processor not found in available processors');
    }
    
    // Test 2: Risk assessment with OpenAI
    console.log('\n2. Testing risk assessment with OpenAI...');
    const testAddress = '0xcda4e840411c00a614ad9205caec807c7458a0e3';
    const riskResponse = await axios.get(`http://localhost:3000/risk/ethereum/${testAddress}?debug=true`);
    
    const openaiAssessment = riskResponse.data.data.debug.processorAssessments.find(
      (assessment) => assessment.processorName === 'openai'
    );
    
    if (!openaiAssessment) {
      throw new Error('OpenAI assessment not found in response');
    }
    
    console.log(`   ✅ OpenAI processor returned score: ${openaiAssessment.score}`);
    console.log(`   ✅ Confidence: ${openaiAssessment.confidence}`);
    console.log(`   ✅ Explanations count: ${openaiAssessment.explanations.length}`);
    
    if (openaiAssessment.rawResponse) {
      console.log(`   ✅ Raw response captured: ${openaiAssessment.rawResponse.length} characters`);
    } else {
      console.log('   ⚠️  Raw response not captured');
    }
    
    // Test 3: Check for errors
    console.log('\n3. Checking for errors...');
    if (riskResponse.data.data.debug.providerData.errors && riskResponse.data.data.debug.providerData.errors.length > 0) {
      console.log(`   ⚠️  Found ${riskResponse.data.data.debug.providerData.errors.length} provider errors:`);
      riskResponse.data.data.debug.providerData.errors.forEach((error, index) => {
        console.log(`      ${index + 1}. ${error.provider}: ${error.message}`);
      });
    } else {
      console.log('   ✅ No provider errors found');
    }
    
    console.log('\n🎉 OpenAI Integration Test PASSED!');
    console.log('\n📊 Summary:');
    console.log(`   - Final Risk Score: ${riskResponse.data.data.riskScore}`);
    console.log(`   - Processors Used: ${riskResponse.data.data.debug.processorCount}`);
    console.log(`   - Processing Time: ${new Date().toISOString()}`);
    
  } catch (error) {
    console.error('\n❌ OpenAI Integration Test FAILED!');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    process.exit(1);
  }
}

// Run the test
testOpenAIIntegration(); 