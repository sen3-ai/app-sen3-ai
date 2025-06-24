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
exports.ReputationProvider = void 0;
const Provider_1 = require("./Provider");
const Config_1 = require("../config/Config");
class ReputationProvider extends Provider_1.BaseProvider {
    constructor() {
        super(...arguments);
        this.config = Config_1.Config.getInstance();
    }
    getName() {
        return 'reputation';
    }
    fetch(address) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.safeFetch(() => __awaiter(this, void 0, void 0, function* () {
                const credentials = this.config.getCredentials();
                const providerConfig = this.config.getProviderConfigs().find(p => p.name === 'reputation');
                // Simulate API call with configured timeout
                const timeout = (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.timeout) || 3000;
                yield this.simulateApiCall(timeout);
                // Use API key if available
                const apiKey = credentials.reputationApiKey;
                return {
                    reputationScore: this.generateReputationScore(),
                    riskLevel: this.generateRiskLevel(),
                    flaggedIncidents: this.generateFlaggedIncidents(),
                    trustScore: this.generateTrustScore(),
                    blacklistStatus: this.generateBlacklistStatus(),
                    apiKeyConfigured: !!apiKey,
                    providerConfig: {
                        timeout,
                        retries: (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.retries) || 2
                    },
                    // Legacy/compat fields for processor/tests
                    isBlacklisted: this.generateBlacklistStatus(),
                    reports: Math.floor(Math.random() * 20),
                    positiveFeedback: Math.floor(Math.random() * 100),
                    negativeFeedback: Math.floor(Math.random() * 100)
                };
            }));
        });
    }
    simulateApiCall(timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise(resolve => setTimeout(resolve, Math.random() * timeout * 0.5 + timeout * 0.1));
        });
    }
    generateReputationScore() {
        return Math.floor(Math.random() * 100);
    }
    generateRiskLevel() {
        const levels = ['low', 'medium', 'high', 'critical'];
        return levels[Math.floor(Math.random() * levels.length)];
    }
    generateFlaggedIncidents() {
        return Math.floor(Math.random() * 10);
    }
    generateTrustScore() {
        return Math.floor(Math.random() * 100);
    }
    generateBlacklistStatus() {
        return Math.random() < 0.1; // 10% chance of being blacklisted
    }
}
exports.ReputationProvider = ReputationProvider;
