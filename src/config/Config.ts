import * as fs from 'fs';
import * as path from 'path';

export interface BlockchainConfig {
  name: string;
  regex: string;
  enabled: boolean;
}

export interface ProviderConfig {
  name: string;
  enabled: boolean;
  priority: number;
  timeout?: number;
  retries?: number;
}

export interface ProcessorConfig {
  name: string;
  enabled: boolean;
  weight: number;
}

export interface ServerConfig {
  port: number;
  host: string;
  cors: {
    origin: string[];
    credentials: boolean;
  };
}

export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  username: string;
  password: string;
}

export interface ApiCredentials {
  blockchainApiKey?: string;
  reputationApiKey?: string;
  socialApiKey?: string;
  onchainApiKey?: string;
  etherscanApiKey?: string;
  polygonscanApiKey?: string;
  bscscanApiKey?: string;
  solscanApiKey?: string;
}

export interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  blockchains: BlockchainConfig[];
  providers: ProviderConfig[];
  processors: ProcessorConfig[];
  credentials: ApiCredentials;
  environment: string;
  logLevel: string;
}

export class Config {
  private static instance: Config;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  public getConfig(): AppConfig {
    return this.config;
  }

  public getServerConfig(): ServerConfig {
    return this.config.server;
  }

  public getDatabaseConfig(): DatabaseConfig {
    return this.config.database;
  }

  public getBlockchainConfigs(): BlockchainConfig[] {
    return this.config.blockchains.filter(bc => bc.enabled);
  }

  public getProviderConfigs(): ProviderConfig[] {
    return this.config.providers.filter(p => p.enabled);
  }

  public getProcessorConfigs(): ProcessorConfig[] {
    return this.config.processors.filter(p => p.enabled);
  }

  public getCredentials(): ApiCredentials {
    return this.config.credentials;
  }

  public getEnvironment(): string {
    return this.config.environment;
  }

  public getLogLevel(): string {
    return this.config.logLevel;
  }

  private loadConfig(): AppConfig {
    // Load base config from JSON file
    const configPath = path.join(process.cwd(), 'config', 'config.json');
    let baseConfig: any = {};

    try {
      if (fs.existsSync(configPath)) {
        const configFile = fs.readFileSync(configPath, 'utf8');
        baseConfig = JSON.parse(configFile);
      } else {
        console.warn(`Config file not found at ${configPath}, using default configuration`);
      }
    } catch (error) {
      console.error('Error loading config file:', error);
      throw new Error('Failed to load configuration file');
    }

    // Load environment variables
    const envConfig = this.loadEnvironmentConfig();

    // Merge configurations
    const mergedConfig: AppConfig = {
      server: {
        port: parseInt(process.env.PORT || baseConfig.server?.port || '3000'),
        host: process.env.HOST || baseConfig.server?.host || 'localhost',
        cors: {
          origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : baseConfig.server?.cors?.origin || ['*'],
          credentials: process.env.CORS_CREDENTIALS === 'true' || baseConfig.server?.cors?.credentials || false
        }
      },
      database: {
        host: process.env.DB_HOST || baseConfig.database?.host || 'localhost',
        port: parseInt(process.env.DB_PORT || baseConfig.database?.port || '5432'),
        name: process.env.DB_NAME || baseConfig.database?.name || 'sen3ai',
        username: process.env.DB_USERNAME || baseConfig.database?.username || 'postgres',
        password: process.env.DB_PASSWORD || baseConfig.database?.password || ''
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

  private loadEnvironmentConfig(): ApiCredentials {
    return {
      blockchainApiKey: process.env.BLOCKCHAIN_API_KEY,
      reputationApiKey: process.env.REPUTATION_API_KEY,
      socialApiKey: process.env.SOCIAL_API_KEY,
      onchainApiKey: process.env.ONCHAIN_API_KEY,
      etherscanApiKey: process.env.ETHERSCAN_API_KEY,
      polygonscanApiKey: process.env.POLYGONSCAN_API_KEY,
      bscscanApiKey: process.env.BSCSCAN_API_KEY,
      solscanApiKey: process.env.SOLSCAN_API_KEY
    };
  }

  private getDefaultBlockchainConfigs(): BlockchainConfig[] {
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

  private getDefaultProviderConfigs(): ProviderConfig[] {
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

  private getDefaultProcessorConfigs(): ProcessorConfig[] {
    return [
      {
        name: 'comprehensive',
        enabled: true,
        weight: 1.0
      }
    ];
  }

  private validateConfig(config: AppConfig): void {
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