"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessorManager = void 0;
class ProcessorManager {
    constructor() {
        this.processors = [];
    }
    addProcessor(processor) {
        this.processors.push(processor);
    }
    removeProcessor(processorName) {
        this.processors = this.processors.filter(p => p.getName() !== processorName);
    }
    getProcessors() {
        return [...this.processors];
    }
    processData(address, addressType, collectedData) {
        return __awaiter(this, void 0, void 0, function* () {
            // Run all processors concurrently
            const processorPromises = this.processors.map((processor) => __awaiter(this, void 0, void 0, function* () {
                try {
                    return yield processor.assessRisk(address, addressType, collectedData);
                }
                catch (error) {
                    console.warn(`Processor ${processor.getName()} failed:`, error);
                    return null;
                }
            }));
            const results = yield Promise.allSettled(processorPromises);
            const validAssessments = [];
            // Collect valid results
            results.forEach((result, index) => {
                var _a;
                if (result.status === 'fulfilled' && result.value) {
                    validAssessments.push(result.value);
                }
                else {
                    console.warn(`Processor ${(_a = this.processors[index]) === null || _a === void 0 ? void 0 : _a.getName()} failed or returned null`);
                }
            });
            if (validAssessments.length === 0) {
                // Fallback assessment if no processors succeeded
                return {
                    finalScore: 50,
                    explanations: ['No risk assessment processors available'],
                    confidence: 0.1,
                    processorAssessments: [],
                    processorCount: 0
                };
            }
            // Merge assessments
            return this.mergeAssessments(validAssessments);
        });
    }
    mergeAssessments(assessments) {
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
        const allExplanations = [];
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
        // Remove duplicate explanations
        const uniqueExplanations = [...new Set(allExplanations)];
        return {
            finalScore: Math.round(finalScore),
            explanations: uniqueExplanations,
            confidence: Math.min(1, averageConfidence * 1.2), // Slight boost for multiple processors
            processorAssessments: assessments,
            processorCount: assessments.length
        };
    }
}
exports.ProcessorManager = ProcessorManager;
