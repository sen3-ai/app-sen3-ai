const crypto = require('crypto');

async function testAMLBotAPI() {
  const address = '0x2b94ec930667fa870ea5739c671e55c857e4136a';
  const tmId = '195061934';
  const accessKey = '1UGss7dPXG-6x1K0BY9Zal-9e75WII3TtJ-jc4vfKoyj-WkUfDqL-t4YRlhvrXg-W4XJ6aWV';
  const baseUrl = 'https://amlbot.silencatech.com/aml/api/ajaxcheck';

  // Calculate token as md5(address:accessKey:tmId)
  const tokenString = `${address}:${accessKey}:${tmId}`;
  const token = crypto.createHash('md5').update(tokenString).digest('hex');

  // Prepare form-urlencoded body
  const params = new URLSearchParams();
  params.append('address', address);
  params.append('hash', address);
  params.append('chain', 'ethereum');
  params.append('tmId', tmId);
  params.append('token', token);

  console.log('Testing AMLBot API...');
  console.log('URL:', baseUrl);
  console.log('Address:', address);
  console.log('TM ID:', tmId);
  console.log('Access Key:', accessKey.substring(0, 20) + '...');
  console.log('Token:', token);

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log('Response body:', text);

    try {
      const json = JSON.parse(text);
      console.log('Parsed JSON:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Could not parse as JSON');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAMLBotAPI(); 