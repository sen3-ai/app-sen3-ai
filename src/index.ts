import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

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

// Utility to determine if address is EVM or Solana
function getAddressType(address: string): AddressType {
  if (/^0x[0-9a-fA-F]{40}$/.test(address)) return AddressType.EVM;
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return AddressType.SOLANA;
  return AddressType.UNKNOWN;
}

// Dummy risk calculation logic
function calculateRisk(address: string): { score: number; description: string; addressType: AddressType } {
  const type = getAddressType(address);
  let score = 50;
  let description = '';

  if (type === AddressType.EVM) {
    // Example: Lower risk for addresses starting with 0xabc, higher otherwise
    score = address.startsWith('0xabc') ? 20 : 70;
    description = `EVM address. Score based on prefix. ${address.startsWith('0xabc') ? 'Trusted prefix.' : 'Untrusted prefix.'}`;
  } else if (type === AddressType.SOLANA) {
    // Example: Lower risk for addresses ending with 'A', higher otherwise
    score = address.endsWith('A') ? 30 : 80;
    description = `Solana address. Score based on suffix. ${address.endsWith('A') ? 'Trusted suffix.' : 'Untrusted suffix.'}`;
  } else {
    throw new Error('Invalid address format. Only EVM and Solana addresses are supported.');
  }

  return { score, description, addressType: type };
}

app.get('/risk/:address', (req: Request, res: Response): void => {
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

    const riskData = calculateRisk(address);
    
    res.json({
      result: true,
      data: {
        address: address,
        riskScore: riskData.score,
        description: riskData.description,
        addressType: riskData.addressType,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(400).json({
      result: false,
      reason: error instanceof Error ? error.message : 'Invalid address format. Only EVM and Solana addresses are supported.'
    });
  }
});

// Export app for testing
export { app };

// Only start server if this file is run directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
} 