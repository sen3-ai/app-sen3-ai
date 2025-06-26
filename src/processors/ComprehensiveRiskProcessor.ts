import { BaseResponseProcessor, ProcessorResult } from './ResponseProcessor';
import { CollectedData } from '../providers/DataCollector';

export class ComprehensiveRiskProcessor extends BaseResponseProcessor {
  getName(): string {
    return 'comprehensive';
  }

  async process(address: string, addressType: string, collectedData: CollectedData): Promise<ProcessorResult> {
    try {
      let score = 50; // Base score
      const explanations: string[] = [];

      // Analyze AMLBot data
      if (collectedData.amlbot && collectedData.amlbot.status === 'success' && collectedData.amlbot.rawData) {
        const amlData = collectedData.amlbot.rawData;
        
        if (amlData.riskscore !== undefined) {
          const riskScore = Math.round(amlData.riskscore * 100);
          score = riskScore; // Use AMLBot's risk score directly
          explanations.push(`AMLBot risk score: ${riskScore}%`);
        }

        if (amlData.addressDetailsData) {
          const txCount = amlData.addressDetailsData.n_txs || 0;
          if (txCount > 1000) {
            explanations.push('High transaction volume indicates active address');
          } else if (txCount < 10) {
            explanations.push('Low transaction volume suggests new address');
          }
        }

        if (amlData.signals) {
          const signals = amlData.signals;
          if (signals.scam > 0.1) {
            score += 20;
            explanations.push('Scam-related activity detected');
          }
          if (signals.sanctions > 0.1) {
            score += 30;
            explanations.push('Sanctions-related activity detected');
          }
          if (signals.mixer > 0.1) {
            score += 15;
            explanations.push('Mixer/tumbler usage detected');
          }
        }
      }

      // Analyze Coingecko data
      if (collectedData.coingecko && collectedData.coingecko.status === 'success' && collectedData.coingecko.rawData) {
        const cgData = collectedData.coingecko.rawData;
        
        if (cgData.market_data) {
          const marketCap = cgData.market_data.market_cap?.usd || 0;
          const volume = cgData.market_data.total_volume?.usd || 0;
          const priceChange = cgData.market_data.price_change_percentage_24h || 0;

          if (marketCap > 1000000000) {
            score -= 10;
            explanations.push('Large market cap indicates established token');
          } else if (marketCap < 1000000) {
            score += 10;
            explanations.push('Small market cap suggests higher risk');
          }

          if (volume > 10000000) {
            score -= 5;
            explanations.push('High trading volume indicates active market');
          } else if (volume < 100000) {
            score += 10;
            explanations.push('Low trading volume suggests limited interest');
          }

          if (Math.abs(priceChange) > 50) {
            score += 15;
            explanations.push('High price volatility indicates risk');
          }
        }

        if (cgData.community_data) {
          const twitterFollowers = cgData.community_data.twitter_followers || 0;
          if (twitterFollowers > 100000) {
            score -= 5;
            explanations.push('Large social media following indicates established project');
          }
        }
      }

      // Analyze DexScreener data
      if (collectedData.dexscreener && collectedData.dexscreener.status === 'success' && collectedData.dexscreener.rawData) {
        const dexData = collectedData.dexscreener.rawData;
        
        if (dexData.length > 0) {
          // Get the most liquid pair
          const bestPair = dexData.reduce((best: any, current: any) => {
            return (current.liquidity?.usd || 0) > (best.liquidity?.usd || 0) ? current : best;
          });

          const liquidityUsd = bestPair.liquidity?.usd || 0;
          const volume24h = bestPair.volume?.h24 || 0;
          const priceChange24h = bestPair.priceChange?.h24 || 0;
          const txns24h = (bestPair.txns?.h24?.buys || 0) + (bestPair.txns?.h24?.sells || 0);

          if (liquidityUsd < 10000) {
            score += 20;
            explanations.push('Very low liquidity indicates high risk');
          } else if (liquidityUsd > 1000000) {
            score -= 10;
            explanations.push('High liquidity suggests good market depth');
          }

          if (volume24h < 1000) {
            score += 15;
            explanations.push('Very low trading volume suggests limited interest');
          } else if (volume24h > 1000000) {
            score -= 5;
            explanations.push('High trading volume indicates active market');
          }

          if (txns24h < 10) {
            score += 10;
            explanations.push('Very few transactions suggests low activity');
          }

          if (Math.abs(priceChange24h) > 50) {
            score += 15;
            explanations.push('Extreme price volatility indicates high risk');
          }
        }
      }

      // Address type specific adjustments
      if (addressType === 'evm') {
        if (address.startsWith('0xabc')) {
          score -= 10;
          explanations.push('EVM address with trusted prefix pattern');
        }
      } else if (addressType === 'solana') {
        if (address.endsWith('A')) {
          score -= 10;
          explanations.push('Solana address with trusted suffix pattern');
        }
      }

      // Ensure score is within bounds
      score = Math.max(0, Math.min(100, score));

      return { score, explanations };
    } catch (error) {
      console.warn(`ComprehensiveRiskProcessor failed to process data:`, error);
      throw error;
    }
  }
} 