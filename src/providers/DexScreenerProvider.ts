import fetch from 'node-fetch';
import { BaseProvider } from './Provider';
import { Config } from '../config/Config';
import type { ProviderConfig } from '../config/Config';

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    h24: {
      buys: number;
      sells: number;
    };
    h6: {
      buys: number;
      sells: number;
    };
    h1: {
      buys: number;
      sells: number;
    };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
  };
  priceChange: {
    h24: number;
    h6: number;
    h1: number;
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv: number;
  pairCreatedAt: number;
}

interface DexScreenerResponse extends Array<DexScreenerPair> {}

// Chain mapping from our internal names to DexScreener chainId values
const CHAIN_MAPPING: { [key: string]: string } = {
  'ethereum': 'ethereum',
  'solana': 'solana',
  'bsc': 'bsc',
  'base': 'base',
  'avalanche': 'avalanche'
};

export class DexScreenerProvider extends BaseProvider {
  private config = Config.getInstance();
  private readonly baseUrl = 'https://api.dexscreener.com/token-pairs/v1';

  getName(): string {
    return 'dexscreener';
  }

  async fetch(address: string, chain?: string): Promise<any> {
    return this.safeFetch(async () => {
      console.log(`DexScreenerProvider.fetch called with address: ${address}, chain: ${chain}`);
      
      const providerConfigs = this.config.getProviderConfigs() || [];
      const providerConfig: Partial<ProviderConfig> = providerConfigs.find(p => p.name === 'dexscreener') || {};

      const timeout = providerConfig?.timeout || 10000;
      const retries = providerConfig?.retries || 3;

      // Determine the chain to use
      const targetChain = this.resolveChain(chain);
      if (!targetChain) {
        throw new Error(`Unsupported chain for DexScreener: ${chain}. Supported chains: ${Object.keys(CHAIN_MAPPING).join(', ')}`);
      }

      console.log(`DexScreenerProvider using targetChain: ${targetChain}`);

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`DexScreenerProvider attempt ${attempt}/${retries} for ${address} on ${targetChain}`);
          const response = await this.callDexScreenerAPI(address, targetChain, timeout);
          
          if (response && response.length > 0) {
            console.log(`DexScreenerProvider found ${response.length} pairs for ${address} on ${targetChain}`);
            return this.transformDexScreenerResponse(response, address, targetChain);
          } else {
            console.warn(`DexScreener API returned no pairs for ${address} on ${targetChain}`);
            if (attempt === retries) {
              console.log(`DexScreenerProvider returning null after ${retries} attempts`);
              return null; // Return null instead of mock data
            }
          }
        } catch (error) {
          console.warn(`DexScreener API attempt ${attempt} failed:`, error);
          if (attempt === retries) {
            throw error; // Re-throw the error instead of returning mock data
          }
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }

      console.log(`DexScreenerProvider returning null after all retries`);
      return null; // Return null if no data found after all retries
    });
  }

  private resolveChain(chain?: string): string | null {
    if (!chain) {
      return 'ethereum'; // Default to Ethereum
    }

    const mappedChain = CHAIN_MAPPING[chain.toLowerCase()];
    if (!mappedChain) {
      console.warn(`Chain '${chain}' not supported by DexScreener. Supported chains: ${Object.keys(CHAIN_MAPPING).join(', ')}`);
      return null;
    }

    return mappedChain;
  }

  private async callDexScreenerAPI(address: string, chain: string, timeout: number): Promise<DexScreenerResponse> {
    try {
      const url = `${this.baseUrl}/${chain}/${address}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as DexScreenerResponse;

    } catch (error) {
      throw error;
    }
  }

  private transformDexScreenerResponse(response: DexScreenerResponse, address: string, chain: string): any {
    if (response.length === 0) {
      return null;
    }

    // Get the most liquid pair (highest USD liquidity)
    const bestPair = response.reduce((best, current) => {
      return (current.liquidity?.usd || 0) > (best.liquidity?.usd || 0) ? current : best;
    });

    const priceUsd = parseFloat(bestPair.priceUsd || '0');
    const volume24h = bestPair.volume?.h24 || 0;
    const liquidityUsd = bestPair.liquidity?.usd || 0;
    const fdv = bestPair.fdv || 0;
    const txns24h = (bestPair.txns?.h24?.buys || 0) + (bestPair.txns?.h24?.sells || 0);
    const priceChange24h = bestPair.priceChange?.h24 || 0;

    return {
      // DexScreener specific data
      tokenName: bestPair.baseToken.name || 'Unknown',
      tokenSymbol: bestPair.baseToken.symbol || 'UNKNOWN',
      tokenAddress: bestPair.baseToken.address || address,
      chain: chain,
      priceUsd: priceUsd,
      volume24h: volume24h,
      liquidityUsd: liquidityUsd,
      fdv: fdv,
      transactions24h: txns24h,
      priceChange24h: priceChange24h,
      pairAddress: bestPair.pairAddress,
      dexId: bestPair.dexId,
      quoteToken: bestPair.quoteToken,
      
      // Risk assessment based on liquidity, volume, and price stability
      riskScore: this.calculateRiskScore(priceUsd, volume24h, liquidityUsd, fdv, txns24h, priceChange24h),
      riskLevel: this.getRiskLevel(priceUsd, volume24h, liquidityUsd, fdv, txns24h, priceChange24h),
      isBlacklisted: false, // DexScreener doesn't provide blacklist info
      blacklistReasons: [],
      tags: this.extractTags(priceUsd, volume24h, liquidityUsd, fdv, txns24h, priceChange24h),
      firstSeen: bestPair.pairCreatedAt ? new Date(bestPair.pairCreatedAt).toISOString() : null,
      lastSeen: null, // Not provided by DexScreener
      totalVolume: volume24h,
      suspiciousPatterns: this.extractSuspiciousPatterns(priceUsd, volume24h, liquidityUsd, fdv, txns24h, priceChange24h),
      description: this.generateExplanation(bestPair, chain),
      
      // Legacy/compat fields for processor
      reputationScore: 50, // Default neutral score
      trustScore: 50, // Default neutral score
      reports: 0,
      positiveFeedback: 50,
      negativeFeedback: 50,
      
      // Provider metadata
      apiKeyConfigured: false, // Public API, no key needed
      providerConfig: {
        timeout: 10000,
        retries: 3
      },
      source: 'dexscreener',
      rawData: response,
      allPairs: response
    };
  }

  private calculateRiskScore(priceUsd: number, volume24h: number, liquidityUsd: number, fdv: number, txns24h: number, priceChange24h: number): number {
    let riskScore = 50; // Start with neutral score

    // Adjust based on liquidity
    if (liquidityUsd < 10000) riskScore += 25; // Very low liquidity = high risk
    else if (liquidityUsd < 100000) riskScore += 15; // Low liquidity = higher risk
    else if (liquidityUsd > 1000000) riskScore -= 10; // High liquidity = lower risk

    // Adjust based on volume
    if (volume24h < 1000) riskScore += 20; // Very low volume = high risk
    else if (volume24h < 10000) riskScore += 10; // Low volume = higher risk
    else if (volume24h > 1000000) riskScore -= 5; // High volume = slightly lower risk

    // Adjust based on transactions
    if (txns24h < 10) riskScore += 15; // Very few transactions = high risk
    else if (txns24h < 100) riskScore += 10; // Few transactions = higher risk
    else if (txns24h > 10000) riskScore -= 5; // Many transactions = slightly lower risk

    // Adjust based on price volatility
    const absPriceChange = Math.abs(priceChange24h);
    if (absPriceChange > 50) riskScore += 20; // High volatility = high risk
    else if (absPriceChange > 20) riskScore += 10; // Moderate volatility = higher risk
    else if (absPriceChange < 5) riskScore -= 5; // Low volatility = slightly lower risk

    // Adjust based on price
    if (priceUsd < 0.000001) riskScore += 10; // Very low price = higher risk
    else if (priceUsd > 1000) riskScore += 5; // Very high price = slightly higher risk

    // Ensure score is within 0-100 range
    return Math.max(0, Math.min(100, riskScore));
  }

  private getRiskLevel(priceUsd: number, volume24h: number, liquidityUsd: number, fdv: number, txns24h: number, priceChange24h: number): string {
    const riskScore = this.calculateRiskScore(priceUsd, volume24h, liquidityUsd, fdv, txns24h, priceChange24h);
    if (riskScore < 25) return 'low';
    if (riskScore < 50) return 'medium';
    if (riskScore < 75) return 'high';
    return 'critical';
  }

  private extractTags(priceUsd: number, volume24h: number, liquidityUsd: number, fdv: number, txns24h: number, priceChange24h: number): string[] {
    const tags = [];
    
    if (liquidityUsd < 10000) tags.push('low_liquidity');
    if (liquidityUsd > 1000000) tags.push('high_liquidity');
    if (volume24h < 1000) tags.push('low_volume');
    if (volume24h > 1000000) tags.push('high_volume');
    if (txns24h < 10) tags.push('low_activity');
    if (txns24h > 10000) tags.push('high_activity');
    if (Math.abs(priceChange24h) > 50) tags.push('high_volatility');
    if (Math.abs(priceChange24h) < 5) tags.push('low_volatility');
    if (priceUsd <= 0.000001) tags.push('micro_cap');
    if (priceUsd > 1000) tags.push('high_price');

    return tags;
  }

  private extractSuspiciousPatterns(priceUsd: number, volume24h: number, liquidityUsd: number, fdv: number, txns24h: number, priceChange24h: number): string[] {
    const patterns = [];

    if (liquidityUsd < 10000) patterns.push('Very low liquidity');
    if (volume24h < 1000) patterns.push('Very low trading volume');
    if (txns24h < 10) patterns.push('Very few transactions');
    if (Math.abs(priceChange24h) > 50) patterns.push('Extreme price volatility');
    if (liquidityUsd > 100000 && volume24h < 10000) patterns.push('High liquidity but low volume');
    if (priceUsd < 0.000001) patterns.push('Extremely low token price');

    return patterns;
  }

  private generateExplanation(pair: DexScreenerPair, chain: string): string {
    const priceUsd = parseFloat(pair.priceUsd || '0');
    const volume24h = pair.volume?.h24 || 0;
    const liquidityUsd = pair.liquidity?.usd || 0;
    const fdv = pair.fdv || 0;
    const txns24h = (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0);
    const priceChange24h = pair.priceChange?.h24 || 0;
    const riskScore = this.calculateRiskScore(priceUsd, volume24h, liquidityUsd, fdv, txns24h, priceChange24h);

    let explanation = `Token: ${pair.baseToken.name || 'Unknown'} (${pair.baseToken.symbol || 'UNKNOWN'}) on ${chain.toUpperCase()}. `;
    explanation += `Risk score: ${riskScore.toFixed(1)}%. `;
    explanation += `Price: $${priceUsd.toFixed(6)}, 24h Volume: $${volume24h.toLocaleString()}, `;
    explanation += `Liquidity: $${liquidityUsd.toLocaleString()}, Transactions: ${txns24h}. `;

    if (priceChange24h !== 0) {
      explanation += `24h Change: ${priceChange24h > 0 ? '+' : ''}${priceChange24h.toFixed(2)}%. `;
    }

    if (liquidityUsd < 10000) {
      explanation += 'Very low liquidity indicates high risk. ';
    } else if (liquidityUsd > 1000000) {
      explanation += 'High liquidity suggests good market depth. ';
    }

    if (volume24h < 1000) {
      explanation += 'Very low trading volume may indicate limited interest. ';
    } else if (volume24h > 1000000) {
      explanation += 'High trading volume suggests active market. ';
    }

    if (Math.abs(priceChange24h) > 50) {
      explanation += 'Extreme price volatility indicates high risk. ';
    }

    return explanation;
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