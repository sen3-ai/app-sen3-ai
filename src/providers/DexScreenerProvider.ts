import fetch from 'node-fetch';
import { BaseProvider } from './Provider';
import { Config } from '../config/Config';
import type { ProviderConfig } from '../config/Config';
import { CommonData } from './CommonDataTypes';

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
  'polygon': 'polygon',
  'optimism': 'optimism',
  'arbitrum': 'arbitrum',
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
      const targetChain = this.resolveChain(chain);
      if (!targetChain) {
        console.warn(`Chain '${chain}' not supported by DexScreener. Supported chains: ${Object.keys(CHAIN_MAPPING).join(', ')}`);
        return {
          rawData: null,
          status: 'error',
          error: `Unsupported chain: ${chain}`,
          provider: 'dexscreener',
          timestamp: new Date().toISOString()
        };
      }

      const retries = 3;
      let lastError: any;

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`DexScreenerProvider attempt ${attempt}/${retries} for ${address} on ${targetChain}`);
          
          // Use the correct DexScreener API endpoint format
          const data = await this.callDexScreenerAPI(address, targetChain, 10000);
          
          if (data && Array.isArray(data) && data.length > 0) {
            console.log(`DexScreenerProvider found ${data.length} pairs for ${address} on ${targetChain}`);
            return {
              rawData: data,
              status: 'success',
              provider: 'dexscreener',
              timestamp: new Date().toISOString()
            };
          } else {
            console.log(`DexScreener API returned no pairs for ${address} on ${targetChain}`);
          }

          // If we get here, no pairs were found, but it's not an error
          return {
            rawData: [],
            status: 'success',
            provider: 'dexscreener',
            timestamp: new Date().toISOString()
          };

        } catch (error) {
          lastError = error;
          console.warn(`DexScreener API attempt ${attempt} failed:`, error);
          
          if (attempt < retries) {
            const backoffTime = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, backoffTime));
          }
        }
      }

      throw lastError;
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
      console.log(`DexScreener API URL: ${url}`);
      
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

  getSupportedChains(): string[] {
    return Object.keys(CHAIN_MAPPING);
  }

  getChainMapping(): { [key: string]: string } {
    return { ...CHAIN_MAPPING };
  }

  extractCommonData(rawData: any): CommonData {
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
      return {};
    }

    // Calculate aggregated values across all pairs
    let totalVolume24h = 0;
    let totalTxCount24h = 0;
    let totalBuyTxCount24h = 0;
    let totalSellTxCount24h = 0;
    let totalLiquidity = 0;
    let totalFdv = 0;
    let priceSum = 0;
    let priceCount = 0;
    let priceChangeSum = 0;
    let priceChangeCount = 0;

    // Process each pair
    rawData.forEach((pair: DexScreenerPair) => {
      // Volume
      if (pair.volume?.h24) {
        totalVolume24h += pair.volume.h24;
      }

      // Transaction counts
      if (pair.txns?.h24) {
        totalBuyTxCount24h += pair.txns.h24.buys || 0;
        totalSellTxCount24h += pair.txns.h24.sells || 0;
        totalTxCount24h += (pair.txns.h24.buys || 0) + (pair.txns.h24.sells || 0);
      }

      // Liquidity
      if (pair.liquidity?.usd) {
        totalLiquidity += pair.liquidity.usd;
      }

      // Price (average across all pairs)
      if (pair.priceUsd) {
        const price = parseFloat(pair.priceUsd);
        if (!isNaN(price)) {
          priceSum += price;
          priceCount++;
        }
      }

      // Price change (average across all pairs)
      if (pair.priceChange?.h24 !== undefined) {
        priceChangeSum += pair.priceChange.h24;
        priceChangeCount++;
      }

      // FDV (use the highest FDV among all pairs)
      if (pair.fdv && pair.fdv > totalFdv) {
        totalFdv = pair.fdv;
      }
    });

    // Calculate averages
    const avgPrice = priceCount > 0 ? priceSum / priceCount : undefined;
    const avgPriceChange24h = priceChangeCount > 0 ? priceChangeSum / priceChangeCount : undefined;

    return {
      //price: avgPrice,
      //priceChange24h: avgPriceChange24h,
      volume24h: totalVolume24h > 0 ? totalVolume24h : undefined,
      fullyDilutedValuation: totalFdv > 0 ? totalFdv : undefined,
      txCount24h: totalTxCount24h > 0 ? totalTxCount24h : undefined,
      buyTxCount24h: totalBuyTxCount24h > 0 ? totalBuyTxCount24h : undefined,
      sellTxCount24h: totalSellTxCount24h > 0 ? totalSellTxCount24h : undefined,
      liquidity: totalLiquidity > 0 ? totalLiquidity : undefined,
      lastUpdated: new Date().toISOString()
    };
  }
} 