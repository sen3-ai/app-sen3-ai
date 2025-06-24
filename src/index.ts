import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { DataCollector } from './providers/DataCollector';
import { ProcessorManager } from './processors/ProcessorManager';
import { ComprehensiveRiskProcessor } from './processors/ComprehensiveRiskProcessor';
import { BlockchainProvider } from './providers/BlockchainProvider';
import { ReputationProvider } from './providers/ReputationProvider';
import { SocialProvider } from './providers/SocialProvider';
import { OnchainProvider } from './providers/OnchainProvider';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
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

// Add providers
dataCollector.addProvider(new BlockchainProvider());
dataCollector.addProvider(new ReputationProvider());
dataCollector.addProvider(new SocialProvider());
dataCollector.addProvider(new OnchainProvider());

// Add processors
processorManager.addProcessor(new ComprehensiveRiskProcessor());

// Utility to determine if address is EVM or Solana
function getAddressType(address: string): AddressType {
  if (/^0x[0-9a-fA-F]{40}$/.test(address)) return AddressType.EVM;
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return AddressType.SOLANA;
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
      providers: dataCollector.getProviders().map(p => p.getName()),
      processors: processorManager.getProcessors().map(p => p.getName()),
      timestamp: new Date().toISOString()
    }
  });
});

// Export app for testing
export { app };

// Only start server if this file is run directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Available providers: ${dataCollector.getProviders().map(p => p.getName()).join(', ')}`);
    console.log(`Available processors: ${processorManager.getProcessors().map(p => p.getName()).join(', ')}`);
  });
} 