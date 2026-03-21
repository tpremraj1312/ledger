/**
 * Agent Context Builder — Builds compact financial context for LLM injection.
 * 
 * Assembles real-time financial data into a structured text block so the LLM
 * can reason about the user's actual situation instead of giving generic advice.
 * 
 * Uses a 5-minute in-memory cache to avoid hammering MongoDB on every message.
 */

import mongoose from 'mongoose';
import Transaction from '../models/transaction.js';
import Budget from '../models/budget.js';
import Investment from '../models/Investment.js';
import FamilyGroup from '../models/FamilyGroup.js';
import User from '../models/user.js';
import RecurringExpense from '../models/RecurringExpense.js';
import FinancialGoal from '../models/FinancialGoal.js';
import { getGamificationProfile } from '../services/xpService.js';

// ═══════════════════════════════════════════════════════════════
// CACHE — 5-minute TTL per user
// ═══════════════════════════════════════════════════════════════
const contextCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Purge expired entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of contextCache) {
        if (now - entry.timestamp > CACHE_TTL_MS * 2) {
            contextCache.delete(key);
        }
    }
}, 10 * 60 * 1000);

const getCached = (key) => {
    const entry = contextCache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
        return entry.data;
    }
    return null;
};

const setCache = (key, data) => {
    contextCache.set(key, { data, timestamp: Date.now() });
};

/**
 * Invalidate the cache for a user (call after write operations)
 */
export const invalidateUserContext = (userId) => {
    const key = `ctx_${userId}`;
    contextCache.delete(key);
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
const fmt = (amount) => {
    if (amount === undefined || amount === null) return '₹0';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
};

const getCurrentMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
};

