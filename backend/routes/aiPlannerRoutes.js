/**
 * AI Planner Routes — Quota-safe analysis + simple investment planner.
 */

import express from 'express';
import { generateAIAnalysis, generateInvestmentPlan } from '../services/aiInvestmentPlanner.js';
import { getSnapshot } from '../services/portfolioEngine.js';
import { getFinancialContext } from '../services/financialService.js';
import { getInvestmentRecommendations } from '../utils/investmentHelper.js';
import rateLimit from 'express-rate-limit';
import { validateRequest } from '../middleware/validate.js';
import Joi from 'joi';

const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 AI queries per hour per user
  message: 'AI limit reached. Please wait an hour.'
});

const AIQuerySchema = Joi.object({
  query: Joi.string().max(1000).optional(),
  amount: Joi.number().optional(),
  riskLevel: Joi.string().optional(),
  investmentType: Joi.string().optional(),
  durationYears: Joi.number().optional()
}).unknown(true);

const router = express.Router();

/**
 * POST /api/investments/ai/analyze
 * Full AI analysis with hash-based caching
 */
router.post('/analyze', aiRateLimiter, validateRequest(AIQuerySchema), async (req, res) => {
    try {
        const portfolio = await getSnapshot(req.user._id);

        let financialData = {};
        try {
            financialData = await getFinancialContext(req.user._id, { period: 'Monthly' });
        } catch (err) {
            financialData = { totalIncome: 0, totalExpense: 0, netSavings: 0 };
        }

        const analysis = await generateAIAnalysis(financialData, portfolio);
        res.json(analysis);
    } catch (error) {
        console.error('AI Analysis Error:', error);
        res.status(500).json({ message: 'AI Analysis failed' });
    }
});

/**
 * POST /api/investments/ai/planner
 * Simple deterministic investment planner (no AI calls)
 */
router.post('/planner', aiRateLimiter, validateRequest(AIQuerySchema), async (req, res) => {
    try {
        const { income, expenses, age, riskPreference, investmentAmount } = req.body;
        if (!income && !expenses) {
            return res.status(400).json({ message: 'At least income or expenses required.' });
        }
        const plan = generateInvestmentPlan({ income: Number(income), expenses: Number(expenses), age: Number(age) || 30, riskPreference: riskPreference || 'moderate', investmentAmount: Number(investmentAmount) || 0 });
        res.json(plan);
    } catch (error) {
        console.error('Planner Error:', error);
        res.status(500).json({ message: 'Planner failed' });
    }
});

/**
 * POST /api/investments/ai/recommend (legacy preserved)
 */
router.post('/recommend', aiRateLimiter, validateRequest(AIQuerySchema), async (req, res) => {
    const { amount, riskLevel, investmentType, durationYears } = req.body;
    if (!amount || !riskLevel || !investmentType || !durationYears) {
        return res.status(400).json({ message: 'All fields are required.' });
    }
    try {
        const recommendations = await getInvestmentRecommendations({ amount, riskLevel, investmentType, durationYears });
        res.status(200).json({ recommendations });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch recommendations', error: error.message });
    }
});

export default router;
