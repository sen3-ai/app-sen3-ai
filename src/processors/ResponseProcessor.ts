import { CollectedData } from '../providers/DataCollector';

export interface RiskAssessment {
  score: number; // 0-100
  explanations: string[]; // List of reasons for the score
  confidence: number; // 0-1 confidence in the assessment
  processorName: string; // Name of the processor that made this assessment
}

export interface ProcessorResult {
  score: number; // 0-100
  explanations: string[]; // List of reasons for the score
}

export abstract class BaseResponseProcessor {
  abstract getName(): string;
  abstract process(address: string, addressType: string, collectedData: CollectedData): Promise<ProcessorResult>;
  
  protected async safeProcess<T>(processFn: () => Promise<T>): Promise<T | null> {
    try {
      return await processFn();
    } catch (error) {
      console.warn(`Processor ${this.getName()} failed to process data:`, error);
      return null;
    }
  }

  async assessRisk(address: string, addressType: string, collectedData: CollectedData): Promise<RiskAssessment | null> {
    const result = await this.process(address, addressType, collectedData);
    
    if (!result) {
      return null;
    }

    // Calculate confidence based on data availability
    const providerCount = Object.keys(collectedData).filter(key => key !== 'errors').length;
    const errorCount = collectedData.errors?.length || 0;
    const confidence = providerCount > 0 ? Math.max(0.1, 1 - (errorCount / providerCount)) : 0.1;

    return {
      score: Math.max(0, Math.min(100, result.score)),
      explanations: result.explanations,
      confidence,
      processorName: this.getName()
    };
  }
} 