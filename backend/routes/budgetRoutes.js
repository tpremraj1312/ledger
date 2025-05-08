import express from 'express';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/authMiddleware.js';
import Budget from '../models/budget.js';
import Transaction from '../models/transaction.js';

const router = express.Router();

// Helper function to get date range for a period
const getPeriodDateRange = (period, referenceDate = new Date()) => {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    let startDate, endDate;

    switch (period) {
        case 'Yearly':
            startDate = new Date(Date.UTC(year, 0, 1));
            endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
            break;
        case 'Quarterly':
            const quarter = Math.floor(month / 3);
            startDate = new Date(Date.UTC(year, quarter * 3, 1));
            endDate = new Date(Date.UTC(year, quarter * 3 + 3, 0, 23, 59, 59, 999));
            break;
        case 'Weekly':
            const dayOfWeek = referenceDate.getDay();
            const diff = referenceDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            startDate = new Date(referenceDate);
            startDate.setDate(diff);
            startDate.setUTCHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setUTCHours(23, 59, 59, 999);
            break;
        case 'Monthly':
        default:
            startDate = new Date(Date.UTC(year, month, 1));
            endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
            break;
    }
    return { startDate, endDate };
};

// Add a Budget Item
router.post('/', authMiddleware, async (req, res) => {
    const { category, amount, period = 'Monthly', type = 'expense' } = req.body;
    const userId = req.user._id;

    // Validation
    if (!category?.trim() || amount === undefined || !period || !type) {
        return res.status(400).json({ message: 'Missing required fields: category, amount, period, type' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: 'Amount must be a positive number' });
    }
    if (!['Monthly', 'Yearly', 'Quarterly', 'Weekly'].includes(period)) {
        return res.status(400).json({ message: 'Invalid period specified' });
    }
    if (!['expense', 'income'].includes(type)) {
        return res.status(400).json({ message: 'Invalid budget type specified (must be expense or income)' });
    }

    try {
        // Create new budget instead of updating existing one
        const newBudget = new Budget({
            user: userId,
            category: category.trim(),
            amount,
            period,
            type
        });
        const savedBudget = await newBudget.save();
        res.status(201).json({ message: 'Budget created successfully', budget: savedBudget });
    } catch (err) {
        console.error("Error creating budget:", err);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ message: 'Budget validation failed', errors: messages });
        }
        res.status(500).json({ message: 'Failed to create budget', error: err.message });
    }
});

// Get All Budgets for User
router.get('/', authMiddleware, async (req, res) => {
    const userId = req.user._id;
    const { period, type } = req.query;

    try {
        const query = { user: userId };
        if (period && ['Monthly', 'Yearly', 'Quarterly', 'Weekly'].includes(period)) {
            query.period = period;
        }
        if (type && ['expense', 'income'].includes(type)) {
            query.type = type;
        }

        const budgets = await Budget.find(query).sort({ type: 1, period: 1, category: 1 });
        res.status(200).json(budgets);
    } catch (err) {
        console.error("Error fetching budgets:", err);
        res.status(500).json({ message: 'Failed to fetch budgets', error: err.message });
    }
});

