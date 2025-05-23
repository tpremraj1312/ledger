import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Transaction from '../models/transaction.js';
import Budget from '../models/budget.js';

const router = express.Router();

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    console.error('No authentication token provided');
    return res.status(401).json({ message: 'Authentication token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT verification failed:', err.message);
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    const userId = user._id || user.userId;
    if (!userId) {
      console.error('No user ID found in JWT payload');
      return res.status(400).json({ message: 'User ID missing in token' });
    }
    req.user = { _id: userId };
    next();
  });
};

// Format currency for response
const formatCurrency = (amount) => {
  const value = Number(amount) || 0;
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Determine budget period based on date range
const determineBudgetPeriod = (startDate, endDate) => {
  if (!startDate || !endDate) return 'Monthly';
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end)) return 'Monthly';
  const diffDays = (end - start) / (1000 * 60 * 60 * 24);
  if (diffDays <= 7) return 'Weekly';
  if (diffDays <= 31) return 'Monthly';
  if (diffDays <= 90) return 'Quarterly';
  return 'Yearly';
};

// Generate Budget Comparison for Debit and Credit
const generateBudgetComparison = async (userId, { startDate, endDate, category }) => {
  try {
    console.log('Generating budget comparison', { userId, startDate, endDate, category });

    // Validate userId
    if (!userId || (typeof userId === 'string' && !mongoose.Types.ObjectId.isValid(userId))) {
      console.error('Invalid user ID:', userId);
      throw new Error('Invalid user ID');
    }
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

    // Normalize dates
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();
    if (isNaN(start) || isNaN(end)) {
      throw new Error('Invalid date format');
    }
    if (start > end) {
      throw new Error('Start date cannot be after end date');
    }
    const endOfDay = new Date(end);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Determine period
    const period = determineBudgetPeriod(startDate, endDate);
    console.log('Determined budget period:', period);

    // Build transaction query for debit (expenses)
    const debitMatch = {
      user: userObjectId,
      type: 'debit',
      status: 'completed',
      date: { $gte: start, $lte: endOfDay },
    };
    if (category && category !== 'All') {
      debitMatch.$or = [
        { category },
        { 'categories.category': category },
      ];
    }

    // Aggregate debit transactions
    const debitAggregation = await Transaction.aggregate([
      { $match: debitMatch },
      {
        $facet: {
          manual: [
            { $match: { source: 'manual' } },
            {
              $group: {
                _id: { $trim: { input: { $ifNull: ['$category', ''] } } },
                total: { $sum: { $toDouble: { $ifNull: ['$amount', 0] } } },
              },
            },
            { $match: { _id: { $ne: '' } } },
            {
              $project: {
                category: '$_id',
                amount: { $round: ['$total', 2] },
                _id: 0,
              },
            },
          ],
          billscan: [
            { $match: { source: 'billscan', categories: { $exists: true, $ne: [] } } },
            { $unwind: '$categories' },
            {
              $match: {
                'categories.category': { $ne: null, $ne: '' },
                'categories.categoryTotal': { $exists: true },
              },
            },
            {
              $group: {
                _id: { $trim: { input: { $ifNull: ['$categories.category', ''] } } },
                total: { $sum: { $toDouble: { $ifNull: ['$categories.categoryTotal', 0] } } },
              },
            },
            { $match: { _id: { $ne: '' } } },
            {
              $project: {
                category: '$_id',
                amount: { $round: ['$total', 2] },
                _id: 0,
              },
            },
          ],
        },
      },
      {
        $project: {
          combined: { $concatArrays: ['$manual', '$billscan'] },
        },
      },
      { $unwind: { path: '$combined', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$combined.category',
          amount: { $sum: '$combined.amount' },
        },
      },
      {
        $project: {
          category: '$_id',
          amount: { $round: ['$amount', 2] },
          _id: 0,
        },
      },
    ]);

    // Aggregate credit transactions
    const creditMatch = {
      user: userObjectId,
      type: 'credit',
      status: 'completed',
      date: { $gte: start, $lte: endOfDay },
    };
    if (category && category !== 'All') {
      creditMatch.$or = [
        { category },
        { 'categories.category': category },
      ];
    }

    const creditAggregation = await Transaction.aggregate([
      { $match: creditMatch },
      {
        $facet: {
          manual: [
            { $match: { source: 'manual' } },
            {
              $group: {
                _id: { $trim: { input: { $ifNull: ['$category', ''] } } },
                total: { $sum: { $toDouble: { $ifNull: ['$amount', 0] } } },
              },
            },
            { $match: { _id: { $ne: '' } } },
            {
              $project: {
                category: '$_id',
                amount: { $round: ['$total', 2] },
                _id: 0,
              },
            },
          ],
          billscan: [
            { $match: { source: 'billscan', categories: { $exists: true, $ne: [] } } },
            { $unwind: '$categories' },
            {
              $match: {
                'categories.category': { $ne: null, $ne: '' },
                'categories.categoryTotal': { $exists: true },
              },
            },
            {
              $group: {
                _id: { $trim: { input: { $ifNull: ['$categories.category', ''] } } },
                total: { $sum: { $toDouble: { $ifNull: ['$categories.categoryTotal', 0] } } },
              },
            },
            { $match: { _id: { $ne: '' } } },
            {
              $project: {
                category: '$_id',
                amount: { $round: ['$total', 2] },
                _id: 0,
              },
            },
          ],
        },
      },
      {
        $project: {
          combined: { $concatArrays: ['$manual', '$billscan'] },
        },
      },
      { $unwind: { path: '$combined', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$combined.category',
          amount: { $sum: '$combined.amount' },
        },
      },
      {
        $project: {
          category: '$_id',
          amount: { $round: ['$amount', 2] },
          _id: 0,
        },
      },
    ]);

    // Aggregate expense budgets
    const expenseBudgetMatch = { user: userObjectId, type: 'expense', period };
    if (category && category !== 'All') {
      expenseBudgetMatch.category = category;
    }

    const expenseBudgetAggregation = await Budget.aggregate([
      { $match: expenseBudgetMatch },
      {
        $group: {
          _id: { $trim: { input: { $ifNull: ['$category', ''] } } },
          total: { $sum: { $toDouble: { $ifNull: ['$amount', 0] } } },
        },
      },
      { $match: { _id: { $ne: '' } } },
      {
        $project: {
          category: '$_id',
          budget: { $round: ['$total', 2] },
          _id: 0,
        },
      },
    ]);

    // Aggregate income budgets
    const incomeBudgetMatch = { user: userObjectId, type: 'income', period };
    if (category && category !== 'All') {
      incomeBudgetMatch.category = category;
    }

    const incomeBudgetAggregation = await Budget.aggregate([
      { $match: incomeBudgetMatch },
      {
        $group: {
          _id: { $trim: { input: { $ifNull: ['$category', ''] } } },
          total: { $sum: { $toDouble: { $ifNull: ['$amount', 0] } } },
        },
      },
      { $match: { _id: { $ne: '' } } },
      {
        $project: {
          category: '$_id',
          budget: { $round: ['$total', 2] },
          _id: 0,
        },
      },
    ]);

    // Combine debit transactions and expense budgets
    const debitMap = {};
    debitAggregation.forEach(item => {
      if (item.category) {
        debitMap[item.category] = Number(item.amount) || 0;
      }
    });

    const expenseBudgetMap = {};
    expenseBudgetAggregation.forEach(item => {
      if (item.category) {
        expenseBudgetMap[item.category] = Number(item.budget) || 0;
      }
    });

    // Debit comparison
    const debitCategories = [...new Set([...Object.keys(debitMap), ...Object.keys(expenseBudgetMap)])];
    const debitComparison = debitCategories
      .map(cat => {
        const budget = expenseBudgetMap[cat] || 0;
        const expense = debitMap[cat] || 0;
        const difference = budget - expense;
        return {
          category: cat,
          budgetedExpense: budget,
          actualExpense: expense,
          difference,
          budgetedExpenseFormatted: formatCurrency(budget),
          actualExpenseFormatted: formatCurrency(expense),
          differenceFormatted: formatCurrency(difference),
          status: difference >= 0 ? 'Under Budget' : 'Over Budget',
        };
      })
      .filter(item => item.budgetedExpense >= 0 || item.actualExpense > 0);

    // Calculate debit totals
    const debitTotals = {
      totalBudgetedExpense: Number(debitComparison.reduce((sum, item) => sum + item.budgetedExpense, 0).toFixed(2)),
      totalActualExpense: Number(debitComparison.reduce((sum, item) => sum + item.actualExpense, 0).toFixed(2)),
      totalDifference: Number(debitComparison.reduce((sum, item) => sum + item.difference, 0).toFixed(2)),
      totalBudgetedExpenseFormatted: formatCurrency(debitComparison.reduce((sum, item) => sum + item.budgetedExpense, 0)),
      totalActualExpenseFormatted: formatCurrency(debitComparison.reduce((sum, item) => sum + item.actualExpense, 0)),
      totalDifferenceFormatted: formatCurrency(debitComparison.reduce((sum, item) => sum + item.difference, 0)),
      totalStatus: debitComparison.reduce((sum, item) => sum + item.difference, 0) >= 0 ? 'Under Budget' : 'Over Budget',
    };

    // Combine credit transactions and income budgets
    const creditMap = {};
    creditAggregation.forEach(item => {
      if (item.category) {
        creditMap[item.category] = Number(item.amount) || 0;
      }
    });

    const incomeBudgetMap = {};
    incomeBudgetAggregation.forEach(item => {
      if (item.category) {
        incomeBudgetMap[item.category] = Number(item.budget) || 0;
      }
    });

    // Credit comparison
    const creditCategories = [...new Set([...Object.keys(creditMap), ...Object.keys(incomeBudgetMap)])];
    const creditComparison = creditCategories
      .map(cat => {
        const goal = incomeBudgetMap[cat] || 0;
        const income = creditMap[cat] || 0;
        const difference = goal - income;
        return {
          category: cat,
          incomeGoal: goal,
          actualIncome: income,
          difference,
          incomeGoalFormatted: formatCurrency(goal),
          actualIncomeFormatted: formatCurrency(income),
          differenceFormatted: formatCurrency(difference),
          status: difference >= 0 ? 'Below Goal' : 'Above Goal',
        };
      })
      .filter(item => item.incomeGoal >= 0 || item.actualIncome > 0);

    // Calculate credit totals
    const creditTotals = {
      totalIncomeGoal: Number(creditComparison.reduce((sum, item) => sum + item.incomeGoal, 0).toFixed(2)),
      totalActualIncome: Number(creditComparison.reduce((sum, item) => sum + item.actualIncome, 0).toFixed(2)),
      totalDifference: Number(creditComparison.reduce((sum, item) => sum + item.difference, 0).toFixed(2)),
      totalIncomeGoalFormatted: formatCurrency(creditComparison.reduce((sum, item) => sum + item.incomeGoal, 0)),
      totalActualIncomeFormatted: formatCurrency(creditComparison.reduce((sum, item) => sum + item.actualIncome, 0)),
      totalDifferenceFormatted: formatCurrency(creditComparison.reduce((sum, item) => sum + item.difference, 0)),
      totalStatus: creditComparison.reduce((sum, item) => sum + item.difference, 0) >= 0 ? 'Below Goal' : 'Above Goal',
    };

    const result = {
      debitComparison: {
        comparison: debitComparison,
        totals: debitTotals,
      },
      creditComparison: {
        comparison: creditComparison,
        totals: creditTotals,
      },
    };

    console.log('Comparison result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error in generateBudgetComparison:', error.message);
    throw new Error(`Failed to generate budget comparison: ${error.message}`);
  }
};

// Budget Comparison Route
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    const userId = req.user._id;
    console.log('Budget comparison request:', { userId, startDate, endDate, category });

    const comparison = await generateBudgetComparison(userId, { startDate, endDate, category });
    res.json(comparison);
  } catch (error) {
    console.error('Error in budget comparison route:', error.message);
    res.status(500).json({ message: error.message || 'Failed to generate budget comparison' });
  }
});

export default router;