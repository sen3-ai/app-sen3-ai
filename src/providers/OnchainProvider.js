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
exports.OnchainProvider = void 0;
const Provider_1 = require("./Provider");
const Config_1 = require("../config/Config");
class OnchainProvider extends Provider_1.BaseProvider {
    constructor() {
        super(...arguments);
        this.config = Config_1.Config.getInstance();
    }
    getName() {
        return 'onchain';
    }
    fetch(address) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.safeFetch(() => __awaiter(this, void 0, void 0, function* () {
                const credentials = this.config.getCredentials();
                const providerConfig = this.config.getProviderConfigs().find(p => p.name === 'onchain');
                // Simulate API call with configured timeout
                const timeout = (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.timeout) || 6000;
                yield this.simulateApiCall(timeout);
                // Use API key if available
                const apiKey = credentials.onchainApiKey;
                return {
                    defiProtocols: this.generateDefiProtocols(),
                    nftHoldings: this.generateNftHoldings(),
                    tokenHoldings: this.generateTokenHoldings(),
                    smartContractInteractions: this.generateSmartContractInteractions(),
                    gasUsage: this.generateGasUsage(),
                    apiKeyConfigured: !!apiKey,
                    providerConfig: {
                        timeout,
                        retries: (providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.retries) || 3
                    },
                    // Legacy/compat fields for processor/tests
                    hasContractInteraction: Math.random() > 0.5,
                    gasUsed: Math.floor(Math.random() * 2000000),
                    contractCount: Math.floor(Math.random() * 20),
                    suspiciousPatterns: Math.random() > 0.8 ? ['Unusual gas patterns'] : [],
                    dappInteractions: ['Uniswap', 'OpenSea', 'Aave'].slice(0, Math.floor(Math.random() * 3) + 1)
                };
            }));
        });
    }
    simulateApiCall(timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise(resolve => setTimeout(resolve, Math.random() * timeout * 0.5 + timeout * 0.1));
        });
    }
    generateDefiProtocols() {
        const protocols = [
            'uniswap', 'pancakeswap', 'aave', 'compound', 'curve',
            'sushiswap', 'balancer', 'yearn', 'makerdao', 'synthetix'
        ];
        const count = Math.floor(Math.random() * 5);
        const selected = [];
        for (let i = 0; i < count; i++) {
            const protocol = protocols[Math.floor(Math.random() * protocols.length)];
            if (!selected.includes(protocol)) {
                selected.push(protocol);
            }
        }
        return selected;
    }
    generateNftHoldings() {
        const collections = [
            'Bored Ape Yacht Club', 'CryptoPunks', 'Doodles', 'Azuki', 'Moonbirds',
            'CloneX', 'Meebits', 'World of Women', 'Cool Cats', 'VeeFriends'
        ];
        const count = Math.floor(Math.random() * 10);
        const holdings = [];
        for (let i = 0; i < count; i++) {
            holdings.push({
                collection: collections[Math.floor(Math.random() * collections.length)],
                count: Math.floor(Math.random() * 5) + 1,
                floorPrice: Math.random() * 100
            });
        }
        return holdings;
    }
    generateTokenHoldings() {
        const tokens = [
            { symbol: 'USDC', name: 'USD Coin' },
            { symbol: 'USDT', name: 'Tether' },
            { symbol: 'DAI', name: 'Dai Stablecoin' },
            { symbol: 'WETH', name: 'Wrapped Ether' },
            { symbol: 'WBTC', name: 'Wrapped Bitcoin' },
            { symbol: 'UNI', name: 'Uniswap' },
            { symbol: 'AAVE', name: 'Aave' },
            { symbol: 'COMP', name: 'Compound' }
        ];
        const count = Math.floor(Math.random() * 8);
        const holdings = [];
        for (let i = 0; i < count; i++) {
            const token = tokens[Math.floor(Math.random() * tokens.length)];
            holdings.push(Object.assign(Object.assign({}, token), { balance: Math.random() * 10000, value: Math.random() * 50000 }));
        }
        return holdings;
    }
    generateSmartContractInteractions() {
        const contracts = [
            { name: 'Uniswap V2 Router', address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' },
            { name: 'Uniswap V3 Router', address: '0xE592427A0AEce92De3Edee1F18E0157C05861564' },
            { name: 'Aave Lending Pool', address: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9' },
            { name: 'Compound Comptroller', address: '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B' },
            { name: 'Curve Registry', address: '0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5' }
        ];
        const count = Math.floor(Math.random() * 5);
        const interactions = [];
        for (let i = 0; i < count; i++) {
            const contract = contracts[Math.floor(Math.random() * contracts.length)];
            interactions.push(Object.assign(Object.assign({}, contract), { interactionCount: Math.floor(Math.random() * 100), lastInteraction: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() }));
        }
        return interactions;
    }
    generateGasUsage() {
        return Math.random() * 1000;
    }
}
exports.OnchainProvider = OnchainProvider;
