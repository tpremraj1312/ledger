import express from 'express';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/authMiddleware.js';
import Budget from '../models/budget.js'; // Import Budget model
import Transaction from '../models/transaction.js'; // Import Transaction model for overview

const router = express.Router();

// Helper function to get date range for a period (e.g., 'Monthly')
const getPeriodDateRange = (period, referenceDate = new Date()) => {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth(); // 0-indexed
    let startDate, endDate;

    switch (period) {
        case 'Yearly':
            startDate = new Date(Date.UTC(year, 0, 1)); // Jan 1st
            endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)); // Dec 31st
            break;
        case 'Quarterly':
            const quarter = Math.floor(month / 3);
            startDate = new Date(Date.UTC(year, quarter * 3, 1)); // Start of quarter
            endDate = new Date(Date.UTC(year, quarter * 3 + 3, 0, 23, 59, 59, 999)); // End of quarter
            break;
        case 'Weekly':
             const dayOfWeek = referenceDate.getDay(); // 0 = Sunday, 1 = Monday...
             const diff = referenceDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
             startDate = new Date(referenceDate.setDate(diff));
             startDate.setUTCHours(0, 0, 0, 0);
             endDate = new Date(startDate);
             endDate.setDate(startDate.getDate() + 6);
             endDate.setUTCHours(23, 59, 59, 999);
             break;
        case 'Monthly':
        default: // Default to Monthly
            startDate = new Date(Date.UTC(year, month, 1)); // First day of current month
            endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)); // Last day of current month
            break;
    }
    return { startDate, endDate };
};


// --- Add or Update a Budget Item (Handles Type: expense/income) ---
// Route: POST /api/budgets
// Access: Private
router.post('/', authMiddleware, async (req, res) => {
    // Include 'type' in destructuring, default to 'expense'
    const { category, amount, period = 'Monthly', type = 'expense' } = req.body;
    const userId = req.user._id; // Use req.user._id

    // Validation
    if (!category || amount === undefined || !period || !type) { // Added type validation
        return res.status(400).json({ message: 'Missing required fields: category, amount, period, type' });
    }
    if (typeof amount !== 'number' || amount < 0) {
        return res.status(400).json({ message: 'Invalid amount (must be a non-negative number)' });
    }
    if (!['Monthly', 'Yearly', 'Quarterly', 'Weekly'].includes(period)) {
        return res.status(400).json({ message: 'Invalid period specified' });
    }
    if (!['expense', 'income'].includes(type)) { // Validate type
        return res.status(400).json({ message: 'Invalid budget type specified (must be expense or income)' });
    }

    try {
        // Include type in the filter to ensure uniqueness per type
        const filter = { user: userId, category: category.trim(), period: period, type: type };
        // Update amount (and implicitly type via filter/upsert)
        const update = { amount: amount, type: type }; // Ensure type is set on update/insert
        const options = {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
            runValidators: true,
        };

        // Find budget matching user, category, period, type and update amount, or insert if not found
        const savedBudget = await Budget.findOneAndUpdate(filter, update, options);

        res.status(201).json({ message: 'Budget saved successfully', budget: savedBudget });

    } catch (err) {
        console.error("Error saving budget:", err);
         if (err.name === 'ValidationError') {
             const messages = Object.values(err.errors).map(e => e.message);
             return res.status(400).json({ message: 'Budget validation failed', errors: messages });
         }
         // Handle potential duplicate key error if index isn't working as expected
         if (err.code === 11000) {
             return res.status(409).json({ message: `A budget for ${category} (${type}) already exists for this period.` });
         }
        res.status(500).json({ message: 'Failed to save budget', error: err.message });
    }
});

// --- Get All Budgets for User (Includes Type) ---
// Route: GET /api/budgets
// Access: Private
// Filter: Optionally filter by period (?period=Monthly) or type (?type=income)
router.get('/', authMiddleware, async (req, res) => {
    const userId = req.user._id;
    const { period, type } = req.query; // Add type filter

    try {
        const query = { user: userId };
        if (period && ['Monthly', 'Yearly', 'Quarterly', 'Weekly'].includes(period)) {
            query.period = period;
        }
        if (type && ['expense', 'income'].includes(type)) { // Add type query
            query.type = type;
        }

        // Sort includes type now
        const budgets = await Budget.find(query).sort({ type: 1, period: 1, category: 1 });
        res.status(200).json(budgets);

    } catch (err) {
        console.error("Error fetching budgets:", err);
        res.status(500).json({ message: 'Failed to fetch budgets', error: err.message });
    }
});

