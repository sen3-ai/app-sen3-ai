import { Provider } from './Provider';
import { CommonData } from './CommonDataTypes';

export interface CollectedData {
  [providerName: string]: any;
  commonData?: { [providerName: string]: CommonData };
  errors?: string[];
}

export class DataCollector {
  private providers: Provider[] = [];

  addProvider(provider: Provider): void {
    this.providers.push(provider);
  }

  removeProvider(providerName: string): void {
    this.providers = this.providers.filter(p => p.getName() !== providerName);
  }

  getProviders(): Provider[] {
    return [...this.providers];
  }

  async collectData(source: string, chain?: string): Promise<CollectedData> {
    const results: CollectedData = {};
    const commonData: { [providerName: string]: CommonData } = {};
    const errors: string[] = [];

    console.log(`DataCollector.collectData called with source: "${source}", chain: "${chain}"`);

    // Execute all providers concurrently
    const providerPromises = this.providers.map(async (provider) => {
      try {
        let data;
        
        // Pass chain parameter to all providers that support it
        if (chain) {
          console.log(`Calling provider ${provider.getName()} with source: "${source}", chain: "${chain}"`);
          data = await (provider as any).fetch(source, chain);
        } else {
          console.log(`Calling provider ${provider.getName()} with source: "${source}" (no chain)`);
          data = await provider.fetch(source);
        }
          
        if (data !== null) {
          results[provider.getName()] = data;
          
          // Extract common data if the provider returned successful data
          if (data.status === 'success' && data.rawData) {
            try {
              const extractedCommonData = provider.extractCommonData(data.rawData);
              if (Object.keys(extractedCommonData).length > 0) {
                commonData[provider.getName()] = extractedCommonData;
              }
            } catch (extractionError) {
              console.warn(`Failed to extract common data from ${provider.getName()}:`, extractionError);
            }
          }
        } else {
          errors.push(`${provider.getName()}: Failed to fetch data`);
        }
      } catch (error) {
        const errorMessage = `${provider.getName()}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
        console.warn(`Provider ${provider.getName()} threw an error:`, error);
      }
    });

    // Wait for all providers to complete
    await Promise.allSettled(providerPromises);

    // Add common data to results if any was extracted
    if (Object.keys(commonData).length > 0) {
      results.commonData = commonData;
    }

    // Add errors to results if any occurred
    if (errors.length > 0) {
      results.errors = errors;
    }

    return results;
  }
} 