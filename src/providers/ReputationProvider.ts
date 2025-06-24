import { BaseProvider } from './Provider';

export interface ReputationData {
  trustScore: number;
  isBlacklisted: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reports: number;
  positiveFeedback: number;
  negativeFeedback: number;
}

export class ReputationProvider extends BaseProvider {
  getName(): string {
    return 'reputation';
  }

  async fetch(address: string): Promise<ReputationData | null> {
    return this.safeFetch(async () => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 800 + 300));
      
      // Simulate different reputation based on address
      const isTrusted = address.includes('abc') || address.endsWith('A');
      const isSuspicious = address.includes('def') || address.includes('xyz');
      const isNew = address.includes('123') || address.length < 40;
      
      if (isTrusted) {
        return {
          trustScore: 95,
          isBlacklisted: false,
          riskLevel: 'low',
          reports: 0,
          positiveFeedback: 150,
          negativeFeedback: 2
        };
      } else if (isSuspicious) {
        return {
          trustScore: 15,
          isBlacklisted: false,
          riskLevel: 'high',
          reports: 25,
          positiveFeedback: 5,
          negativeFeedback: 45
        };
      } else if (isNew) {
        return {
          trustScore: 30,
          isBlacklisted: false,
          riskLevel: 'medium',
          reports: 0,
          positiveFeedback: 0,
          negativeFeedback: 0
        };
      } else {
        // Simulate occasional blacklisted addresses
        const isBlacklisted = Math.random() < 0.05; // 5% chance
        return {
          trustScore: isBlacklisted ? 0 : 65,
          isBlacklisted,
          riskLevel: isBlacklisted ? 'critical' : 'medium',
          reports: isBlacklisted ? 100 : 3,
          positiveFeedback: isBlacklisted ? 0 : 25,
          negativeFeedback: isBlacklisted ? 150 : 8
        };
      }
    });
  }
} 