import fetch from 'node-fetch';
import { BaseProvider } from './Provider';
import { Config } from '../config/Config';
import type { ProviderConfig } from '../config/Config';
import { CommonData } from './CommonDataTypes';

interface BubblemapResponse {
  metadata: {
    dt_update: string;
    ts_update: number;
    identified_supply: {
      share_in_cexs: number;
      share_in_dexs: number;
      share_in_other_contracts: number;
    };
  };
  nodes: any[] | null;
  relationships: any[] | null;
  decentralization_score: number;
  clusters: Array<{
    share: number;
    amount: number;
    holder_count: number;
    holders: string[];
  }>;
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
        return {
          status: 'error',
          error: 'Bubblemap API key not configured',
          source: 'bubblemap',
          apiKeyConfigured: false,
          rawData: null
        };
      }

      const timeout = providerConfig?.timeout || 10000;
      const retries = providerConfig?.retries || 3;

      // Determine the chain to use
      const targetChain = this.resolveChain(chain);
      if (!targetChain) {
        return {
          status: 'error',
          error: `Unsupported chain for Bubblemap: ${chain}. Supported chains: ${Object.keys(CHAIN_MAPPING).join(', ')}`,
          source: 'bubblemap',
          apiKeyConfigured: true,
          rawData: null
        };
      }

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`Bubblemap API attempt ${attempt}/${retries} for address ${address} on ${targetChain}`);
          const response = await this.callBubblemapAPI(address, targetChain, credentials.bubblemapApiKey, timeout);
          
          // The API returns the data directly, not wrapped in success/error structure
          if (response && response.decentralization_score !== undefined) {
            return {
              status: 'success',
              source: 'bubblemap',
              apiKeyConfigured: true,
              rawData: response
            };
          } else {
            console.warn(`Bubblemap API returned unexpected response structure`);
            if (attempt === retries) {
              return {
                status: 'error',
                error: 'Bubblemap API returned unexpected response structure',
                source: 'bubblemap',
                apiKeyConfigured: true,
                rawData: null
              };
            }
          }
        } catch (error) {
          console.warn(`Bubblemap API attempt ${attempt} failed:`, error);
          if (attempt === retries) {
            return {
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
              source: 'bubblemap',
              apiKeyConfigured: true,
              rawData: null
            };
          }
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }

      return {
        status: 'error',
        error: 'All retry attempts failed',
        source: 'bubblemap',
        apiKeyConfigured: true,
        rawData: null
      };
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
    try {
      const url = `${this.baseUrl}/${chain}/${address}?return_nodes=true`;
      console.log(`Bubblemap API URL: ${url}`);
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout);
      });

      const fetchPromise = fetch(url, {
        method: 'GET',
        headers: {
          'X-ApiKey': apiKey,
          'Content-Type': 'application/json'
        }
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as BubblemapResponse;

    } catch (error) {
      throw error;
    }
  }

  getSupportedChains(): string[] {
    return Object.keys(CHAIN_MAPPING);
  }

  getChainMapping(): { [key: string]: string } {
    return CHAIN_MAPPING;
  }

  extractCommonData(rawData: any): CommonData {
    if (!rawData || !rawData.nodes) {
      return {};
    }

    // Collect all top_holders from all nodes
    const allTopHolders: Array<{ amount: number; share: number }> = [];
    
    // Ensure nodes is an array
    const nodesArr = Array.isArray(rawData.nodes) ? rawData.nodes : [rawData.nodes];
    
    for (const node of nodesArr) {
      if (node && node.top_holders && Array.isArray(node.top_holders)) {
        for (const holder of node.top_holders) {
          // Check for different possible field names
          const amount = holder.holder_data?.amount || null;
          const share = holder?.holder_data?.share || null;
          
          if (amount !== undefined && share !== undefined && share > 0) {
            allTopHolders.push({ amount, share });
          }
        }
      }
    }

    // Remove duplicates and sort by share (descending)
    const uniqueHolders = allTopHolders
      .filter((holder, index, self) => 
        index === self.findIndex(h => h.amount === holder.amount)
      )
      .sort((a, b) => b.share - a.share);

    // Calculate top holders percentages
    const top3HoldersPercentage = Math.round(uniqueHolders.slice(0, 3).reduce((sum, holder) => sum + holder.share, 0) * 1000) / 10;
    const top5HoldersPercentage = Math.round(uniqueHolders.slice(0, 5).reduce((sum, holder) => sum + holder.share, 0) * 1000) / 10;
    const top10HoldersPercentage = Math.round(uniqueHolders.slice(0, 10).reduce((sum, holder) => sum + holder.share, 0) * 1000) / 10;

    // Calculate total supply from first non-zero share holder
    let totalSupply = 0;
    if (uniqueHolders.length > 0) {
      const firstHolder = uniqueHolders[0];
      totalSupply = Math.round(firstHolder.amount / firstHolder.share);
    }

    // Calculate decentralization score
    const decentralizationScore = Math.max(0, 100 - top10HoldersPercentage);

    return {
      decentralizationScore,
      top3HoldersPercentage,
      top5HoldersPercentage,
      top10HoldersPercentage,
      totalSupply,
      clusters: rawData.clusters || [],
    };
  }
} 