export interface Provider {
  fetch(source: string): Promise<any>;
  getName(): string;
}

export abstract class BaseProvider implements Provider {
  abstract fetch(source: string): Promise<any>;
  abstract getName(): string;
  
  protected async safeFetch<T>(fetchFn: () => Promise<T>): Promise<T | null> {
    try {
      return await fetchFn();
    } catch (error) {
      console.warn(`Provider ${this.getName()} failed to fetch data:`, error);
      return null;
    }
  }
} 