import express from 'express';
import Budget from '../models/budget.js';
import Transaction from '../models/transaction.js';
import auth from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/dashboard/summary
router.get('/summary', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Budgets
    const budgets = await Budget.find({ user: userId });

    // Transactions
    const transactions = await Transaction.find({ user: userId });

    // Expense Totals
    const expenseBudgets = budgets.filter(b => b.type === 'expense');
    const expenseBudgeted = expenseBudgets.reduce((sum, b) => sum + b.amount, 0);
    const expenseSpent = transactions
      .filter(tx => tx.type === 'debit')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const expenseRemaining = expenseBudgeted - expenseSpent;

    // Income Totals
    const incomeGoals = budgets.filter(b => b.type === 'income');
    const incomeGoal = incomeGoals.reduce((sum, b) => sum + b.amount, 0);
    const incomeEarned = transactions
      .filter(tx => tx.type === 'credit')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const incomeDifference = incomeEarned - incomeGoal;

    res.json({
      expenseTotals: {
        budgeted: expenseBudgeted,
        spentTotal: expenseSpent,
        remainingOverall: expenseRemaining
      },
      incomeTotals: {
        goal: incomeGoal,
        earnedTotal: incomeEarned,
        differenceOverall: incomeDifference
      }
    });

  } catch (err) {
    console.error("Dashboard summary error:", err);
    res.status(500).json({ message: "Failed to fetch dashboard summary" });
  }
});

export default router;
