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
          riskScore: 20,
          description: 'EVM address. Score based on prefix. Trusted prefix.',
          addressType: 'evm',
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
          riskScore: 70,
          description: 'EVM address. Score based on prefix. Untrusted prefix.',
          addressType: 'evm',
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
          riskScore: 30,
          description: 'Solana address. Score based on suffix. Trusted suffix.',
          addressType: 'solana',
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
          riskScore: 80,
          description: 'Solana address. Score based on suffix. Untrusted suffix.',
          addressType: 'solana',
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