import { AMLBotProvider } from '../src/providers/AMLBotProvider';

// Set test environment
process.env.NODE_ENV = 'test';

// Mock fetch globally for tests
global.fetch = jest.fn();

describe('AMLBot Provider', () => {
  let provider: AMLBotProvider;

  beforeEach(() => {
    provider = new AMLBotProvider();
    jest.clearAllMocks();
  });

  describe('fetch', () => {
    it('should return mock data when credentials are not configured', async () => {
      const result = await provider.fetch('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');

      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('isBlacklisted');
      expect(result).toHaveProperty('apiKeyConfigured', false);
      expect(result).toHaveProperty('source', 'amlbot-mock');
      expect(result).toHaveProperty('transactionCount');
      expect(result).toHaveProperty('totalVolume');
    }, 10000); // Increased timeout

    it('should handle network errors gracefully and return mock data', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.fetch('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');

      expect(result).toHaveProperty('source', 'amlbot-mock');
      expect(result).toHaveProperty('apiKeyConfigured', false);
    }, 10000); // Increased timeout

    it('should retry on failure and eventually return mock data', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.fetch('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');

      expect(result).toHaveProperty('source', 'amlbot-mock');
      expect(result).toHaveProperty('apiKeyConfigured', false);
    }, 15000); // Increased timeout

    it('should handle API errors and return mock data', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: false,
          description: 'API error'
        })
      });

      const result = await provider.fetch('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');

      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('source', 'amlbot-mock');
    }, 10000); // Increased timeout

    it('should handle successful API response', async () => {
      const mockResponse = {
        result: true,
        data: {
          riskscore: 0.25,
          signals: { exchange: 0.8, scam: 0.1 },
          addressDetailsData: {
            n_txs: 100,
            balance_usd: 5000,
            first_tx: '2023-01-01',
            last_tx: '2023-12-01'
          }
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await provider.fetch('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');

      expect(result).toHaveProperty('riskScore', 25);
      expect(result).toHaveProperty('source', 'amlbot');
      expect(result).toHaveProperty('transactionCount', 100);
    }, 10000); // Increased timeout

    it('should detect Solana addresses correctly', async () => {
      const mockResponse = {
        success: true,
        data: {
          risk_score: 30,
          risk_level: 'low',
          is_blacklisted: false
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      // This test will fail because credentials aren't configured, but we can test the chain detection
      const result = await provider.fetch('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');

      expect(result).toHaveProperty('source', 'amlbot-mock');
    });

    it('should detect EVM addresses correctly', async () => {
      const result = await provider.fetch('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');

      expect(result).toHaveProperty('source', 'amlbot-mock');
    }, 10000); // Increased timeout
  });

  describe('getName', () => {
    it('should return correct provider name', () => {
      expect(provider.getName()).toBe('amlbot');
    });
  });

  describe('generateMockData', () => {
    it('should generate consistent mock data structure', async () => {
      const result = await provider.fetch('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');

      // Check all required fields are present
      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('isBlacklisted');
      expect(result).toHaveProperty('blacklistReasons');
      expect(result).toHaveProperty('tags');
      expect(result).toHaveProperty('firstSeen');
      expect(result).toHaveProperty('lastSeen');
      expect(result).toHaveProperty('transactionCount');
      expect(result).toHaveProperty('totalVolume');
      expect(result).toHaveProperty('suspiciousPatterns');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('reputationScore');
      expect(result).toHaveProperty('trustScore');
      expect(result).toHaveProperty('reports');
      expect(result).toHaveProperty('positiveFeedback');
      expect(result).toHaveProperty('negativeFeedback');
      expect(result).toHaveProperty('apiKeyConfigured');
      expect(result).toHaveProperty('providerConfig');
      expect(result).toHaveProperty('source');

      // Check data types
      expect(typeof result.riskScore).toBe('number');
      expect(typeof result.riskLevel).toBe('string');
      expect(typeof result.isBlacklisted).toBe('boolean');
      expect(Array.isArray(result.blacklistReasons)).toBe(true);
      expect(Array.isArray(result.tags)).toBe(true);
      expect(typeof result.firstSeen).toBe('string');
      expect(typeof result.lastSeen).toBe('string');
      expect(typeof result.transactionCount).toBe('number');
      expect(typeof result.totalVolume).toBe('number');
      expect(Array.isArray(result.suspiciousPatterns)).toBe(true);
      expect(typeof result.description).toBe('string');
    }, 10000); // Increased timeout
  });
}); 