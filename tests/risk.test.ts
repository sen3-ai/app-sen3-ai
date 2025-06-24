import request from 'supertest';
import { app } from '../src/index';

// Set test environment
process.env.NODE_ENV = 'test';

describe('Risk API Endpoint', () => {
  describe('GET /risk/:address', () => {
    // Use real contract addresses for testing
    const testContractAddress = '0xf75e354c5edc8efed9b59ee9f67a80845ade7d0c'; // Known contract
    const testEOAAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'; // Known EOA

    it('should return success response for valid EVM contract address', async () => {
      const response = await request(app)
        .get(`/risk/${testContractAddress}`)
        .expect(200);

      expect(response.body).toEqual({
        result: true,
        data: expect.objectContaining({
          address: testContractAddress,
          addressType: 'evm',
          riskScore: expect.any(Number),
          description: expect.any(String),
          confidence: expect.any(Number),
          explanations: expect.any(Array),
          processorCount: expect.any(Number),
          processorAssessments: expect.any(Array),
          providerData: expect.any(Object),
          timestamp: expect.any(String)
        })
      });
    }, 15000); // Increased timeout

    it('should return error for non-contract EVM address', async () => {
      const response = await request(app)
        .get(`/risk/${testEOAAddress}`)
        .expect(400);

      expect(response.body).toEqual({
        result: false,
        reason: expect.stringContaining('not a smart contract')
      });
    }, 15000); // Increased timeout

    it('should return error for invalid address format', async () => {
      const response = await request(app)
        .get('/risk/invalid-address')
        .expect(400);

      expect(response.body).toEqual({
        result: false,
        reason: 'Invalid address format. Only EVM and Solana addresses are supported.'
      });
    });

    it('should return error for empty address', async () => {
      const response = await request(app)
        .get('/risk/')
        .expect(404);
    });

    it('should include provider data in response', async () => {
      const response = await request(app)
        .get(`/risk/${testContractAddress}`)
        .expect(200);

      const { providerData } = response.body.data;
      
      expect(providerData).toBeDefined();
      expect(typeof providerData).toBe('object');
      
      // Check that at least one provider returned data
      const providerNames = Object.keys(providerData);
      expect(providerNames.length).toBeGreaterThan(0);
      
      // Check that each provider has the expected structure
      providerNames.forEach(providerName => {
        const providerDataItem = providerData[providerName];
        expect(providerDataItem).toHaveProperty('riskScore');
        expect(providerDataItem).toHaveProperty('source');
      });
    }, 15000); // Increased timeout

    it('should include processor data in response', async () => {
      const response = await request(app)
        .get(`/risk/${testContractAddress}`)
        .expect(200);

      const { explanations, processorCount, processorAssessments, confidence, riskScore } = response.body.data;
      
      expect(Array.isArray(explanations)).toBe(true);
      expect(typeof processorCount).toBe('number');
      expect(processorCount).toBeGreaterThan(0);
      expect(Array.isArray(processorAssessments)).toBe(true);
      expect(typeof confidence).toBe('number');
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
      expect(typeof riskScore).toBe('number');
      expect(riskScore).toBeGreaterThanOrEqual(0);
      expect(riskScore).toBeLessThanOrEqual(100);
    }, 15000); // Increased timeout

    it('should include detailed explanations for risk assessment', async () => {
      const response = await request(app)
        .get(`/risk/${testContractAddress}`)
        .expect(200);

      const { explanations, description } = response.body.data;
      
      expect(Array.isArray(explanations)).toBe(true);
      expect(explanations.length).toBeGreaterThan(0);
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
      
      // Check that explanations contain meaningful content
      explanations.forEach((explanation: string) => {
        expect(typeof explanation).toBe('string');
        expect(explanation.length).toBeGreaterThan(0);
      });
    }, 15000); // Increased timeout
  });

  describe('Address Type Detection', () => {
    it('should correctly identify EVM addresses', () => {
      const validEvmAddresses = [
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        '0xABC123DEF4567890ABC123DEF4567890ABC123DE'
      ];

      validEvmAddresses.forEach(address => {
        const isEvm = /^0x[0-9a-fA-F]{40}$/.test(address);
        expect(isEvm).toBe(true);
      });
    });

    it('should correctly identify Solana addresses', () => {
      const validSolanaAddresses = [
        '11111111111111111111111111111111',
        'So11111111111111111111111111111111111111112',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      ];

      validSolanaAddresses.forEach(address => {
        const isSolana = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
        expect(isSolana).toBe(true);
      });
    });

    it('should reject invalid addresses', () => {
      const invalidAddresses = [
        '0x123', // Too short
        '0x1234567890123456789012345678901234567890123456789012345678901234567890', // Too long
        'invalid-address',
        '1234567890123456789012345678901234567890', // Missing 0x prefix
        '0x123456789012345678901234567890123456789g' // Invalid character
      ];

      invalidAddresses.forEach(address => {
        const isEvm = /^0x[0-9a-fA-F]{40}$/.test(address);
        const isSolana = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
        expect(isEvm || isSolana).toBe(false);
      });
    });
  });
}); 