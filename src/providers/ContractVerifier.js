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
exports.ContractVerifier = void 0;
const Config_1 = require("../config/Config");
const SUPPORTED_CHAINS = [
    { name: 'ethereum', chainId: 1 },
    { name: 'polygon', chainId: 137 },
    { name: 'bsc', chainId: 56 },
    { name: 'arbitrum', chainId: 42161 },
    { name: 'optimism', chainId: 10 },
    { name: 'avalanche', chainId: 43114 },
    { name: 'fantom', chainId: 250 },
    { name: 'gnosis', chainId: 100 }
];
class ContractVerifier {
    constructor() {
        this.config = Config_1.Config.getInstance();
        this.baseUrl = 'https://api.etherscan.io/v2/api';
        const credentials = this.config.getCredentials();
        this.apiKey = credentials.etherscanApiKey || '';
    }
    /**
     * Detects the EVM chain based on address format and available config
     * For now, defaults to Ethereum Mainnet (chainId 1)
     * You can enhance this to detect chain by address prefix or user input
     */
    detectChain(address) {
        // TODO: Enhance detection if needed
        return SUPPORTED_CHAINS[0]; // Default to Ethereum
    }
    /**
     * Checks if an address is a smart contract on the specified chain
     */
    isContractAddress(address, chainName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.apiKey) {
                throw new Error('No Etherscan API key configured. Please set ETHERSCAN_API_KEY in your environment.');
            }
            let chain;
            if (chainName) {
                chain = SUPPORTED_CHAINS.find(c => c.name === chainName) || SUPPORTED_CHAINS[0];
            }
            else {
                chain = this.detectChain(address);
            }
            try {
                const url = `${this.baseUrl}?chainid=${chain.chainId}&module=proxy&action=eth_getCode&address=${address}&tag=latest&apikey=${this.apiKey}`;
                const response = yield fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = yield response.json();
                if (data.error) {
                    throw new Error(`API error: ${data.error.message || 'Unknown error'}`);
                }
                const code = data.result;
                return code && code !== '0x' && code !== '0x0';
            }
            catch (error) {
                console.error(`Error checking contract status for ${address}:`, error);
                throw new Error(`Failed to verify contract address: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Validates that an address is a smart contract, throws error if not
     */
    validateContractAddress(address, chainName) {
        return __awaiter(this, void 0, void 0, function* () {
            const isContract = yield this.isContractAddress(address, chainName);
            if (!isContract) {
                throw new Error(`Address ${address} is not a smart contract. Only smart contract addresses are supported.`);
            }
        });
    }
    /**
     * Gets available chains for verification
     */
    getAvailableChains() {
        return SUPPORTED_CHAINS.map(c => c.name);
    }
    /**
     * Checks if the Etherscan API key is configured
     */
    hasApiKeys() {
        return !!this.apiKey;
    }
}
exports.ContractVerifier = ContractVerifier;
