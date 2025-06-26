import { BaseResponseProcessor, ProcessorResult, RiskExplanation } from './ResponseProcessor';
import { CollectedData } from '../providers/DataCollector';

export class ComprehensiveRiskProcessor extends BaseResponseProcessor {
  getName(): string {
    return 'comprehensive';
  }

  async process(address: string, addressType: string, collectedData: CollectedData): Promise<ProcessorResult> {
    try {
      let score = 50; // Base score
      const explanations: RiskExplanation[] = [];

      // Analyze AMLBot data
      if (collectedData.amlbot && collectedData.amlbot.status === 'success' && collectedData.amlbot.rawData) {
        const amlData = collectedData.amlbot.rawData;
        
        if (amlData.riskscore !== undefined) {
          const riskScore = Math.round(amlData.riskscore * 100);
          score = riskScore; // Use AMLBot's risk score directly
          explanations.push({
            text: `AMLBot risk score: ${riskScore}%`,
            type: riskScore > 70 ? 'increase' : riskScore < 30 ? 'decrease' : 'neutral'
          });
        }

        if (amlData.addressDetailsData) {
          const txCount = amlData.addressDetailsData.n_txs || 0;
          if (txCount > 1000) {
            explanations.push({
              text: 'High transaction volume indicates active address',
              type: 'decrease'
            });
          } else if (txCount < 10) {
            explanations.push({
              text: 'Low transaction volume suggests new address',
              type: 'increase'
            });
          }
        }

        if (amlData.signals) {
          const signals = amlData.signals;
          if (signals.scam > 0.1) {
            score += 20;
            explanations.push({
              text: 'Scam-related activity detected',
              type: 'increase'
            });
          }
          if (signals.sanctions > 0.1) {
            score += 30;
            explanations.push({
              text: 'Sanctions-related activity detected',
              type: 'increase'
            });
          }
          if (signals.mixer > 0.1) {
            score += 15;
            explanations.push({
              text: 'Mixer/tumbler usage detected',
              type: 'increase'
            });
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
            explanations.push({
              text: 'Large market cap indicates established token',
              type: 'decrease'
            });
          } else if (marketCap < 1000000) {
            score += 10;
            explanations.push({
              text: 'Small market cap suggests higher risk',
              type: 'increase'
            });
          }

          if (volume > 10000000) {
            score -= 5;
            explanations.push({
              text: 'High trading volume indicates active market',
              type: 'decrease'
            });
          } else if (volume < 100000) {
            score += 10;
            explanations.push({
              text: 'Low trading volume suggests limited interest',
              type: 'increase'
            });
          }

          if (Math.abs(priceChange) > 50) {
            score += 15;
            explanations.push({
              text: 'High price volatility indicates risk',
              type: 'increase'
            });
          }
        }

        if (cgData.community_data) {
          const twitterFollowers = cgData.community_data.twitter_followers || 0;
          if (twitterFollowers > 100000) {
            score -= 5;
            explanations.push({
              text: 'Large social media following indicates established project',
              type: 'decrease'
            });
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
            explanations.push({
              text: 'Very low liquidity indicates high risk',
              type: 'increase'
            });
          } else if (liquidityUsd > 1000000) {
            score -= 10;
            explanations.push({
              text: 'High liquidity suggests good market depth',
              type: 'decrease'
            });
          }

          if (volume24h < 1000) {
            score += 15;
            explanations.push({
              text: 'Very low trading volume suggests limited interest',
              type: 'increase'
            });
          } else if (volume24h > 1000000) {
            score -= 5;
            explanations.push({
              text: 'High trading volume indicates active market',
              type: 'decrease'
            });
          }

          if (txns24h < 10) {
            score += 10;
            explanations.push({
              text: 'Very few transactions suggests low activity',
              type: 'increase'
            });
          }

          if (Math.abs(priceChange24h) > 50) {
            score += 15;
            explanations.push({
              text: 'Extreme price volatility indicates high risk',
              type: 'increase'
            });
          }
        }
      }

      // Analyze Bubblemap data
      if (collectedData.bubblemap && collectedData.bubblemap.status === 'success' && collectedData.bubblemap.rawData) {
        const bubblemapData = collectedData.bubblemap.rawData;
        
        const decentralizationScore = bubblemapData.decentralization_score || 0;
        const clusters = bubblemapData.clusters || [];
        const identifiedSupply = bubblemapData.metadata?.identified_supply;

        // Risk assessment based on decentralization score
        if (decentralizationScore < 30) {
          score += 25;
          explanations.push({
            text: `Very low decentralization score (${decentralizationScore.toFixed(1)}) indicates high concentration risk`,
            type: 'increase'
          });
        } else if (decentralizationScore < 50) {
          score += 15;
          explanations.push({
            text: `Low decentralization score (${decentralizationScore.toFixed(1)}) suggests concentration risk`,
            type: 'increase'
          });
        } else if (decentralizationScore > 80) {
          score -= 10;
          explanations.push({
            text: `High decentralization score (${decentralizationScore.toFixed(1)}) indicates good distribution`,
            type: 'decrease'
          });
        }

        // Risk assessment based on cluster analysis
        if (clusters.length > 0) {
          const largestCluster = clusters.reduce((max: any, cluster: any) => 
            cluster.share > max.share ? cluster : max, clusters[0]);
          
          if (largestCluster.share > 0.5) {
            score += 30;
            explanations.push({
              text: `Large concentration detected: ${(largestCluster.share * 100).toFixed(1)}% in single cluster`,
              type: 'increase'
            });
          } else if (largestCluster.share > 0.2) {
            score += 15;
            explanations.push({
              text: `Moderate concentration: ${(largestCluster.share * 100).toFixed(1)}% in largest cluster`,
              type: 'increase'
            });
          } else if (largestCluster.share < 0.05) {
            score -= 5;
            explanations.push({
              text: `Good distribution: largest cluster only ${(largestCluster.share * 100).toFixed(1)}%`,
              type: 'decrease'
            });
          }

          // Check for whale clusters
          const whaleClusters = clusters.filter((cluster: any) => cluster.share > 0.1);
          if (whaleClusters.length > 3) {
            score += 10;
            explanations.push({
              text: `${whaleClusters.length} large holder clusters detected`,
              type: 'increase'
            });
          }
        }

        // Risk assessment based on identified supply distribution
        if (identifiedSupply) {
          const cexShare = identifiedSupply.share_in_cexs || 0;
          const dexShare = identifiedSupply.share_in_dexs || 0;
          const otherContractsShare = identifiedSupply.share_in_other_contracts || 0;

          if (cexShare > 0.8) {
            score += 15;
            explanations.push({
              text: `High CEX concentration (${(cexShare * 100).toFixed(1)}%) indicates exchange risk`,
              type: 'increase'
            });
          } else if (cexShare < 0.2) {
            score -= 5;
            explanations.push({
              text: `Low CEX concentration (${(cexShare * 100).toFixed(1)}%) suggests good distribution`,
              type: 'decrease'
            });
          }

          if (otherContractsShare > 0.8) {
            score += 20;
            explanations.push({
              text: `High contract concentration (${(otherContractsShare * 100).toFixed(1)}%) indicates smart contract risk`,
              type: 'increase'
            });
          }

          if (dexShare < 0.1) {
            score += 10;
            explanations.push({
              text: `Very low DEX presence (${(dexShare * 100).toFixed(1)}%) suggests limited trading`,
              type: 'increase'
            });
          }
        }

        // Add decentralization score to explanations
        explanations.push({
          text: `Decentralization score: ${decentralizationScore.toFixed(1)}/100`,
          type: 'neutral'
        });
      }

      // Address type specific adjustments
      if (addressType === 'evm') {
        if (address.startsWith('0xabc')) {
          score -= 10;
          explanations.push({
            text: 'EVM address with trusted prefix pattern',
            type: 'decrease'
          });
        }
      } else if (addressType === 'solana') {
        if (address.endsWith('A')) {
          score -= 10;
          explanations.push({
            text: 'Solana address with trusted suffix pattern',
            type: 'decrease'
          });
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