import { BaseProvider } from './Provider';
import { Config } from '../config/Config';
import { CommonData } from './CommonDataTypes';

// Chain mapping from our internal names to Coingecko chain IDs
const CHAIN_MAPPING: { [key: string]: string } = {
  'ethereum': 'ethereum',
  'bsc': 'binance-smart-chain',
  'solana': 'solana',
  'base': 'base'
};

interface CoingeckoContractData {
  id: string;
  symbol: string;
  name: string;
  platforms: { [key: string]: string };
  image: {
    thumb: string;
    small: string;
    large: string;
  };
  market_data: {
    current_price: { [key: string]: number };
    market_cap: { [key: string]: number };
    total_volume: { [key: string]: number };
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    market_cap_rank: number;
    total_supply: number;
    max_supply: number;
    circulating_supply: number;
    fully_diluted_valuation: { [key: string]: number };
    total_value_locked: { [key: string]: number };
    fdv_to_tvl_ratio: number;
    market_cap_fdv_ratio: number;
    mcap_to_tvl_ratio: number;
    high_24h: { [key: string]: number };
    low_24h: { [key: string]: number };
    ath: { [key: string]: number };
    ath_date: { [key: string]: string };
    atl: { [key: string]: number };
    atl_date: { [key: string]: string };
    last_updated: string;
  };
  community_data: {
    twitter_followers: number;
    reddit_subscribers: number;
    telegram_channel_user_count: number;
  };
  developer_data: {
    forks: number;
    stars: number;
    subscribers: number;
    total_issues: number;
    closed_issues: number;
    pull_requests_merged: number;
    pull_request_contributors: number;
    code_additions_deletions_4_weeks: {
      additions: number;
      deletions: number;
    };
    commit_count_4_weeks: number;
  };
  public_interest_score: number;
  last_updated: string;
  genesis_date: string | null;
  block_time_in_minutes: number | null;
}

export class CoingeckoProvider extends BaseProvider {
  private apiKey: string;
  private baseUrl: string = 'https://api.coingecko.com/api/v3';
  private config = Config.getInstance();

  constructor() {
    super();
    this.apiKey = this.config.getCredentials().coingeckoApiKey || '';
  }

  getName(): string {
    return 'coingecko';
  }

  private resolveChain(chain: string): string | null {
    const mappedChain = CHAIN_MAPPING[chain.toLowerCase()];
    if (!mappedChain) {
      console.warn(`Chain '${chain}' not supported by Coingecko. Supported chains: ${Object.keys(CHAIN_MAPPING).join(', ')}`);
      return null;
    }
    return mappedChain;
  }

  async fetch(address: string, chain?: string): Promise<any> {
    return this.safeFetch(async () => {
      if (!this.apiKey) {
        console.warn('Coingecko API key not configured');
        return {
          rawData: null,
          status: 'error',
          error: 'Coingecko API key not configured',
          provider: 'coingecko',
          timestamp: new Date().toISOString()
        };
      }

      const targetChain = this.resolveChain(chain || 'ethereum');
      if (!targetChain) {
        console.warn(`Unsupported chain for Coingecko: ${chain}`);
        return {
          rawData: null,
          status: 'error',
          error: `Unsupported chain: ${chain}`,
          provider: 'coingecko',
          timestamp: new Date().toISOString()
        };
      }

      const url = `${this.baseUrl}/coins/${targetChain}/contract/${address}`;
      console.log(`Fetching Coingecko data for ${address} on ${targetChain}...`);

      const retries = 3;
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'x-cg-api-key': this.apiKey
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data: CoingeckoContractData = await response.json();
            return {
              rawData: data,
              status: 'success',
              provider: 'coingecko',
              timestamp: new Date().toISOString()
            };
          } else if (response.status === 404) {
            console.warn(`Coingecko API returned 404 for ${address} on ${targetChain}`);
            if (attempt === retries) {
              return {
                rawData: null,
                status: 'not_found',
                error: 'Contract not found',
                provider: 'coingecko',
                timestamp: new Date().toISOString()
              };
            }
          } else {
            console.warn(`Coingecko API returned ${response.status} for ${address} on ${targetChain}`);
            if (attempt === retries) {
              return {
                rawData: null,
                status: 'error',
                error: `HTTP ${response.status}`,
                provider: 'coingecko',
                timestamp: new Date().toISOString()
              };
            }
          }
        } catch (error) {
          console.warn(`Coingecko API attempt ${attempt} failed:`, error);
          if (attempt === retries) {
            return {
              rawData: null,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
              provider: 'coingecko',
              timestamp: new Date().toISOString()
            };
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        }
      }

      return {
        rawData: null,
        status: 'error',
        error: 'All retry attempts failed',
        provider: 'coingecko',
        timestamp: new Date().toISOString()
      };
    });
  }

  extractCommonData(rawData: any): CommonData {
    if (!rawData || !rawData.market_data) {
      return {};
    }

    const marketData = rawData.market_data;
    const communityData = rawData.community_data;

    return {
      name: rawData.name,
      symbol: rawData.symbol,
      price: marketData.current_price?.usd,
      priceChange24h: marketData.price_change_percentage_24h,
      volume24h: marketData.total_volume?.usd,
      marketCap: marketData.market_cap?.usd,
      fullyDilutedValuation: marketData.fully_diluted_valuation?.usd,
      twitterFollowers: communityData?.twitter_followers,
      lastUpdated: new Date().toISOString()
    };
  }
} 