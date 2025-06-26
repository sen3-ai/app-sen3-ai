import request from 'supertest';
import { spawn } from 'child_process';

describe('Simple API Endpoint Tests', () => {
  const testAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // WETH
  let serverProcess: any;
  const baseUrl = 'http://localhost:3000';

  beforeAll(async () => {
    // Start the server
    serverProcess = spawn('ts-node', ['src/index.ts'], {
      stdio: 'pipe',
      detached: false
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  afterAll(async () => {
    // Kill the server
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  describe('Health Check', () => {
    it('should respond to health check', async () => {
      const response = await request(baseUrl)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('result');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status');
    });
  });

  describe('Search Endpoint', () => {
    it('should respond to search endpoint call', async () => {
      const response = await request(baseUrl)
        .get(`/search/${testAddress}`)
        .expect(200);

      expect(response.body).toHaveProperty('result');
      expect(response.body).toHaveProperty('data');
    });
  });
}); 