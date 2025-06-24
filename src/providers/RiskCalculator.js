"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskCalculator = void 0;
class RiskCalculator {
    calculateRisk(address, addressType, collectedData) {
        var _a;
        let score = 50; // Base score
        const factors = [];
        let confidence = 0.5; // Base confidence
        // Analyze data from each provider
        const providerCount = Object.keys(collectedData).filter(key => key !== 'errors').length;
        const errorCount = ((_a = collectedData.errors) === null || _a === void 0 ? void 0 : _a.length) || 0;
        // Adjust confidence based on data availability
        if (providerCount > 0) {
            confidence = Math.max(0.1, 1 - (errorCount / providerCount));
        }
        // Example: Analyze blockchain data
        if (collectedData.blockchain) {
            const blockchainData = collectedData.blockchain;
            if (blockchainData.transactionCount > 1000) {
                score -= 10;
                factors.push('High transaction volume indicates active address');
            }
            else if (blockchainData.transactionCount < 10) {
                score += 20;
                factors.push('Low transaction volume indicates new/inactive address');
            }
        }
        // Example: Analyze reputation data
        if (collectedData.reputation) {
            const reputationData = collectedData.reputation;
            if (reputationData.isBlacklisted) {
                score = 100;
                factors.push('Address is blacklisted');
            }
            else if (reputationData.trustScore > 80) {
                score -= 15;
                factors.push('High trust score from reputation provider');
            }
            else if (reputationData.trustScore < 20) {
                score += 25;
                factors.push('Low trust score from reputation provider');
            }
        }
        // Example: Analyze social data
        if (collectedData.social) {
            const socialData = collectedData.social;
            if (socialData.mentions > 100) {
                score -= 5;
                factors.push('Address has significant social media presence');
            }
        }
        // Example: Analyze on-chain analysis
        if (collectedData.onchain) {
            const onchainData = collectedData.onchain;
            if (onchainData.hasContractInteraction) {
                score += 10;
                factors.push('Address has interacted with smart contracts');
            }
            if (onchainData.gasUsed > 1000000) {
                score += 5;
                factors.push('High gas usage indicates complex transactions');
            }
        }
        // Address type specific adjustments
        if (addressType === 'evm') {
            if (address.startsWith('0xabc')) {
                score -= 10;
                factors.push('EVM address with trusted prefix pattern');
            }
        }
        else if (addressType === 'solana') {
            if (address.endsWith('A')) {
                score -= 10;
                factors.push('Solana address with trusted suffix pattern');
            }
        }
        // Ensure score is within bounds
        score = Math.max(0, Math.min(100, score));
        // Generate description
        const description = this.generateDescription(addressType, factors, score, confidence);
        return {
            score,
            description,
            factors,
            confidence
        };
    }
    generateDescription(addressType, factors, score, confidence) {
        let description = `${addressType.toUpperCase()} address. `;
        if (factors.length > 0) {
            description += `Risk factors: ${factors.join(', ')}. `;
        }
        if (confidence < 0.7) {
            description += `Low confidence due to data collection issues. `;
        }
        description += `Final risk score: ${score}/100.`;
        return description;
    }
}
exports.RiskCalculator = RiskCalculator;
