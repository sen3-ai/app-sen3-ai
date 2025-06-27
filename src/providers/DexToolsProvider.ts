import { BaseProvider } from './Provider';
import { CommonData } from './CommonDataTypes';
import { Config } from '../config/Config';

export class DexToolsProvider extends BaseProvider {
  private config = Config.getInstance();
  private chainMap: { [key: string]: string } = {
    ethereum: 'ether',
    bsc: 'bsc',
    base: 'base',
    solana: 'solana',
    polygon: 'polygon',
    optimism: 'optimism'
  };

  getName(): string {
    return 'dextools';
  }

  async fetch(address: string, chain?: string): Promise<any> {
    return this.safeFetch(async () => {
      const apiKey = this.config.getCredentials().dextoolsApiKey;
      
      if (!apiKey) {
        console.warn('DexTools API key not configured');
        return {
          rawData: null,
          status: 'error',
          error: 'DexTools API key not configured',
          provider: 'dextools',
          timestamp: new Date().toISOString()
        };
      }

      const targetChain = this.chainMap[chain || 'ethereum'] || 'ether';
      const url = `https://public-api.dextools.io/trial/v2/token/${targetChain}/${address}`;

      // Add 1-second delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': apiKey
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`DexTools API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
          rawData: data,
          status: 'success',
          provider: 'dextools',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    });
  }

  extractCommonData(rawData: any): CommonData {
    if (!rawData || !rawData.data) {
      return {};
    }

    const data = rawData.data;
    return {
      name: data.name || '',
      symbol: data.symbol || '',
      address: data.address || '',
      decimals: data.decimals || 18,
      logo: data.logo || '',
      description: data.description || '',
      creationTime: data.creationTime || '',
      creationBlock: data.creationBlock || 0,
      socialInfo: data.socialInfo || {}
    };
  }
} 