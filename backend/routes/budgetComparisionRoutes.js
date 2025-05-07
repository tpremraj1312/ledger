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
    console.log('JWT payload:', user);
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
  if (amount === undefined || amount === null) return '₹0.00';
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

    // Validate dates
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start && end && start > end) {
      throw new Error('Start date cannot be after end date');
    }

    // Determine period
    const period = determineBudgetPeriod(startDate, endDate);
    console.log('Determined budget period:', period);

    // Build transaction query for debit (expenses)
    const debitMatch = {
      user: userObjectId,
      type: 'debit',
      status: 'completed'
    };
    if (startDate && start) {
      debitMatch.date = { $gte: start };
    }
    if (endDate && end) {
      debitMatch.date = debitMatch.date || {};
      const endOfDay = new Date(end);
      endOfDay.setUTCHours(23, 59, 59, 999);
      debitMatch.date.$lte = endOfDay;
    }
    if (category && category !== 'All') {
      debitMatch.$or = [
        { category },
        { 'categories.category': category }
      ];
    }

    // Debug raw debit transactions
    const rawDebitTransactions = await Transaction.find(debitMatch).lean();
    console.log('Raw debit transactions:', JSON.stringify(rawDebitTransactions, null, 2));

    // Aggregate debit transactions
    const debitAggregation = await Transaction.aggregate([
      { $match: debitMatch },
      {
        $facet: {
          manual: [
            { $match: { source: 'manual' } },
            {
              $group: {
                _id: '$category',
                total: { $sum: '$amount' }
              }
            },
            {
              $project: {
                category: '$_id',
                amount: '$total',
                _id: 0
              }
            }
          ],
          billscan: [
            { $match: { source: 'billscan' } },
            { $unwind: '$categories' },
            {
              $group: {
                _id: '$categories.category',
                total: { $sum: '$categories.categoryTotal' }
              }
            },
            {
              $project: {
                category: '$_id',
                amount: '$total',
                _id: 0
              }
            }
          ]
        }
      },
      {
        $project: {
          combined: { $concatArrays: ['$manual', '$billscan'] }
        }
      },
      { $unwind: '$combined' },
      {
        $group: {
          _id: '$combined.category',
          amount: { $sum: '$combined.amount' }
        }
      },
      {
        $project: {
          category: '$_id',
          amount: 1,
          _id: 0
        }
      }
    ]);
    console.log('Aggregated debit transactions:', JSON.stringify(debitAggregation, null, 2));

    // Build transaction query for credit (income)
    const creditMatch = {
      user: userObjectId,
      type: 'credit',
      status: 'completed'
    };
    if (startDate && start) {
      creditMatch.date = { $gte: start };
    }
    if (endDate && end) {
      creditMatch.date = creditMatch.date || {};
      const endOfDay = new Date(end);
      endOfDay.setUTCHours(23, 59, 59, 999);
      creditMatch.date.$lte = endOfDay;
    }
    if (category && category !== 'All') {
      creditMatch.$or = [
        { category },
        { 'categories.category': category }
      ];
    }

    // Debug raw credit transactions
    const rawCreditTransactions = await Transaction.find(creditMatch).lean();
    console.log('Raw credit transactions:', JSON.stringify(rawCreditTransactions, null, 2));

    // Aggregate credit transactions
    const creditAggregation = await Transaction.aggregate([
      { $match: creditMatch },
      {
        $facet: {
          manual: [
            { $match: { source: 'manual' } },
            {
              $group: {
                _id: '$category',
                total: { $sum: '$amount' }
              }
            },
            {
              $project: {
                category: '$_id',
                amount: '$total',
                _id: 0
              }
            }
          ],
          billscan: [
            { $match: { source: 'billscan' } },
            { $unwind: '$categories' },
            {
              $group: {
                _id: '$categories.category',
                total: { $sum: '$categories.categoryTotal' }
              }
            },
            {
              $project: {
                category: '$_id',
                amount: '$total',
                _id: 0
              }
            }
          ]
        }
      },
      {
        $project: {
          combined: { $concatArrays: ['$manual', '$billscan'] }
        }
      },
      { $unwind: '$combined' },
      {
        $group: {
          _id: '$combined.category',
          amount: { $sum: '$combined.amount' }
        }
      },
      {
        $project: {
          category: '$_id',
          amount: 1,
          _id: 0
        }
      }
    ]);
    console.log('Aggregated credit transactions:', JSON.stringify(creditAggregation, null, 2));

    // Build budget query for expense budgets
    const expenseBudgetMatch = { user: userObjectId, type: 'expense', period };
    if (category && category !== 'All') {
      expenseBudgetMatch.category = category;
    }

    // Aggregate expense budgets
    const expenseBudgetAggregation = await Budget.aggregate([
      { $match: expenseBudgetMatch },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' }
        }
      },
      {
        $project: {
          category: '$_id',
          budget: '$total',
          _id: 0
        }
      }
    ]);
    console.log('Aggregated expense budgets:', JSON.stringify(expenseBudgetAggregation, null, 2));

    // Build budget query for income budgets
    const incomeBudgetMatch = { user: userObjectId, type: 'income', period };
    if (category && category !== 'All') {
      incomeBudgetMatch.category = category;
    }

    // Aggregate income budgets
    const incomeBudgetAggregation = await Budget.aggregate([
      { $match: incomeBudgetMatch },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' }
        }
      },
      {
        $project: {
          category: '$_id',
          budget: '$total',
          _id: 0
        }
      }
    ]);
    console.log('Aggregated income budgets:', JSON.stringify(incomeBudgetAggregation, null, 2));

    // Combine debit transactions and expense budgets
    const debitMap = {};
    debitAggregation.forEach(item => {
      debitMap[item.category] = item.amount;
    });

    const expenseBudgetMap = {};
    expenseBudgetAggregation.forEach(item => {
      expenseBudgetMap[item.category] = item.budget;
    });

    // Debit comparison
    const debitCategories = [...new Set([...Object.keys(debitMap), ...Object.keys(expenseBudgetMap)])];
    const debitComparison = debitCategories.map(cat => {
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
        status: difference >= 0 ? 'Under Budget' : 'Over Budget'
      };
    }).filter(item => item.budgetedExpense > 0 || item.actualExpense > 0);

    // Calculate debit totals
    const debitTotals = {
      totalBudgetedExpense: debitComparison.reduce((sum, item) => sum + item.budgetedExpense, 0),
      totalActualExpense: debitComparison.reduce((sum, item) => sum + item.actualExpense, 0),
      totalDifference: debitComparison.reduce((sum, item) => sum + item.difference, 0),
      totalBudgetedExpenseFormatted: formatCurrency(debitComparison.reduce((sum, item) => sum + item.budgetedExpense, 0)),
      totalActualExpenseFormatted: formatCurrency(debitComparison.reduce((sum, item) => sum + item.actualExpense, 0)),
      totalDifferenceFormatted: formatCurrency(debitComparison.reduce((sum, item) => sum + item.difference, 0)),
      totalStatus: debitComparison.reduce((sum, item) => sum + item.difference, 0) >= 0 ? 'Under Budget' : 'Over Budget'
    };

    // Combine credit transactions and income budgets
    const creditMap = {};
    creditAggregation.forEach(item => {
      creditMap[item.category] = item.amount;
    });

    const incomeBudgetMap = {};
    incomeBudgetAggregation.forEach(item => {
      incomeBudgetMap[item.category] = item.budget;
    });

    // Credit comparison
    const creditCategories = [...new Set([...Object.keys(creditMap), ...Object.keys(incomeBudgetMap)])];
    const creditComparison = creditCategories.map(cat => {
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
        status: difference >= 0 ? 'Below Goal' : 'Above Goal'
      };
    }).filter(item => item.incomeGoal > 0 || item.actualIncome > 0);

    // Calculate credit totals
    const creditTotals = {
      totalIncomeGoal: creditComparison.reduce((sum, item) => sum + item.incomeGoal, 0),
      totalActualIncome: creditComparison.reduce((sum, item) => sum + item.actualIncome, 0),
      totalDifference: creditComparison.reduce((sum, item) => sum + item.difference, 0),
      totalIncomeGoalFormatted: formatCurrency(creditComparison.reduce((sum, item) => sum + item.incomeGoal, 0)),
      totalActualIncomeFormatted: formatCurrency(creditComparison.reduce((sum, item) => sum + item.actualIncome, 0)),
      totalDifferenceFormatted: formatCurrency(creditComparison.reduce((sum, item) => sum + item.difference, 0)),
      totalStatus: creditComparison.reduce((sum, item) => sum + item.difference, 0) >= 0 ? 'Below Goal' : 'Above Goal'
    };

    const result = {
      debitComparison: {
        comparison: debitComparison,
        totals: debitTotals,
        debug: {
          debitCount: debitAggregation.length,
          expenseBudgetCount: expenseBudgetAggregation.length,
          categories: debitCategories,
          rawDebitTransactionCount: rawDebitTransactions.length
        }
      },
      creditComparison: {
        comparison: creditComparison,
        totals: creditTotals,
        debug: {
          creditCount: creditAggregation.length,
          incomeBudgetCount: incomeBudgetAggregation.length,
          categories: creditCategories,
          rawCreditTransactionCount: rawCreditTransactions.length
        }
      }
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

    // Call the comparison function
    const comparison = await generateBudgetComparison(userId, { startDate, endDate, category });

    // Return the comparison
    res.json(comparison);
  } catch (error) {
    console.error('Error in budget comparison route:', error.message);
    res.status(500).json({ message: error.message || 'Failed to generate budget comparison' });
  }
});

export default router;