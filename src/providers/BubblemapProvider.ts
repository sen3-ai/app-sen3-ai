import { BaseProvider } from './Provider';
import { Config } from '../config/Config';
import type { ProviderConfig } from '../config/Config';

interface BubblemapResponse {
  success: boolean;
  data?: {
    token: {
      name: string;
      symbol: string;
      address: string;
      chain: string;
      [key: string]: any;
    };
    holders: {
      count: number;
      [key: string]: any;
    };
    transactions: {
      count: number;
      [key: string]: any;
    };
    [key: string]: any;
  };
  error?: string;
}

// Chain mapping from our internal names to Bubblemap API names
const CHAIN_MAPPING: { [key: string]: string } = {
  'ethereum': 'eth',
  'base': 'base',
  'solana': 'solana',
  'tron': 'tron',
  'bsc': 'bsc'
};

export class BubblemapProvider extends BaseProvider {
  private config = Config.getInstance();
  private readonly baseUrl = 'https://api.bubblemaps.io/maps';

  getName(): string {
    return 'bubblemap';
  }

  async fetch(address: string, chain?: string): Promise<any> {
    return this.safeFetch(async () => {
      const credentials = this.config.getCredentials();
      const providerConfigs = this.config.getProviderConfigs() || [];
      const providerConfig: Partial<ProviderConfig> = providerConfigs.find(p => p.name === 'bubblemap') || {};

      if (!credentials.bubblemapApiKey) {
        console.warn('Bubblemap API key not configured, using mock data');
        return this.generateMockData(address, chain);
      }

      const timeout = providerConfig?.timeout || 10000;
      const retries = providerConfig?.retries || 3;

      // Determine the chain to use
      const targetChain = this.resolveChain(chain);
      if (!targetChain) {
        console.warn(`Unsupported chain for Bubblemap: ${chain}, using mock data`);
        return this.generateMockData(address, chain);
      }

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const response = await this.callBubblemapAPI(address, targetChain, credentials.bubblemapApiKey, timeout);
          
          if (response.success && response.data) {
            return this.transformBubblemapResponse(response.data, address, targetChain);
          } else {
            console.warn(`Bubblemap API error: ${response.error}`);
            if (attempt === retries) {
              return this.generateMockData(address, targetChain);
            }
          }
        } catch (error) {
          console.warn(`Bubblemap API attempt ${attempt} failed:`, error);
          if (attempt === retries) {
            return this.generateMockData(address, targetChain);
          }
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }

      return this.generateMockData(address, targetChain);
    });
  }

  private resolveChain(chain?: string): string | null {
    if (!chain) {
      return 'eth'; // Default to Ethereum
    }

    const mappedChain = CHAIN_MAPPING[chain.toLowerCase()];
    if (!mappedChain) {
      console.warn(`Chain '${chain}' not supported by Bubblemap. Supported chains: ${Object.keys(CHAIN_MAPPING).join(', ')}`);
      return null;
    }

    return mappedChain;
  }

  private async callBubblemapAPI(address: string, chain: string, apiKey: string, timeout: number): Promise<BubblemapResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const url = `${this.baseUrl}/${chain}/${address}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-ApiKey': apiKey,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as BubblemapResponse;

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private transformBubblemapResponse(data: BubblemapResponse['data'], address: string, chain: string): any {
    if (!data) {
      return this.generateMockData(address, chain);
    }

    const token = data.token || {};
    const holders = data.holders || {};
    const transactions = data.transactions || {};

    return {
      // Bubblemap specific data
      tokenName: token.name || 'Unknown',
      tokenSymbol: token.symbol || 'UNKNOWN',
      tokenAddress: token.address || address,
      chain: chain,
      holderCount: holders.count || 0,
      transactionCount: transactions.count || 0,
      
      // Risk assessment based on holder distribution and activity
      riskScore: this.calculateRiskScore(holders, transactions),
      riskLevel: this.getRiskLevel(holders, transactions),
      isBlacklisted: false, // Bubblemap doesn't provide blacklist info
      blacklistReasons: [],
      tags: this.extractTags(holders, transactions),
      firstSeen: null, // Not provided by Bubblemap
      lastSeen: null, // Not provided by Bubblemap
      totalVolume: 0, // Not provided by Bubblemap
      suspiciousPatterns: this.extractSuspiciousPatterns(holders, transactions),
      description: this.generateExplanation(data, chain),
      
      // Legacy/compat fields for processor
      reputationScore: 50, // Default neutral score
      trustScore: 50, // Default neutral score
      reports: 0,
      positiveFeedback: 50,
      negativeFeedback: 50,
      
      // Provider metadata
      apiKeyConfigured: true,
      providerConfig: {
        timeout: 10000,
        retries: 3
      },
      source: 'bubblemap',
      rawData: data
    };
  }

  private calculateRiskScore(holders: any, transactions: any): number {
    let riskScore = 50; // Start with neutral score

    // Adjust based on holder count
    const holderCount = holders.count || 0;
    if (holderCount < 10) riskScore += 20; // Few holders = higher risk
    else if (holderCount > 10000) riskScore -= 10; // Many holders = lower risk

    // Adjust based on transaction count
    const txCount = transactions.count || 0;
    if (txCount < 100) riskScore += 15; // Low activity = higher risk
    else if (txCount > 100000) riskScore -= 5; // High activity = slightly lower risk

    // Ensure score is within 0-100 range
    return Math.max(0, Math.min(100, riskScore));
  }

  private getRiskLevel(holders: any, transactions: any): string {
    const riskScore = this.calculateRiskScore(holders, transactions);
    if (riskScore < 25) return 'low';
    if (riskScore < 50) return 'medium';
    if (riskScore < 75) return 'high';
    return 'critical';
  }

  private extractTags(holders: any, transactions: any): string[] {
    const tags = [];
    const holderCount = holders.count || 0;
    const txCount = transactions.count || 0;

    if (holderCount < 10) tags.push('few_holders');
    if (holderCount > 10000) tags.push('many_holders');
    if (txCount < 100) tags.push('low_activity');
    if (txCount > 100000) tags.push('high_activity');

    return tags;
  }

  private extractSuspiciousPatterns(holders: any, transactions: any): string[] {
    const patterns = [];
    const holderCount = holders.count || 0;
    const txCount = transactions.count || 0;

    if (holderCount < 10) patterns.push('Very few token holders');
    if (txCount < 100) patterns.push('Low transaction activity');
    if (holderCount > 10000 && txCount < 1000) patterns.push('Many holders but low activity');

    return patterns;
  }

  private generateExplanation(data: any, chain: string): string {
    const token = data.token || {};
    const holders = data.holders || {};
    const transactions = data.transactions || {};

    const holderCount = holders.count || 0;
    const txCount = transactions.count || 0;
    const riskScore = this.calculateRiskScore(holders, transactions);

    let explanation = `Token: ${token.name || 'Unknown'} (${token.symbol || 'UNKNOWN'}) on ${chain.toUpperCase()}. `;
    explanation += `Risk score: ${riskScore.toFixed(1)}%. `;
    explanation += `Holders: ${holderCount}, Transactions: ${txCount}. `;

    if (holderCount < 10) {
      explanation += 'Very few holders may indicate high concentration risk. ';
    } else if (holderCount > 10000) {
      explanation += 'Large holder base suggests good distribution. ';
    }

    if (txCount < 100) {
      explanation += 'Low transaction activity may indicate limited liquidity. ';
    } else if (txCount > 100000) {
      explanation += 'High transaction volume suggests active trading. ';
    }

    return explanation;
  }

  private generateMockData(address: string, chain?: string): any {
    const targetChain = chain || 'eth';
    
    return {
      tokenName: 'Mock Token',
      tokenSymbol: 'MOCK',
      tokenAddress: address,
      chain: targetChain,
      holderCount: 1000,
      transactionCount: 5000,
      riskScore: 30,
      riskLevel: 'medium',
      isBlacklisted: false,
      blacklistReasons: [],
      tags: ['mock_data'],
      firstSeen: null,
      lastSeen: null,
      totalVolume: 0,
      suspiciousPatterns: [],
      description: `Mock data for ${address} on ${targetChain}`,
      reputationScore: 70,
      trustScore: 70,
      reports: 0,
      positiveFeedback: 70,
      negativeFeedback: 30,
      apiKeyConfigured: false,
      providerConfig: {
        timeout: 10000,
        retries: 3
      },
      source: 'bubblemap_mock'
    };
  }

  /**
   * Gets the supported chains for this provider
   */
  getSupportedChains(): string[] {
    return Object.keys(CHAIN_MAPPING);
  }

  /**
   * Gets the chain mapping used by this provider
   */
  getChainMapping(): { [key: string]: string } {
    return { ...CHAIN_MAPPING };
  }
} 