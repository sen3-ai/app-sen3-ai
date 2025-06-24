"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
// Load environment variables from .env file
dotenv.config();
class Config {
    constructor() {
        this.config = this.loadConfig();
    }
    static getInstance() {
        if (!Config.instance) {
            Config.instance = new Config();
        }
        return Config.instance;
    }
    getConfig() {
        return this.config;
    }
    getServerConfig() {
        return this.config.server;
    }
    getDatabaseConfig() {
        return this.config.database;
    }
    getBlockchainConfigs() {
        return this.config.blockchains.filter(bc => bc.enabled);
    }
    getProviderConfigs() {
        return this.config.providers.filter(p => p.enabled);
    }
    getProcessorConfigs() {
        return this.config.processors.filter(p => p.enabled);
    }
    getCredentials() {
        return this.config.credentials;
    }
    getEnvironment() {
        return this.config.environment;
    }
    getLogLevel() {
        return this.config.logLevel;
    }
    loadConfig() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        // Load base config from JSON file
        const configPath = path.join(process.cwd(), 'config', 'config.json');
        let baseConfig = {};
        try {
            if (fs.existsSync(configPath)) {
                const configFile = fs.readFileSync(configPath, 'utf8');
                baseConfig = JSON.parse(configFile);
            }
            else {
                console.warn(`Config file not found at ${configPath}, using default configuration`);
            }
        }
        catch (error) {
            console.error('Error loading config file:', error);
            throw new Error('Failed to load configuration file');
        }
        // Load environment variables
        const envConfig = this.loadEnvironmentConfig();
        // Merge configurations
        const mergedConfig = {
            server: {
                port: parseInt(process.env.PORT || ((_a = baseConfig.server) === null || _a === void 0 ? void 0 : _a.port) || '3000'),
                host: process.env.HOST || ((_b = baseConfig.server) === null || _b === void 0 ? void 0 : _b.host) || 'localhost',
                cors: {
                    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ((_d = (_c = baseConfig.server) === null || _c === void 0 ? void 0 : _c.cors) === null || _d === void 0 ? void 0 : _d.origin) || ['*'],
                    credentials: process.env.CORS_CREDENTIALS === 'true' || ((_f = (_e = baseConfig.server) === null || _e === void 0 ? void 0 : _e.cors) === null || _f === void 0 ? void 0 : _f.credentials) || false
                }
            },
            database: {
                host: process.env.DB_HOST || ((_g = baseConfig.database) === null || _g === void 0 ? void 0 : _g.host) || 'localhost',
                port: parseInt(process.env.DB_PORT || ((_h = baseConfig.database) === null || _h === void 0 ? void 0 : _h.port) || '5432'),
                name: process.env.DB_NAME || ((_j = baseConfig.database) === null || _j === void 0 ? void 0 : _j.name) || 'sen3ai',
                username: process.env.DB_USERNAME || ((_k = baseConfig.database) === null || _k === void 0 ? void 0 : _k.username) || 'postgres',
                password: process.env.DB_PASSWORD || ((_l = baseConfig.database) === null || _l === void 0 ? void 0 : _l.password) || ''
            },
            blockchains: baseConfig.blockchains || this.getDefaultBlockchainConfigs(),
            providers: baseConfig.providers || this.getDefaultProviderConfigs(),
            processors: baseConfig.processors || this.getDefaultProcessorConfigs(),
            credentials: envConfig,
            environment: process.env.NODE_ENV || 'development',
            logLevel: process.env.LOG_LEVEL || baseConfig.logLevel || 'info'
        };
        // Validate configuration
        this.validateConfig(mergedConfig);
        return mergedConfig;
    }
    loadEnvironmentConfig() {
        return {
            blockchainApiKey: process.env.BLOCKCHAIN_API_KEY,
            reputationApiKey: process.env.REPUTATION_API_KEY,
            socialApiKey: process.env.SOCIAL_API_KEY,
            onchainApiKey: process.env.ONCHAIN_API_KEY,
            etherscanApiKey: process.env.ETHERSCAN_API_KEY,
            polygonscanApiKey: process.env.POLYGONSCAN_API_KEY,
            bscscanApiKey: process.env.BSCSCAN_API_KEY,
            solscanApiKey: process.env.SOLSCAN_API_KEY,
            amlbotTmId: process.env.AMLBOT_TM_ID,
            amlbotAccessKey: process.env.AMLBOT_ACCESS_KEY
        };
    }
    getDefaultBlockchainConfigs() {
        return [
            {
                name: 'ethereum',
                regex: '^0x[0-9a-fA-F]{40}$',
                enabled: true
            },
            {
                name: 'polygon',
                regex: '^0x[0-9a-fA-F]{40}$',
                enabled: true
            },
            {
                name: 'bsc',
                regex: '^0x[0-9a-fA-F]{40}$',
                enabled: true
            },
            {
                name: 'solana',
                regex: '^[1-9A-HJ-NP-Za-km-z]{32,44}$',
                enabled: true
            }
        ];
    }
    getDefaultProviderConfigs() {
        return [
            {
                name: 'blockchain',
                enabled: true,
                priority: 1,
                timeout: 5000,
                retries: 3
            },
            {
                name: 'reputation',
                enabled: true,
                priority: 2,
                timeout: 3000,
                retries: 2
            },
            {
                name: 'social',
                enabled: true,
                priority: 3,
                timeout: 4000,
                retries: 2
            },
            {
                name: 'onchain',
                enabled: true,
                priority: 4,
                timeout: 6000,
                retries: 3
            }
        ];
    }
    getDefaultProcessorConfigs() {
        return [
            {
                name: 'comprehensive',
                enabled: true,
                weight: 1.0
            }
        ];
    }
    validateConfig(config) {
        // Validate server config
        if (!config.server.port || config.server.port < 1 || config.server.port > 65535) {
            throw new Error('Invalid server port configuration');
        }
        // Validate database config
        if (!config.database.host || !config.database.name) {
            throw new Error('Invalid database configuration');
        }
        // Validate blockchains
        if (!config.blockchains || config.blockchains.length === 0) {
            throw new Error('No blockchain configurations found');
        }
        // Validate providers
        if (!config.providers || config.providers.length === 0) {
            throw new Error('No provider configurations found');
        }
        // Validate processors
        if (!config.processors || config.processors.length === 0) {
            throw new Error('No processor configurations found');
        }
        console.log('Configuration loaded successfully');
    }
}
exports.Config = Config;
