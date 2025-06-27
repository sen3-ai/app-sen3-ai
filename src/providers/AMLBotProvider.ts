import fetch from 'node-fetch';
import { BaseProvider } from './Provider';
import { Config } from '../config/Config';
import { CommonData } from './CommonDataTypes';
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
        console.warn('AMLBot credentials not configured');
        return null;
      }

      const timeout = providerConfig?.timeout || 30000;
      const retries = providerConfig?.retries || 2;

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`AMLBot API attempt ${attempt}/${retries} for address ${address} (timeout: ${timeout}ms)`);
          const response = await this.callAMLBotAPI(address, credentials.amlbotTmId, credentials.amlbotAccessKey, timeout);
          
          if (response.result && response.data) {
            return {
              rawData: response.data,
              status: 'success',
              provider: 'amlbot',
              timestamp: new Date().toISOString()
            };
          } else {
            console.warn(`AMLBot API error: ${response.description}`);
            if (attempt === retries) {
              return {
                rawData: null,
                status: 'error',
                error: response.description,
                provider: 'amlbot',
                timestamp: new Date().toISOString()
              };
            }
          }
        } catch (error) {
          console.warn(`AMLBot API attempt ${attempt} failed:`, error);
          if (attempt === retries) {
            return {
              rawData: null,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
              provider: 'amlbot',
              timestamp: new Date().toISOString()
            };
          }
          // Wait before retry (exponential backoff)
          const backoffTime = Math.pow(2, attempt) * 1000;
          console.log(`Waiting ${backoffTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }

      return {
        rawData: null,
        status: 'error',
        error: 'All retry attempts failed',
        provider: 'amlbot',
        timestamp: new Date().toISOString()
      };
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

  extractCommonData(rawData: any): CommonData {
    if (!rawData || !rawData.riskscore) {
      return {};
    }

    return {
      amlbotScore: rawData.riskscore / 100, // Convert to 0-1 scale
      lastUpdated: new Date().toISOString()
    };
  }
} 