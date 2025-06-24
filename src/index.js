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
exports.app = exports.AddressType = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const Config_1 = require("./config/Config");
const DataCollector_1 = require("./providers/DataCollector");
const ProcessorManager_1 = require("./processors/ProcessorManager");
const ComprehensiveRiskProcessor_1 = require("./processors/ComprehensiveRiskProcessor");
const BlockchainProvider_1 = require("./providers/BlockchainProvider");
const ReputationProvider_1 = require("./providers/ReputationProvider");
const SocialProvider_1 = require("./providers/SocialProvider");
const OnchainProvider_1 = require("./providers/OnchainProvider");
const AMLBotProvider_1 = require("./providers/AMLBotProvider");
const ContractVerifier_1 = require("./providers/ContractVerifier");
// Load configuration
const config = Config_1.Config.getInstance();
const serverConfig = config.getServerConfig();
const app = (0, express_1.default)();
exports.app = app;
const port = serverConfig.port;
// Configure CORS
app.use((0, cors_1.default)({
    origin: serverConfig.cors.origin,
    credentials: serverConfig.cors.credentials
}));
app.use(body_parser_1.default.json());
// Enum for address types
var AddressType;
(function (AddressType) {
    AddressType["EVM"] = "evm";
    AddressType["SOLANA"] = "solana";
    AddressType["UNKNOWN"] = "unknown";
})(AddressType || (exports.AddressType = AddressType = {}));
// Initialize providers and processors
const dataCollector = new DataCollector_1.DataCollector();
const processorManager = new ProcessorManager_1.ProcessorManager();
const contractVerifier = new ContractVerifier_1.ContractVerifier();
// Add providers based on configuration
const providerConfigs = config.getProviderConfigs();
providerConfigs.forEach(providerConfig => {
    switch (providerConfig.name) {
        case 'blockchain':
            dataCollector.addProvider(new BlockchainProvider_1.BlockchainProvider());
            break;
        case 'reputation':
            dataCollector.addProvider(new ReputationProvider_1.ReputationProvider());
            break;
        case 'social':
            dataCollector.addProvider(new SocialProvider_1.SocialProvider());
            break;
        case 'onchain':
            dataCollector.addProvider(new OnchainProvider_1.OnchainProvider());
            break;
        case 'amlbot':
            dataCollector.addProvider(new AMLBotProvider_1.AMLBotProvider());
            break;
        default:
            console.warn(`Unknown provider: ${providerConfig.name}`);
    }
});
// Add processors based on configuration
const processorConfigs = config.getProcessorConfigs();
processorConfigs.forEach(processorConfig => {
    switch (processorConfig.name) {
        case 'comprehensive':
            processorManager.addProcessor(new ComprehensiveRiskProcessor_1.ComprehensiveRiskProcessor());
            break;
        default:
            console.warn(`Unknown processor: ${processorConfig.name}`);
    }
});
// Utility to determine if address is EVM or Solana based on configuration
function getAddressType(address) {
    const blockchainConfigs = config.getBlockchainConfigs();
    for (const blockchain of blockchainConfigs) {
        if (new RegExp(blockchain.regex).test(address)) {
            if (blockchain.name === 'solana') {
                return AddressType.SOLANA;
            }
            else {
                return AddressType.EVM;
            }
        }
    }
    return AddressType.UNKNOWN;
}
// Helper method to generate description
function generateDescription(addressType, explanations, score, confidence) {
    let description = `${addressType.toUpperCase()} address. `;
    if (explanations.length > 0) {
        description += `Risk factors: ${explanations.join(', ')}. `;
    }
    if (confidence < 0.7) {
        description += `Low confidence due to data collection issues. `;
    }
    description += `Final risk score: ${score}/100.`;
    return description;
}
app.get('/risk/:address', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { address } = req.params;
        const { chain } = req.query; // Optional chain parameter
        if (!address || typeof address !== 'string') {
            res.status(400).json({
                result: false,
                reason: 'Missing or invalid address parameter'
            });
            return;
        }
        if (address.trim() === '') {
            res.status(400).json({
                result: false,
                reason: 'Address cannot be empty'
            });
            return;
        }
        const addressType = getAddressType(address);
        if (addressType === AddressType.UNKNOWN) {
            res.status(400).json({
                result: false,
                reason: 'Invalid address format. Only EVM and Solana addresses are supported.'
            });
            return;
        }
        // For EVM addresses, verify it's a smart contract
        if (addressType === AddressType.EVM) {
            try {
                if (!contractVerifier.hasApiKeys()) {
                    res.status(400).json({
                        result: false,
                        reason: 'No EVM API keys configured. Please configure ETHERSCAN_API_KEY in your environment.'
                    });
                    return;
                }
                // Use the chain parameter if provided, otherwise use default detection
                const chainName = typeof chain === 'string' ? chain : undefined;
                yield contractVerifier.validateContractAddress(address, chainName);
            }
            catch (error) {
                res.status(400).json({
                    result: false,
                    reason: error instanceof Error ? error.message : 'Contract verification failed'
                });
                return;
            }
        }
        // Collect data from all providers
        const collectedData = yield dataCollector.collectData(address);
        // Process data through all processors
        const riskAssessment = yield processorManager.processData(address, addressType, collectedData);
        res.json({
            result: true,
            data: {
                address: address,
                addressType: addressType,
                riskScore: riskAssessment.finalScore,
                description: generateDescription(addressType, riskAssessment.explanations, riskAssessment.finalScore, riskAssessment.confidence),
                confidence: riskAssessment.confidence,
                explanations: riskAssessment.explanations,
                processorCount: riskAssessment.processorCount,
                processorAssessments: riskAssessment.processorAssessments,
                providerData: collectedData,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        res.status(500).json({
            result: false,
            reason: error instanceof Error ? error.message : 'Internal server error occurred while processing the request'
        });
    }
}));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        result: true,
        data: {
            status: 'healthy',
            environment: config.getEnvironment(),
            providers: dataCollector.getProviders().map(p => p.getName()),
            processors: processorManager.getProcessors().map(p => p.getName()),
            blockchains: config.getBlockchainConfigs().map(bc => bc.name),
            contractVerification: {
                enabled: contractVerifier.hasApiKeys(),
                availableChains: contractVerifier.getAvailableChains()
            },
            timestamp: new Date().toISOString()
        }
    });
});
// Supported chains endpoint
app.get('/chains', (req, res) => {
    res.json({
        result: true,
        data: {
            supportedChains: contractVerifier.getAvailableChains(),
            contractVerificationEnabled: contractVerifier.hasApiKeys(),
            timestamp: new Date().toISOString()
        }
    });
});
// Configuration endpoint (for debugging, should be disabled in production)
app.get('/config', (req, res) => {
    if (config.getEnvironment() === 'production') {
        res.status(403).json({
            result: false,
            reason: 'Configuration endpoint is disabled in production'
        });
        return;
    }
    const safeConfig = Object.assign(Object.assign({}, config.getConfig()), { credentials: {
            // Only show if credentials are set, not the actual values
            blockchainApiKey: !!config.getCredentials().blockchainApiKey,
            reputationApiKey: !!config.getCredentials().reputationApiKey,
            socialApiKey: !!config.getCredentials().socialApiKey,
            onchainApiKey: !!config.getCredentials().onchainApiKey,
            etherscanApiKey: !!config.getCredentials().etherscanApiKey,
            polygonscanApiKey: !!config.getCredentials().polygonscanApiKey,
            bscscanApiKey: !!config.getCredentials().bscscanApiKey,
            solscanApiKey: !!config.getCredentials().solscanApiKey,
            amlbotTmId: !!config.getCredentials().amlbotTmId,
            amlbotAccessKey: !!config.getCredentials().amlbotAccessKey
        } });
    res.json({
        result: true,
        data: safeConfig
    });
});
// Only start server if this file is run directly
if (require.main === module) {
    app.listen(port, serverConfig.host, () => {
        console.log(`Server running on ${serverConfig.host}:${port}`);
        console.log(`Environment: ${config.getEnvironment()}`);
        console.log(`Log level: ${config.getLogLevel()}`);
        console.log(`Available providers: ${dataCollector.getProviders().map(p => p.getName()).join(', ')}`);
        console.log(`Available processors: ${processorManager.getProcessors().map(p => p.getName()).join(', ')}`);
        console.log(`Supported blockchains: ${config.getBlockchainConfigs().map(bc => bc.name).join(', ')}`);
    });
}
