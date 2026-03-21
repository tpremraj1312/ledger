import { computeUserTaxProfile } from './computationEngine.js';
import { detectOpportunities } from './opportunityEngine.js';
import { generateRecommendations } from './recommendationEngine.js';

export const TAX_EVENTS = {
    TRANSACTION_ADDED: 'TRANSACTION_ADDED',
    TRANSACTION_UPDATED: 'TRANSACTION_UPDATED',
    TRANSACTION_DELETED: 'TRANSACTION_DELETED',
    INVESTMENT_ADDED: 'INVESTMENT_ADDED',
};

/**
 * 🎯 Tax Optimization Engine
 * Central event processor for all tax-relevant app activities.
 */
export const processTaxEvent = async (userId, eventType, payload, session = null) => {
    // 1. Calculate Initial State (Before Event, if we want to diff, but simpler to just calc after since DB might already have it)
    // Actually, payload.transaction might already be saved in DB. If session is passed, the aggregation reads uncommitted data!
    
    try {
        // Run computation
        const profile = await computeUserTaxProfile(userId, null, session);
        
        // Run AI / Detection
        const opportunities = detectOpportunities(profile);
        const recommendations = generateRecommendations(opportunities, profile);
        
        // Sum up potential savings for UI
        const totalPotentialSaving = recommendations.reduce((sum, r) => sum + r.actionDetails.estimatedTaxSaving, 0);

        // We return the structured Tax State delta to stream back to frontend
        const results = {
            taxOptimizationScore: profile.optimizationScore,
            oldRegimeTax: profile.oldTotalTax,
            newRegimeTax: profile.newTotalTax,
            recommendedRegime: profile.oldTotalTax <= profile.newTotalTax ? 'Old Regime' : 'New Regime',
            totalPotentialSaving,
            recommendationsCount: recommendations.length
        };

        return results;

    } catch (error) {
        console.error(`[TaxOptimizationEngine] Error processing event ${eventType}:`, error);
        return null; // Don't crash processing
    }
};