const getMonthLabel = () => {
    return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

// ═══════════════════════════════════════════════════════════════
// MAIN CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════

/**
 * Build a compact, structured financial context string for LLM injection.
 * Returns ~300-500 tokens of critical financial data.
 *
 * @param {string} userId — MongoDB user ID
 * @returns {string} — Formatted context block
 */
export const buildUserContext = async (userId) => {
    const cacheKey = `ctx_${userId}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
        const userOid = new mongoose.Types.ObjectId(userId);
        const { start, end } = getCurrentMonthRange();
        const monthLabel = getMonthLabel();

        // ── 1. Current Month Transactions ──
        const [expenseAgg, incomeAgg] = await Promise.all([
            Transaction.aggregate([
                { $match: { user: userOid, type: 'debit', isDeleted: false, mode: 'PERSONAL', date: { $gte: start, $lte: end } } },
                { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
                { $sort: { total: -1 } },
            ]),
            Transaction.aggregate([
                { $match: { user: userOid, type: 'credit', isDeleted: false, mode: 'PERSONAL', date: { $gte: start, $lte: end } } },
                { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
            ]),
        ]);

        const totalExpenses = expenseAgg.reduce((s, c) => s + c.total, 0);
        const totalIncome = incomeAgg[0]?.total || 0;
        const txCount = expenseAgg.reduce((s, c) => s + c.count, 0) + (incomeAgg[0]?.count || 0);
        const netSavings = totalIncome - totalExpenses;

        const topCategories = expenseAgg.slice(0, 5).map(c => ({
            name: c._id,
            amount: Math.round(c.total),
            pct: totalExpenses > 0 ? Math.round((c.total / totalExpenses) * 100) : 0,
        }));

        // ── 2. Budget Status ──
        const now = new Date();
        const budgets = await Budget.find({
            user: userOid,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            type: 'expense',
        }).lean();

        let budgetLines = [];
        let overBudgetCount = 0;
        for (const b of budgets) {
            const catExpense = expenseAgg.find(c => c._id === b.category);
            const spent = catExpense ? catExpense.total : 0;
            const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
            if (pct > 100) overBudgetCount++;
            budgetLines.push(`${b.category}: ${fmt(spent)}/${fmt(b.amount)} (${pct}%)${pct > 100 ? ' ⚠️OVER' : ''}`);
        }

        // ── 3. Investment Summary ──
        const investments = await Investment.find({ user: userOid }).lean();
        const totalInvested = investments.reduce((s, i) => s + (i.investedAmount || 0), 0);
        const investmentByType = {};
        investments.forEach(i => {
            investmentByType[i.assetType] = (investmentByType[i.assetType] || 0) + (i.investedAmount || 0);
        });
        const investAlloc = Object.entries(investmentByType)
            .sort((a, b) => b[1] - a[1])
            .map(([type, amt]) => `${type}: ${totalInvested > 0 ? Math.round((amt / totalInvested) * 100) : 0}%`);

        // ── 4. Recurring Expenses ──
        const recurringCount = await RecurringExpense.countDocuments({ user: userOid, status: 'active' });
        const recurringTotal = await RecurringExpense.aggregate([
            { $match: { user: userOid, status: 'active' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        const monthlyRecurring = recurringTotal[0]?.total || 0;

        // ── 4b. Top Investment Holdings ──
        const topHoldings = investments.slice().sort((a, b) => (b.investedAmount || 0) - (a.investedAmount || 0)).slice(0, 5);
        const topHoldingsLines = topHoldings.map((h, i) => `${i + 1}. ${h.name} (${h.assetType}) — ${fmt(h.investedAmount || 0)}`).join('\n• ');

        // ── 4c. Financial Goals ──
        const activeGoals = await FinancialGoal.find({ user: userOid, status: 'active' }).lean();
        const completedGoalCount = await FinancialGoal.countDocuments({ user: userOid, status: 'completed' });
        const goalLines = activeGoals.slice(0, 5).map(g => {
            const progress = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
            return `${g.title}: ${fmt(g.currentAmount)}/${fmt(g.targetAmount)} (${progress}%)`;
        });

        // ── 4d. Income Breakdown ──
        const incomeByCategory = await Transaction.aggregate([
            { $match: { user: userOid, type: 'credit', isDeleted: false, mode: 'PERSONAL', date: { $gte: start, $lte: end } } },
            { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
        ]);
        const incomeLines = incomeByCategory.map(c => `${c._id}: ${fmt(c.total)} (${incomeByCategory.length > 0 ? Math.round((c.total / totalIncome) * 100) : 0}%)`);

        // ── 5. Gamification ──
        let questLine = '';
        try {
            const profile = await getGamificationProfile(userId);
            questLine = `Level ${profile.level} "${profile.title}" | ${profile.xp} XP | 🔥 ${profile.currentStreak}-day streak | ${profile.badges?.length || 0} badges`;
        } catch {
            questLine = 'Not available';
        }

        // ── 6. User Preferences ──
        const user = await User.findById(userOid).select('settings profile currentFamilyId').lean();
        const taxRegime = user?.settings?.tax?.regime || 'New';
        const riskAppetite = user?.settings?.investment?.riskAppetite || 'Medium';

        // ── 7. Family Context ──
        let familyLine = 'Not in a family group';
        let familyRole = 'user';
        if (user?.currentFamilyId) {
            try {
                const group = await FamilyGroup.findById(user.currentFamilyId)
                    .populate('members.user', 'username')
                    .lean();
                if (group) {
                    const member = group.members.find(m => m.user?._id?.toString() === userId.toString());
                    familyRole = member?.role || 'VIEWER';

                    // Family expenses this month
                    const familyExpAgg = await Transaction.aggregate([
                        { $match: { familyGroupId: group._id, type: 'debit', isDeleted: false, mode: 'FAMILY', date: { $gte: start, $lte: end } } },
                        { $group: { _id: null, total: { $sum: '$amount' } } },
                    ]);
                    const famExpense = familyExpAgg[0]?.total || 0;
                    familyLine = `"${group.name}" | Role: ${familyRole} | ${group.members.length} members | ${fmt(famExpense)} family expenses this month`;
                }
            } catch { /* ignore */ }
        }

        // ── 8. Previous Month Comparison ──
        const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        const prevExpAgg = await Transaction.aggregate([
            { $match: { user: userOid, type: 'debit', isDeleted: false, mode: 'PERSONAL', date: { $gte: prevStart, $lte: prevEnd } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        const prevMonthExpense = prevExpAgg[0]?.total || 0;
        const monthOverMonthChange = prevMonthExpense > 0
            ? Math.round(((totalExpenses - prevMonthExpense) / prevMonthExpense) * 100)
            : 0;

        // ── BUILD CONTEXT STRING ──
        const dayOfMonth = now.getDate();
        const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysRemaining = totalDaysInMonth - dayOfMonth;

        const context = [
            `[USER FINANCIAL CONTEXT — ${monthLabel}]`,
            `Day: ${dayOfMonth}/${totalDaysInMonth} (${daysRemaining} days remaining)`,
            ``,
            `💰 INCOME & EXPENSES`,
            `Income: ${fmt(totalIncome)} | Expenses: ${fmt(totalExpenses)} | Net Savings: ${fmt(netSavings)} | ${txCount} transactions`,
            `Month-over-Month: ${monthOverMonthChange > 0 ? '+' : ''}${monthOverMonthChange}% vs last month`,
            ``,
            `📊 TOP CATEGORIES`,
            topCategories.length > 0
                ? topCategories.map(c => `• ${c.name}: ${fmt(c.amount)} (${c.pct}%)`).join('\n')
                : '• No expenses recorded yet',
            ``,
            `📋 BUDGETS (${budgets.length} active${overBudgetCount > 0 ? `, ⚠️ ${overBudgetCount} OVER` : ''})`,
            budgetLines.length > 0 ? budgetLines.map(l => `• ${l}`).join('\n') : '• No budgets set',
            ``,
            `📈 INVESTMENTS (${investments.length} holdings | ${fmt(totalInvested)} total)`,
            investAlloc.length > 0 ? `Allocation: ${investAlloc.join(', ')}` : 'No investments',
            topHoldings.length > 0 ? `Top Holdings:\n• ${topHoldingsLines}` : '',
            ``,
            `💰 INCOME SOURCES`,
            incomeLines.length > 0 ? incomeLines.map(l => `• ${l}`).join('\n') : `• Total income: ${fmt(totalIncome)} (no category breakdown)`,
            ``,
            `🎯 GOALS (${activeGoals.length} active, ${completedGoalCount} completed)`,
            goalLines.length > 0 ? goalLines.map(l => `• ${l}`).join('\n') : '• No active goals set',
            ``,
            `🔄 RECURRING: ${recurringCount} active subscriptions (${fmt(monthlyRecurring)}/cycle)`,
            ``,
            `🏆 QUEST: ${questLine}`,
            ``,
            `⚙️ PREFERENCES: Tax Regime: ${taxRegime} | Risk Appetite: ${riskAppetite}`,
            `👨‍👩‍👧 FAMILY: ${familyLine}`,
            ``,
            `[END CONTEXT — Use this data to give personalized, specific financial advice. Never hallucinate numbers not in this context.]`,
        ].join('\n');

        setCache(cacheKey, context);
        return context;
    } catch (error) {
        console.error('Context builder error:', error);
        return '[FINANCIAL CONTEXT UNAVAILABLE — Answer generally but recommend the user check their data.]';
    }
};

/**
 * Resolve user's family role from DB (never trust frontend).
 * @param {string} userId
 * @returns {string} — 'ADMIN' | 'MEMBER' | 'VIEWER' | 'user'
 */
export const resolveUserRole = async (userId) => {
    try {
        const user = await User.findById(userId).select('currentFamilyId').lean();
        if (!user?.currentFamilyId) return 'user';

        const group = await FamilyGroup.findById(user.currentFamilyId).select('members').lean();
        if (!group) return 'user';

        const member = group.members.find(m => m.user?.toString() === userId.toString());
        return member?.role || 'user';
    } catch {
        return 'user';
    }
};
