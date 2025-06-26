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
        return {
          rawData: null,
          status: 'error',
          error: `Unsupported chain for DexScreener: ${chain}. Supported chains: ${Object.keys(CHAIN_MAPPING).join(', ')}`,
          provider: 'dexscreener',
          timestamp: new Date().toISOString()
        };
      }

      console.log(`DexScreenerProvider using targetChain: ${targetChain}`);

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`DexScreenerProvider attempt ${attempt}/${retries} for ${address} on ${targetChain}`);
          const response = await this.callDexScreenerAPI(address, targetChain, timeout);
          
          if (response && response.length > 0) {
            console.log(`DexScreenerProvider found ${response.length} pairs for ${address} on ${targetChain}`);
            return {
              rawData: response,
              status: 'success',
              provider: 'dexscreener',
              timestamp: new Date().toISOString()
            };
          } else {
            console.warn(`DexScreener API returned no pairs for ${address} on ${targetChain}`);
            if (attempt === retries) {
              return {
                rawData: null,
                status: 'not_found',
                error: 'No trading pairs found',
                provider: 'dexscreener',
                timestamp: new Date().toISOString()
              };
            }
          }
        } catch (error) {
          console.warn(`DexScreener API attempt ${attempt} failed:`, error);
          if (attempt === retries) {
            return {
              rawData: null,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
              provider: 'dexscreener',
              timestamp: new Date().toISOString()
            };
          }
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }

      return {
        rawData: null,
        status: 'error',
        error: 'All retry attempts failed',
        provider: 'dexscreener',
        timestamp: new Date().toISOString()
      };
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

  getSupportedChains(): string[] {
    return Object.keys(CHAIN_MAPPING);
  }

  getChainMapping(): { [key: string]: string } {
    return { ...CHAIN_MAPPING };
  }
} 