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
exports.BlockchainProvider = void 0;
const Provider_1 = require("./Provider");
const Config_1 = require("../config/Config");
class BlockchainProvider extends Provider_1.BaseProvider {
    constructor() {
        super(...arguments);
        this.config = Config_1.Config.getInstance();
    }
    getName() {
        return 'blockchain';
    }
    fetch(address) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.safeFetch(() => __awaiter(this, void 0, void 0, function* () {
                const credentials = this.config.getCredentials();
                const providerConfig = this.config.getProviderConfigs().find(p => p.name === 'blockchain');
                // Simulate API call with configured timeout
                const timeout = (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.timeout) || 5000;
                yield this.simulateApiCall(timeout);
                // Use API key if available
                const apiKey = credentials.blockchainApiKey || credentials.etherscanApiKey;
                return {
                    balance: this.generateRandomBalance(),
                    transactionCount: this.generateRandomTransactionCount(),
                    lastActivity: this.generateRandomDate(),
                    contractInteractions: this.generateRandomContractInteractions(),
                    apiKeyConfigured: !!apiKey,
                    providerConfig: {
                        timeout,
                        retries: (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.retries) || 3
                    },
                    // Legacy/compat fields for processor/tests
                    totalVolume: Math.floor(Math.random() * 2000000),
                    firstSeen: this.generateRandomDate(),
                    lastSeen: this.generateRandomDate(),
                    averageTransactionValue: Math.floor(Math.random() * 1000)
                };
            }));
        });
    }
    simulateApiCall(timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise(resolve => setTimeout(resolve, Math.random() * timeout * 0.5 + timeout * 0.1));
        });
    }
    generateRandomBalance() {
        return Math.random() * 1000000;
    }
    generateRandomTransactionCount() {
        return Math.floor(Math.random() * 10000);
    }
    generateRandomDate() {
        const now = new Date();
        const daysAgo = Math.floor(Math.random() * 365);
        const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        return date.toISOString();
    }
    generateRandomContractInteractions() {
        const contracts = [
            '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 Router
            '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3 Router
            '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap Router
            '0x7D1AfA7B718fb893dB30A3aBc0Cfc608aCafEBB', // Polygon Bridge
            '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B' // Compound
        ];
        const count = Math.floor(Math.random() * 5);
        return contracts.slice(0, count);
    }
}
exports.BlockchainProvider = BlockchainProvider;
