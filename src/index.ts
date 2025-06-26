import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { Config } from './config/Config';
import { DataCollector } from './providers/DataCollector';
import { ProcessorManager } from './processors/ProcessorManager';
import { ComprehensiveRiskProcessor } from './processors/ComprehensiveRiskProcessor';
import { AMLBotProvider } from './providers/AMLBotProvider';
import { DexScreenerProvider } from './providers/DexScreenerProvider';
import { CoingeckoProvider } from './providers/CoingeckoProvider';
import { BubblemapProvider } from './providers/BubblemapProvider';
import { ContractVerifier } from './providers/ContractVerifier';
import { RiskExplanation } from './processors/ResponseProcessor';

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

    if (contractInfo && contractInfo.provider === 'dexscreener' && contractInfo.rawData && contractInfo.rawData.length > 0) {
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
    }

    // Step 2: Determine address type
    const addressType = getAddressType(address);
    
    // Step 3: Collect data from all providers
    const collectedData = await dataCollector.collectData(address, chain);
    
    // Step 4: Filter out mock data (removed)
    // const realData = filterMockData(collectedData);
    const realData = collectedData;
    
    // Step 5: Process data through all processors
    const riskAssessment = await processorManager.processData(address, addressType, realData);
    
    // Build response based on debug parameter
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

    // Only include raw provider data if debug parameter is present
    if (debug) {
      response.data.providerData = realData;
      response.data.processorAssessments = riskAssessment.processorAssessments;
      response.data.processorCount = riskAssessment.processorCount;
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
        config: '/config'
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

    // Search across all supported chains
    for (const chain of supportedChains) {
      try {
        const dexscreenerProvider = new DexScreenerProvider();
        const result = await dexscreenerProvider.fetch(address, chain);
        
        // Check if we got real data (not mock data)
        if (result && result.provider === 'dexscreener' && result.rawData && result.rawData.length > 0) {
          // Process each pair found for this chain
          result.rawData.forEach((pair: any) => {
            // Only include if the base token matches our search address
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
          });
        }
      } catch (error) {
        console.warn(`Error searching on ${chain}:`, error instanceof Error ? error.message : 'Unknown error');
        // Continue with other chains even if one fails
      }
    }

    // Remove duplicates (same blockchain and owner)
    const uniqueMatches = matches.filter((match, index, self) => 
      index === self.findIndex(m => m.blockchain === match.blockchain && m.owner.toLowerCase() === match.owner.toLowerCase())
    );

    res.json({
      result: true,
      data: {
        address: address,
        matches: uniqueMatches,
        totalMatches: uniqueMatches.length,
        searchedChains: supportedChains,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      result: false,
      reason: error instanceof Error ? error.message : 'Internal server error occurred while searching'
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