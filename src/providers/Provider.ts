import { CommonData } from './CommonDataTypes';

export interface Provider {
  fetch(source: string, chain?: string): Promise<any>;
  getName(): string;
  extractCommonData(rawData: any): CommonData;
}

export abstract class BaseProvider implements Provider {
  abstract fetch(source: string, chain?: string): Promise<any>;
  abstract getName(): string;
  
  extractCommonData(rawData: any): CommonData {
    // Default implementation - returns empty object
    // Override in specific providers to extract meaningful data
    return {};
  }
  
  protected async safeFetch<T>(fetchFn: () => Promise<T>): Promise<T | null> {
    try {
      return await fetchFn();
    } catch (error) {
      console.warn(`Provider ${this.getName()} failed to fetch data:`, error);
      return null;
    }
  }
} 