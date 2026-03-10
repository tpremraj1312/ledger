import FinancialGoal from '../models/FinancialGoal.js';
import Transaction from '../models/transaction.js';
import { addXP } from './xpService.js';

/**
 * Recalculate all active goals for a user based on actual transaction data.
 * Called after every transaction creation/deletion.
 */
export const recalculateGoalProgress = async (userId, session = null) => {
    try {
        const goals = await FinancialGoal.find({
            user: userId,
            status: 'active'
        }).session(session);

        if (goals.length === 0) return;

        const now = new Date();

        for (const goal of goals) {
            // Check if goal has expired
            if (new Date(goal.endDate) < now && goal.status === 'active') {
                if (goal.type === 'expense_limit') {
                    // For expense limits: if currentAmount <= targetAmount, user succeeded
                    goal.status = goal.currentAmount <= goal.targetAmount ? 'completed' : 'failed';
                } else {
                    // For income/savings targets: if currentAmount >= targetAmount, user succeeded
                    goal.status = goal.currentAmount >= goal.targetAmount ? 'completed' : 'failed';
                }
                if (goal.status === 'completed') {
                    goal.completedAt = now;
                    await addXP(userId, goal.xpReward, `goal_completed_${goal._id}`, session);
                }
                await goal.save({ session });
                continue;
            }

            // Query actual transactions within the goal's date range
            const txQuery = {
                user: userId,
                isDeleted: { $ne: true },
                date: {
                    $gte: new Date(goal.startDate),
                    $lte: new Date(goal.endDate)
                }
            };

            let currentAmount = 0;

            if (goal.type === 'expense_limit') {
                // Sum all debits in the period
                const result = await Transaction.aggregate([
                    { $match: { ...txQuery, type: 'debit' } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ]);
                currentAmount = result.length > 0 ? result[0].total : 0;
            } else if (goal.type === 'income_target') {
                // Sum all credits in the period
                const result = await Transaction.aggregate([
                    { $match: { ...txQuery, type: 'credit' } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ]);
                currentAmount = result.length > 0 ? result[0].total : 0;
            } else if (goal.type === 'savings_target') {
                // Savings = income - expenses
                const incomeResult = await Transaction.aggregate([
                    { $match: { ...txQuery, type: 'credit' } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ]);
                const expenseResult = await Transaction.aggregate([
                    { $match: { ...txQuery, type: 'debit' } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ]);
                const income = incomeResult.length > 0 ? incomeResult[0].total : 0;
                const expenses = expenseResult.length > 0 ? expenseResult[0].total : 0;
                currentAmount = Math.max(0, income - expenses);
            }

            goal.currentAmount = currentAmount;

            // Check auto-completion for non-expense goals (income/savings targets)
            if (goal.type !== 'expense_limit' && currentAmount >= goal.targetAmount) {
                goal.status = 'completed';
                goal.completedAt = now;
                await addXP(userId, goal.xpReward, `goal_completed_${goal._id}`, session);
            }

            await goal.save({ session });
        }
    } catch (error) {
        console.error('Error recalculating goals:', error);
    }
};

/**
 * Get all goals for a user (active first, then completed, then failed).
 */
export const getUserGoals = async (userId) => {
    return FinancialGoal.find({ user: userId })
        .sort({ status: 1, createdAt: -1 })
        .limit(20);
};
