/**
 * Tax Saving Advisor Routes
 * GET /api/tax/summary   — Full tax computation + recommendations
 * POST /api/tax/ai-explain — AI-generated narrative of tax summary
 */

import express from 'express';
import { computeTaxSummary } from '../services/taxService.js';
import { generateTaxNarrative } from '../utils/taxAiNarrative.js';
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
 * POST /ai-explain
 * Body: { summary } — pre-computed summary object
 * Returns AI-generated narrative.
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

export default router;
