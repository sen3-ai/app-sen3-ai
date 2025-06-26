import { BaseProvider } from './Provider';
import { Config } from '../config/Config';

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
    this.apiKey = this.config.getCredentials().coingeckoApiKey || 'CG-ABbdKjPjZ1EVvfRBkzyyzDga'; // Fallback to demo key if not set
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

  async fetch(address: string, chain: string = 'ethereum'): Promise<any> {
    return this.safeFetch(async () => {
      const targetChain = this.resolveChain(chain);
      if (!targetChain) {
        console.warn(`Unsupported chain for Coingecko: ${chain}, using mock data`);
        return this.generateMockData(address, chain);
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
              'x-cg-demo-api-key': this.apiKey
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data: CoingeckoContractData = await response.json();
            return this.transformCoingeckoResponse(data, address, targetChain);
          } else if (response.status === 404) {
            console.warn(`Coingecko API returned 404 for ${address} on ${targetChain}`);
            if (attempt === retries) {
              return this.generateMockData(address, chain);
            }
          } else {
            console.warn(`Coingecko API returned ${response.status} for ${address} on ${targetChain}`);
            if (attempt === retries) {
              return this.generateMockData(address, chain);
            }
          }
        } catch (error) {
          console.warn(`Coingecko API attempt ${attempt} failed:`, error);
          if (attempt === retries) {
            return this.generateMockData(address, chain);
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        }
      }

      return this.generateMockData(address, chain);
    });
  }

  private transformCoingeckoResponse(data: CoingeckoContractData, address: string, chain: string): any {
    const marketData = data.market_data || {};
    const communityData = data.community_data || {};
    const developerData = data.developer_data || {};

    // Calculate token age
    const tokenAge = this.calculateTokenAge(data.genesis_date, data.last_updated);

    return {
      source: 'coingecko',
      address: address,
      chain: chain,
      riskScore: this.calculateRiskScore(data),
      riskLevel: this.getRiskLevel(this.calculateRiskScore(data)),
      tags: this.generateTags(data),
      rawData: data,
      metadata: {
        name: data.name,
        symbol: data.symbol,
        id: data.id,
        image: data.image,
        lastUpdated: data.last_updated,
        publicInterestScore: data.public_interest_score,
        genesisDate: data.genesis_date,
        blockTimeInMinutes: data.block_time_in_minutes,
        tokenAge: tokenAge
      },
      marketData: {
        currentPrice: marketData.current_price?.usd || 0,
        marketCap: marketData.market_cap?.usd || 0,
        totalVolume: marketData.total_volume?.usd || 0,
        priceChange24h: marketData.price_change_percentage_24h || 0,
        priceChange7d: marketData.price_change_percentage_7d || 0,
        priceChange30d: marketData.price_change_percentage_30d || 0,
        marketCapRank: marketData.market_cap_rank || null,
        totalSupply: marketData.total_supply || 0,
        maxSupply: marketData.max_supply || 0,
        circulatingSupply: marketData.circulating_supply || 0,
        fullyDilutedValuation: marketData.fully_diluted_valuation?.usd || 0,
        totalValueLocked: marketData.total_value_locked?.usd || 0,
        fdvToTvlRatio: marketData.fdv_to_tvl_ratio || 0,
        marketCapFdvRatio: marketData.market_cap_fdv_ratio || 0,
        mcapToTvlRatio: marketData.mcap_to_tvl_ratio || 0,
        high24h: marketData.high_24h || {},
        low24h: marketData.low_24h || {},
        ath: marketData.ath || {},
        athDate: marketData.ath_date || {},
        atl: marketData.atl || {},
        atlDate: marketData.atl_date || {},
        // Volume metrics (24h only from main endpoint)
        volume24h: marketData.total_volume?.usd || 0,
        volume7d: null, // Would need market_chart endpoint
        volume30d: null, // Would need market_chart endpoint
        // Token age information
        tokenAge: tokenAge
      },
      communityData: {
        twitterFollowers: communityData.twitter_followers || 0,
        redditSubscribers: communityData.reddit_subscribers || 0,
        telegramUsers: communityData.telegram_channel_user_count || 0
      },
      developerData: {
        forks: developerData.forks || 0,
        stars: developerData.stars || 0,
        subscribers: developerData.subscribers || 0,
        totalIssues: developerData.total_issues || 0,
        closedIssues: developerData.closed_issues || 0,
        pullRequestsMerged: developerData.pull_requests_merged || 0,
        contributors: developerData.pull_request_contributors || 0,
        codeAdditions: developerData.code_additions_deletions_4_weeks?.additions || 0,
        codeDeletions: developerData.code_additions_deletions_4_weeks?.deletions || 0,
        commitCount: developerData.commit_count_4_weeks || 0
      }
    };
  }

  private calculateRiskScore(data: CoingeckoContractData): number {
    let score = 50; // Base score
    const marketData = data.market_data || {};
    const communityData = data.community_data || {};
    const developerData = data.developer_data || {};

    // Market data factors
    const marketCap = marketData.market_cap?.usd || 0;
    const volume = marketData.total_volume?.usd || 0;
    const priceChange24h = marketData.price_change_percentage_24h || 0;

    if (marketCap > 1000000000) score -= 20; // Large market cap = lower risk
    else if (marketCap < 1000000) score += 20; // Small market cap = higher risk

    if (volume > 10000000) score -= 15; // High volume = lower risk
    else if (volume < 100000) score += 15; // Low volume = higher risk

    if (Math.abs(priceChange24h) > 50) score += 20; // High volatility = higher risk

    // Community factors
    const twitterFollowers = communityData.twitter_followers || 0;
    const redditSubscribers = communityData.reddit_subscribers || 0;

    if (twitterFollowers > 100000) score -= 10; // Large community = lower risk
    else if (twitterFollowers < 1000) score += 10; // Small community = higher risk

    if (redditSubscribers > 10000) score -= 10; // Active community = lower risk
    else if (redditSubscribers < 100) score += 10; // Inactive community = higher risk

    // Developer activity factors
    const stars = developerData.stars || 0;
    const forks = developerData.forks || 0;
    const commitCount = developerData.commit_count_4_weeks || 0;

    if (stars > 1000) score -= 15; // Well-received project = lower risk
    else if (stars < 10) score += 15; // Poor reception = higher risk

    if (forks > 100) score -= 10; // Active development = lower risk
    else if (forks < 5) score += 10; // Inactive development = higher risk

    if (commitCount > 50) score -= 10; // Active development = lower risk
    else if (commitCount < 5) score += 10; // Inactive development = higher risk

    // Public interest score
    const publicInterest = data.public_interest_score || 0;
    if (publicInterest > 0.8) score -= 10; // High interest = lower risk
    else if (publicInterest < 0.2) score += 10; // Low interest = higher risk

    return Math.max(0, Math.min(100, score));
  }

  private getRiskLevel(score: number): string {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'low';
    return 'very_low';
  }

  private generateTags(data: CoingeckoContractData): string[] {
    const tags: string[] = [];
    const marketData = data.market_data || {};
    const communityData = data.community_data || {};
    const developerData = data.developer_data || {};

    // Market cap tags
    const marketCap = marketData.market_cap?.usd || 0;
    if (marketCap > 1000000000) tags.push('large_cap');
    else if (marketCap > 100000000) tags.push('mid_cap');
    else if (marketCap > 10000000) tags.push('small_cap');
    else tags.push('micro_cap');

    // Volume tags
    const volume = marketData.total_volume?.usd || 0;
    if (volume > 10000000) tags.push('high_volume');
    else if (volume > 1000000) tags.push('medium_volume');
    else tags.push('low_volume');

    // Volatility tags
    const priceChange24h = marketData.price_change_percentage_24h || 0;
    if (Math.abs(priceChange24h) > 50) tags.push('high_volatility');
    else if (Math.abs(priceChange24h) > 20) tags.push('medium_volatility');
    else tags.push('low_volatility');

    // Community tags
    const twitterFollowers = communityData.twitter_followers || 0;
    if (twitterFollowers > 100000) tags.push('large_community');
    else if (twitterFollowers > 10000) tags.push('medium_community');
    else tags.push('small_community');

    // Developer activity tags
    const stars = developerData.stars || 0;
    const commitCount = developerData.commit_count_4_weeks || 0;
    if (stars > 1000 && commitCount > 50) tags.push('active_development');
    else if (stars > 100 || commitCount > 10) tags.push('moderate_development');
    else tags.push('inactive_development');

    // Public interest tags
    const publicInterest = data.public_interest_score || 0;
    if (publicInterest > 0.8) tags.push('high_interest');
    else if (publicInterest > 0.4) tags.push('medium_interest');
    else tags.push('low_interest');

    return tags;
  }

  private generateMockData(address: string, chain: string): any {
    return {
      source: 'coingecko',
      address: address,
      chain: chain,
      riskScore: 50,
      riskLevel: 'medium',
      tags: ['mock_data'],
      rawData: null,
      metadata: {
        name: 'Mock Token',
        symbol: 'MOCK',
        id: 'mock-token',
        image: null,
        lastUpdated: new Date().toISOString(),
        publicInterestScore: 0.5
      },
      marketData: {
        currentPrice: 0,
        marketCap: 0,
        totalVolume: 0,
        priceChange24h: 0,
        priceChange7d: 0,
        priceChange30d: 0,
        marketCapRank: null,
        totalSupply: 0,
        maxSupply: 0,
        circulatingSupply: 0,
        fullyDilutedValuation: 0,
        totalValueLocked: 0,
        fdvToTvlRatio: 0,
        marketCapFdvRatio: 0,
        mcapToTvlRatio: 0,
        high24h: {},
        low24h: {},
        ath: {},
        athDate: {},
        atl: {},
        atlDate: {},
        volume24h: 0,
        volume7d: null,
        volume30d: null,
        tokenAge: null
      },
      communityData: {
        twitterFollowers: 0,
        redditSubscribers: 0,
        telegramUsers: 0
      },
      developerData: {
        forks: 0,
        stars: 0,
        subscribers: 0,
        totalIssues: 0,
        closedIssues: 0,
        pullRequestsMerged: 0,
        contributors: 0,
        codeAdditions: 0,
        codeDeletions: 0,
        commitCount: 0
      }
    };
  }

  private calculateTokenAge(genesisDate: string | null, lastUpdated: string): number | null {
    try {
      // Try genesis date first (most accurate)
      if (genesisDate) {
        const genesis = new Date(genesisDate);
        const now = new Date();
        const ageInDays = Math.floor((now.getTime() - genesis.getTime()) / (1000 * 60 * 60 * 24));
        return ageInDays;
      }
      
      // Fallback to last updated (less accurate but available)
      if (lastUpdated) {
        const lastUpdate = new Date(lastUpdated);
        const now = new Date();
        const ageInDays = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
        return ageInDays;
      }
      
      return null;
    } catch (error) {
      console.warn('Error calculating token age:', error);
      return null;
    }
  }
} 