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
exports.SocialProvider = void 0;
const Provider_1 = require("./Provider");
const Config_1 = require("../config/Config");
class SocialProvider extends Provider_1.BaseProvider {
    constructor() {
        super(...arguments);
        this.config = Config_1.Config.getInstance();
    }
    getName() {
        return 'social';
    }
    fetch(address) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.safeFetch(() => __awaiter(this, void 0, void 0, function* () {
                const credentials = this.config.getCredentials();
                const providerConfig = this.config.getProviderConfigs().find(p => p.name === 'social');
                // Simulate API call with configured timeout
                const timeout = (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.timeout) || 4000;
                yield this.simulateApiCall(timeout);
                // Use API key if available
                const apiKey = credentials.socialApiKey;
                return {
                    socialPresence: this.generateSocialPresence(),
                    followers: this.generateFollowers(),
                    mentions: this.generateMentions(),
                    sentiment: this.generateSentiment(),
                    verifiedAccounts: this.generateVerifiedAccounts(),
                    apiKeyConfigured: !!apiKey,
                    providerConfig: {
                        timeout,
                        retries: (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.retries) || 2
                    },
                    // Legacy/compat fields for processor/tests
                    influencers: Math.floor(Math.random() * 10)
                };
            }));
        });
    }
    simulateApiCall(timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise(resolve => setTimeout(resolve, Math.random() * timeout * 0.5 + timeout * 0.1));
        });
    }
    generateSocialPresence() {
        return Math.random() < 0.3; // 30% chance of having social presence
    }
    generateFollowers() {
        if (!this.generateSocialPresence())
            return 0;
        return Math.floor(Math.random() * 10000);
    }
    generateMentions() {
        if (!this.generateSocialPresence())
            return 0;
        return Math.floor(Math.random() * 500);
    }
    generateSentiment() {
        const sentiments = ['positive', 'neutral', 'negative'];
        return sentiments[Math.floor(Math.random() * sentiments.length)];
    }
    generateVerifiedAccounts() {
        const platforms = ['twitter', 'telegram', 'discord', 'github'];
        const verified = [];
        if (this.generateSocialPresence()) {
            const count = Math.floor(Math.random() * 3);
            for (let i = 0; i < count; i++) {
                verified.push(platforms[Math.floor(Math.random() * platforms.length)]);
            }
        }
        return verified;
    }
}
exports.SocialProvider = SocialProvider;
