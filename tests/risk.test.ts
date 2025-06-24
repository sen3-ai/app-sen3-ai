import request from 'supertest';
import { app } from '../src/index';

describe('Risk API Endpoint', () => {
  describe('GET /risk/:address', () => {
    it('should return success response for valid EVM address with trusted prefix', async () => {
      const response = await request(app)
        .get('/risk/0xabc1234567890abcdef1234567890abcdef12345')
        .expect(200);

      expect(response.body).toEqual({
        result: true,
        data: {
          address: '0xabc1234567890abcdef1234567890abcdef12345',
          addressType: 'evm',
          riskScore: expect.any(Number),
          description: expect.stringContaining('EVM address'),
          confidence: expect.any(Number),
          factors: expect.any(Array),
          providerData: expect.objectContaining({
            blockchain: expect.any(Object),
            reputation: expect.any(Object),
            social: expect.any(Object),
            onchain: expect.any(Object)
          }),
          timestamp: expect.any(String)
        }
      });
    });

    it('should return success response for valid EVM address with untrusted prefix', async () => {
      const response = await request(app)
        .get('/risk/0xdef1234567890abcdef1234567890abcdef12345')
        .expect(200);

      expect(response.body).toEqual({
        result: true,
        data: {
          address: '0xdef1234567890abcdef1234567890abcdef12345',
          addressType: 'evm',
          riskScore: expect.any(Number),
          description: expect.stringContaining('EVM address'),
          confidence: expect.any(Number),
          factors: expect.any(Array),
          providerData: expect.objectContaining({
            blockchain: expect.any(Object),
            reputation: expect.any(Object),
            social: expect.any(Object),
            onchain: expect.any(Object)
          }),
          timestamp: expect.any(String)
        }
      });
    });

    it('should return success response for valid Solana address with trusted suffix', async () => {
      const response = await request(app)
        .get('/risk/11111111111111111111111111111111A')
        .expect(200);

      expect(response.body).toEqual({
        result: true,
        data: {
          address: '11111111111111111111111111111111A',
          addressType: 'solana',
          riskScore: expect.any(Number),
          description: expect.stringContaining('SOLANA address'),
          confidence: expect.any(Number),
          factors: expect.any(Array),
          providerData: expect.objectContaining({
            blockchain: expect.any(Object),
            reputation: expect.any(Object),
            social: expect.any(Object),
            onchain: expect.any(Object)
          }),
          timestamp: expect.any(String)
        }
      });
    });

    it('should return success response for valid Solana address with untrusted suffix', async () => {
      const response = await request(app)
        .get('/risk/11111111111111111111111111111111')
        .expect(200);

      expect(response.body).toEqual({
        result: true,
        data: {
          address: '11111111111111111111111111111111',
          addressType: 'solana',
          riskScore: expect.any(Number),
          description: expect.stringContaining('SOLANA address'),
          confidence: expect.any(Number),
          factors: expect.any(Array),
          providerData: expect.objectContaining({
            blockchain: expect.any(Object),
            reputation: expect.any(Object),
            social: expect.any(Object),
            onchain: expect.any(Object)
          }),
          timestamp: expect.any(String)
        }
      });
    });

    it('should return error response for invalid address format', async () => {
      const response = await request(app)
        .get('/risk/invalid-address')
        .expect(400);

      expect(response.body).toEqual({
        result: false,
        reason: 'Invalid address format. Only EVM and Solana addresses are supported.'
      });
    });

    it('should return error response for malformed EVM address', async () => {
      const response = await request(app)
        .get('/risk/0x123') // Too short
        .expect(400);

      expect(response.body).toEqual({
        result: false,
        reason: 'Invalid address format. Only EVM and Solana addresses are supported.'
      });
    });

    it('should return error response for malformed Solana address', async () => {
      const response = await request(app)
        .get('/risk/1111111111111111111111111111111') // Too short
        .expect(400);

      expect(response.body).toEqual({
        result: false,
        reason: 'Invalid address format. Only EVM and Solana addresses are supported.'
      });
    });

    it('should return error response for empty address', async () => {
      const response = await request(app)
        .get('/risk/')
        .expect(404); // Express will return 404 for empty path

      // Test with URL encoded space
      const response2 = await request(app)
        .get('/risk/%20') // URL encoded space
        .expect(400);

      expect(response2.body).toEqual({
        result: false,
        reason: 'Address cannot be empty'
      });
    });

    it('should include provider data in response', async () => {
      const response = await request(app)
        .get('/risk/0xabc1234567890abcdef1234567890abcdef12345')
        .expect(200);

      const { providerData } = response.body.data;
      
      expect(providerData).toHaveProperty('blockchain');
      expect(providerData).toHaveProperty('reputation');
      expect(providerData).toHaveProperty('social');
      expect(providerData).toHaveProperty('onchain');
      
      // Check that blockchain data has expected structure
      expect(providerData.blockchain).toHaveProperty('transactionCount');
      expect(providerData.blockchain).toHaveProperty('totalVolume');
      expect(providerData.blockchain).toHaveProperty('firstSeen');
      expect(providerData.blockchain).toHaveProperty('lastSeen');
      expect(providerData.blockchain).toHaveProperty('averageTransactionValue');
      
      // Check that reputation data has expected structure
      expect(providerData.reputation).toHaveProperty('trustScore');
      expect(providerData.reputation).toHaveProperty('isBlacklisted');
      expect(providerData.reputation).toHaveProperty('riskLevel');
    });

    it('should include risk factors and confidence in response', async () => {
      const response = await request(app)
        .get('/risk/0xabc1234567890abcdef1234567890abcdef12345')
        .expect(200);

      const { factors, confidence, riskScore } = response.body.data;
      
      expect(Array.isArray(factors)).toBe(true);
      expect(typeof confidence).toBe('number');
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
      expect(typeof riskScore).toBe('number');
      expect(riskScore).toBeGreaterThanOrEqual(0);
      expect(riskScore).toBeLessThanOrEqual(100);
    });
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