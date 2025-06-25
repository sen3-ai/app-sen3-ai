import { BaseProvider } from './Provider';
import { Config } from '../config/Config';

export class OnchainProvider extends BaseProvider {
  private config = Config.getInstance();

  getName(): string {
    return 'onchain';
  }

  async fetch(address: string): Promise<any> {
    return this.safeFetch(async () => {
      const credentials = this.config.getCredentials();
      const providerConfig = this.config.getProviderConfigs().find(p => p.name === 'onchain');
      
      // Simulate API call with configured timeout
      const timeout = providerConfig?.timeout || 6000;
      await this.simulateApiCall(timeout);

      // Use API key if available
      const apiKey = credentials.onchainApiKey;
      
      return {
        defiProtocols: this.generateDefiProtocols(),
        nftHoldings: this.generateNftHoldings(),
        tokenHoldings: this.generateTokenHoldings(),
        smartContractInteractions: this.generateSmartContractInteractions(),
        gasUsage: this.generateGasUsage(),
        apiKeyConfigured: !!apiKey,
        providerConfig: {
          timeout,
          retries: providerConfig?.retries || 3
        },
        // Legacy/compat fields for processor/tests
        hasContractInteraction: Math.random() > 0.5,
        gasUsed: Math.floor(Math.random() * 2000000),
        contractCount: Math.floor(Math.random() * 20),
        suspiciousPatterns: Math.random() > 0.8 ? ['Unusual gas patterns'] : [],
        dappInteractions: ['Uniswap', 'OpenSea', 'Aave'].slice(0, Math.floor(Math.random() * 3) + 1),
        // Required fields for tests
        riskScore: this.generateRiskScore(),
        source: 'onchain'
      };
    });
  }

  private async simulateApiCall(timeout: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, Math.random() * timeout * 0.5 + timeout * 0.1));
  }

  private generateDefiProtocols(): string[] {
    const protocols = [
      'uniswap', 'pancakeswap', 'aave', 'compound', 'curve', 
      'sushiswap', 'balancer', 'yearn', 'makerdao', 'synthetix'
    ];
    
    const count = Math.floor(Math.random() * 5);
    const selected: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const protocol = protocols[Math.floor(Math.random() * protocols.length)];
      if (!selected.includes(protocol)) {
        selected.push(protocol);
      }
    }
    
    return selected;
  }

  private generateNftHoldings(): any[] {
    const collections = [
      'Bored Ape Yacht Club', 'CryptoPunks', 'Doodles', 'Azuki', 'Moonbirds',
      'CloneX', 'Meebits', 'World of Women', 'Cool Cats', 'VeeFriends'
    ];
    
    const count = Math.floor(Math.random() * 10);
    const holdings = [];
    
    for (let i = 0; i < count; i++) {
      holdings.push({
        collection: collections[Math.floor(Math.random() * collections.length)],
        count: Math.floor(Math.random() * 5) + 1,
        floorPrice: Math.random() * 100
      });
    }
    
    return holdings;
  }

  private generateTokenHoldings(): any[] {
    const tokens = [
      { symbol: 'USDC', name: 'USD Coin' },
      { symbol: 'USDT', name: 'Tether' },
      { symbol: 'DAI', name: 'Dai Stablecoin' },
      { symbol: 'WETH', name: 'Wrapped Ether' },
      { symbol: 'WBTC', name: 'Wrapped Bitcoin' },
      { symbol: 'UNI', name: 'Uniswap' },
      { symbol: 'AAVE', name: 'Aave' },
      { symbol: 'COMP', name: 'Compound' }
    ];
    
    const count = Math.floor(Math.random() * 8);
    const holdings = [];
    
    for (let i = 0; i < count; i++) {
      const token = tokens[Math.floor(Math.random() * tokens.length)];
      holdings.push({
        ...token,
        balance: Math.random() * 10000,
        value: Math.random() * 50000
      });
    }
    
    return holdings;
  }

  private generateSmartContractInteractions(): any[] {
    const contracts = [
      { name: 'Uniswap V2 Router', address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' },
      { name: 'Uniswap V3 Router', address: '0xE592427A0AEce92De3Edee1F18E0157C05861564' },
      { name: 'Aave Lending Pool', address: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9' },
      { name: 'Compound Comptroller', address: '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B' },
      { name: 'Curve Registry', address: '0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5' }
    ];
    
    const count = Math.floor(Math.random() * 5);
    const interactions = [];
    
    for (let i = 0; i < count; i++) {
      const contract = contracts[Math.floor(Math.random() * contracts.length)];
      interactions.push({
        ...contract,
        interactionCount: Math.floor(Math.random() * 100),
        lastInteraction: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    return interactions;
  }

  private generateGasUsage(): number {
    return Math.random() * 1000;
  }

  private generateRiskScore(): number {
    return Math.random() * 100;
  }
} 