import { DexScreenerProvider } from '../src/providers/DexScreenerProvider';
import { Config } from '../src/config/Config';

// Mock fetch globally
global.fetch = jest.fn();

// Mock the Config class
jest.mock('../src/config/Config');

describe('DexScreenerProvider', () => {
  let provider: DexScreenerProvider;
  let mockConfig: jest.Mocked<Config>;

  beforeEach(() => {
    mockConfig = {
      getCredentials: jest.fn().mockReturnValue({}),
      getProviderConfigs: jest.fn().mockReturnValue([
        { name: 'dexscreener', enabled: true, priority: 6, timeout: 100, retries: 1 }
      ])
    } as any;
    (Config.getInstance as jest.Mock).mockReturnValue(mockConfig);
    provider = new DexScreenerProvider();
    (fetch as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getName', () => {
    it('should return correct provider name', () => {
      expect(provider.getName()).toBe('dexscreener');
    });
  });

  describe('getSupportedChains', () => {
    it('should return supported chains', () => {
      const chains = provider.getSupportedChains();
      expect(chains).toContain('ethereum');
      expect(chains).toContain('solana');
      expect(chains).toContain('bsc');
      expect(chains).toContain('base');
      expect(chains).toContain('avalanche');
    });
  });

  describe('getChainMapping', () => {
    it('should return chain mapping', () => {
      const mapping = provider.getChainMapping();
      expect(mapping.ethereum).toBe('ethereum');
      expect(mapping.solana).toBe('solana');
      expect(mapping.bsc).toBe('bsc');
      expect(mapping.base).toBe('base');
      expect(mapping.avalanche).toBe('avalanche');
    });
  });

  describe('fetch with mock data', () => {
    it('should return mock data for unsupported chain', async () => {
      const result = await provider.fetch('0x1234567890123456789012345678901234567890', 'unsupported');
      
      expect(result).toBeDefined();
      expect(result.source).toBe('dexscreener_mock');
      expect(result.tokenName).toBe('Mock Token');
      expect(result.tokenSymbol).toBe('MOCK');
      expect(result.riskScore).toBe(30);
      expect(result.apiKeyConfigured).toBe(false);
    });
  });

  describe('fetch with real API', () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';

    it('should fetch real data from DexScreener API', async () => {
      const mockResponse = {
        pairs: [
          {
            chainId: 'ethereum',
            dexId: 'uniswap_v2',
            url: 'https://app.uniswap.org/#/swap',
            pairAddress: '0x1234567890123456789012345678901234567890',
            baseToken: {
              address: mockAddress,
              name: 'Test Token',
              symbol: 'TEST'
            },
            quoteToken: {
              address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
              name: 'Wrapped Ether',
              symbol: 'WETH'
            },
            priceNative: '0.0001',
            priceUsd: '0.001',
            txns: {
              h24: { buys: 50, sells: 30 },
              h6: { buys: 20, sells: 15 },
              h1: { buys: 5, sells: 3 }
            },
            volume: {
              h24: 50000,
              h6: 20000,
              h1: 5000
            },
            priceChange: {
              h24: 5.2,
              h6: 2.1,
              h1: 0.5
            },
            liquidity: {
              usd: 100000,
              base: 100000000,
              quote: 100
            },
            fdv: 1000000,
            pairCreatedAt: Date.now() - 86400000 // 1 day ago
          }
        ]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await provider.fetch(mockAddress, 'ethereum');

      expect(fetch).toHaveBeenCalledWith(
        `https://api.dexscreener.com/token-pairs/v1/ethereum/${mockAddress}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: expect.any(AbortSignal)
        }
      );

      expect(result).toBeDefined();
      expect(result.source).toBe('dexscreener');
      expect(result.tokenName).toBe('Test Token');
      expect(result.tokenSymbol).toBe('TEST');
      expect(result.priceUsd).toBe(0.001);
      expect(result.volume24h).toBe(50000);
      expect(result.liquidityUsd).toBe(100000);
      expect(result.transactions24h).toBe(80); // 50 + 30
      expect(result.priceChange24h).toBe(5.2);
      expect(result.apiKeyConfigured).toBe(false);
    });

    it('should handle empty response gracefully', async () => {
      const mockEmptyResponse = { pairs: [] };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmptyResponse
      });

      const result = await provider.fetch(mockAddress, 'ethereum');

      expect(result).toBeDefined();
      expect(result.source).toBe('dexscreener_mock');
    });

    it('should handle network errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.fetch(mockAddress, 'ethereum');

      expect(result).toBeDefined();
      expect(result.source).toBe('dexscreener_mock');
    });

    it('should handle HTTP errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await provider.fetch(mockAddress, 'ethereum');

      expect(result).toBeDefined();
      expect(result.source).toBe('dexscreener_mock');
    });
  });

  describe('chain mapping', () => {
    it('should map ethereum to ethereum', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pairs: [] })
      });

      await provider.fetch('0x1234567890123456789012345678901234567890', 'ethereum');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/ethereum/'),
        expect.any(Object)
      );
    });

    it('should map bsc to bsc', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pairs: [] })
      });

      await provider.fetch('0x1234567890123456789012345678901234567890', 'bsc');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/bsc/'),
        expect.any(Object)
      );
    });

    it('should map solana to solana', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pairs: [] })
      });

      await provider.fetch('1234567890123456789012345678901234567890', 'solana');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/solana/'),
        expect.any(Object)
      );
    });
  });

  describe('risk calculation', () => {
    it('should calculate high risk for low liquidity and volume', async () => {
      const mockResponse = {
        pairs: [
          {
            chainId: 'ethereum',
            dexId: 'uniswap_v2',
            pairAddress: '0x1234567890123456789012345678901234567890',
            baseToken: {
              address: '0x1234567890123456789012345678901234567890',
              name: 'Test Token',
              symbol: 'TEST'
            },
            quoteToken: {
              address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
              name: 'Wrapped Ether',
              symbol: 'WETH'
            },
            priceUsd: '0.000001', // Very low price
            txns: {
              h24: { buys: 2, sells: 1 } // Very few transactions
            },
            volume: {
              h24: 500 // Very low volume
            },
            priceChange: {
              h24: 75.5 // High volatility
            },
            liquidity: {
              usd: 5000 // Very low liquidity
            },
            fdv: 1000000,
            pairCreatedAt: Date.now()
          }
        ]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await provider.fetch('0x1234567890123456789012345678901234567890', 'ethereum');

      // Should have high risk due to low liquidity, volume, and high volatility
      expect(result.riskScore).toBeGreaterThan(70);
      expect(result.riskLevel).toBe('critical');
      expect(result.tags).toContain('low_liquidity');
      expect(result.tags).toContain('low_volume');
      expect(result.tags).toContain('low_activity');
      expect(result.tags).toContain('high_volatility');
      expect(result.tags).toContain('micro_cap');
    });

    it('should calculate low risk for high liquidity and volume', async () => {
      const mockResponse = {
        pairs: [
          {
            chainId: 'ethereum',
            dexId: 'uniswap_v2',
            pairAddress: '0x1234567890123456789012345678901234567890',
            baseToken: {
              address: '0x1234567890123456789012345678901234567890',
              name: 'Test Token',
              symbol: 'TEST'
            },
            quoteToken: {
              address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
              name: 'Wrapped Ether',
              symbol: 'WETH'
            },
            priceUsd: '1.50', // Normal price
            txns: {
              h24: { buys: 5500, sells: 5000 } // Many transactions (10500 total)
            },
            volume: {
              h24: 2000000 // High volume
            },
            priceChange: {
              h24: 2.5 // Low volatility
            },
            liquidity: {
              usd: 5000000 // High liquidity
            },
            fdv: 1000000,
            pairCreatedAt: Date.now()
          }
        ]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await provider.fetch('0x1234567890123456789012345678901234567890', 'ethereum');

      // Should have lower risk due to high liquidity, volume, and low volatility
      expect(result.riskScore).toBeLessThan(50);
      expect(result.tags).toContain('high_liquidity');
      expect(result.tags).toContain('high_volume');
      expect(result.tags).toContain('high_activity');
      expect(result.tags).toContain('low_volatility');
    });
  });

  describe('best pair selection', () => {
    it('should select the pair with highest liquidity', async () => {
      const mockResponse = {
        pairs: [
          {
            chainId: 'ethereum',
            dexId: 'uniswap_v2',
            pairAddress: '0x1111111111111111111111111111111111111111',
            baseToken: {
              address: '0x1234567890123456789012345678901234567890',
              name: 'Test Token',
              symbol: 'TEST'
            },
            quoteToken: {
              address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
              name: 'Wrapped Ether',
              symbol: 'WETH'
            },
            priceUsd: '0.001',
            txns: { h24: { buys: 10, sells: 5 } },
            volume: { h24: 10000 },
            priceChange: { h24: 5.0 },
            liquidity: { usd: 50000 }, // Lower liquidity
            fdv: 1000000,
            pairCreatedAt: Date.now()
          },
          {
            chainId: 'ethereum',
            dexId: 'sushiswap',
            pairAddress: '0x2222222222222222222222222222222222222222',
            baseToken: {
              address: '0x1234567890123456789012345678901234567890',
              name: 'Test Token',
              symbol: 'TEST'
            },
            quoteToken: {
              address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
              name: 'Wrapped Ether',
              symbol: 'WETH'
            },
            priceUsd: '0.001',
            txns: { h24: { buys: 20, sells: 15 } },
            volume: { h24: 20000 },
            priceChange: { h24: 5.0 },
            liquidity: { usd: 150000 }, // Higher liquidity - should be selected
            fdv: 1000000,
            pairCreatedAt: Date.now()
          }
        ]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await provider.fetch('0x1234567890123456789012345678901234567890', 'ethereum');

      // Should select the pair with higher liquidity (sushiswap)
      expect(result.liquidityUsd).toBe(150000);
      expect(result.dexId).toBe('sushiswap');
      expect(result.pairAddress).toBe('0x2222222222222222222222222222222222222222');
    });
  });
}); 