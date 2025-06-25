const fetch = require('node-fetch');

const TWITTER_BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAAEI7ngEAAAAApTeHQ5KEWi9TU3ZmxoqSxb%2FIXSg%3DHphu5sGJqGLgIXpP7WG6IgwELnMm59vEVlTMpTsywXbBAPUVHv';

// Track when we hit rate limit
let rateLimitHitTime = null;

async function searchTwitterForAddress(address, query = null) {
  try {
    const searchQuery = query || address;
    console.log(`Searching Twitter for: ${searchQuery}`);
    
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(searchQuery)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 429) {
      if (!rateLimitHitTime) {
        rateLimitHitTime = new Date();
        console.log(`\n🚫 Rate limit hit at: ${rateLimitHitTime.toLocaleString()}`);
        console.log('⏰ Next available time: 15 minutes from now');
      }
      throw new Error(`HTTP error! status: ${response.status} - Too Many Requests`);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('Twitter API Response:');
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('Error searching Twitter:', error.message);
    throw error;
  }
}

function checkRateLimitStatus() {
  if (!rateLimitHitTime) {
    console.log('✅ No rate limit hit yet - API should be available');
    return true;
  }

  const now = new Date();
  const timeSinceRateLimit = now - rateLimitHitTime;
  const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds
  
  if (timeSinceRateLimit >= fifteenMinutes) {
    console.log('✅ Rate limit should be reset - API available again');
    console.log(`⏰ Time since rate limit: ${Math.floor(timeSinceRateLimit / 1000 / 60)} minutes`);
    return true;
  } else {
    const remainingTime = fifteenMinutes - timeSinceRateLimit;
    const remainingMinutes = Math.floor(remainingTime / 1000 / 60);
    const remainingSeconds = Math.floor((remainingTime / 1000) % 60);
    
    console.log(`⏳ Rate limit still active - ${remainingMinutes}m ${remainingSeconds}s remaining`);
    console.log(`⏰ Next available time: ${new Date(rateLimitHitTime.getTime() + fifteenMinutes).toLocaleString()}`);
    return false;
  }
}

function showSampleResponses() {
  console.log('\n📋 SAMPLE TWITTER API RESPONSES:');
  console.log('=====================================');
  
  console.log('\n1️⃣ SUCCESSFUL RESPONSE (with tweets):');
  console.log(JSON.stringify({
    "data": [
      {
        "id": "1234567890123456789",
        "text": "Just deployed a new smart contract at 0xf75e354c5edc8efed9b59ee9f67a80845ade7d0c - excited to see how it performs! 🚀 #blockchain #ethereum",
        "created_at": "2024-01-15T10:30:00.000Z",
        "author_id": "9876543210987654321"
      },
      {
        "id": "1234567890123456790",
        "text": "Be careful with this address 0xf75e354c5edc8efed9b59ee9f67a80845ade7d0c - seems suspicious based on recent activity",
        "created_at": "2024-01-15T09:15:00.000Z",
        "author_id": "1112223334445556666"
      }
    ],
    "meta": {
      "result_count": 2,
      "newest_id": "1234567890123456789",
      "oldest_id": "1234567890123456790",
      "next_token": "b26v89c19zqg8o3fosq64gtu12345678901234567890"
    }
  }, null, 2));

  console.log('\n2️⃣ SUCCESSFUL RESPONSE (no results):');
  console.log(JSON.stringify({
    "meta": {
      "result_count": 0
    }
  }, null, 2));

  console.log('\n3️⃣ RATE LIMITED RESPONSE:');
  console.log(JSON.stringify({
    "errors": [
      {
        "message": "Rate limit exceeded",
        "code": 88
      }
    ]
  }, null, 2));

  console.log('\n4️⃣ AUTHENTICATION ERROR:');
  console.log(JSON.stringify({
    "errors": [
      {
        "message": "Unauthorized",
        "code": 32
      }
    ]
  }, null, 2));
}

async function runTests() {
  console.log('🔍 TWITTER API TEST SCRIPT');
  console.log('==========================');
  
  // Check rate limit status first
  console.log('\n📊 Rate Limit Status:');
  const canProceed = checkRateLimitStatus();
  
  if (!canProceed) {
    console.log('\n⏸️  Skipping API calls due to rate limit...');
    showSampleResponses();
    return;
  }

  // Test 1: Original address
  console.log('\n=== Test 1: Original address ===');
  try {
    await searchTwitterForAddress('0xf75e354c5edc8efed9b59ee9f67a80845ade7d0c');
  } catch (error) {
    if (error.message.includes('429')) {
      console.log('Rate limit hit - stopping tests');
      showSampleResponses();
      return;
    }
  }
  
  console.log('\n=== Test 2: USDT contract address ===');
  try {
    await searchTwitterForAddress('0xdAC17F958D2ee523a2206206994597C13D831ec7');
  } catch (error) {
    if (error.message.includes('429')) {
      console.log('Rate limit hit - stopping tests');
      showSampleResponses();
      return;
    }
  }
  
  console.log('\n=== Test 3: Search for "USDT" ===');
  try {
    await searchTwitterForAddress('0xdAC17F958D2ee523a2206206994597C13D831ec7', 'USDT');
  } catch (error) {
    if (error.message.includes('429')) {
      console.log('Rate limit hit - stopping tests');
      showSampleResponses();
      return;
    }
  }
  
  console.log('\nAll tests completed!');
}

// Show sample responses immediately
showSampleResponses();

// Run tests
runTests().catch(error => {
  console.error('Tests failed:', error);
}); 