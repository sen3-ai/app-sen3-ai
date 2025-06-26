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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../src/index");
describe('Risk API Endpoint', () => {
    describe('GET /risk/:address', () => {
        it('should return success response for valid EVM address', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.app)
                .get('/risk/ethereum/0xabc1234567890abcdef1234567890abcdef12345')
                .expect(200);
            expect(response.body).toEqual({
                result: true,
                data: {
                    address: '0xabc1234567890abcdef1234567890abcdef12345',
                    chain: 'ethereum',
                    contractInfo: expect.any(Object),
                    riskScore: expect.any(Number),
                    description: expect.stringContaining('EVM address'),
                    explanations: expect.any(Array),
                    timestamp: expect.any(String)
                }
            });
        }));
        it('should return success response for valid Solana address with trusted suffix', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.app)
                .get('/risk/solana/11111111111111111111111111111111A')
                .expect(200);
            expect(response.body).toEqual({
                result: true,
                data: {
                    address: '11111111111111111111111111111111A',
                    chain: 'solana',
                    contractInfo: expect.any(Object),
                    riskScore: expect.any(Number),
                    description: expect.stringContaining('SOLANA address'),
                    explanations: expect.any(Array),
                    timestamp: expect.any(String)
                }
            });
        }));
        it('should return success response for valid Solana address with untrusted suffix', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.app)
                .get('/risk/solana/11111111111111111111111111111111')
                .expect(200);
            expect(response.body).toEqual({
                result: true,
                data: {
                    address: '11111111111111111111111111111111',
                    chain: 'solana',
                    contractInfo: expect.any(Object),
                    riskScore: expect.any(Number),
                    description: expect.stringContaining('SOLANA address'),
                    explanations: expect.any(Array),
                    timestamp: expect.any(String)
                }
            });
        }));
        it('should return error response for invalid address format', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.app)
                .get('/risk/ethereum/invalid-address')
                .expect(400);
            expect(response.body).toEqual({
                result: false,
                reason: 'Missing or invalid address parameter'
            });
        }));
        it('should return error response for malformed EVM address', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.app)
                .get('/risk/ethereum/0x123') // Too short
                .expect(400);
            expect(response.body).toEqual({
                result: false,
                reason: 'Missing or invalid address parameter'
            });
        }));
        it('should return error response for malformed Solana address', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.app)
                .get('/risk/solana/1111111111111111111111111111111') // Too short
                .expect(400);
            expect(response.body).toEqual({
                result: false,
                reason: 'Missing or invalid address parameter'
            });
        }));
        it('should return error response for empty address', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.app)
                .get('/risk/ethereum/')
                .expect(404); // Express will return 404 for empty path
            // Test with URL encoded space
            const response2 = yield (0, supertest_1.default)(index_1.app)
                .get('/risk/ethereum/%20') // URL encoded space
                .expect(400);
            expect(response2.body).toEqual({
                result: false,
                reason: 'Address cannot be empty'
            });
        }));
        it('should include provider data in response when debug is enabled', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.app)
                .get('/risk/ethereum/0xabc1234567890abcdef1234567890abcdef12345?debug=true')
                .expect(200);
            const { providerData } = response.body.data;
            // Only check for providers that are actually enabled
            if (providerData) {
                // Check for real providers that might be present
                if (providerData.amlbot) {
                    expect(providerData.amlbot).toHaveProperty('riskScore');
                    expect(providerData.amlbot).toHaveProperty('riskLevel');
                }
                if (providerData.coingecko) {
                    expect(providerData.coingecko).toHaveProperty('riskScore');
                    expect(providerData.coingecko).toHaveProperty('marketData');
                }
                if (providerData.dexscreener) {
                    expect(providerData.dexscreener).toHaveProperty('source');
                }
            }
        }));
        it('should include processor data in response when debug is enabled', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.app)
                .get('/risk/ethereum/0xabc1234567890abcdef1234567890abcdef12345?debug=true')
                .expect(200);
            const { explanations, processorAssessments, riskScore } = response.body.data;
            expect(Array.isArray(explanations)).toBe(true);
            expect(Array.isArray(processorAssessments)).toBe(true);
            // Check processor assessment structure
            if (processorAssessments.length > 0) {
                const assessment = processorAssessments[0];
                expect(assessment).toHaveProperty('score');
                expect(assessment).toHaveProperty('explanations');
                expect(assessment).toHaveProperty('processorName');
            }
            expect(typeof riskScore).toBe('number');
            expect(riskScore).toBeGreaterThanOrEqual(0);
            expect(riskScore).toBeLessThanOrEqual(100);
        }));
        it('should include detailed explanations for risk assessment', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.app)
                .get('/risk/ethereum/0xabc1234567890abcdef1234567890abcdef12345')
                .expect(200);
            const { explanations, description } = response.body.data;
            expect(Array.isArray(explanations)).toBe(true);
            // Check that description includes explanations if any exist
            if (explanations.length > 0) {
                expect(description).toContain('Risk factors:');
                explanations.forEach((explanation) => {
                    expect(description).toContain(explanation);
                });
            }
        }));
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
