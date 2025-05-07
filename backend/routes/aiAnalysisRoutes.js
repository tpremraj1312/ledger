import express from 'express';
import jwt from 'jsonwebtoken';
import { generateAIAnalysis } from '../utils/aiAnalysis.js'; // Adjust if aiAnalysis.js is in routes/

const router = express.Router();

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// AI Analysis Route
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    const userId = req.user.userId; // Assumes JWT payload has userId as ObjectId

    // Call the analysis function
    const analysis = await generateAIAnalysis(userId, { startDate, endDate, category });

    // Return the analysis
    res.json({ analysis });
  } catch (error) {
    console.error('Error in AI analysis route:', error);
    res.status(500).json({ message: error.message || 'Failed to generate AI analysis' });
  }
});

export default router;