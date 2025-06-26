import fetch from 'node-fetch';
import { BaseProvider } from './Provider';
import { Config } from '../config/Config';
import crypto from 'crypto';

interface AMLBotResponse {
  result: boolean;
  description?: string;
  data?: {
    riskscore: number;
    signals: any;
    addressDetailsData: any;
    [key: string]: any;
  };
}

export class AMLBotProvider extends BaseProvider {
  private config = Config.getInstance();
  private readonly baseUrl = 'https://amlbot.silencatech.com/aml/api/ajaxcheck';

  getName(): string {
    return 'amlbot';
  }

  async fetch(address: string): Promise<any> {
    return this.safeFetch(async () => {
      const credentials = this.config.getCredentials();
      const providerConfig = this.config.getProviderConfigs().find(p => p.name === 'amlbot');

      if (!credentials.amlbotTmId || !credentials.amlbotAccessKey) {
        console.warn('AMLBot credentials not configured, using mock data');
        return this.generateMockData(address);
      }

      const timeout = providerConfig?.timeout || 30000;
      const retries = providerConfig?.retries || 2;

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`AMLBot API attempt ${attempt}/${retries} for address ${address} (timeout: ${timeout}ms)`);
          const response = await this.callAMLBotAPI(address, credentials.amlbotTmId, credentials.amlbotAccessKey, timeout);
          
          if (response.result && response.data) {
            if (response.description === 'Request pending') {
              console.log(`AMLBot API: Returning pending status for ${address}`);
              return this.transformPendingResponse(address);
            }
            return this.transformAMLBotResponse(response.data);
          } else {
            console.warn(`AMLBot API error: ${response.description}`);
            if (attempt === retries) {
              return this.generateMockData(address);
            }
          }
        } catch (error) {
          console.warn(`AMLBot API attempt ${attempt} failed:`, error);
          if (attempt === retries) {
            return this.generateMockData(address);
          }
          // Wait before retry (exponential backoff)
          const backoffTime = Math.pow(2, attempt) * 1000;
          console.log(`Waiting ${backoffTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }

      return this.generateMockData(address);
    });
  }

  private async callAMLBotAPI(address: string, tmId: string, accessKey: string, timeout: number): Promise<AMLBotResponse> {
    try {
      // Calculate token as md5(address:accessKey:tmId)
      const tokenString = `${address}:${accessKey}:${tmId}`;
      const token = crypto.createHash('md5').update(tokenString).digest('hex');

      // Prepare form-urlencoded body
      const params = new URLSearchParams();
      params.append('address', address);
      params.append('hash', address);
      params.append('chain', 'ethereum');
      params.append('tmId', tmId);
      params.append('token', token);

      // Use AbortController for better timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString(),
          signal: controller.signal as any // Type assertion to fix compatibility
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Check if response indicates pending status
        if (data.result === false && data.description && data.description.toLowerCase().includes('pending')) {
          console.log(`AMLBot API: Request is pending for address ${address}`);
          return {
            result: true,
            description: 'Request pending',
            data: {
              riskscore: 0.5, // Default pending risk score
              signals: {},
              addressDetailsData: {}
            }
          };
        }
        
        return data as AMLBotResponse;

      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        
        throw fetchError;
      }

    } catch (error) {
      throw error;
    }
  }

  private transformPendingResponse(address: string): any {
    return {
      // Pending status data
      riskScore: 50, // Neutral risk score for pending
      riskLevel: 'medium',
      isBlacklisted: false,
      blacklistReasons: [],
      tags: ['pending_analysis'],
      firstSeen: null,
      lastSeen: null,
      transactionCount: 0,
      totalVolume: 0,
      suspiciousPatterns: [],
      description: `AMLBot analysis is pending for address ${address}. This may take some time to complete.`,
      
      // Legacy/compat fields for processor
      reputationScore: 50,
      trustScore: 50,
      reports: 0,
      positiveFeedback: 50,
      negativeFeedback: 50,
      
      // Provider metadata
      apiKeyConfigured: true,
      providerConfig: {
        timeout: 30000,
        retries: 2
      },
      source: 'amlbot-pending'
    };
  }

  private transformAMLBotResponse(data: AMLBotResponse['data']): any {
    if (!data) {
      return this.generateMockData('unknown');
    }

    const riskScore = data.riskscore || 0;
    const normalizedScore = Math.round(riskScore * 100); // Convert 0-1 to 0-100

    return {
      // Real AMLBot data
      riskScore: normalizedScore,
      riskLevel: this.getRiskLevel(riskScore),
      isBlacklisted: false, // AMLBot doesn't provide this directly
      blacklistReasons: [],
      tags: this.extractTags(data.signals),
      firstSeen: data.addressDetailsData?.first_tx,
      lastSeen: data.addressDetailsData?.last_tx,
      transactionCount: data.addressDetailsData?.n_txs || 0,
      totalVolume: data.addressDetailsData?.balance_usd || 0,
      suspiciousPatterns: this.extractSuspiciousPatterns(data.signals),
      description: this.generateExplanation(data),
      
      // Legacy/compat fields for processor
      reputationScore: 100 - normalizedScore,
      trustScore: 100 - normalizedScore,
      reports: 0,
      positiveFeedback: 100 - normalizedScore,
      negativeFeedback: normalizedScore,
      
      // Provider metadata
      apiKeyConfigured: true,
      providerConfig: {
        timeout: 10000,
        retries: 3
      },
      source: 'amlbot'
    };
  }

  private getRiskLevel(riskScore: number): string {
    if (riskScore < 0.1) return 'low';
    if (riskScore < 0.3) return 'medium';
    if (riskScore < 0.6) return 'high';
    return 'critical';
  }

  private extractTags(signals: any): string[] {
    const tags = [];
    if (signals.exchange > 0.5) tags.push('exchange');
    if (signals.risky_exchange > 0.1) tags.push('risky_exchange');
    if (signals.scam > 0.1) tags.push('scam');
    if (signals.sanctions > 0.1) tags.push('sanctions');
    if (signals.mixer > 0.1) tags.push('mixer');
    if (signals.dark_market > 0.1) tags.push('dark_market');
    return tags;
  }

  private extractSuspiciousPatterns(signals: any): string[] {
    const patterns = [];
    if (signals.exchange > 0.8) patterns.push('High exchange activity');
    if (signals.risky_exchange > 0.2) patterns.push('Risky exchange connections');
    if (signals.scam > 0.1) patterns.push('Scam-related activity');
    if (signals.sanctions > 0.1) patterns.push('Sanctions-related activity');
    if (signals.mixer > 0.1) patterns.push('Mixer/tumbler usage');
    if (signals.dark_market > 0.1) patterns.push('Dark market activity');
    return patterns;
  }

  private generateExplanation(data: any): string {
    const riskScore = data?.riskscore || 0;
    const signals = data?.signals || {};
    
    const riskFactors = [];
    
    if (signals.exchange > 0.5) riskFactors.push('High exchange activity');
    if (signals.risky_exchange > 0.1) riskFactors.push('Risky exchange connections');
    if (signals.scam > 0.1) riskFactors.push('Scam-related activity');
    if (signals.sanctions > 0.1) riskFactors.push('Sanctions-related activity');
    if (signals.mixer > 0.1) riskFactors.push('Mixer/tumbler usage');
    if (signals.dark_market > 0.1) riskFactors.push('Dark market activity');
    
    const balance = data?.addressDetailsData?.balance_usd || 0;
    const txCount = data?.addressDetailsData?.n_txs || 0;
    
    let explanation = `Risk score: ${(riskScore * 100).toFixed(1)}%. `;
    
    if (riskFactors.length > 0) {
      explanation += `Risk factors: ${riskFactors.join(', ')}. `;
    }
    
    explanation += `Balance: $${balance.toFixed(2)}, Transactions: ${txCount}. `;
    
    if (riskScore < 0.1) {
      explanation += 'Address appears to be low risk.';
    } else if (riskScore < 0.3) {
      explanation += 'Address shows moderate risk indicators.';
    } else {
      explanation += 'Address shows significant risk indicators.';
    }
    
    return explanation;
  }

  private generateMockData(address: string): any {
    return {
      riskScore: Math.floor(Math.random() * 50) + 10,
      riskLevel: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
      isBlacklisted: Math.random() < 0.05,
      blacklistReasons: [],
      tags: ['verified', 'active'],
      firstSeen: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      lastSeen: new Date().toISOString(),
      transactionCount: Math.floor(Math.random() * 1000),
      totalVolume: Math.floor(Math.random() * 1000000),
      suspiciousPatterns: [],
      description: `Mock AMLBot data for ${address} - API not configured`,
      
      // Legacy/compat fields
      reputationScore: Math.floor(Math.random() * 100),
      trustScore: Math.floor(Math.random() * 100),
      reports: Math.floor(Math.random() * 10),
      positiveFeedback: Math.floor(Math.random() * 100),
      negativeFeedback: Math.floor(Math.random() * 50),
      
      // Provider metadata
      apiKeyConfigured: false,
      providerConfig: {
        timeout: 10000,
        retries: 3
      },
      source: 'amlbot-mock'
    };
  }
} 