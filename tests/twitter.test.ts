import { TwitterProvider } from '../src/providers/TwitterProvider';
import { Config } from '../src/config/Config';

// Mock the Config class
jest.mock('../src/config/Config');

describe('TwitterProvider', () => {
  let twitterProvider: TwitterProvider;
  let mockConfig: jest.Mocked<Config>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock config
    mockConfig = {
      getProviderConfigs: jest.fn().mockReturnValue([
        {
          name: 'twitter',
          enabled: true,
          priority: 7,
          timeout: 10000,
          retries: 1
        }
      ]),
      getTwitterApiKey: jest.fn().mockReturnValue('test-api-key')
    } as any;

    // Mock the getInstance method
    (Config.getInstance as jest.Mock).mockReturnValue(mockConfig);

    twitterProvider = new TwitterProvider(mockConfig);
  });

  describe('fetch', () => {
    it('should return mock data in test environment', async () => {
      // Set test environment
      process.env.NODE_ENV = 'test';

      const result = await twitterProvider.fetch('0x1234567890abcdef');

      expect(result).toHaveProperty('tweets');
      expect(result).toHaveProperty('totalMentions');
      expect(result).toHaveProperty('positiveMentions');
      expect(result).toHaveProperty('negativeMentions');
      expect(result).toHaveProperty('neutralMentions');
      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('source', 'twitter');
      expect(result).toHaveProperty('apiKeyConfigured', true);
      expect(result).toHaveProperty('providerConfig');

      expect(result.tweets).toHaveLength(3);
      expect(result.totalMentions).toBe(3);
      expect(result.positiveMentions).toBe(1);
      expect(result.negativeMentions).toBe(1);
      expect(result.neutralMentions).toBe(1);
      expect(result.riskScore).toBe(50);
    });

    it('should use mock data when no API key is configured', async () => {
      // Set production environment but no API key
      process.env.NODE_ENV = 'production';
      mockConfig.getTwitterApiKey.mockReturnValue(undefined);

      // Create a new provider instance with the updated mock config
      const providerWithoutKey = new TwitterProvider(mockConfig);

      const result = await providerWithoutKey.fetch('0x1234567890abcdef');

      expect(result.source).toBe('twitter');
      expect(result.apiKeyConfigured).toBe(false);
      expect(result.tweets).toHaveLength(3);
    });

    it('should include address in mock tweet text', async () => {
      process.env.NODE_ENV = 'test';

      const address = '0xabcdef1234567890';
      const result = await twitterProvider.fetch(address);

      expect(result.tweets[0].text).toContain(address);
      expect(result.tweets[1].text).toContain(address);
      expect(result.tweets[2].text).toContain(address);
    });

    it('should have proper tweet structure in mock data', async () => {
      process.env.NODE_ENV = 'test';

      const result = await twitterProvider.fetch('0x1234567890abcdef');

      result.tweets.forEach(tweet => {
        expect(tweet).toHaveProperty('id');
        expect(tweet).toHaveProperty('text');
        expect(tweet).toHaveProperty('created_at');
        expect(tweet).toHaveProperty('author_id');
        expect(tweet).toHaveProperty('sentiment');
        expect(tweet).toHaveProperty('mentions');

        expect(['positive', 'negative', 'neutral']).toContain(tweet.sentiment);
        expect(typeof tweet.mentions).toBe('number');
        expect(tweet.mentions).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have balanced sentiment distribution in mock data', async () => {
      process.env.NODE_ENV = 'test';

      const result = await twitterProvider.fetch('0x1234567890abcdef');

      const sentiments = result.tweets.map(t => t.sentiment);
      expect(sentiments).toContain('positive');
      expect(sentiments).toContain('negative');
      expect(sentiments).toContain('neutral');
    });

    it('should have proper provider config structure', async () => {
      process.env.NODE_ENV = 'test';

      const result = await twitterProvider.fetch('0x1234567890abcdef');

      expect(result.providerConfig).toHaveProperty('timeout', 10000);
      expect(result.providerConfig).toHaveProperty('retries', 1);
    });
  });

  describe('sentiment analysis', () => {
    it('should identify positive sentiment correctly', async () => {
      process.env.NODE_ENV = 'test';

      const result = await twitterProvider.fetch('0x1234567890abcdef');
      const positiveTweet = result.tweets.find(t => t.sentiment === 'positive');

      expect(positiveTweet).toBeDefined();
      expect(positiveTweet?.text).toContain('excited');
    });

    it('should identify negative sentiment correctly', async () => {
      process.env.NODE_ENV = 'test';

      const result = await twitterProvider.fetch('0x1234567890abcdef');
      const negativeTweet = result.tweets.find(t => t.sentiment === 'negative');

      expect(negativeTweet).toBeDefined();
      expect(negativeTweet?.text).toContain('suspicious');
    });

    it('should identify neutral sentiment correctly', async () => {
      process.env.NODE_ENV = 'test';

      const result = await twitterProvider.fetch('0x1234567890abcdef');
      const neutralTweet = result.tweets.find(t => t.sentiment === 'neutral');

      expect(neutralTweet).toBeDefined();
      expect(neutralTweet?.text).toContain('analysis');
    });
  });

  describe('risk score calculation', () => {
    it('should return balanced risk score for mock data', async () => {
      process.env.NODE_ENV = 'test';

      const result = await twitterProvider.fetch('0x1234567890abcdef');

      expect(result.riskScore).toBe(50);
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    it('should have consistent mention counts', async () => {
      process.env.NODE_ENV = 'test';

      const result = await twitterProvider.fetch('0x1234567890abcdef');

      expect(result.totalMentions).toBe(3);
      expect(result.positiveMentions + result.negativeMentions + result.neutralMentions).toBe(3);
    });
  });

  describe('error handling', () => {
    it('should handle missing provider config gracefully', async () => {
      mockConfig.getProviderConfigs.mockReturnValue([]);

      const result = await twitterProvider.fetch('0x1234567890abcdef');

      expect(result).toBeDefined();
      expect(result.source).toBe('twitter');
    });

    it('should use default timeout and retries when config is missing', async () => {
      mockConfig.getProviderConfigs.mockReturnValue([]);

      const result = await twitterProvider.fetch('0x1234567890abcdef');

      expect(result.providerConfig.timeout).toBe(10000);
      expect(result.providerConfig.retries).toBe(1);
    });
  });
}); 