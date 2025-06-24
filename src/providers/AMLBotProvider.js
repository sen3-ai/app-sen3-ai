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
exports.AMLBotProvider = void 0;
const Provider_1 = require("./Provider");
const Config_1 = require("../config/Config");
const crypto_1 = __importDefault(require("crypto"));
class AMLBotProvider extends Provider_1.BaseProvider {
    constructor() {
        super(...arguments);
        this.config = Config_1.Config.getInstance();
        this.baseUrl = 'https://amlbot.silencatech.com/aml/api/ajaxcheck';
    }
    getName() {
        return 'amlbot';
    }
    fetch(address) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.safeFetch(() => __awaiter(this, void 0, void 0, function* () {
                const credentials = this.config.getCredentials();
                const providerConfig = this.config.getProviderConfigs().find(p => p.name === 'amlbot');
                if (!credentials.amlbotTmId || !credentials.amlbotAccessKey) {
                    console.warn('AMLBot credentials not configured, using mock data');
                    return this.generateMockData(address);
                }
                const timeout = (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.timeout) || 10000;
                const retries = (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.retries) || 3;
                for (let attempt = 1; attempt <= retries; attempt++) {
                    try {
                        const response = yield this.callAMLBotAPI(address, credentials.amlbotTmId, credentials.amlbotAccessKey, timeout);
                        if (response.result && response.data) {
                            return this.transformAMLBotResponse(response.data);
                        }
                        else {
                            console.warn(`AMLBot API error: ${response.description}`);
                            if (attempt === retries) {
                                return this.generateMockData(address);
                            }
                        }
                    }
                    catch (error) {
                        console.warn(`AMLBot API attempt ${attempt} failed:`, error);
                        if (attempt === retries) {
                            return this.generateMockData(address);
                        }
                        // Wait before retry (exponential backoff)
                        yield new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                    }
                }
                return this.generateMockData(address);
            }));
        });
    }
    callAMLBotAPI(address, tmId, accessKey, timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            try {
                // Calculate token as md5(address:accessKey:tmId)
                const tokenString = `${address}:${accessKey}:${tmId}`;
                const token = crypto_1.default.createHash('md5').update(tokenString).digest('hex');
                // Prepare form-urlencoded body
                const params = new URLSearchParams();
                params.append('address', address);
                params.append('hash', address);
                params.append('chain', 'ethereum');
                params.append('tmId', tmId);
                params.append('token', token);
                const response = yield fetch(this.baseUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: params.toString(),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const data = yield response.json();
                return data;
            }
            catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        });
    }
    transformAMLBotResponse(data) {
        var _a, _b, _c, _d;
        if (!data) {
            return this.generateMockData('unknown');
        }
        const riskScore = data.riskscore || 0;
        const normalizedScore = Math.round(riskScore * 100); // Convert 0-1 to 0-100
        return {
            // Real AMLBot data
            riskScore: normalizedScore,
            riskLevel: this.getRiskLevel(riskScore),
            isBlacklisted: false, // AMLBot doesn't provide this directly
            blacklistReasons: [],
            tags: this.extractTags(data.signals),
            firstSeen: (_a = data.addressDetailsData) === null || _a === void 0 ? void 0 : _a.first_tx,
            lastSeen: (_b = data.addressDetailsData) === null || _b === void 0 ? void 0 : _b.last_tx,
            transactionCount: ((_c = data.addressDetailsData) === null || _c === void 0 ? void 0 : _c.n_txs) || 0,
            totalVolume: ((_d = data.addressDetailsData) === null || _d === void 0 ? void 0 : _d.balance_usd) || 0,
            suspiciousPatterns: this.extractSuspiciousPatterns(data.signals),
            description: this.generateExplanation(data),
            // Legacy/compat fields for processor
            reputationScore: 100 - normalizedScore,
            trustScore: 100 - normalizedScore,
            reports: 0,
            positiveFeedback: 100 - normalizedScore,
            negativeFeedback: normalizedScore,
            // Provider metadata
            apiKeyConfigured: true,
            providerConfig: {
                timeout: 10000,
                retries: 3
            },
            source: 'amlbot'
        };
    }
    getRiskLevel(riskScore) {
        if (riskScore < 0.1)
            return 'low';
        if (riskScore < 0.3)
            return 'medium';
        if (riskScore < 0.6)
            return 'high';
        return 'critical';
    }
    extractTags(signals) {
        const tags = [];
        if (signals.exchange > 0.5)
            tags.push('exchange');
        if (signals.risky_exchange > 0.1)
            tags.push('risky_exchange');
        if (signals.scam > 0.1)
            tags.push('scam');
        if (signals.sanctions > 0.1)
            tags.push('sanctions');
        if (signals.mixer > 0.1)
            tags.push('mixer');
        if (signals.dark_market > 0.1)
            tags.push('dark_market');
        return tags;
    }
    extractSuspiciousPatterns(signals) {
        const patterns = [];
        if (signals.exchange > 0.8)
            patterns.push('High exchange activity');
        if (signals.risky_exchange > 0.2)
            patterns.push('Risky exchange connections');
        if (signals.scam > 0.1)
            patterns.push('Scam-related activity');
        if (signals.sanctions > 0.1)
            patterns.push('Sanctions-related activity');
        if (signals.mixer > 0.1)
            patterns.push('Mixer/tumbler usage');
        if (signals.dark_market > 0.1)
            patterns.push('Dark market activity');
        return patterns;
    }
    generateExplanation(data) {
        var _a, _b;
        const riskScore = (data === null || data === void 0 ? void 0 : data.riskscore) || 0;
        const signals = (data === null || data === void 0 ? void 0 : data.signals) || {};
        const riskFactors = [];
        if (signals.exchange > 0.5)
            riskFactors.push('High exchange activity');
        if (signals.risky_exchange > 0.1)
            riskFactors.push('Risky exchange connections');
        if (signals.scam > 0.1)
            riskFactors.push('Scam-related activity');
        if (signals.sanctions > 0.1)
            riskFactors.push('Sanctions-related activity');
        if (signals.mixer > 0.1)
            riskFactors.push('Mixer/tumbler usage');
        if (signals.dark_market > 0.1)
            riskFactors.push('Dark market activity');
        const balance = ((_a = data === null || data === void 0 ? void 0 : data.addressDetailsData) === null || _a === void 0 ? void 0 : _a.balance_usd) || 0;
        const txCount = ((_b = data === null || data === void 0 ? void 0 : data.addressDetailsData) === null || _b === void 0 ? void 0 : _b.n_txs) || 0;
        let explanation = `Risk score: ${(riskScore * 100).toFixed(1)}%. `;
        if (riskFactors.length > 0) {
            explanation += `Risk factors: ${riskFactors.join(', ')}. `;
        }
        explanation += `Balance: $${balance.toFixed(2)}, Transactions: ${txCount}. `;
        if (riskScore < 0.1) {
            explanation += 'Address appears to be low risk.';
        }
        else if (riskScore < 0.3) {
            explanation += 'Address shows moderate risk indicators.';
        }
        else {
            explanation += 'Address shows significant risk indicators.';
        }
        return explanation;
    }
    generateMockData(address) {
        return {
            riskScore: Math.floor(Math.random() * 50) + 10,
            riskLevel: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
            isBlacklisted: Math.random() < 0.05,
            blacklistReasons: [],
            tags: ['verified', 'active'],
            firstSeen: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
            lastSeen: new Date().toISOString(),
            transactionCount: Math.floor(Math.random() * 1000),
            totalVolume: Math.floor(Math.random() * 1000000),
            suspiciousPatterns: [],
            description: `Mock AMLBot data for ${address} - API not configured`,
            // Legacy/compat fields
            reputationScore: Math.floor(Math.random() * 100),
            trustScore: Math.floor(Math.random() * 100),
            reports: Math.floor(Math.random() * 10),
            positiveFeedback: Math.floor(Math.random() * 100),
            negativeFeedback: Math.floor(Math.random() * 50),
            // Provider metadata
            apiKeyConfigured: false,
            providerConfig: {
                timeout: 10000,
                retries: 3
            },
            source: 'amlbot-mock'
        };
    }
}
exports.AMLBotProvider = AMLBotProvider;
