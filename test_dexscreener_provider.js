const fetch = require('node-fetch');

const address = '0xcDa4e840411C00a614aD9205CAEC807c7458a0E3';
const chainId = 'ethereum'; // DexScreener expects chainId
const url = `https://api.dexscreener.com/token-pairs/v1/${chainId}/${address}`;

async function fetchDexScreenerRaw(address, chainId) {
  try {
    console.log(`Fetching raw DexScreener data for address: ${address} on chainId: ${chainId}`);
    console.log(`Request URL: ${url}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }
    const data = await response.json();
    console.log('\nRaw DexScreener API Response:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error fetching DexScreener data:', error.message);
  }
}

fetchDexScreenerRaw(address, chainId); 