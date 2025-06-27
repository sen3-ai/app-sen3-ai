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

      // Use the provided chain or default to ethereum
      const targetChain = chain ? this.chainMap[chain] || chain : 'ether';
      const url = `https://public-api.dextools.io/trial/v2/token/${targetChain}/${address}`;
      
      console.log(`DexToolsProvider.fetch called with address: ${address}, chain: ${chain}`);
      console.log(`DexToolsProvider using targetChain: ${targetChain}`);
      console.log(`DexTools API URL: ${url}`);

      // Add 1-second delay to avoid rate limiting
      console.log('DexToolsProvider - Adding 1-second delay to avoid rate limiting...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`DexTools API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('DexToolsProvider - Raw response:', JSON.stringify(data, null, 2));
      
      return {
        rawData: data,
        status: 'success',
        provider: 'dextools',
        timestamp: new Date().toISOString()
      };
    });
  }

  extractCommonData(rawData: any): CommonData {
    if (!rawData) {
      return {};
    }

    // For now, return the raw data structure to see what we get
    console.log('DexToolsProvider.extractCommonData - rawData structure:', Object.keys(rawData));
    
    return {
      lastUpdated: new Date().toISOString()
    };
  }
} 