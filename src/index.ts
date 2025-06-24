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

app.get('/risk/:address', async (req: Request, res: Response): Promise<void> => {
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

    const addressType = getAddressType(address);
    if (addressType === AddressType.UNKNOWN) {
      res.status(400).json({
        result: false,
        reason: 'Invalid address format. Only EVM and Solana addresses are supported.'
      });
      return;
    }

    // Collect data from all providers
    const collectedData = await dataCollector.collectData(address);
    
    // Process data through all processors
    const riskAssessment = await processorManager.processData(address, addressType, collectedData);
    
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
      providers: dataCollector.getProviders().map(p => p.getName()),
      processors: processorManager.getProcessors().map(p => p.getName()),
      blockchains: config.getBlockchainConfigs().map(bc => bc.name),
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
      solscanApiKey: !!config.getCredentials().solscanApiKey
    }
  };

  res.json({
    result: true,
    data: safeConfig
  });
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