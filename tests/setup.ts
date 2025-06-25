// Test setup file
export {};

// Set test environment
process.env.NODE_ENV = 'test';

// Mock fetch globally for tests
global.fetch = jest.fn().mockImplementation((url: string, options?: any) => {
  // Mock response for contract verification
  if (url.includes('etherscan.io') && url.includes('eth_getCode')) {
    // Check if this is a contract address or EOA
    const urlParams = new URLSearchParams(url.split('?')[1]);
    const address = urlParams.get('address');
    
    // Known contract addresses return contract code, others return empty code
    const knownContracts = [
      '0xf75e354c5edc8efed9b59ee9f67a80845ade7d0c'
    ];
    
    const isContract = knownContracts.includes(address || '');
    
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        result: isContract ? '0x1234567890abcdef' : '0x', // Contract code or empty
        error: null
      })
    } as Response);
  }
  
  // Mock response for AMLBot API
  if (url.includes('amlbot.silencatech.com')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        result: true,
        data: {
          riskscore: 0.15,
          signals: {
            exchange: 0.1,
            risky_exchange: 0.05,
            scam: 0.0,
            sanctions: 0.0,
            mixer: 0.0,
            dark_market: 0.0
          },
          addressDetailsData: {
            first_tx: '2023-01-01',
            last_tx: '2024-01-01',
            n_txs: 100,
            balance_usd: 1000.0
          }
        }
      })
    } as Response);
  }
  
  // Mock response for Bubblemap API
  if (url.includes('bubblemap.io')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          address: '0x1234567890123456789012345678901234567890',
          risk_score: 25,
          tags: ['exchange'],
          first_seen: '2023-01-01',
          last_seen: '2024-01-01',
          transaction_count: 150,
          total_volume: 50000
        }
      })
    } as Response);
  }
  
  // Default mock response for other API calls (but not DexScreener - let tests handle that)
  if (!url.includes('api.dexscreener.com')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {}
      })
    } as Response);
  }
  
  // For DexScreener, let the individual tests handle mocking
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      pairs: []
    })
  } as Response);
}); 