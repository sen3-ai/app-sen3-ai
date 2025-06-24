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
exports.BaseResponseProcessor = void 0;
class BaseResponseProcessor {
    safeProcess(processFn) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield processFn();
            }
            catch (error) {
                console.warn(`Processor ${this.getName()} failed to process data:`, error);
                return null;
            }
        });
    }
    assessRisk(address, addressType, collectedData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const result = yield this.process(address, addressType, collectedData);
            if (!result) {
                return null;
            }
            // Calculate confidence based on data availability
            const providerCount = Object.keys(collectedData).filter(key => key !== 'errors').length;
            const errorCount = ((_a = collectedData.errors) === null || _a === void 0 ? void 0 : _a.length) || 0;
            const confidence = providerCount > 0 ? Math.max(0.1, 1 - (errorCount / providerCount)) : 0.1;
            return {
                score: Math.max(0, Math.min(100, result.score)),
                explanations: result.explanations,
                confidence,
                processorName: this.getName()
            };
        });
    }
}
exports.BaseResponseProcessor = BaseResponseProcessor;
