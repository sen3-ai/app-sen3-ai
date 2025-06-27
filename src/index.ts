import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { Config } from './config/Config';
import { DataCollector } from './providers/DataCollector';
import { ProcessorManager } from './processors/ProcessorManager';
import { ComprehensiveRiskProcessor } from './processors/ComprehensiveRiskProcessor';
import { OpenAIProcessor } from './processors/OpenAIProcessor';
import { AMLBotProvider } from './providers/AMLBotProvider';
import { DexScreenerProvider } from './providers/DexScreenerProvider';
import { CoingeckoProvider } from './providers/CoingeckoProvider';
import { BubblemapProvider } from './providers/BubblemapProvider';
import { ContractVerifier } from './providers/ContractVerifier';
import { RiskExplanation } from './processors/ResponseProcessor';
import { ConfigManager } from './config/ConfigManager';

// Load configuration
const config = Config.getInstance();
const serverConfig = config.getServerConfig();

const app = express();
const port = serverConfig.port;

// Configure CORS
app.use(cors({
  origin: serverConfig.cors.origin,
  credentials: serverConfig.cors.credentials
}));
app.use(bodyParser.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Root route - serve the main interface
app.get('/', (req: Request, res: Response): void => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Admin route - serve the admin interface
app.get('/admin', (req: Request, res: Response): void => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Prompt info route - serve the prompt info interface
app.get('/info/prompt', (req: Request, res: Response): void => {
  console.log('INFO/PROMPT route hit');
  console.log('Accept header:', req.headers.accept);
  console.log('User-Agent:', req.headers['user-agent']);
  
  // Check if it's an API request (JSON) or HTML request
  const acceptHeader = req.headers.accept || '';
  if (acceptHeader.includes('application/json')) {
    console.log('Serving JSON response');
    // API request - return JSON data
    try {
      // Create a temporary OpenAI processor to get the system prompt
      const openaiProcessor = new OpenAIProcessor();
      
      // Get the system prompt with current configuration values
      const systemPrompt = openaiProcessor.buildSystemPrompt();
      
      // Get current risk assessment configuration
      const riskConfig = config.getRiskAssessmentConfig();
      
      res.json({
        result: true,
        data: {
          systemPrompt: systemPrompt,
          configuration: {
            riskAssessment: riskConfig,
            openai: config.getOpenAIConfig()
          },
          timestamp: new Date().toISOString(),
          note: "This shows the current system prompt that will be sent to OpenAI with configuration values prefilled."
        }
      });
    } catch (error) {
      console.error('Error in JSON response:', error);
      res.status(500).json({
        result: false,
        reason: error instanceof Error ? error.message : 'Failed to generate prompt info'
      });
    }
  } else {
    console.log('Serving HTML response');
    // HTML request - serve the page
    res.sendFile(path.join(__dirname, '../public/prompt-info.html'));
  }
});

// Enum for address types
export enum AddressType {
  EVM = 'evm',
  SOLANA = 'solana',
  UNKNOWN = 'unknown'
}

// Initialize providers and processors
const dataCollector = new DataCollector();
const processorManager = new ProcessorManager();
const contractVerifier = new ContractVerifier();

// Only register real providers
const providerRegistry: Record<string, any> = {
  amlbot: AMLBotProvider,
  coingecko: CoingeckoProvider,
  dexscreener: DexScreenerProvider,
  bubblemap: BubblemapProvider,
};

// Add providers based on configuration
const providerConfigs = config.getProviderConfigs();
providerConfigs.forEach(providerConfig => {
  const provider = providerRegistry[providerConfig.name];
  if (provider) {
    dataCollector.addProvider(new provider(config));
  } else {
    console.warn(`Unknown provider: ${providerConfig.name}`);
  }
});

// Add processors based on configuration
const processorConfigs = config.getProcessorConfigs();
processorConfigs.forEach(processorConfig => {
  switch (processorConfig.name) {
    case 'comprehensive':
      processorManager.addProcessor(new ComprehensiveRiskProcessor());
      break;
    case 'openai':
      processorManager.addProcessor(new OpenAIProcessor());
      break;
    default:
      console.warn(`Unknown processor: ${processorConfig.name}`);
  }
});

// Utility to determine if address is EVM or Solana based on configuration
function getAddressType(address: string): AddressType {
  const blockchainConfigs = config.getBlockchainConfigs();
  
  for (const blockchain of blockchainConfigs) {
    if (new RegExp(blockchain.regex).test(address)) {
      if (blockchain.name === 'solana') {
        return AddressType.SOLANA;
      } else {
        return AddressType.EVM;
      }
    }
  }
  
  return AddressType.UNKNOWN;
}

// Helper method to generate description
function generateDescription(addressType: string, explanations: RiskExplanation[], score: number): string {
  let description = `${addressType.toUpperCase()} address. `;
  
  if (explanations.length > 0) {
    // Extract text from explanations
    const explanationTexts = explanations.map(exp => exp.text);
    description += `Risk factors: ${explanationTexts.join(', ')}. `;
  }
  
  description += `Final risk score: ${score}/100.`;
  
  return description;
}

// Risk assessment endpoint
app.get('/risk/:chain/:address', async (req: Request, res: Response): Promise<void> => {
  try {
    const { chain, address } = req.params;
    const { debug } = req.query;
    const isDebugMode = debug === 'true';
    
    if (!address || typeof address !== 'string') {
      res.status(400).json({
        result: false,
        reason: 'Missing or invalid address parameter'
      });
      return;
    }

    if (!chain || typeof chain !== 'string') {
      res.status(400).json({
        result: false,
        reason: 'Missing or invalid chain parameter'
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

    if (chain.trim() === '') {
      res.status(400).json({
        result: false,
        reason: 'Chain cannot be empty'
      });
      return;
    }

    console.log(`Processing risk assessment for ${address} on ${chain}...`);
    console.log(`Request params - address: "${address}", chain: "${chain}"`);

    // Step 1: Fetch basic contract information from DexScreener
    console.log(`Fetching basic contract information from DexScreener...`);
    const dexscreenerProvider = new DexScreenerProvider();
    const contractInfo = await dexscreenerProvider.fetch(address, chain);
    
    let basicInfo = {
      name: 'Unknown',
      symbol: 'Unknown',
      priceUsd: 0,
      liquidityUsd: 0,
      volume24h: 0,
      dexId: 'Unknown',
      pairAddress: 'Unknown',
      found: false
    };

    if (contractInfo && contractInfo.status === 'success' && contractInfo.rawData && contractInfo.rawData.length > 0) {
      // Get the best pair (highest liquidity)
      const bestPair = contractInfo.rawData.reduce((best: any, current: any) => {
        const bestLiquidity = best.liquidity?.usd || 0;
        const currentLiquidity = current.liquidity?.usd || 0;
        return currentLiquidity > bestLiquidity ? current : best;
      }, contractInfo.rawData[0]);

      basicInfo = {
        name: bestPair.baseToken?.name || 'Unknown',
        symbol: bestPair.baseToken?.symbol || 'Unknown',
        priceUsd: parseFloat(bestPair.priceUsd || '0'),
        liquidityUsd: bestPair.liquidity?.usd || 0,
        volume24h: bestPair.volume?.h24 || 0,
        dexId: bestPair.dexId || 'Unknown',
        pairAddress: bestPair.pairAddress || 'Unknown',
        found: true
      };
      
      console.log(`Found contract: ${basicInfo.name} (${basicInfo.symbol}) on ${basicInfo.dexId}`);
    } else {
      console.log(`No contract information found on DexScreener for ${chain}`);
      if (contractInfo) {
        console.log(`DexScreener response status: ${contractInfo.status}, has rawData: ${!!contractInfo.rawData}, rawData length: ${contractInfo.rawData?.length || 0}`);
      }
    }

    // Step 2: Determine address type
    const addressType = getAddressType(address);
    
    // Step 3: Collect data from all providers
    const collectedData = await dataCollector.collectData(address, chain);
    
    // Step 4: Use collected data directly (no filtering)
    const realData = collectedData;
    
    // Step 5: Process data through all processors
    const riskAssessment = await processorManager.processData(address, addressType, realData);
    
    // Build response
    const response: any = {
      result: true,
      data: {
        address: address,
        chain: chain,
        contractInfo: basicInfo,
        riskScore: riskAssessment.finalScore,
        description: generateDescription(addressType, riskAssessment.explanations, riskAssessment.finalScore),
        explanations: riskAssessment.explanations,
        timestamp: new Date().toISOString()
      }
    };

    // Include debug information if debug mode is enabled
    if (isDebugMode) {
      response.data.debug = {
        addressType: addressType,
        providerData: realData,
        processorAssessments: riskAssessment.processorAssessments,
        processorCount: riskAssessment.processorCount,
        confidence: riskAssessment.confidence,
        requestParams: {
          chain: chain,
          address: address,
          debug: isDebugMode
        },
        processingTime: new Date().toISOString()
      };
    }
    
    res.json(response);
  } catch (error) {
    res.status(500).json({
      result: false,
      reason: error instanceof Error ? error.message : 'Internal server error occurred while processing the request'
    });
  }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response): void => {
  res.json({
    result: true,
    data: {
      status: 'healthy',
      environment: config.getEnvironment(),
      endpoints: {
        risk: '/risk/:chain/:address',
        search: '/search/:address',
        health: '/health',
        chains: '/chains',
        config: '/config',
        prompt: '/info/prompt'
      },
      providers: dataCollector.getProviders().map(p => p.getName()),
      processors: processorManager.getProcessors().map(p => p.getName()),
      blockchains: config.getBlockchainConfigs().map(bc => bc.name),
      searchSupportedChains: ['ethereum', 'bsc', 'base', 'solana'],
      contractVerification: {
        enabled: contractVerifier.hasApiKeys(),
        availableChains: contractVerifier.getAvailableChains()
      },
      timestamp: new Date().toISOString()
    }
  });
});

// Supported chains endpoint
app.get('/chains', (req: Request, res: Response): void => {
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
app.get('/config', (req: Request, res: Response): void => {
  if (config.getEnvironment() === 'production') {
    res.status(403).json({
      result: false,
      reason: 'Configuration endpoint is disabled in production'
    });
    return;
  }

  const safeConfig = {
    ...config.getConfig(),
    credentials: {
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
    }
  };

  res.json({
    result: true,
    data: safeConfig
  });
});

// Add new endpoint for cross-chain contract search
app.get('/search/:address', async (req: Request, res: Response): Promise<void> => {
  try {
    const { address } = req.params;
    const { debug } = req.query;
    const isDebugMode = debug === 'true';
    
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

    console.log(`Searching for contract ${address} across supported blockchains...`);

    // Supported blockchains for search
    const supportedChains = ['ethereum', 'bsc', 'base', 'solana'];
    const matches: Array<{
      blockchain: string;
      name: string;
      owner: string;
      symbol?: string;
      priceUsd?: number;
      liquidityUsd?: number;
      volume24h?: number;
      dexId?: string;
      pairAddress?: string;
    }> = [];

    const debugData: any = {
      searchedChains: [],
      chainResults: {},
      errors: [],
      requestParams: {
        address: address,
        debug: isDebugMode
      },
      processingTime: new Date().toISOString()
    };

    // Search across all supported chains
    for (const chain of supportedChains) {
      try {
        debugData.searchedChains.push(chain);
        debugData.chainResults[chain] = {
          status: 'processing',
          pairsFound: 0,
          error: null
        };

        const dexscreenerProvider = new DexScreenerProvider();
        const result = await dexscreenerProvider.fetch(address, chain);
        
        // Check if we got real data (not mock data)
        if (result && result.status === 'success' && result.rawData && result.rawData.length > 0) {
          debugData.chainResults[chain].status = 'success';
          debugData.chainResults[chain].pairsFound = result.rawData.length;
          
          if (isDebugMode) {
            debugData.chainResults[chain].rawData = result.rawData;
          }

          // Process each pair found for this chain
          result.rawData.forEach((pair: any) => {
            // Check if the base token matches our search address
            if (pair.baseToken && pair.baseToken.address.toLowerCase() === address.toLowerCase()) {
              matches.push({
                blockchain: chain,
                name: pair.baseToken.name || 'Unknown',
                owner: pair.baseToken.address,
                symbol: pair.baseToken.symbol,
                priceUsd: parseFloat(pair.priceUsd || '0'),
                liquidityUsd: pair.liquidity?.usd || 0,
                volume24h: pair.volume?.h24 || 0,
                dexId: pair.dexId,
                pairAddress: pair.pairAddress
              });
            }
            // Also check if the quote token matches our search address
            else if (pair.quoteToken && pair.quoteToken.address.toLowerCase() === address.toLowerCase()) {
              matches.push({
                blockchain: chain,
                name: pair.quoteToken.name || 'Unknown',
                owner: pair.quoteToken.address,
                symbol: pair.quoteToken.symbol,
                priceUsd: parseFloat(pair.priceUsd || '0'),
                liquidityUsd: pair.liquidity?.usd || 0,
                volume24h: pair.volume?.h24 || 0,
                dexId: pair.dexId,
                pairAddress: pair.pairAddress
              });
            }
          });
        } else {
          debugData.chainResults[chain].status = 'no_data';
          debugData.chainResults[chain].pairsFound = 0;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`Error searching on ${chain}:`, errorMessage);
        debugData.chainResults[chain].status = 'error';
        debugData.chainResults[chain].error = errorMessage;
        debugData.errors.push({ chain, error: errorMessage });
        // Continue with other chains even if one fails
      }
    }

    // Remove duplicates (same blockchain and owner)
    const uniqueMatches = matches.filter((match, index, self) => 
      index === self.findIndex(m => m.blockchain === match.blockchain && m.owner.toLowerCase() === match.owner.toLowerCase())
    );

    // Check if we found any matches
    if (uniqueMatches.length === 0) {
      res.status(404).json({
        result: false,
        reason: 'Cannot find information for this contract address',
        data: {
          address: address,
          matches: [],
          totalMatches: 0,
          searchedChains: supportedChains,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const response: any = {
      result: true,
      data: {
        address: address,
        matches: uniqueMatches,
        totalMatches: uniqueMatches.length,
        searchedChains: supportedChains,
        timestamp: new Date().toISOString()
      }
    };

    // Include debug information if debug mode is enabled
    if (isDebugMode) {
      response.data.debug = debugData;
    }

    res.json(response);

  } catch (error) {
    res.status(500).json({
      result: false,
      reason: error instanceof Error ? error.message : 'Internal server error occurred while searching'
    });
  }
});

// Admin routes
const configManager = ConfigManager.getInstance();

// Risk Parameters endpoints
app.get('/admin/risk-params', (req: Request, res: Response): void => {
  try {
    const params = configManager.getRiskParameters();
    res.json(params);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to load risk parameters',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/admin/risk-params', (req: Request, res: Response): void => {
  try {
    const params = req.body;
    configManager.setRiskParameters(params);
    configManager.addLog('info', 'Risk parameters updated via admin panel');
    res.json({ success: true, message: 'Risk parameters saved successfully' });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to save risk parameters',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Configuration endpoints
app.get('/admin/config', (req: Request, res: Response): void => {
  try {
    const configData = {
      server: config.getServerConfig(),
      database: config.getDatabaseConfig(),
      blockchains: config.getBlockchainConfigs(),
      providers: config.getProviderConfigs(),
      processors: config.getProcessorConfigs(),
      riskAssessment: config.getRiskAssessmentConfig(),
      logLevel: config.getLogLevel(),
      features: config.getFeaturesConfig(),
      limits: config.getLimitsConfig()
    };
    
    res.json(configData);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to load configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/admin/config', (req: Request, res: Response): void => {
  try {
    const newConfig = req.body;
    
    // Validate required fields
    if (!newConfig.riskAssessment) {
      res.status(400).json({
        error: 'Missing riskAssessment configuration'
      });
      return;
    }

    // Save configuration to file
    const fs = require('fs');
    const configPath = path.join(process.cwd(), 'config', 'config.json');
    
    // Read current config to preserve any fields not in the form
    let currentConfig = {};
    try {
      currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.warn('Could not read current config, starting fresh');
    }

    // Merge configurations
    const mergedConfig = {
      ...currentConfig,
      ...newConfig
    };

    // Write back to file
    fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2));
    
    // Reload configuration in the running application
    config.reloadConfig();
    
    res.json({
      success: true,
      message: 'Configuration saved successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to save configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/admin/config/reset', (req: Request, res: Response): void => {
  try {
    const fs = require('fs');
    const configPath = path.join(process.cwd(), 'config', 'config.json');
    
    // Default configuration
    const defaultConfig = {
      "server": {
        "port": 3000,
        "host": "localhost",
        "cors": {
          "origin": ["http://localhost:3000", "http://localhost:3001"],
          "credentials": false
        }
      },
      "database": {
        "host": "localhost",
        "port": 5432,
        "name": "sen3ai",
        "username": "postgres",
        "password": ""
      },
      "blockchains": [
        { "name": "ethereum", "regex": "^0x[0-9a-fA-F]{40}$", "enabled": true },
        { "name": "polygon", "regex": "^0x[0-9a-fA-F]{40}$", "enabled": true },
        { "name": "bsc", "regex": "^0x[0-9a-fA-F]{40}$", "enabled": true },
        { "name": "arbitrum", "regex": "^0x[0-9a-fA-F]{40}$", "enabled": true },
        { "name": "optimism", "regex": "^0x[0-9a-fA-F]{40}$", "enabled": true },
        { "name": "solana", "regex": "^[1-9A-HJ-NP-Za-km-z]{32,44}$", "enabled": true }
      ],
      "providers": [
        { "name": "amlbot", "enabled": true, "priority": 1, "timeout": 8000, "retries": 3 },
        { "name": "coingecko", "enabled": true, "priority": 2, "timeout": 10000, "retries": 2 },
        { "name": "dexscreener", "enabled": true, "priority": 3, "timeout": 5000, "retries": 2 },
        { "name": "bubblemap", "enabled": true, "priority": 4, "timeout": 10000, "retries": 3 }
      ],
      "processors": [
        { "name": "comprehensive", "enabled": true }
      ],
      "riskAssessment": {
        "volume24h": {
          "low": 1000000,
          "medium": 100000,
          "high": 100000
        },
        "holdersCount": {
          "low": 2000,
          "medium": 300,
          "high": 300
        },
        "amlbotScore": {
          "low": 30,
          "medium": 70,
          "high": 70
        },
        "top3ClustersPercentage": {
          "low": 20,
          "medium": 50,
          "high": 80,
          "critical": 80
        },
        "connectedWalletsThreshold": 50,
        "tokenAge": {
          "low": 30,
          "medium": 7,
          "high": 7
        },
        "marketCap": {
          "low": 100000000,
          "medium": 10000000,
          "high": 1000000,
          "critical": 1000000
        },
        "fullyDilutedValuation": {
          "low": 3,
          "medium": 10,
          "high": 10
        }
      },
      "logLevel": "info",
      "features": {
        "caching": true,
        "rateLimiting": true,
        "metrics": true,
        "healthChecks": true
      },
      "limits": {
        "maxAddressesPerRequest": 10,
        "maxConcurrentRequests": 100,
        "requestTimeout": 30000
      }
    };

    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    
    // Reload configuration in the running application
    config.reloadConfig();
    
    res.json({
      success: true,
      message: 'Configuration reset to defaults successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to reset configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/admin/provider', (req: Request, res: Response): void => {
  try {
    const { name, enabled } = req.body;
    
    if (!name || typeof enabled !== 'boolean') {
      res.status(400).json({
        error: 'Missing or invalid provider name or enabled status'
      });
      return;
    }

    // Update provider in configuration
    const fs = require('fs');
    const configPath = path.join(process.cwd(), 'config', 'config.json');
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    const provider = configData.providers.find((p: any) => p.name === name);
    if (provider) {
      provider.enabled = enabled;
      fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
      
      // Reload configuration in the running application
      config.reloadConfig();
      
      res.json({
        success: true,
        message: `Provider ${name} ${enabled ? 'enabled' : 'disabled'} successfully`
      });
    } else {
      res.status(404).json({
        error: `Provider ${name} not found`
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update provider',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Providers endpoints
app.get('/admin/providers', (req: Request, res: Response): void => {
  try {
    const providers = configManager.getProviders();
    res.json(providers);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to load providers',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.patch('/admin/providers', (req: Request, res: Response): void => {
  try {
    const { name, enabled } = req.body;
    configManager.updateProvider(name, enabled);
    configManager.addLog('info', `Provider ${name} ${enabled ? 'enabled' : 'disabled'} via admin panel`);
    res.json({ success: true, message: `Provider ${name} ${enabled ? 'enabled' : 'disabled'}` });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update provider',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Logs endpoints
app.get('/admin/logs', (req: Request, res: Response): void => {
  try {
    const logs = configManager.getLogs();
    res.json(logs);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to load logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.delete('/admin/logs', (req: Request, res: Response): void => {
  try {
    configManager.clearLogs();
    configManager.addLog('info', 'Logs cleared via admin panel');
    res.json({ success: true, message: 'Logs cleared successfully' });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/admin/logs/download', (req: Request, res: Response): void => {
  try {
    const logsText = configManager.getLogsAsText();
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=logs-${new Date().toISOString().split('T')[0]}.txt`);
    res.send(logsText);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to download logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test endpoints
app.post('/admin/test-risk-calculation', async (req: Request, res: Response): Promise<void> => {
  try {
    const { address, chain } = req.body;
    
    if (!address || !chain) {
      res.status(400).json({
        error: 'Missing address or chain parameter'
      });
      return;
    }

    // Use the existing risk assessment logic
    const collectedData = await dataCollector.collectData(address, chain);
    const addressType = getAddressType(address);
    const processedData = await processorManager.processData(address, addressType, collectedData);
    
    res.json({
      success: true,
      riskScore: processedData.finalScore,
      message: 'Test calculation completed successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Test calculation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/admin/test-providers', async (req: Request, res: Response): Promise<void> => {
  try {
    const providers = configManager.getProviders();
    const results: { successful: number; failed: number; details: any[] } = { successful: 0, failed: 0, details: [] };

    for (const provider of providers) {
      try {
        // Test each provider with a sample address
        const testAddress = '0xcda4e840411c00a614ad9205caec807c7458a0e3';
        const testChain = 'ethereum';
        
        let providerInstance;
        switch (provider.name) {
          case 'amlbot':
            providerInstance = new AMLBotProvider();
            break;
          case 'coingecko':
            providerInstance = new CoingeckoProvider();
            break;
          case 'dexscreener':
            providerInstance = new DexScreenerProvider();
            break;
          case 'bubblemap':
            providerInstance = new BubblemapProvider();
            break;
          default:
            continue;
        }

        const result = await providerInstance.fetch(testAddress);
        const status = result && result.rawData ? 'working' : 'no_data';
        
        configManager.updateProviderStatus(provider.name, status);
        results.successful++;
        results.details.push({ provider: provider.name, status: 'success' });
      } catch (error) {
        configManager.updateProviderStatus(provider.name, 'error');
        results.failed++;
        results.details.push({ 
          provider: provider.name, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    configManager.addLog('info', `Provider test completed: ${results.successful} successful, ${results.failed} failed`);
    res.json(results);
  } catch (error) {
    res.status(500).json({
      error: 'Provider test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/admin/restart', (req: Request, res: Response): void => {
  try {
    configManager.addLog('info', 'Server restart requested via admin panel');
    res.json({ success: true, message: 'Server restart initiated' });
    
    // Note: In a real implementation, you might want to use PM2 or similar process manager
    // For now, we'll just log the restart request
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to restart server',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Export app for testing
export { app };

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

// Utility function to filter out mock data
function filterMockData(collectedData: any): any {
  const filteredData: any = {};
  const mockProviders: string[] = [];

  for (const [providerName, data] of Object.entries(collectedData)) {
    if (providerName === 'errors') {
      // Keep errors
      filteredData.errors = data;
      continue;
    }

    // Check if this is mock data based on various indicators
    const isMockData = isMockDataProvider(providerName, data);
    
    if (isMockData) {
      mockProviders.push(providerName);
      console.log(`Filtering out mock data from provider: ${providerName}`);
    } else {
      filteredData[providerName] = data;
    }
  }

  if (mockProviders.length > 0) {
    console.log(`Filtered out mock data from providers: ${mockProviders.join(', ')}`);
  }

  return filteredData;
}

// Determines if provider data is mock data based on various indicators
function isMockDataProvider(providerName: string, data: any): boolean {
  if (!data) return true;

  // Check source field for mock indicators
  if (data.source && typeof data.source === 'string') {
    const source = data.source.toLowerCase();
    if (source.includes('mock') || source.includes('_mock')) {
      return true;
    }
  }

  // Check apiKeyConfigured field
  if (data.apiKeyConfigured === false) {
    return true;
  }

  // Provider-specific mock detection
  switch (providerName) {
    case 'social':
    case 'reputation':
    case 'blockchain':
    case 'onchain':
      // These providers are currently all mock data
      return true;
    
    case 'amlbot':
      // Check if it's using mock data
      if (data.source === 'amlbot-mock') {
        return true;
      }
      break;
    
    case 'dexscreener':
      // Check if it's using mock data
      if (data.source === 'dexscreener_mock') {
        return true;
      }
      break;
    
    case 'coingecko':
      // Check if it's using mock data
      if (data.source === 'coingecko' && data.rawData === null) {
        return true;
      }
      break;
  }

  return false;
}