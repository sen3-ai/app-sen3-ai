const { TwitterProvider } = require('./dist/src/providers/TwitterProvider');
const { Config } = require('./dist/src/config/Config');

// Set environment to production to enable real API calls
process.env.NODE_ENV = 'production';

// Set the Twitter API key from the previous test
process.env.TWITTER_API_KEY = 'AAAAAAAAAAAAAAAAAAAAAEI7ngEAAAAApTeHQ5KEWi9TU3ZmxoqSxb%2FIXSg%3DHphu5sGJqGLgIXpP7WG6IgwELnMm59vEVlTMpTsywXbBAPUVHv';

async function testTwitterProvider() {
  try {
    console.log('🔍 Testing TwitterProvider with real API call');
    console.log('============================================');
    
    // Get config instance
    const config = Config.getInstance();
    
    // Create Twitter provider
    const twitterProvider = new TwitterProvider(config);
    
    // Test address
    const testAddress = '0xcDa4e840411C00a614aD9205CAEC807c7458a0E3';
    
    console.log(`\n📝 Searching for address: ${testAddress}`);
    console.log(`⏰ Time: ${new Date().toLocaleString()}`);
    
    // Make the API call
    const result = await twitterProvider.fetch(testAddress);
    
    console.log('\n✅ TwitterProvider Response:');
    console.log('============================');
    console.log(JSON.stringify(result, null, 2));
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`- Total Mentions: ${result.totalMentions}`);
    console.log(`- Positive Mentions: ${result.positiveMentions}`);
    console.log(`- Negative Mentions: ${result.negativeMentions}`);
    console.log(`- Neutral Mentions: ${result.neutralMentions}`);
    console.log(`- Risk Score: ${result.riskScore}/100`);
    console.log(`- API Key Configured: ${result.apiKeyConfigured}`);
    console.log(`- Source: ${result.source}`);
    
    if (result.tweets && result.tweets.length > 0) {
      console.log('\n🐦 Sample Tweets:');
      result.tweets.slice(0, 3).forEach((tweet, index) => {
        console.log(`\n${index + 1}. [${tweet.sentiment.toUpperCase()}] ${tweet.text.substring(0, 100)}...`);
        console.log(`   Created: ${tweet.created_at}`);
        console.log(`   Mentions: ${tweet.mentions}`);
      });
    } else {
      console.log('\n📭 No tweets found for this address');
    }
    
  } catch (error) {
    console.error('\n❌ Error testing TwitterProvider:', error.message);
    
    if (error.message.includes('429')) {
      console.log('\n⏳ Rate limit hit - Twitter API allows only 1 query per 15 minutes');
      console.log('💡 Try again in 15 minutes or use a different API key');
    } else if (error.message.includes('401')) {
      console.log('\n🔑 Authentication failed - check your Twitter API key');
    } else if (error.message.includes('403')) {
      console.log('\n🚫 Access forbidden - check your Twitter API permissions');
    }
  }
}

// Run the test
testTwitterProvider(); 