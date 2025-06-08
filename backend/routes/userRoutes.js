import express from 'express';
import User from '../models/user.js'; // Adjust the path to your User model
import authMiddleware from '../middleware/authMiddleware.js'; // Adjust the path as needed

const router = express.Router();

// Get current user settings
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationsEnabled');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error in GET /api/users/me:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;