import { BaseProvider } from './Provider';
import { Config } from '../config/Config';

export class SocialProvider extends BaseProvider {
  private config = Config.getInstance();

  getName(): string {
    return 'social';
  }

  async fetch(address: string): Promise<any> {
    return this.safeFetch(async () => {
      const credentials = this.config.getCredentials();
      const providerConfig = this.config.getProviderConfigs().find(p => p.name === 'social');
      
      // Simulate API call with configured timeout
      const timeout = providerConfig?.timeout || 4000;
      await this.simulateApiCall(timeout);

      // Use API key if available
      const apiKey = credentials.socialApiKey;
      
      return {
        socialPresence: this.generateSocialPresence(),
        followers: this.generateFollowers(),
        mentions: this.generateMentions(),
        sentiment: this.generateSentiment(),
        verifiedAccounts: this.generateVerifiedAccounts(),
        apiKeyConfigured: !!apiKey,
        providerConfig: {
          timeout,
          retries: providerConfig?.retries || 2
        },
        // Legacy/compat fields for processor/tests
        influencers: Math.floor(Math.random() * 10),
        // Required fields for tests
        riskScore: this.generateRiskScore(),
        source: 'social'
      };
    });
  }

  private async simulateApiCall(timeout: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, Math.random() * timeout * 0.5 + timeout * 0.1));
  }

  private generateSocialPresence(): boolean {
    return Math.random() < 0.3; // 30% chance of having social presence
  }

  private generateFollowers(): number {
    if (!this.generateSocialPresence()) return 0;
    return Math.floor(Math.random() * 10000);
  }

  private generateMentions(): number {
    if (!this.generateSocialPresence()) return 0;
    return Math.floor(Math.random() * 500);
  }

  private generateSentiment(): string {
    const sentiments = ['positive', 'neutral', 'negative'];
    return sentiments[Math.floor(Math.random() * sentiments.length)];
  }

  private generateVerifiedAccounts(): string[] {
    const platforms = ['twitter', 'telegram', 'discord', 'github'];
    const verified = [];
    
    if (this.generateSocialPresence()) {
      const count = Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        verified.push(platforms[Math.floor(Math.random() * platforms.length)]);
      }
    }
    
    return verified;
  }

  private generateRiskScore(): number {
    return Math.random() * 100; // Random risk score between 0 and 100
  }
} 