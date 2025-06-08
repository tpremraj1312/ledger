import mongoose from 'mongoose';
import Budget from '../models/budget.js';
import User from '../models/user.js';

const budgetCheckMiddleware = async (req, res, next) => {
  try {
    // Validate req.user
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Authentication failed: No user data provided' });
    }
    const userId = req.user._id;
    const { category, amount, date } = req.body;

    console.log('budgetCheckMiddleware - userId:', userId);
    console.log('budgetCheckMiddleware - request body:', req.body);

    // Validate required fields
    if (!category || !amount || !date) {
      return res.status(400).json({ message: 'Missing required fields: category, amount, or date' });
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !Number.isFinite(parsedAmount)) {
      return res.status(400).json({ message: 'Invalid amount (must be a positive number)' });
    }

    // Validate date
    const transactionDate = new Date(date);
    if (isNaN(transactionDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format in request body' });
    }

    // Find the user
    const userDoc = await User.findById(userId);
    if (!userDoc) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only proceed if notifications are enabled
    if (!userDoc.notificationsEnabled) {
      return next();
    }

    // Determine the period
    const month = transactionDate.getMonth() + 1;
    const year = transactionDate.getFullYear();
    let period;

    if (month >= 1 && month <= 3) period = 'Q1';
    else if (month >= 4 && month <= 6) period = 'Q2';
    else if (month >= 7 && month <= 9) period = 'Q3';
    else period = 'Q4';

    const budgetPeriod = req.body.period || 'Monthly';
    const budgetQueryPeriod = budgetPeriod === 'Quarterly' ? period : budgetPeriod;

    // Find the relevant budget
    const budget = await Budget.findOne({
      user: userId,
      category,
      period: budgetQueryPeriod,
      type: 'expense',
    });

    if (!budget) {
      console.log('budgetCheckMiddleware - no budget found for category:', category);
      return next();
    }

    // Calculate total expenses
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    if (budgetPeriod === 'Monthly') {
      startDate.setMonth(month - 1);
      endDate.setMonth(month - 1);
      endDate.setDate(new Date(year, month, 0).getDate());
    } else if (budgetPeriod === 'Weekly') {
      const weekStart = new Date(transactionDate);
      weekStart.setDate(transactionDate.getDate() - transactionDate.getDay());
      startDate.setTime(weekStart.getTime());
      endDate.setTime(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    } else if (budgetPeriod === 'Quarterly') {
      if (period === 'Q1') startDate.setMonth(0);
      else if (period === 'Q2') startDate.setMonth(3);
      else if (period === 'Q3') startDate.setMonth(6);
      else startDate.setMonth(9);
      endDate.setMonth(startDate.getMonth() + 2);
      endDate.setDate(new Date(year, endDate.getMonth() + 1, 0).getDate());
    }

    const transactions = await mongoose.model('Transaction').aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          category,
          type: 'debit',
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const totalSpent = transactions.length > 0 ? transactions[0].total : 0;
    const newTotal = totalSpent + parsedAmount;

    // Check if budget is exceeded and attach notification data to req
    if (newTotal > budget.amount) {
      req.budgetNotification = {
        user: userId,
        message: `Budget exceeded for ${category} (${budgetPeriod}). Budget: ₹${budget.amount}, Spent: ₹${newTotal}`,
      };
      console.log('budgetCheckMiddleware - budget exceeded, notification queued:', req.budgetNotification.message);
    }

    next();
  } catch (error) {
    console.error('budgetCheckMiddleware - error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export default budgetCheckMiddleware;