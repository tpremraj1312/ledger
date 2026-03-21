/**
 * Opportunity Detection Engine
 * Analyzes the user's computed tax profile to find unused deduction limits
 * and behavioral gaps (e.g. medical expenses without insurance).
 */

export const detectOpportunities = (profile) => {
    const { deductions, expenseByCategory, totalIncome, oldTaxableIncome, rules } = profile;
    const opportunities = [];

    // Helper: Marginal tax rate
    const getMarginalRate = (taxableIncome, slabs) => {
        let marginalRate = 0;
        for (const slab of slabs) {
            if (taxableIncome >= slab.min) {
                marginalRate = slab.rate;
            }
        }
        return marginalRate;
    };
    const marginalRate = getMarginalRate(oldTaxableIncome, rules.oldRegimeSlabs);

    // 1. Unused Standard Core Limits (80C, 80D, etc)
    for (const [sectionKey, ded] of Object.entries(deductions)) {
        if (ded.maxLimit !== Infinity && ded.remaining > 0) {
            opportunities.push({
                type: 'UNUSED_LIMIT',
                sectionKey,
                sectionName: ded.name,
                remainingLimit: ded.remaining,
                estimatedTaxSaving: parseFloat(((ded.remaining * marginalRate) / 100).toFixed(2)),
                urgency: ded.remaining === ded.maxLimit ? 'HIGH' : 'MEDIUM'
            });
        }
    }

    // 2. Behavioral Gaps (Extracted from old taxService pattern detection)
    for (const pattern of rules.expensePatternRules) {
        let triggerSpending = 0;
        for (const cat of pattern.triggerCategories) {
            for (const [expCat, data] of Object.entries(expenseByCategory)) {
                if (expCat.toLowerCase().includes(cat.toLowerCase())) {
                    triggerSpending += data.amount;
                }
            }
        }

        const targetDed = deductions[pattern.checkMissing];
        const hasClaimed = targetDed && targetDed.claimed > 0;
        const shouldTrigger = pattern.triggerCategories.length === 0 
            ? !hasClaimed 
            : (triggerSpending >= pattern.threshold && !hasClaimed);

        if (shouldTrigger && targetDed && targetDed.remaining > 0) {
            opportunities.push({
                type: 'BEHAVIORAL_GAP',
                sectionKey: pattern.checkMissing,
                sectionName: targetDed.name,
                triggerAmount: triggerSpending,
                remainingLimit: targetDed.remaining,
                estimatedTaxSaving: parseFloat(((targetDed.remaining * marginalRate) / 100).toFixed(2)),
                urgency: 'HIGH',
                behaviorReason: pattern.recommendation.description
            });
        }
    }

    // Sort opportunities by highest potential tax saving
    return opportunities.sort((a, b) => b.estimatedTaxSaving - a.estimatedTaxSaving);
};
