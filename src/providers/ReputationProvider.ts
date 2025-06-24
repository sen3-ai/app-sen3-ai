import { BaseProvider } from './Provider';
import { Config } from '../config/Config';

export class ReputationProvider extends BaseProvider {
  private config = Config.getInstance();

  getName(): string {
    return 'reputation';
  }

  async fetch(address: string): Promise<any> {
    return this.safeFetch(async () => {
      const credentials = this.config.getCredentials();
      const providerConfig = this.config.getProviderConfigs().find(p => p.name === 'reputation');
      
      // Simulate API call with configured timeout
      const timeout = providerConfig?.timeout || 3000;
      await this.simulateApiCall(timeout);

      // Use API key if available
      const apiKey = credentials.reputationApiKey;
      
      return {
        reputationScore: this.generateReputationScore(),
        riskLevel: this.generateRiskLevel(),
        flaggedIncidents: this.generateFlaggedIncidents(),
        trustScore: this.generateTrustScore(),
        blacklistStatus: this.generateBlacklistStatus(),
        apiKeyConfigured: !!apiKey,
        providerConfig: {
          timeout,
          retries: providerConfig?.retries || 2
        },
        // Legacy/compat fields for processor/tests
        isBlacklisted: this.generateBlacklistStatus(),
        reports: Math.floor(Math.random() * 20),
        positiveFeedback: Math.floor(Math.random() * 100),
        negativeFeedback: Math.floor(Math.random() * 100)
      };
    });
  }

  private async simulateApiCall(timeout: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, Math.random() * timeout * 0.5 + timeout * 0.1));
  }

  private generateReputationScore(): number {
    return Math.floor(Math.random() * 100);
  }

  private generateRiskLevel(): string {
    const levels = ['low', 'medium', 'high', 'critical'];
    return levels[Math.floor(Math.random() * levels.length)];
  }

  private generateFlaggedIncidents(): number {
    return Math.floor(Math.random() * 10);
  }

  private generateTrustScore(): number {
    return Math.floor(Math.random() * 100);
  }

  private generateBlacklistStatus(): boolean {
    return Math.random() < 0.1; // 10% chance of being blacklisted
  }
} 