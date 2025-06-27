// Common data types that can be extracted from different providers
export interface CommonData {
  // Market data
  price?: number; // Current price in USD
  priceChange24h?: number; // 24h price change percentage
  volume24h?: number; // 24h trading volume in USD
  marketCap?: number; // Market capitalization in USD
  fullyDilutedValuation?: number; // FDV in USD
  
  // Trading activity
  txCount24h?: number; // Number of transactions in last 24h
  buyTxCount24h?: number; // Number of buy transactions in last 24h
  sellTxCount24h?: number; // Number of sell transactions in last 24h
  
  // Liquidity
  liquidity?: number; // Total liquidity in USD
  liquidityChange24h?: number; // 24h liquidity change percentage
  
  // Holders and distribution
  holdersCount?: number; // Total number of holders
  topHoldersPercentage?: number; // Percentage held by top holders
  top3HoldersPercentage?: number; // Percentage held by top 3 holders
  top5HoldersPercentage?: number; // Percentage held by top 5 holders
  top10HoldersPercentage?: number; // Percentage held by top 10 holders
  totalSupply?: number; // Total token supply
  clusters?: any[]; // Detected clusters
  
  // Social and community
  twitterFollowers?: number; // Twitter followers count
  twitterMentions7d?: number; // Twitter mentions in last 7 days
  engagementRatio?: number; // Social engagement ratio
  
  // Risk indicators
  amlbotScore?: number; // AMLBot risk score (0-1)
  decentralizationScore?: number; // Decentralization score (0-100)
  
  // Metadata
  tokenAge?: number; // Token age in days
  contractAddress?: string; // Contract address
  chain?: string; // Blockchain chain
  lastUpdated?: string; // ISO timestamp of last update
}

// Provider-specific data extraction interface
export interface DataExtractor {
  extractCommonData(rawData: any): CommonData;
} 