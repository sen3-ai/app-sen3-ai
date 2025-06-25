import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Config } from './config/Config';
import { DataCollector } from './providers/DataCollector';
import { ProcessorManager } from './processors/ProcessorManager';
import { ComprehensiveRiskProcessor } from './processors/ComprehensiveRiskProcessor';
import { BlockchainProvider } from './providers/BlockchainProvider';
import { ReputationProvider } from './providers/ReputationProvider';
import { SocialProvider } from './providers/SocialProvider';
import { OnchainProvider } from './providers/OnchainProvider';
import { AMLBotProvider } from './providers/AMLBotProvider';
import { BubblemapProvider } from './providers/BubblemapProvider';
import { DexScreenerProvider } from './providers/DexScreenerProvider';
import { TwitterProvider } from './providers/TwitterProvider';
import { ContractVerifier } from './providers/ContractVerifier';

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

// Add providers based on configuration
const providerConfigs = config.getProviderConfigs();
providerConfigs.forEach(providerConfig => {
  switch (providerConfig.name) {
    case 'blockchain':
      dataCollector.addProvider(new BlockchainProvider());
      break;
    case 'reputation':
      dataCollector.addProvider(new ReputationProvider());
      break;
    case 'social':
      dataCollector.addProvider(new SocialProvider());
      break;
    case 'onchain':
      dataCollector.addProvider(new OnchainProvider());
      break;
    case 'amlbot':
      dataCollector.addProvider(new AMLBotProvider());
      break;
    case 'bubblemap':
      dataCollector.addProvider(new BubblemapProvider());
      break;
    case 'dexscreener':
      dataCollector.addProvider(new DexScreenerProvider());
      break;
    case 'twitter':
      dataCollector.addProvider(new TwitterProvider(config));
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
function generateDescription(addressType: string, explanations: string[], score: number, confidence: number): string {
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

// Risk assessment endpoint
app.get('/risk/:chain/:address', async (req: Request, res: Response): Promise<void> => {
  try {
    const { address, chain } = req.params;
    
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

    if (contractInfo && contractInfo.source === 'dexscreener' && contractInfo.rawData && contractInfo.rawData.length > 0) {
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
    const collectedData = await dataCollector.collectData(address);
    
    // Step 4: Process data through all processors
    const riskAssessment = await processorManager.processData(address, addressType, collectedData);
    
    res.json({
      result: true,
      data: {
        address: address,
        chain: chain,
        addressType: addressType,
        contractInfo: basicInfo,
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
        if (result && result.source === 'dexscreener' && result.rawData && result.rawData.length > 0) {
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