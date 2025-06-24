import { BaseProvider } from './Provider';

export interface OnchainData {
  hasContractInteraction: boolean;
  gasUsed: number;
  contractCount: number;
  dappInteractions: string[];
  suspiciousPatterns: string[];
}

export class OnchainProvider extends BaseProvider {
  getName(): string {
    return 'onchain';
  }

  async fetch(address: string): Promise<OnchainData | null> {
    return this.safeFetch(async () => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 700 + 400));
      
      // Simulate different on-chain data based on address
      const isDeFiUser = address.includes('abc') || address.includes('def');
      const isContractCreator = address.includes('creator') || address.includes('factory');
      const isNew = address.includes('123') || address.length < 40;
      
      if (isDeFiUser) {
        return {
          hasContractInteraction: true,
          gasUsed: 2500000,
          contractCount: 8,
          dappInteractions: ['Uniswap', 'Aave', 'Compound', 'Curve'],
          suspiciousPatterns: []
        };
      } else if (isContractCreator) {
        return {
          hasContractInteraction: true,
          gasUsed: 5000000,
          contractCount: 15,
          dappInteractions: ['Custom DEX', 'Yield Farm', 'NFT Marketplace'],
          suspiciousPatterns: ['High gas usage', 'Multiple contract deployments']
        };
      } else if (isNew) {
        return {
          hasContractInteraction: false,
          gasUsed: 21000,
          contractCount: 0,
          dappInteractions: [],
          suspiciousPatterns: []
        };
      } else {
        const hasContractInteraction = Math.random() > 0.3;
        return {
          hasContractInteraction,
          gasUsed: hasContractInteraction ? Math.floor(Math.random() * 1000000) + 50000 : 21000,
          contractCount: hasContractInteraction ? Math.floor(Math.random() * 5) + 1 : 0,
          dappInteractions: hasContractInteraction ? ['Uniswap', 'OpenSea'] : [],
          suspiciousPatterns: Math.random() > 0.8 ? ['Unusual gas patterns'] : []
        };
      }
    });
  }
} 