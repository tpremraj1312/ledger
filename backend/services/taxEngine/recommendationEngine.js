/**
 * Recommendation Engine (Action Layer)
 * Converts Raw Opportunities into actionable UI recommendations with Trust explanations.
 */

export const generateRecommendations = (opportunities, profile) => {
    const { rules, totalIncome } = profile;
    const recommendations = [];

    // To prevent duplicate recommendations for the same section (e.g., from both unused limit & behavioral gap)
    const recommendedSections = new Set();

    for (const opp of opportunities) {
        if (recommendedSections.has(opp.sectionKey)) continue;

        const recGroup = rules.recommendations.find(r => r.section === opp.sectionKey);
        if (!recGroup) continue;

        recommendedSections.add(opp.sectionKey);

        for (const instrument of recGroup.instruments) {
            // Priority scoring logic
            const normalizedRemaining = opp.remainingLimit / (profile.deductions[opp.sectionKey]?.maxLimit || 1);
            const normalizedSavings = totalIncome > 0 ? opp.estimatedTaxSaving / (totalIncome * 0.3) : 0;
            const ease = instrument.implementationEase || 0.5;

            const priorityScore = parseFloat(
                (normalizedRemaining * 0.4) + (Math.min(1, normalizedSavings) * 0.4) + (ease * 0.2)
            ).toFixed(3);

            const priority = opp.urgency === 'HIGH' ? 'high' : (priorityScore > 0.6 ? 'medium' : 'low');

            recommendations.push({
                id: `rec_${opp.sectionKey}_${instrument.name.replace(/\s+/g, '_')}`,
                sectionKey: opp.sectionKey,
                sectionName: opp.sectionName,
                instrument: instrument.name,
                description: instrument.description,
                
                // Actionable Trust Output
                actionDetails: {
                    why: opp.type === 'BEHAVIORAL_GAP' ? opp.behaviorReason : `You have ₹${opp.remainingLimit.toLocaleString('en-IN')} unused capacity under ${opp.sectionName}.`,
                    impact: `Reduces tax liability by up to ₹${opp.estimatedTaxSaving.toLocaleString('en-IN')}`,
                    whatToDo: `Invest in ${instrument.name} to maximize this limit.`,
                    estimatedTaxSaving: opp.estimatedTaxSaving,
                    maxInvestable: opp.remainingLimit,
                },

                // Metadata
                meta: {
                    riskLevel: instrument.riskLevel,
                    lockIn: instrument.lockIn,
                    expectedReturn: instrument.expectedReturn,
                    wealthImpact: instrument.wealthImpact,
                },

                priority,
                priorityScore: parseFloat(priorityScore),
                source: opp.type
            });
        }
    }

    // Sort by priority score
    return recommendations.sort((a, b) => b.priorityScore - a.priorityScore);
};
