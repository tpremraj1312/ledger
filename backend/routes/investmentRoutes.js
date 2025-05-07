import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getInvestmentRecommendations } from '../utils/investmentHelper.js';

const router = express.Router();

// @route   POST /api/investments
// @desc    Generate top 5 investment plans using Gemini
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
  const { amount, riskLevel, investmentType, durationYears } = req.body;

  // Basic validation
  if (!amount || !riskLevel || !investmentType || !durationYears) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const recommendations = await getInvestmentRecommendations({
      amount,
      riskLevel,
      investmentType,
      durationYears
    });

    res.status(200).json({ recommendations });
  } catch (error) {
    console.error('Gemini investment error:', error.message);
    res.status(500).json({
      message: 'Failed to fetch investment recommendations',
      error: error.message
    });
  }
});

export default router;
