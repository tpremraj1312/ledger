import express from 'express';
import {
    getSettings,
    updateProfile,
    updatePreferences,
    exportData,
    deleteAccount
} from '../controllers/settingsController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, getSettings);
router.patch('/profile', authMiddleware, updateProfile);
router.patch('/preferences', authMiddleware, updatePreferences);
router.get('/export', authMiddleware, exportData);
router.post('/delete-account', authMiddleware, deleteAccount);

export default router;
