import { BubblemapProvider } from '../src/providers/BubblemapProvider';
import { Config } from '../src/config/Config';

// Mock fetch globally
global.fetch = jest.fn();

// Mock the Config class
jest.mock('../src/config/Config');

describe('BubblemapProvider', () => {
  let provider: BubblemapProvider;
  let mockConfig: jest.Mocked<Config>;

  beforeEach(() => {
    mockConfig = {
      getCredentials: jest.fn().mockReturnValue({}),
      getProviderConfigs: jest.fn().mockReturnValue([
        { name: 'bubblemap', enabled: true, priority: 5, timeout: 100, retries: 1 }
      ])
    } as any;
    (Config.getInstance as jest.Mock).mockReturnValue(mockConfig);
    provider = new BubblemapProvider();
    (fetch as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getName', () => {
    it('should return correct provider name', () => {
      expect(provider.getName()).toBe('bubblemap');
    });
  });

  describe('getSupportedChains', () => {
    it('should return supported chains', () => {
      const chains = provider.getSupportedChains();
      expect(chains).toContain('ethereum');
      expect(chains).toContain('base');
      expect(chains).toContain('solana');
      expect(chains).toContain('tron');
      expect(chains).toContain('bsc');
    });
  });

  describe('getChainMapping', () => {
    it('should return chain mapping', () => {
      const mapping = provider.getChainMapping();
      expect(mapping.ethereum).toBe('eth');
      expect(mapping.base).toBe('base');
      expect(mapping.solana).toBe('solana');
      expect(mapping.tron).toBe('tron');
      expect(mapping.bsc).toBe('bsc');
    });
  });

  describe('fetch with mock data', () => {
    beforeEach(() => {
      mockConfig.getCredentials.mockReturnValue({
        bubblemapApiKey: undefined // No API key configured
      });
      mockConfig.getProviderConfigs.mockReturnValue([
        { name: 'bubblemap', enabled: true, priority: 5, timeout: 100, retries: 1 }
      ]);
    });

    it('should return mock data when no API key is configured', async () => {
      const result = await provider.fetch('0x1234567890123456789012345678901234567890');
      
      expect(result).toBeDefined();
      expect(result.source).toBe('bubblemap_mock');
      expect(result.tokenName).toBe('Mock Token');
      expect(result.tokenSymbol).toBe('MOCK');
      expect(result.riskScore).toBe(30);
      expect(result.apiKeyConfigured).toBe(false);
    });

    it('should return mock data for unsupported chain', async () => {
      const result = await provider.fetch('0x1234567890123456789012345678901234567890', 'unsupported');
      
      expect(result).toBeDefined();
      expect(result.source).toBe('bubblemap_mock');
    });
  });

  describe('fetch with real API', () => {
    const mockApiKey = 'test-api-key';
    const mockAddress = '0x1234567890123456789012345678901234567890';

    beforeEach(() => {
      mockConfig.getCredentials.mockReturnValue({
        bubblemapApiKey: mockApiKey
      });
      mockConfig.getProviderConfigs.mockReturnValue([
        { name: 'bubblemap', enabled: true, priority: 5, timeout: 100, retries: 1 }
      ]);
    });

    it('should fetch real data from Bubblemap API', async () => {
      const mockResponse = {
        success: true,
        data: {
          token: {
            name: 'Test Token',
            symbol: 'TEST',
            address: mockAddress,
            chain: 'eth'
          },
          holders: {
            count: 5000
          },
          transactions: {
            count: 25000
          }
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await provider.fetch(mockAddress, 'ethereum');

      expect(fetch).toHaveBeenCalledWith(
        `https://api.bubblemaps.io/maps/eth/${mockAddress}`,
        {
          method: 'GET',
          headers: {
            'X-ApiKey': mockApiKey,
            'Content-Type': 'application/json'
          },
          signal: expect.any(AbortSignal)
        }
      );

      expect(result).toBeDefined();
      expect(result.source).toBe('bubblemap');
      expect(result.tokenName).toBe('Test Token');
      expect(result.tokenSymbol).toBe('TEST');
      expect(result.holderCount).toBe(5000);
      expect(result.transactionCount).toBe(25000);
      expect(result.apiKeyConfigured).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Token not found'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockErrorResponse
      });

      const result = await provider.fetch(mockAddress, 'ethereum');

      expect(result).toBeDefined();
      expect(result.source).toBe('bubblemap_mock');
    });

    it('should handle network errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.fetch(mockAddress, 'ethereum');

      expect(result).toBeDefined();
      expect(result.source).toBe('bubblemap_mock');
    });

    it('should handle HTTP errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await provider.fetch(mockAddress, 'ethereum');

      expect(result).toBeDefined();
      expect(result.source).toBe('bubblemap_mock');
    });
  });

  describe('chain mapping', () => {
    it('should map ethereum to eth', async () => {
      mockConfig.getCredentials.mockReturnValue({
        bubblemapApiKey: 'test-key'
      });
      mockConfig.getProviderConfigs.mockReturnValue([
        { name: 'bubblemap', enabled: true, priority: 5, timeout: 100, retries: 1 }
      ]);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} })
      });

      await provider.fetch('0x1234567890123456789012345678901234567890', 'ethereum');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/eth/'),
        expect.any(Object)
      );
    });

    it('should map bsc to bsc', async () => {
      mockConfig.getCredentials.mockReturnValue({
        bubblemapApiKey: 'test-key'
      });
      mockConfig.getProviderConfigs.mockReturnValue([
        { name: 'bubblemap', enabled: true, priority: 5, timeout: 100, retries: 1 }
      ]);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} })
      });

      await provider.fetch('0x1234567890123456789012345678901234567890', 'bsc');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/bsc/'),
        expect.any(Object)
      );
    });
  });

  describe('risk calculation', () => {
    it('should calculate risk score based on holder and transaction counts', async () => {
      mockConfig.getCredentials.mockReturnValue({
        bubblemapApiKey: 'test-key'
      });
      mockConfig.getProviderConfigs.mockReturnValue([
        { name: 'bubblemap', enabled: true, priority: 5, timeout: 100, retries: 1 }
      ]);

      const mockResponse = {
        success: true,
        data: {
          token: { name: 'Test', symbol: 'TEST', address: '0x123', chain: 'eth' },
          holders: { count: 5 }, // Very few holders
          transactions: { count: 50 } // Low activity
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await provider.fetch('0x1234567890123456789012345678901234567890', 'ethereum');

      // Should have high risk due to few holders and low activity
      expect(result.riskScore).toBeGreaterThan(70);
      expect(result.riskLevel).toBe('critical');
      expect(result.tags).toContain('few_holders');
      expect(result.tags).toContain('low_activity');
    });

    it('should calculate low risk for well-distributed tokens', async () => {
      mockConfig.getCredentials.mockReturnValue({
        bubblemapApiKey: 'test-key'
      });
      mockConfig.getProviderConfigs.mockReturnValue([
        { name: 'bubblemap', enabled: true, priority: 5, timeout: 100, retries: 1 }
      ]);

      const mockResponse = {
        success: true,
        data: {
          token: { name: 'Test', symbol: 'TEST', address: '0x123', chain: 'eth' },
          holders: { count: 15000 }, // Many holders
          transactions: { count: 150000 } // High activity
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await provider.fetch('0x1234567890123456789012345678901234567890', 'ethereum');

      // Should have lower risk due to many holders and high activity
      expect(result.riskScore).toBeLessThan(50);
      expect(result.tags).toContain('many_holders');
      expect(result.tags).toContain('high_activity');
    });
  });
}); 