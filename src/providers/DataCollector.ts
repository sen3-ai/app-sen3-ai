import { Provider } from './Provider';

export interface CollectedData {
  [providerName: string]: any;
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

  async collectData(source: string): Promise<CollectedData> {
    const results: CollectedData = {};
    const errors: string[] = [];

    // Execute all providers concurrently
    const providerPromises = this.providers.map(async (provider) => {
      try {
        const data = await provider.fetch(source);
        if (data !== null) {
          results[provider.getName()] = data;
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

    // Add errors to results if any occurred
    if (errors.length > 0) {
      results.errors = errors;
    }

    return results;
  }
} 