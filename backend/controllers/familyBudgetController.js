import FamilyBudget from '../models/FamilyBudget.js';
import Transaction from '../models/transaction.js';
import { logAction } from '../services/auditLogService.js';

export const getFamilyBudget = async (req, res) => {
    try {
        const { month, year } = req.query;
        const groupId = req.familyGroup._id; // Use validated groupId

        const m = parseInt(month) || new Date().getUTCMonth() + 1;
        const y = parseInt(year) || new Date().getUTCFullYear();

        const budget = await FamilyBudget.findOne({ groupId, month: m, year: y }).lean();
        res.json(budget || { groupId, month: m, year: y, categories: [] });
    } catch (error) {
        console.error('getFamilyBudget error:', error);
        res.status(500).json({ message: 'Failed to fetch family budget.' });
    }
};

export const upsertFamilyBudget = async (req, res) => {
    try {
        const { month, year, categories } = req.body;
        const groupId = req.familyGroup._id;

        if (!month || !year || !categories || !Array.isArray(categories)) {
            return res.status(400).json({ message: 'month, year, and categories array are required.' });
        }

        const budget = await FamilyBudget.findOneAndUpdate(
            { groupId, month: parseInt(month), year: parseInt(year) },
            { categories },
            { upsert: true, new: true, runValidators: true }
        );

        await logAction(groupId, req.user._id, 'BUDGET_UPDATED',
            `Budget updated for ${month}/${year}`);

        res.json(budget);
    } catch (error) {
        console.error('upsertFamilyBudget error:', error);
        res.status(500).json({ message: 'Failed to update family budget.' });
    }
};

export const copyPreviousMonth = async (req, res) => {
    try {
        const { month, year } = req.body;
        const groupId = req.familyGroup._id;

        let prevMonth = parseInt(month) - 1;
        let prevYear = parseInt(year);
        if (prevMonth < 1) { prevMonth = 12; prevYear -= 1; }

        const prevBudget = await FamilyBudget.findOne({
            groupId, month: prevMonth, year: prevYear,
        }).lean();

        if (!prevBudget || prevBudget.categories.length === 0) {
            return res.status(404).json({ message: 'No budget found for the previous month.' });
        }

        const budget = await FamilyBudget.findOneAndUpdate(
            { groupId, month: parseInt(month), year: parseInt(year) },
            { categories: prevBudget.categories },
            { upsert: true, new: true, runValidators: true }
        );

        await logAction(groupId, req.user._id, 'BUDGET_COPIED',
            `Copied budget from ${prevMonth}/${prevYear} to ${month}/${year}`);

        res.json(budget);
    } catch (error) {
        console.error('copyPreviousMonth error:', error);
        res.status(500).json({ message: 'Failed to copy previous month budget.' });
    }
};

export const getFamilyBudgetUsage = async (req, res) => {
    try {
        const { month, year } = req.query;
        const groupId = req.familyGroup._id;
        const mongoose = (await import('mongoose')).default;

        const m = parseInt(month) || new Date().getUTCMonth() + 1;
        const y = parseInt(year) || new Date().getUTCFullYear();

        const budget = await FamilyBudget.findOne({ groupId, month: m, year: y }).lean();

        const startOfMonth = new Date(Date.UTC(y, m - 1, 1));
        const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

        // Aggregate by category
        const categoryAgg = await Transaction.aggregate([
            {
                $match: {
                    familyGroupId: groupId, // Already an ObjectId from req.familyGroup
                    mode: 'FAMILY',
                    type: 'debit',
                    isDeleted: false,
                    date: { $gte: startOfMonth, $lte: endOfMonth },
                },
            },
            { $group: { _id: '$category', totalSpent: { $sum: '$amount' } } },
        ]);

        // Aggregate by member
        const memberAgg = await Transaction.aggregate([
            {
                $match: {
                    familyGroupId: groupId,
                    mode: 'FAMILY',
                    type: 'debit',
                    isDeleted: false,
                    date: { $gte: startOfMonth, $lte: endOfMonth },
                },
            },
            { $group: { _id: '$spentBy', totalSpent: { $sum: '$amount' } } },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo',
                },
            },
            { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    userId: '$_id',
                    name: '$userInfo.username',
                    email: '$userInfo.email',
                    totalSpent: 1,
                    _id: 0,
                },
            },
        ]);

        const categoryMap = {};
        categoryAgg.forEach((c) => { categoryMap[c._id] = c.totalSpent; });

        const usage = (budget?.categories || []).map((cat) => {
            const spent = categoryMap[cat.name] || 0;
            return {
                name: cat.name,
                allocatedAmount: cat.allocatedAmount,
                spent,
                remaining: cat.allocatedAmount - spent,
                progress: cat.allocatedAmount > 0 ? ((spent / cat.allocatedAmount) * 100).toFixed(1) : 0,
            };
        });

        res.json({
            budget: budget || { groupId, month: m, year: y, categories: [] },
            categoryUsage: usage,
            memberBreakdown: memberAgg,
        });
    } catch (error) {
        console.error('getFamilyBudgetUsage error:', error);
        res.status(500).json({ message: 'Failed to fetch budget usage.' });
    }
};
