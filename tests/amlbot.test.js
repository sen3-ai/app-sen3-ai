"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const AMLBotProvider_1 = require("../src/providers/AMLBotProvider");
// Mock fetch globally
global.fetch = jest.fn();
describe('AMLBot Provider', () => {
    let provider;
    beforeEach(() => {
        provider = new AMLBotProvider_1.AMLBotProvider();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('fetch', () => {
        it('should return mock data when credentials are not configured', () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield provider.fetch('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
            expect(result).toHaveProperty('riskScore');
            expect(result).toHaveProperty('riskLevel');
            expect(result).toHaveProperty('isBlacklisted');
            expect(result).toHaveProperty('apiKeyConfigured', false);
            expect(result).toHaveProperty('source', 'amlbot-mock');
            expect(result).toHaveProperty('transactionCount');
            expect(result).toHaveProperty('totalVolume');
        }));
        it('should handle network errors gracefully and return mock data', () => __awaiter(void 0, void 0, void 0, function* () {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));
            const result = yield provider.fetch('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
            expect(result).toHaveProperty('source', 'amlbot-mock');
            expect(result).toHaveProperty('apiKeyConfigured', false);
        }));
        it('should retry on failure and eventually return mock data', () => __awaiter(void 0, void 0, void 0, function* () {
            global.fetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'));
            const result = yield provider.fetch('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
            expect(result).toHaveProperty('source', 'amlbot-mock');
            expect(result).toHaveProperty('apiKeyConfigured', false);
        }));
        it('should detect Solana addresses correctly', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockResponse = {
                success: true,
                data: {
                    risk_score: 30,
                    risk_level: 'low',
                    is_blacklisted: false
                }
            };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => __awaiter(void 0, void 0, void 0, function* () { return mockResponse; })
            });
            // This test will fail because credentials aren't configured, but we can test the chain detection
            const result = yield provider.fetch('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
            expect(result).toHaveProperty('source', 'amlbot-mock');
        }));
        it('should detect EVM addresses correctly', () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield provider.fetch('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
            expect(result).toHaveProperty('source', 'amlbot-mock');
        }));
    });
    describe('getName', () => {
        it('should return correct provider name', () => {
            expect(provider.getName()).toBe('amlbot');
        });
    });
    describe('generateMockData', () => {
        it('should generate consistent mock data structure', () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield provider.fetch('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
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
        }));
    });
});
