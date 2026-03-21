/**
 * Tax Saving Advisor Routes
 * GET  /api/tax/summary        — Full tax computation + recommendations
 * GET  /api/tax/full-analysis   — Combined computation + AI insights (single call)
 * POST /api/tax/ai-explain      — AI-generated structured insights
 * POST /api/tax/projection      — Tax projection simulator
 */

import express from 'express';
import { computeTaxSummary } from '../services/taxService.js';
import { generateTaxNarrative } from '../utils/taxAiNarrative.js';
import { simulateTaxProjection } from '../services/taxProjectionService.js';
import { addXP } from '../services/xpService.js';

const router = express.Router();

/**
 * GET /summary?fy=FY2025-26
 * Returns the full computed tax summary with recommendations.
 */
router.get('/summary', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { fy } = req.query;

        const summary = await computeTaxSummary(userId, fy || undefined);

        // Award XP for reviewing tax analysis (idempotent via reason-based dedup)
        const xpReason = `tax_analysis_review_${summary.financialYear}`;
        try {
            await addXP(userId, 5, xpReason);
        } catch (xpErr) {
            // Non-blocking — don't fail the request if XP award fails
            console.error('Tax XP award error:', xpErr);
        }

        res.json(summary);
    } catch (error) {
        console.error('Tax Summary Error:', error);
        res.status(500).json({ message: error.message || 'Failed to compute tax summary' });
    }
});

/**
 * GET /full-analysis?fy=FY2025-26
 * Combined endpoint: computes tax summary + generates AI insights in a single call.
 * Returns: { ...summary, aiInsights: { ... } }
 */
router.get('/full-analysis', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { fy } = req.query;

        // Step 1: Compute tax summary
        const summary = await computeTaxSummary(userId, fy || undefined);

        // Step 2: Generate AI insights (in parallel with XP award)
        const [aiInsights] = await Promise.all([
            generateTaxNarrative(summary).catch((err) => {
                console.error('AI Insights generation failed:', err);
                return {
                    overallAssessment: 'AI insights are temporarily unavailable. Your tax summary and recommendations are based on accurate server-side calculations.',
                    strengths: [],
                    improvements: [],
                    regimeAdvice: `Based on calculations, the ${summary.taxLiability.recommendedRegime} appears optimal.`,
                    actionItems: [],
                    incomeInsights: '',
                    expenseInsights: '',
                };
            }),
            // Award XP (non-blocking)
            addXP(userId, 8, `tax_full_analysis_${summary.financialYear}`).catch((xpErr) => {
                console.error('Tax XP award error:', xpErr);
            }),
        ]);

        res.json({
            ...summary,
            aiInsights,
        });
    } catch (error) {
        console.error('Tax Full Analysis Error:', error);
        res.status(500).json({ message: error.message || 'Failed to compute tax analysis' });
    }
});

/**
 * POST /ai-explain
 * Body: { summary } — pre-computed summary object
 * Returns structured AI-generated insights.
 */
router.post('/ai-explain', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { summary } = req.body;

        if (!summary) {
            return res.status(400).json({ message: 'Tax summary is required in request body' });
        }

        const narrative = await generateTaxNarrative(summary);

        // Award XP for generating AI explanation (idempotent)
        const xpReason = `tax_ai_explain_${summary.financialYear}`;
        try {
            await addXP(userId, 3, xpReason);
        } catch (xpErr) {
            console.error('Tax AI XP award error:', xpErr);
        }

        res.json({ narrative });
    } catch (error) {
        console.error('Tax AI Explain Error:', error);
        res.status(500).json({ message: error.message || 'Failed to generate AI explanation' });
    }
});

/**
 * POST /projection
 * Body: { expectedIncome, futureInvestments, futureDeductions, financialYear }
 * Returns projected tax liability under different scenarios.
 */
router.post('/projection', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { expectedIncome, futureInvestments, futureDeductions, financialYear } = req.body;

        if (!expectedIncome || expectedIncome <= 0) {
            return res.status(400).json({ message: 'Expected income must be a positive number' });
        }

        // Get current summary for comparison
        let currentSummary = null;
        try {
            currentSummary = await computeTaxSummary(userId, financialYear || undefined);
        } catch (err) {
            // Current summary is optional — proceed without it
            console.warn('Could not fetch current summary for comparison:', err.message);
        }

        const projection = simulateTaxProjection({
            expectedIncome,
            futureInvestments: futureInvestments || {},
            futureDeductions: futureDeductions || {},
            financialYear,
            currentSummary,
        });

        // Award XP for using projection simulator
        try {
            await addXP(userId, 3, `tax_projection_${projection.financialYear}`);
        } catch (xpErr) {
            console.error('Tax projection XP error:', xpErr);
        }

        res.json(projection);
    } catch (error) {
        console.error('Tax Projection Error:', error);
        res.status(500).json({ message: error.message || 'Failed to compute tax projection' });
    }
});

/**
 * POST /simulate
 * Body: { additionalInvestments: { '80C': 50000 } }
 * Returns simulated tax savings entirely in-memory.
 */
router.post('/simulate', async (req, res) => {
    try {
        const userId = req.user._id || req.user.userId;
        const { additionalInvestments } = req.body;

        if (!additionalInvestments) {
            return res.status(400).json({ message: 'additionalInvestments object is required' });
        }

        const { computeUserTaxProfile, simulateTaxProfile } = await import('../services/taxEngine/computationEngine.js');
        const baseProfile = await computeUserTaxProfile(userId);
        const simProfile = simulateTaxProfile(baseProfile, additionalInvestments);

        // Calculate Net Benefit
        const baseBestTax = Math.min(baseProfile.oldTotalTax, baseProfile.newTotalTax);
        const simBestTax = Math.min(simProfile.oldTotalTax, simProfile.newTotalTax);
        const netTaxSaved = Math.max(0, baseBestTax - simBestTax);

        res.json({
            originalTax: baseBestTax,
            simulatedTax: simBestTax,
            netTaxSaved,
            details: {
                baseProfile: { oldRegime: baseProfile.oldTotalTax, newRegime: baseProfile.newTotalTax },
                simProfile: { oldRegime: simProfile.oldTotalTax, newRegime: simProfile.newTotalTax },
            }
        });
    } catch (error) {
        console.error('Tax Simulation Error:', error);
        res.status(500).json({ message: error.message || 'Failed to compute tax simulation' });
    }
});

export default router;
