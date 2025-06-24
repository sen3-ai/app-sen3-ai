import { BaseProvider } from './Provider';

export interface BlockchainData {
  transactionCount: number;
  totalVolume: number;
  firstSeen: string;
  lastSeen: string;
  averageTransactionValue: number;
}

export class BlockchainProvider extends BaseProvider {
  getName(): string {
    return 'blockchain';
  }

  async fetch(address: string): Promise<BlockchainData | null> {
    return this.safeFetch(async () => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      
      // Simulate different data based on address
      const isHighActivity = address.includes('abc') || address.includes('def');
      const isLowActivity = address.includes('123') || address.length < 40;
      
      if (isHighActivity) {
        return {
          transactionCount: 2500,
          totalVolume: 1500000,
          firstSeen: '2022-01-15T10:30:00Z',
          lastSeen: new Date().toISOString(),
          averageTransactionValue: 600
        };
      } else if (isLowActivity) {
        return {
          transactionCount: 5,
          totalVolume: 1000,
          firstSeen: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          lastSeen: new Date().toISOString(),
          averageTransactionValue: 200
        };
      } else {
        return {
          transactionCount: 150,
          totalVolume: 50000,
          firstSeen: '2023-06-20T14:15:00Z',
          lastSeen: new Date().toISOString(),
          averageTransactionValue: 333
        };
      }
    });
  }
} 