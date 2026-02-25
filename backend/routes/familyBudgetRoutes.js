import express from 'express';
import requireFamily from '../middleware/enforceFamilyIsolation.js';
import requireRole from '../middleware/rbacMiddleware.js';
import {
    getFamilyBudget,
    upsertFamilyBudget,
    copyPreviousMonth,
    getFamilyBudgetUsage,
} from '../controllers/familyBudgetController.js';

const router = express.Router();

// All routes require active family membership (groupId derived from req.user.currentFamilyId)
router.get('/', requireFamily, getFamilyBudget);
router.get('/usage', requireFamily, getFamilyBudgetUsage);
router.put('/', requireFamily, requireRole('ADMIN'), upsertFamilyBudget);
router.post('/copy-previous', requireFamily, requireRole('ADMIN'), copyPreviousMonth);

export default router;
