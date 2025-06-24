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
exports.DataCollector = void 0;
class DataCollector {
    constructor() {
        this.providers = [];
    }
    addProvider(provider) {
        this.providers.push(provider);
    }
    removeProvider(providerName) {
        this.providers = this.providers.filter(p => p.getName() !== providerName);
    }
    getProviders() {
        return [...this.providers];
    }
    collectData(source) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = {};
            const errors = [];
            // Execute all providers concurrently
            const providerPromises = this.providers.map((provider) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const data = yield provider.fetch(source);
                    if (data !== null) {
                        results[provider.getName()] = data;
                    }
                    else {
                        errors.push(`${provider.getName()}: Failed to fetch data`);
                    }
                }
                catch (error) {
                    const errorMessage = `${provider.getName()}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    errors.push(errorMessage);
                    console.warn(`Provider ${provider.getName()} threw an error:`, error);
                }
            }));
            // Wait for all providers to complete
            yield Promise.allSettled(providerPromises);
            // Add errors to results if any occurred
            if (errors.length > 0) {
                results.errors = errors;
            }
            return results;
        });
    }
}
exports.DataCollector = DataCollector;
