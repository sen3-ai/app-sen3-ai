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

      // Analyze blockchain data
      if (collectedData.blockchain) {
        const blockchainData = collectedData.blockchain;
        
        if (blockchainData.transactionCount > 1000) {
          score -= 10;
          explanations.push('High transaction volume indicates active and established address');
        } else if (blockchainData.transactionCount < 10) {
          score += 20;
          explanations.push('Low transaction volume suggests new or inactive address');
        }

        if (blockchainData.totalVolume > 1000000) {
          score -= 5;
          explanations.push('High total volume indicates significant financial activity');
        } else if (blockchainData.totalVolume < 10000) {
          score += 10;
          explanations.push('Low total volume suggests limited financial activity');
        }

        const daysSinceFirstSeen = this.calculateDaysSince(blockchainData.firstSeen);
        if (daysSinceFirstSeen > 365) {
          score -= 5;
          explanations.push('Address has been active for over a year');
        } else if (daysSinceFirstSeen < 30) {
          score += 15;
          explanations.push('Address is relatively new (less than 30 days)');
        }
      }

      // Analyze reputation data
      if (collectedData.reputation) {
        const reputationData = collectedData.reputation;
        
        if (reputationData.isBlacklisted) {
          score = 100;
          explanations.push('Address is blacklisted - immediate high risk');
          return { score, explanations };
        }

        if (reputationData.trustScore > 80) {
          score -= 15;
          explanations.push('High trust score from reputation provider');
        } else if (reputationData.trustScore < 20) {
          score += 25;
          explanations.push('Low trust score from reputation provider');
        }

        if (reputationData.riskLevel === 'critical') {
          score += 30;
          explanations.push('Critical risk level identified by reputation provider');
        } else if (reputationData.riskLevel === 'high') {
          score += 20;
          explanations.push('High risk level identified by reputation provider');
        } else if (reputationData.riskLevel === 'low') {
          score -= 10;
          explanations.push('Low risk level identified by reputation provider');
        }

        if (reputationData.reports > 10) {
          score += 15;
          explanations.push(`Address has ${reputationData.reports} negative reports`);
        }

        const feedbackRatio = reputationData.positiveFeedback / (reputationData.positiveFeedback + reputationData.negativeFeedback);
        if (feedbackRatio < 0.3 && reputationData.positiveFeedback + reputationData.negativeFeedback > 10) {
          score += 20;
          explanations.push('Poor community feedback ratio');
        }
      }

      // Analyze social data
      if (collectedData.social) {
        const socialData = collectedData.social;
        
        if (socialData.mentions > 100) {
          score -= 5;
          explanations.push('Significant social media presence indicates established address');
        } else if (socialData.mentions === 0) {
          score += 5;
          explanations.push('No social media presence detected');
        }

        if (socialData.sentiment === 'negative' && socialData.mentions > 10) {
          score += 15;
          explanations.push('Negative social media sentiment detected');
        } else if (socialData.sentiment === 'positive' && socialData.mentions > 10) {
          score -= 5;
          explanations.push('Positive social media sentiment detected');
        }

        if (socialData.influencers > 5) {
          score -= 3;
          explanations.push('Address mentioned by multiple influencers');
        }
      }

      // Analyze on-chain data
      if (collectedData.onchain) {
        const onchainData = collectedData.onchain;
        
        if (onchainData.hasContractInteraction) {
          score += 10;
          explanations.push('Address has interacted with smart contracts');
        }

        if (onchainData.gasUsed > 1000000) {
          score += 5;
          explanations.push('High gas usage indicates complex transactions');
        }

        if (onchainData.contractCount > 10) {
          score += 10;
          explanations.push('High number of contract interactions');
        }

        if (onchainData.suspiciousPatterns.length > 0) {
          score += 15;
          explanations.push(`Suspicious patterns detected: ${onchainData.suspiciousPatterns.join(', ')}`);
        }

        if (onchainData.dappInteractions.length > 5) {
          score -= 3;
          explanations.push('Active DeFi user with multiple dApp interactions');
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

  private calculateDaysSince(dateString: string): number {
    const firstSeen = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - firstSeen.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
} 