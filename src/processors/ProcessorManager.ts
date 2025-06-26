import { BaseResponseProcessor, RiskAssessment, RiskExplanation } from './ResponseProcessor';
import { CollectedData } from '../providers/DataCollector';

export interface MergedRiskAssessment {
  finalScore: number; // 0-100
  explanations: RiskExplanation[]; // Combined explanations from all processors
  confidence: number; // 0-1 overall confidence
  processorAssessments: RiskAssessment[]; // Individual processor results
  processorCount: number; // Number of processors that contributed
}

export class ProcessorManager {
  private processors: BaseResponseProcessor[] = [];

  addProcessor(processor: BaseResponseProcessor): void {
    this.processors.push(processor);
  }

  removeProcessor(processorName: string): void {
    this.processors = this.processors.filter(p => p.getName() !== processorName);
  }

  getProcessors(): BaseResponseProcessor[] {
    return [...this.processors];
  }

  async processData(address: string, addressType: string, collectedData: CollectedData): Promise<MergedRiskAssessment> {
    // Run all processors concurrently
    const processorPromises = this.processors.map(async (processor) => {
      try {
        return await processor.assessRisk(address, addressType, collectedData);
      } catch (error) {
        console.warn(`Processor ${processor.getName()} failed:`, error);
        return null;
      }
    });

    const results = await Promise.allSettled(processorPromises);
    const validAssessments: RiskAssessment[] = [];

    // Collect valid results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        validAssessments.push(result.value);
      } else {
        console.warn(`Processor ${this.processors[index]?.getName()} failed or returned null`);
      }
    });

    if (validAssessments.length === 0) {
      // Fallback assessment if no processors succeeded
      return {
        finalScore: 50,
        explanations: [{ text: 'No risk assessment processors available', type: 'neutral' }],
        confidence: 0.1,
        processorAssessments: [],
        processorCount: 0
      };
    }

    // Merge assessments
    return this.mergeAssessments(validAssessments);
  }

  private mergeAssessments(assessments: RiskAssessment[]): MergedRiskAssessment {
    if (assessments.length === 1) {
      const assessment = assessments[0];
      return {
        finalScore: assessment.score,
        explanations: assessment.explanations,
        confidence: assessment.confidence,
        processorAssessments: assessments,
        processorCount: 1
      };
    }

    // Weighted average based on confidence
    let totalWeightedScore = 0;
    let totalWeight = 0;
    const allExplanations: RiskExplanation[] = [];
    let totalConfidence = 0;

    assessments.forEach(assessment => {
      const weight = assessment.confidence;
      totalWeightedScore += assessment.score * weight;
      totalWeight += weight;
      totalConfidence += assessment.confidence;
      allExplanations.push(...assessment.explanations);
    });

    const finalScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 50;
    const averageConfidence = totalConfidence / assessments.length;

    // Remove duplicate explanations based on text content
    const uniqueExplanations = allExplanations.filter((explanation, index, self) => 
      index === self.findIndex(e => e.text === explanation.text)
    );

    return {
      finalScore: Math.round(finalScore),
      explanations: uniqueExplanations,
      confidence: Math.min(1, averageConfidence * 1.2), // Slight boost for multiple processors
      processorAssessments: assessments,
      processorCount: assessments.length
    };
  }
} 