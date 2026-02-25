import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import requireFamily from '../middleware/enforceFamilyIsolation.js';
import { getFinancialContext, getFamilyFinancialContext } from '../services/financialService.js';

const router = express.Router();

/**
 * GET /api/financial/context
 * Unified source of truth for personal financial data
 */
router.get('/context', authMiddleware, async (req, res) => {
    try {
        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            period: req.query.period || 'Monthly'
        };

        const context = await getFinancialContext(req.user._id, filters);
        res.json(context);
    } catch (error) {
        console.error('Error fetching financial context:', error);
        res.status(500).json({ message: 'Failed to fetch financial data' });
    }
});

/**
 * GET /api/financial/family-context
 * Family financial context — derives groupId from authenticated user's currentFamilyId
 */
router.get('/family-context', authMiddleware, requireFamily, async (req, res) => {
    try {
        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
        };
        const context = await getFamilyFinancialContext(req.familyGroup._id, filters);
        res.json(context);
    } catch (error) {
        console.error('Error fetching family financial context:', error);
        res.status(500).json({ message: 'Failed to fetch family financial data' });
    }
});

export default router;
