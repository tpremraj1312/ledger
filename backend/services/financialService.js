import mongoose from 'mongoose';
import Transaction from '../models/transaction.js';
import Budget from '../models/budget.js';
import RecurringExpense from '../models/RecurringExpense.js';
import FamilyBudget from '../models/FamilyBudget.js';

export const getFinancialContext = async (userId, filters = {}) => {
    const { startDate, endDate, period = 'Monthly' } = filters;

    const query = { user: userId, isDeleted: false };
    if (startDate || endDate) {
        query.date = {};
        if (startDate) {
            const start = new Date(startDate);
            start.setUTCHours(0, 0, 0, 0);
            query.date.$gte = start;
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setUTCHours(23, 59, 59, 999);
            query.date.$lte = end;
        }
    } else if (period === 'Monthly') {
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
        query.date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    const transactions = await Transaction.find(query).sort({ date: -1 });

    // Totals
    const totals = transactions.reduce((acc, tx) => {
        if (tx.type === 'debit') {
            acc.expenses += tx.amount;
            acc.categoryBreakdown[tx.category] = (acc.categoryBreakdown[tx.category] || 0) + tx.amount;
            if (tx.isNonEssential) acc.nonEssential += tx.amount;
        } else {
            acc.income += tx.amount;
        }
        return acc;
    }, { expenses: 0, income: 0, nonEssential: 0, categoryBreakdown: {} });

    // Budget Progress
    const budgets = await Budget.find({
        user: userId,
        month: startDate ? new Date(startDate).getUTCMonth() + 1 : new Date().getUTCMonth() + 1,
        year: startDate ? new Date(startDate).getUTCFullYear() : new Date().getUTCFullYear()
    });

    let totalBudgeted = 0;
    let totalSpentInBudgets = 0;

    const budgetOverview = budgets.map(b => {
        const spent = totals.categoryBreakdown[b.category] || 0;
        totalBudgeted += b.amount;
        totalSpentInBudgets += Math.min(spent, b.amount);
        return {
            category: b.category,
            budgeted: parseFloat(b.amount.toFixed(2)),
            spent: parseFloat(spent.toFixed(2)),
            remaining: parseFloat((b.amount - spent).toFixed(2)),
            progress: parseFloat(((spent / b.amount) * 100).toFixed(2))
        };
    });

    const budgetUsage = totalBudgeted > 0 ? (totalSpentInBudgets / totalBudgeted) * 100 : 0;

    // Recurring Info
    const upcomingRecurring = await RecurringExpense.find({
        user: userId,
        status: 'active',
        nextOccurrence: { $gte: new Date() }
    }).sort({ nextOccurrence: 1 }).limit(5);

    // Aggregate Trend Data (Daily) for the period
    const trendAgg = await Transaction.aggregate([
        { $match: { ...query, type: 'debit' } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                amount: { $sum: "$amount" }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    const trendData = trendAgg.map(t => ({ date: t._id, amount: t.amount }));

    return {
        transactions: transactions.slice(0, 50),
        totalIncome: parseFloat(totals.income.toFixed(2)),
        totalExpense: parseFloat(totals.expenses.toFixed(2)),
        netSavings: parseFloat((totals.income - totals.expenses).toFixed(2)),
        nonEssential: parseFloat(totals.nonEssential.toFixed(2)),
        budgetUsage: parseFloat(budgetUsage.toFixed(2)),
        categoryBreakdown: Object.entries(totals.categoryBreakdown).map(([name, value]) => ({
            name,
            value: parseFloat(value.toFixed(2))
        })),
        budgets: budgetOverview,
        upcomingRecurring,
        trendData,
        period: {
            start: query.date?.$gte,
            end: query.date?.$lte
        }
    };
};

/**
 * Family Financial Context — aggregates family-mode transactions for a group.
 */
export const getFamilyFinancialContext = async (groupId, filters = {}) => {
    const { startDate, endDate } = filters;
    const groupOid = new mongoose.Types.ObjectId(groupId);

    const dateFilter = {};
    if (startDate || endDate) {
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setUTCHours(23, 59, 59, 999);
            dateFilter.$lte = end;
        }
    } else {
        const now = new Date();
        dateFilter.$gte = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
        dateFilter.$lte = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
    }

    const matchStage = {
        familyGroupId: groupOid,
        mode: 'FAMILY',
        isDeleted: false,
        date: dateFilter,
    };

    // Category breakdown
    const categoryAgg = await Transaction.aggregate([
        { $match: { ...matchStage, type: 'debit' } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]);

    // Member breakdown
    const memberAgg = await Transaction.aggregate([
        { $match: { ...matchStage, type: 'debit' } },
        { $group: { _id: '$spentBy', totalSpent: { $sum: '$amount' } } },
        {
            $lookup: {
                from: 'users', localField: '_id', foreignField: '_id', as: 'u',
            },
        },
        { $unwind: { path: '$u', preserveNullAndEmptyArrays: true } },
        { $project: { userId: '$_id', name: '$u.username', totalSpent: 1, _id: 0 } },
    ]);

    // Totals
    const totalsAgg = await Transaction.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$type',
                total: { $sum: '$amount' },
            },
        },
    ]);

    let totalIncome = 0;
    let totalExpense = 0;
    totalsAgg.forEach((t) => {
        if (t._id === 'credit') totalIncome = t.total;
        if (t._id === 'debit') totalExpense = t.total;
    });

    const categoryBreakdown = {};
    categoryAgg.forEach((c) => { categoryBreakdown[c._id] = c.total; });

    // Family Budget progress
    const m = dateFilter.$gte ? dateFilter.$gte.getUTCMonth() + 1 : new Date().getUTCMonth() + 1;
    const y = dateFilter.$gte ? dateFilter.$gte.getUTCFullYear() : new Date().getUTCFullYear();

    const familyBudget = await FamilyBudget.findOne({ groupId: groupOid, month: m, year: y }).lean();

    const budgetOverview = (familyBudget?.categories || []).map((b) => {
        const spent = categoryBreakdown[b.name] || 0;
        return {
            category: b.name,
            budgeted: b.allocatedAmount,
            spent,
            remaining: b.allocatedAmount - spent,
            progress: b.allocatedAmount > 0 ? ((spent / b.allocatedAmount) * 100) : 0,
        };
    });

    // Monthly trend for family
    const trendAgg = await Transaction.aggregate([
        { $match: { ...matchStage, type: 'debit' } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                amount: { $sum: "$amount" }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    return {
        totalIncome,
        totalExpense,
        netSavings: totalIncome - totalExpense,
        categoryBreakdown: Object.entries(categoryBreakdown).map(([name, value]) => ({ name, value })),
        memberBreakdown: memberAgg,
        budgets: budgetOverview,
        trendData: trendAgg.map(t => ({ date: t._id, amount: t.amount })),
        period: { start: dateFilter.$gte, end: dateFilter.$lte },
    };
};
