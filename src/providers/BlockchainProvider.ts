import { BaseProvider } from './Provider';
import { Config } from '../config/Config';

export class BlockchainProvider extends BaseProvider {
  private config = Config.getInstance();

  getName(): string {
    return 'blockchain';
  }

  async fetch(address: string): Promise<any> {
    return this.safeFetch(async () => {
      const credentials = this.config.getCredentials();
      const providerConfig = this.config.getProviderConfigs().find(p => p.name === 'blockchain');
      
      // Simulate API call with configured timeout
      const timeout = providerConfig?.timeout || 5000;
      await this.simulateApiCall(timeout);

      // Use API key if available
      const apiKey = credentials.blockchainApiKey || credentials.etherscanApiKey;
      
      return {
        balance: this.generateRandomBalance(),
        transactionCount: this.generateRandomTransactionCount(),
        lastActivity: this.generateRandomDate(),
        contractInteractions: this.generateRandomContractInteractions(),
        apiKeyConfigured: !!apiKey,
        providerConfig: {
          timeout,
          retries: providerConfig?.retries || 3
        },
        // Legacy/compat fields for processor/tests
        totalVolume: Math.floor(Math.random() * 2000000),
        firstSeen: this.generateRandomDate(),
        lastSeen: this.generateRandomDate(),
        averageTransactionValue: Math.floor(Math.random() * 1000)
      };
    });
  }

  private async simulateApiCall(timeout: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, Math.random() * timeout * 0.5 + timeout * 0.1));
  }

  private generateRandomBalance(): number {
    return Math.random() * 1000000;
  }

  private generateRandomTransactionCount(): number {
    return Math.floor(Math.random() * 10000);
  }

  private generateRandomDate(): string {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 365);
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return date.toISOString();
  }

  private generateRandomContractInteractions(): string[] {
    const contracts = [
      '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 Router
      '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3 Router
      '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap Router
      '0x7D1AfA7B718fb893dB30A3aBc0Cfc608aCafEBB',  // Polygon Bridge
      '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B'  // Compound
    ];
    
    const count = Math.floor(Math.random() * 5);
    return contracts.slice(0, count);
  }
} 