// --- Get Budget Overview (Separates Expense Budgets vs Income Goals) ---
// Route: GET /api/budgets/overview
// Access: Private
// Filter: Optionally filter by period (?period=Monthly - defaults to Monthly)
router.get('/overview', authMiddleware, async (req, res) => {
    const userId = req.user._id;
    const period = req.query.period || 'Monthly'; // Default to Monthly

    if (!['Monthly', 'Yearly', 'Quarterly', 'Weekly'].includes(period)) {
        return res.status(400).json({ message: 'Invalid period specified' });
    }

    try {
        // 1. Determine Date Range for the period
        const { startDate, endDate } = getPeriodDateRange(period);

        // 2. Fetch Budgets (both types) for the specified period
        const budgets = await Budget.find({ user: userId, period: period });
        const expenseBudgets = budgets.filter(b => b.type === 'expense');
        const incomeGoals = budgets.filter(b => b.type === 'income');

        // 3. Fetch relevant Transactions (debits for expenses, credits for income)
        const [debitTransactions, creditTransactions] = await Promise.all([
            Transaction.find({ user: userId, type: 'debit', date: { $gte: startDate, $lte: endDate } }),
            Transaction.find({ user: userId, type: 'credit', date: { $gte: startDate, $lte: endDate } })
        ]);

        // 4. Aggregate Spending (Debits) by Category
        const spentByCategory = debitTransactions.reduce((acc, tx) => {
            const categoryKey = tx.category.trim();
            acc[categoryKey] = (acc[categoryKey] || 0) + tx.amount;
            return acc;
        }, {});

        // 5. Aggregate Income (Credits) by Category
        const earnedByCategory = creditTransactions.reduce((acc, tx) => {
            const categoryKey = tx.category.trim();
            acc[categoryKey] = (acc[categoryKey] || 0) + tx.amount;
            return acc;
        }, {});

        // 6. Process Expense Budgets
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

        // Calculate unbudgeted spending
        let totalSpentUnbudgeted = 0;
        const expenseBudgetedCategories = new Set(expenseBudgets.map(b => b.category.trim()));
        for (const category in spentByCategory) {
            if (!expenseBudgetedCategories.has(category)) {
                totalSpentUnbudgeted += spentByCategory[category];
            }
        }
        const totalOverallSpending = totalSpentInBudgeted + totalSpentUnbudgeted;

        // 7. Process Income Goals
        let totalIncomeGoal = 0;
        let totalEarnedInGoal = 0;
        const incomeOverview = incomeGoals.map(budget => {
            const categoryKey = budget.category.trim();
            const earned = earnedByCategory[categoryKey] || 0;
            totalIncomeGoal += budget.amount;
            totalEarnedInGoal += earned;
            return {
                _id: budget._id, category: budget.category, type: budget.type,
                period: budget.period, goal: budget.amount, earned: earned, // Use goal/earned terms
                difference: earned - budget.amount, // Positive means exceeded goal
            };
        });

        // Calculate income from categories without goals
        let totalEarnedUnbudgeted = 0;
        const incomeGoalCategories = new Set(incomeGoals.map(b => b.category.trim()));
        for (const category in earnedByCategory) {
            if (!incomeGoalCategories.has(category)) {
                totalEarnedUnbudgeted += earnedByCategory[category];
            }
        }
        const totalOverallIncome = totalEarnedInGoal + totalEarnedUnbudgeted;

        // 8. Construct Response
        res.status(200).json({
            period: {
                type: period,
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
             },
            expenseDetails: { // Renamed from 'overview'
                budgets: expenseOverview, // List of expense budgets and their status
                totals: {
                    budgeted: totalExpenseBudgeted,
                    spentInBudgeted: totalSpentInBudgeted,
                    spentUnbudgeted: totalSpentUnbudgeted,
                    spentTotal: totalOverallSpending,
                    remainingOverall: totalExpenseBudgeted - totalSpentInBudgeted,
                }
            },
            incomeDetails: { // Added section for income goals
                goals: incomeOverview, // List of income goals and their status
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


// --- Delete a Budget Item ---
// Route: DELETE /api/budgets/:id
// Access: Private
router.delete('/:id', authMiddleware, async (req, res) => {
    const budgetId = req.params.id;
    const userId = req.user._id; // Use req.user._id

     if (!mongoose.Types.ObjectId.isValid(budgetId)) {
       return res.status(400).json({ message: 'Invalid budget ID format' });
     }

    try {
        // No need to check type, just find by ID and verify user ownership
        const budget = await Budget.findOne({ _id: budgetId, user: userId });

        if (!budget) {
            // Changed message slightly for clarity
            return res.status(404).json({ message: 'Budget not found or you do not have permission' });
        }

        // Perform the delete using the verified ID and user
        await Budget.deleteOne({ _id: budgetId, user: userId });

        res.status(200).json({ message: 'Budget deleted successfully' });

    } catch (err) {
         console.error("Error deleting budget:", err);
         res.status(500).json({ message: 'Failed to delete budget', error: err.message });
    }
});


export default router;