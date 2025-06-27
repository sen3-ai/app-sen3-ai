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

  async collectData(source: string, chain: string): Promise<CollectedData> {
    const providers = this.getProviders();
    const collectedData: CollectedData = {};

    for (const provider of providers) {
      try {
        let result;
        result = await provider.fetch(source, chain);

        if (result && result.status === 'success') {
          try {
            const commonData = provider.extractCommonData(result.rawData);
            collectedData[provider.getName()] = {
              status: 'success',
              rawData: result.rawData,
              commonData: commonData,
              timestamp: result.timestamp
            };
          } catch (extractionError) {
            console.warn(`Failed to extract common data from ${provider.getName()}:`, extractionError);
            collectedData[provider.getName()] = {
              status: 'error',
              error: extractionError instanceof Error ? extractionError.message : 'Data extraction failed',
              timestamp: result.timestamp
            };
          }
        } else {
          collectedData[provider.getName()] = {
            status: result?.status || 'error',
            error: result?.error || 'Unknown error',
            timestamp: result?.timestamp || new Date().toISOString()
          };
        }
      } catch (error) {
        console.warn(`Provider ${provider.getName()} threw an error:`, error);
        collectedData[provider.getName()] = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        };
      }
    }

    return collectedData;
  }
} 