// Get Budget Overview
router.get('/overview', authMiddleware, async (req, res) => {
    const userId = req.user._id;
    const period = req.query.period || 'Monthly';

    if (!['Monthly', 'Yearly', 'Quarterly', 'Weekly'].includes(period)) {
        return res.status(400).json({ message: 'Invalid period specified' });
    }

    try {
        const { startDate, endDate } = getPeriodDateRange(period);
        const budgets = await Budget.find({ user: userId, period: period });
        const expenseBudgets = budgets.filter(b => b.type === 'expense');
        const incomeGoals = budgets.filter(b => b.type === 'income');

        const [debitTransactions, creditTransactions] = await Promise.all([
            Transaction.find({ user: userId, type: 'debit', date: { $gte: startDate, $lte: endDate } }),
            Transaction.find({ user: userId, type: 'credit', date: { $gte: startDate, $lte: endDate } })
        ]);

        const spentByCategory = debitTransactions.reduce((acc, tx) => {
            const categoryKey = tx.category.trim();
            acc[categoryKey] = (acc[categoryKey] || 0) + tx.amount;
            return acc;
        }, {});

        const earnedByCategory = creditTransactions.reduce((acc, tx) => {
            const categoryKey = tx.category.trim();
            acc[categoryKey] = (acc[categoryKey] || 0) + tx.amount;
            return acc;
        }, {});

        let totalExpenseBudgeted = 0;
        let totalSpentInBudgeted = 0;
        const expenseOverview = expenseBudgets.map(budget => {
            const categoryKey = budget.category.trim();
            const spent = spentByCategory[categoryKey] || 0;
            totalExpenseBudgeted += budget.amount;
            totalSpentInBudgeted += spent;
            return {
                _id: budget._id, category: budget.category, type: budget.type,
                period: budget.period, budgeted: budget.amount, spent: spent,
                remaining: budget.amount - spent,
            };
        });

        let totalSpentUnbudgeted = 0;
        const expenseBudgetedCategories = new Set(expenseBudgets.map(b => b.category.trim()));
        for (const category in spentByCategory) {
            if (!expenseBudgetedCategories.has(category)) {
                totalSpentUnbudgeted += spentByCategory[category];
            }
        }
        const totalOverallSpending = totalSpentInBudgeted + totalSpentUnbudgeted;

        let totalIncomeGoal = 0;
        let totalEarnedInGoal = 0;
        const incomeOverview = incomeGoals.map(budget => {
            const categoryKey = budget.category.trim();
            const earned = earnedByCategory[categoryKey] || 0;
            totalIncomeGoal += budget.amount;
            totalEarnedInGoal += earned;
            return {
                _id: budget._id, category: budget.category, type: budget.type,
                period: budget.period, goal: budget.amount, earned: earned,
                difference: earned - budget.amount,
            };
        });

        let totalEarnedUnbudgeted = 0;
        const incomeGoalCategories = new Set(incomeGoals.map(b => b.category.trim()));
        for (const category in earnedByCategory) {
            if (!incomeGoalCategories.has(category)) {
                totalEarnedUnbudgeted += earnedByCategory[category];
            }
        }
        const totalOverallIncome = totalEarnedInGoal + totalEarnedUnbudgeted;

        res.status(200).json({
            period: {
                type: period,
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
            },
            expenseDetails: {
                budgets: expenseOverview,
                totals: {
                    budgeted: totalExpenseBudgeted,
                    spentInBudgeted: totalSpentInBudgeted,
                    spentUnbudgeted: totalSpentUnbudgeted,
                    spentTotal: totalOverallSpending,
                    remainingOverall: totalExpenseBudgeted - totalSpentInBudgeted,
                }
            },
            incomeDetails: {
                goals: incomeOverview,
                totals: {
                    goal: totalIncomeGoal,
                    earnedInGoal: totalEarnedInGoal,
                    earnedUnbudgeted: totalEarnedUnbudgeted,
                    earnedTotal: totalOverallIncome,
                    differenceOverall: totalEarnedInGoal - totalIncomeGoal,
                }
            }
        });
    } catch (err) {
        console.error("Error fetching budget overview:", err);
        res.status(500).json({ message: 'Failed to fetch budget overview', error: err.message });
    }
});

// Delete a Budget Item
router.delete('/:id', authMiddleware, async (req, res) => {
    const budgetId = req.params.id;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(budgetId)) {
        return res.status(400).json({ message: 'Invalid budget ID format' });
    }

    try {
        const budget = await Budget.findOne({ _id: budgetId, user: userId });
        if (!budget) {
            return res.status(404).json({ message: 'Budget not found or you do not have permission' });
        }

        await Budget.deleteOne({ _id: budgetId, user: userId });
        res.status(200).json({ message: 'Budget deleted successfully' });
    } catch (err) {
        console.error("Error deleting budget:", err);
        res.status(500).json({ message: 'Failed to delete budget', error: err.message });
    }
});

export default router;