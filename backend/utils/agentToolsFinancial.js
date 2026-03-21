/**
 * Financial Agent Tools — Granular data-access tools for deep financial intelligence.
 *
 * Domains: Investments (detailed), Goals, Transactions (enhanced), Health Scoring
 *
 * Imported and merged into the main TOOL_REGISTRY in agentTools.js.
 */

import mongoose from 'mongoose';
import Transaction from '../models/transaction.js';
import Budget from '../models/budget.js';
import Investment from '../models/Investment.js';
import FinancialGoal from '../models/FinancialGoal.js';
import RecurringExpense from '../models/RecurringExpense.js';
import User from '../models/user.js';

const fmt = (amount) => {
    if (amount === undefined || amount === null) return '₹0';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const getCurrentMonthRange = () => {
    const now = new Date();
    return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
};

const CHART_COLORS = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777', '#0891B2', '#65A30D', '#E11D48', '#0D9488'];

// ═══════════════════════════════════════════════════════════════
// INVESTMENT TOOLS — Granular Holdings Access
// ═══════════════════════════════════════════════════════════════

export const getInvestmentHoldingsDetailed = async (userId) => {
    const investments = await Investment.find({ user: userId }).sort({ investedAmount: -1 }).lean();

    if (investments.length === 0) {
        return {
            success: true,
            data: { holdings: [], totalInvested: 0, count: 0 },
            message: "📈 You don't have any investments recorded yet. Add investments via the Investments section to unlock detailed portfolio insights, tracking, and AI-powered recommendations.",
        };
    }

    const totalInvested = investments.reduce((s, i) => s + (i.investedAmount || 0), 0);

    const holdings = investments.map((inv, idx) => ({
        rank: idx + 1,
        name: inv.name,
        symbol: inv.symbol,
        assetType: inv.assetType,
        quantity: inv.quantity,
        buyPrice: inv.buyPrice,
        investedAmount: inv.investedAmount,
        buyDate: inv.buyDate,
        allocation: totalInvested > 0 ? Math.round((inv.investedAmount / totalInvested) * 100) : 0,
        notes: inv.notes || '',
    }));

    const holdingsList = holdings.slice(0, 15).map(h =>
        `• ${h.rank}. ${h.name} (${h.assetType}) — ${fmt(h.investedAmount)} (${h.allocation}%) | Qty: ${h.quantity} @ ${fmt(h.buyPrice)}`
    ).join('\n');

    return {
        success: true,
        data: { holdings, totalInvested, count: investments.length },
        message: `📈 **Investment Holdings** — ${investments.length} holdings worth ${fmt(totalInvested)}:\n\n${holdingsList}${investments.length > 15 ? `\n\n...and ${investments.length - 15} more holdings` : ''}`,
        chartData: {
            type: 'pie',
            data: holdings.slice(0, 8).map(h => ({ name: h.name, value: h.investedAmount })),
            nameKey: 'name', valueKey: 'value',
            title: 'Holdings Allocation',
            colors: CHART_COLORS,
        },
    };
};

export const getTopHoldings = async (userId, params) => {
    const limit = params.limit || 5;
    const investments = await Investment.find({ user: userId }).sort({ investedAmount: -1 }).limit(limit).lean();

    if (investments.length === 0) {
        return {
            success: true,
            data: { topHoldings: [], count: 0 },
            message: "📈 No investments found. Add your holdings to see top positions and concentration analysis.",
        };
    }

    const totalInvested = await Investment.find({ user: userId }).lean().then(all => all.reduce((s, i) => s + (i.investedAmount || 0), 0));

    const topHoldings = investments.map((inv, idx) => ({
        rank: idx + 1,
        name: inv.name,
        symbol: inv.symbol,
        assetType: inv.assetType,
        investedAmount: inv.investedAmount,
        allocation: totalInvested > 0 ? Math.round((inv.investedAmount / totalInvested) * 100) : 0,
    }));

    const topConcentration = topHoldings.reduce((s, h) => s + h.allocation, 0);

    return {
        success: true,
        data: { topHoldings, totalInvested, topConcentration },
        message: `🏆 **Top ${limit} Holdings** (${topConcentration}% of portfolio):\n\n${topHoldings.map(h => `• ${h.rank}. ${h.name} — ${fmt(h.investedAmount)} (${h.allocation}%)`).join('\n')}`,
        chartData: {
            type: 'bar',
            data: topHoldings.map(h => ({ name: h.name.length > 12 ? h.name.substring(0, 12) + '…' : h.name, Invested: h.investedAmount })),
            xKey: 'name', yKey: 'Invested',
            title: `Top ${limit} Holdings`,
            colors: ['#2563EB'],
        },
    };
};

export const getSectorAllocation = async (userId) => {
    const investments = await Investment.find({ user: userId }).lean();

    if (investments.length === 0) {
        return {
            success: true,
            data: { sectors: [], totalInvested: 0 },
            message: "📊 No investments to analyze. Add holdings to see sector/asset-type allocation breakdown.",
        };
    }

    const totalInvested = investments.reduce((s, i) => s + (i.investedAmount || 0), 0);
    const byType = {};
    investments.forEach(i => {
        if (!byType[i.assetType]) byType[i.assetType] = { amount: 0, count: 0, holdings: [] };
        byType[i.assetType].amount += i.investedAmount || 0;
        byType[i.assetType].count += 1;
        byType[i.assetType].holdings.push(i.name);
    });

    const sectors = Object.entries(byType)
        .sort((a, b) => b[1].amount - a[1].amount)
        .map(([type, data]) => ({
            assetType: type,
            invested: Math.round(data.amount),
            allocation: totalInvested > 0 ? Math.round((data.amount / totalInvested) * 100) : 0,
            holdingCount: data.count,
            topHolding: data.holdings[0] || '',
        }));

    return {
        success: true,
        data: { sectors, totalInvested },
        message: `📊 **Asset Allocation** across ${sectors.length} types:\n\n${sectors.map(s => `• ${s.assetType}: ${fmt(s.invested)} (${s.allocation}%) — ${s.holdingCount} holdings`).join('\n')}`,
        chartData: {
            type: 'pie',
            data: sectors.map(s => ({ name: s.assetType, value: s.invested })),
            nameKey: 'name', valueKey: 'value',
            title: 'Sector/Asset Allocation',
            colors: CHART_COLORS,
        },
    };
};

export const getInvestmentsByType = async (userId, params) => {
    const { assetType } = params;
    const query = { user: userId };
    if (assetType) query.assetType = { $regex: new RegExp(`^${assetType}$`, 'i') };

    const investments = await Investment.find(query).sort({ investedAmount: -1 }).lean();

    if (investments.length === 0) {
        return {
            success: true,
            data: { investments: [], count: 0 },
            message: assetType
                ? `📈 No ${assetType} investments found. You can add them via the Investments section.`
                : "📈 No investments found.",
        };
    }

    const totalInvested = investments.reduce((s, i) => s + (i.investedAmount || 0), 0);
    const holdings = investments.map(inv => ({
        name: inv.name,
        symbol: inv.symbol,
        assetType: inv.assetType,
        quantity: inv.quantity,
        buyPrice: inv.buyPrice,
        investedAmount: inv.investedAmount,
        buyDate: inv.buyDate,
    }));

    return {
        success: true,
        data: { investments: holdings, count: investments.length, totalInvested },
        message: `📈 **${assetType || 'All'} Investments** — ${holdings.length} holdings worth ${fmt(totalInvested)}:\n\n${holdings.slice(0, 10).map(h => `• ${h.name} — ${fmt(h.investedAmount)} | Qty: ${h.quantity}`).join('\n')}`,
        chartData: holdings.length > 1 ? {
            type: 'bar',
            data: holdings.slice(0, 8).map(h => ({ name: h.name.length > 15 ? h.name.substring(0, 15) + '…' : h.name, Invested: h.investedAmount })),
            xKey: 'name', yKey: 'Invested',
            title: `${assetType || 'All'} Holdings`,
            colors: CHART_COLORS,
        } : undefined,
    };
};

export const getInvestmentGrowthTimeline = async (userId) => {
    const investments = await Investment.find({ user: userId }).sort({ buyDate: 1 }).lean();

    if (investments.length === 0) {
        return {
            success: true,
            data: { timeline: [], totalInvested: 0 },
            message: "📈 No investments to build a timeline. Add holdings with buy dates to see your investment growth journey.",
        };
    }

    // Build cumulative timeline by month
    const monthlyMap = {};
    let cumulative = 0;
    investments.forEach(inv => {
        const d = new Date(inv.buyDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyMap[key]) monthlyMap[key] = 0;
        monthlyMap[key] += inv.investedAmount || 0;
    });

    const timeline = [];
    for (const [month, amount] of Object.entries(monthlyMap).sort()) {
        cumulative += amount;
        timeline.push({ month, added: Math.round(amount), cumulative: Math.round(cumulative) });
    }

    return {
        success: true,
        data: { timeline, totalInvested: cumulative },
        message: `📈 **Investment Growth Timeline** — ${fmt(cumulative)} invested across ${timeline.length} months:\n\n${timeline.slice(-6).map(t => `• ${t.month}: +${fmt(t.added)} → Total: ${fmt(t.cumulative)}`).join('\n')}`,
        chartData: {
            type: 'area',
            data: timeline,
            xKey: 'month', yKey: 'cumulative',
            title: 'Cumulative Investment Growth',
            colors: ['#059669'],
        },
    };
};

// ═══════════════════════════════════════════════════════════════
// FINANCIAL GOAL TOOLS
// ═══════════════════════════════════════════════════════════════

export const getGoalsOverview = async (userId) => {
    const goals = await FinancialGoal.find({ user: userId }).sort({ status: 1, endDate: 1 }).lean();

    if (goals.length === 0) {
        return {
            success: true,
            data: { goals: [], count: 0 },
            message: "🎯 No financial goals set yet. Create goals to track your progress toward expense limits, income targets, or savings objectives.",
        };
    }

    const active = goals.filter(g => g.status === 'active');
    const completed = goals.filter(g => g.status === 'completed');
    const failed = goals.filter(g => g.status === 'failed');

    const goalList = goals.map(g => {
        const progress = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
        const statusIcon = g.status === 'completed' ? '✅' : g.status === 'failed' ? '❌' : progress >= 80 ? '🟢' : progress >= 50 ? '🟡' : '🔴';
        return {
            title: g.title,
            type: g.type,
            targetAmount: g.targetAmount,
            currentAmount: g.currentAmount,
            progress,
            status: g.status,
            period: g.period,
            startDate: g.startDate,
            endDate: g.endDate,
            statusIcon,
        };
    });

    return {
        success: true,
        data: { goals: goalList, activeCount: active.length, completedCount: completed.length, failedCount: failed.length },
        message: `🎯 **Financial Goals** — ${active.length} active, ${completed.length} completed, ${failed.length} failed:\n\n${goalList.map(g => `${g.statusIcon} ${g.title}: ${fmt(g.currentAmount)}/${fmt(g.targetAmount)} (${g.progress}%) — ${g.status}`).join('\n')}`,
        chartData: active.length > 0 ? {
            type: 'bar',
            data: goalList.filter(g => g.status === 'active').map(g => ({
                goal: g.title.length > 15 ? g.title.substring(0, 15) + '…' : g.title,
                Current: g.currentAmount,
                Target: g.targetAmount,
            })),
            xKey: 'goal', yKey: 'Current',
            title: 'Active Goals Progress',
            colors: ['#059669', '#D1D5DB'],
        } : undefined,
    };
};

export const getGoalProgress = async (userId, params) => {
    const query = { user: userId };
    if (params.title) query.title = { $regex: params.title, $options: 'i' };
    if (params.status) query.status = params.status;

    const goals = await FinancialGoal.find(query).lean();

    if (goals.length === 0) {
        return {
            success: true,
            data: { goals: [] },
            message: params.title
                ? `🎯 No goal found matching "${params.title}". Check your goals list or create a new one.`
                : "🎯 No goals found with the specified criteria.",
        };
    }

    const detailed = goals.map(g => {
        const progress = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
        const daysRemaining = Math.max(0, Math.ceil((new Date(g.endDate) - new Date()) / (1000 * 60 * 60 * 24)));
        const totalDays = Math.max(1, Math.ceil((new Date(g.endDate) - new Date(g.startDate)) / (1000 * 60 * 60 * 24)));
        const daysPassed = totalDays - daysRemaining;
        const timeProgress = Math.round((daysPassed / totalDays) * 100);
        const onTrack = progress >= timeProgress;

        return {
            title: g.title,
            type: g.type,
            targetAmount: g.targetAmount,
            currentAmount: g.currentAmount,
            remainingAmount: Math.max(0, g.targetAmount - g.currentAmount),
            progress,
            timeProgress,
            daysRemaining,
            onTrack,
            status: g.status,
            xpReward: g.xpReward,
        };
    });

    return {
        success: true,
        data: { goals: detailed },
        message: `🎯 **Goal Progress**:\n\n${detailed.map(g => {
            const trackEmoji = g.onTrack ? '✅ On track' : '⚠️ Behind';
            return `• **${g.title}** (${g.type})\n  Progress: ${g.progress}% | ${fmt(g.currentAmount)} of ${fmt(g.targetAmount)}\n  Time: ${g.timeProgress}% elapsed | ${g.daysRemaining} days left | ${trackEmoji}\n  Remaining: ${fmt(g.remainingAmount)} | XP Reward: ${g.xpReward}`;
        }).join('\n\n')}`,
    };
};

export const createGoal = async (userId, params) => {
    const { title, type = 'savings_target', targetAmount, period = 'monthly' } = params;

    const now = new Date();
    let endDate;
    switch (period) {
        case 'weekly': endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); break;
        case 'monthly': endDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()); break;
        case 'custom': endDate = params.endDate ? new Date(params.endDate) : new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()); break;
        default: endDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }

    const goal = await FinancialGoal.create({
        user: userId,
        title,
        type,
        targetAmount,
        currentAmount: 0,
        period,
        startDate: now,
        endDate,
        status: 'active',
    });

    return {
        success: true,
        data: { id: goal._id, title: goal.title, type: goal.type, targetAmount: goal.targetAmount, period: goal.period, endDate: goal.endDate },
        message: `🎯 Goal created: **${title}** — Target: ${fmt(targetAmount)} (${period}). Track your progress to earn ${goal.xpReward} XP on completion!`,
    };
};

// ═══════════════════════════════════════════════════════════════
// ENHANCED TRANSACTION TOOLS
// ═══════════════════════════════════════════════════════════════

export const getTransactionsByDateRange = async (userId, params) => {
    const { startDate, endDate, category, type, limit = 30 } = params;
    const query = { user: userId, isDeleted: false, mode: 'PERSONAL' };

    if (startDate) query.date = { ...(query.date || {}), $gte: new Date(startDate) };
    if (endDate) query.date = { ...(query.date || {}), $lte: new Date(endDate) };
    if (category) query.category = { $regex: category, $options: 'i' };
    if (type) query.type = type;

    const transactions = await Transaction.find(query).sort({ date: -1 }).limit(limit).lean();

    if (transactions.length === 0) {
        return {
            success: true,
            data: { transactions: [], count: 0, totalAmount: 0 },
            message: "📋 No transactions found for the specified criteria. Try adjusting your date range or filters.",
        };
    }

    const totalAmount = transactions.reduce((s, t) => s + t.amount, 0);
    const txList = transactions.map(t => ({
        id: t._id,
        type: t.type,
        category: t.category,
        amount: t.amount,
        description: t.description,
        date: t.date,
    }));

    return {
        success: true,
        data: { transactions: txList, count: txList.length, totalAmount },
        message: `📋 **${txList.length} Transactions** (total: ${fmt(totalAmount)}):\n\n${txList.slice(0, 15).map(t =>
            `• ${t.type === 'debit' ? '🔴' : '🟢'} ${fmt(t.amount)} — ${t.category}${t.description ? ` (${t.description})` : ''} — ${new Date(t.date).toLocaleDateString('en-IN')}`
        ).join('\n')}${txList.length > 15 ? `\n\n...and ${txList.length - 15} more` : ''}`,
    };
};

export const getIncomeBreakdown = async (userId, params) => {
    const { start, end } = getCurrentMonthRange();
    const startDate = params.startDate ? new Date(params.startDate) : start;
    const endDate = params.endDate ? new Date(params.endDate) : end;

    const transactions = await Transaction.find({
        user: userId, type: 'credit', isDeleted: false, mode: 'PERSONAL',
        date: { $gte: startDate, $lte: endDate },
    }).lean();

    if (transactions.length === 0) {
        return {
            success: true,
            data: { categories: [], totalIncome: 0, count: 0 },
            message: "💰 No income recorded for this period. Add income transactions to see your income breakdown and sources.",
        };
    }

    const totalIncome = transactions.reduce((s, t) => s + t.amount, 0);
    const byCategory = {};
    transactions.forEach(t => {
        if (!byCategory[t.category]) byCategory[t.category] = { amount: 0, count: 0 };
        byCategory[t.category].amount += t.amount;
        byCategory[t.category].count += 1;
    });

    const categories = Object.entries(byCategory)
        .sort((a, b) => b[1].amount - a[1].amount)
        .map(([category, data]) => ({
            category,
            amount: Math.round(data.amount),
            count: data.count,
            percentage: totalIncome > 0 ? Math.round((data.amount / totalIncome) * 100) : 0,
        }));

    return {
        success: true,
        data: { categories, totalIncome, count: transactions.length },
        message: `💰 **Income Breakdown** — ${fmt(totalIncome)} from ${categories.length} sources:\n\n${categories.map(c =>
            `• ${c.category}: ${fmt(c.amount)} (${c.percentage}%) — ${c.count} transactions`
        ).join('\n')}`,
        chartData: {
            type: 'pie',
            data: categories.map(c => ({ name: c.category, value: c.amount })),
            nameKey: 'name', valueKey: 'value',
            title: 'Income Sources',
            colors: CHART_COLORS,
        },
    };
};

export const getTopMerchants = async (userId, params) => {
    const limit = params.limit || 10;
    const { start, end } = getCurrentMonthRange();
    const startDate = params.startDate ? new Date(params.startDate) : start;
    const endDate = params.endDate ? new Date(params.endDate) : end;

    const transactions = await Transaction.find({
        user: userId, type: 'debit', isDeleted: false, mode: 'PERSONAL',
        date: { $gte: startDate, $lte: endDate },
        description: { $exists: true, $ne: '' },
    }).lean();

    if (transactions.length === 0) {
        return {
            success: true,
            data: { merchants: [], count: 0 },
            message: "🏪 No transaction descriptions found. Add descriptions to your expenses to see top spending destinations.",
        };
    }

    const byDesc = {};
    transactions.forEach(t => {
        const key = t.description.toLowerCase().trim();
        if (!key) return;
        if (!byDesc[key]) byDesc[key] = { name: t.description, totalAmount: 0, count: 0, category: t.category };
        byDesc[key].totalAmount += t.amount;
        byDesc[key].count += 1;
    });

    const merchants = Object.values(byDesc)
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, limit)
        .map((m, i) => ({ rank: i + 1, ...m, totalAmount: Math.round(m.totalAmount) }));

    return {
        success: true,
        data: { merchants, count: merchants.length },
        message: `🏪 **Top ${merchants.length} Spending Destinations**:\n\n${merchants.map(m =>
            `• ${m.rank}. ${m.name} — ${fmt(m.totalAmount)} (${m.count}x) — ${m.category}`
        ).join('\n')}`,
        chartData: merchants.length > 1 ? {
            type: 'bar',
            data: merchants.slice(0, 6).map(m => ({
                name: m.name.length > 12 ? m.name.substring(0, 12) + '…' : m.name,
                Amount: m.totalAmount,
            })),
            xKey: 'name', yKey: 'Amount',
            title: 'Top Spending Destinations',
            colors: ['#DC2626'],
        } : undefined,
    };
};

export const getMonthOverMonthTrend = async (userId, params) => {
    const months = params.months || 6;
    const now = new Date();
    const result = [];

    for (let i = 0; i < months; i++) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
        const label = monthStart.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

        const [expenses, income] = await Promise.all([
            Transaction.aggregate([
                { $match: { user: new mongoose.Types.ObjectId(userId), type: 'debit', isDeleted: false, mode: 'PERSONAL', date: { $gte: monthStart, $lte: monthEnd } } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Transaction.aggregate([
                { $match: { user: new mongoose.Types.ObjectId(userId), type: 'credit', isDeleted: false, mode: 'PERSONAL', date: { $gte: monthStart, $lte: monthEnd } } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
        ]);

        const exp = expenses[0]?.total || 0;
        const inc = income[0]?.total || 0;
        result.push({
            month: label,
            income: Math.round(inc),
            expenses: Math.round(exp),
            savings: Math.round(inc - exp),
            savingsRate: inc > 0 ? Math.round(((inc - exp) / inc) * 100) : 0,
        });
    }

    result.reverse();

    return {
        success: true,
        data: { trend: result, months },
        message: `📊 **${months}-Month Financial Trend**:\n\n${result.map(r =>
            `• ${r.month}: Income ${fmt(r.income)} | Expenses ${fmt(r.expenses)} | Savings ${fmt(r.savings)} (${r.savingsRate}%)`
        ).join('\n')}`,
        chartData: {
            type: 'bar',
            data: result.map(r => ({ month: r.month, Income: r.income, Expenses: r.expenses, Savings: r.savings })),
            xKey: 'month', yKey: 'Expenses',
            title: `${months}-Month Trend`,
            colors: ['#059669', '#DC2626', '#2563EB'],
        },
    };
};

// ═══════════════════════════════════════════════════════════════
// FINANCIAL HEALTH SCORING
// ═══════════════════════════════════════════════════════════════

export const getFinancialHealthScore = async (userId) => {
    const { start, end } = getCurrentMonthRange();
    const now = new Date();
    let score = 0;
    const breakdown = [];

    // 1. Savings Rate (0-25 points)
    const [incomeAgg, expenseAgg] = await Promise.all([
        Transaction.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId), type: 'credit', isDeleted: false, mode: 'PERSONAL', date: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Transaction.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId), type: 'debit', isDeleted: false, mode: 'PERSONAL', date: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
    ]);

    const income = incomeAgg[0]?.total || 0;
    const expenses = expenseAgg[0]?.total || 0;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
    const savingsPoints = Math.min(25, Math.max(0, Math.round(savingsRate * 0.83)));
    score += savingsPoints;
    breakdown.push({ metric: 'Savings Rate', score: savingsPoints, max: 25, detail: `${Math.round(savingsRate)}% of income saved` });

    // 2. Budget Adherence (0-25 points)
    const budgets = await Budget.find({ user: userId, month: now.getMonth() + 1, year: now.getFullYear(), type: 'expense' }).lean();
    let budgetPoints = 0;
    if (budgets.length > 0) {
        let withinBudgetCount = 0;
        for (const b of budgets) {
            const spent = await Transaction.find({
                user: userId, type: 'debit', isDeleted: false, category: b.category,
                date: { $gte: start, $lte: end },
            }).lean().then(txs => txs.reduce((s, t) => s + t.amount, 0));
            if (spent <= b.amount) withinBudgetCount++;
        }
        budgetPoints = Math.round((withinBudgetCount / budgets.length) * 25);
    } else {
        budgetPoints = 10; // Partial credit for no budgets (not penalized, but not full)
    }
    score += budgetPoints;
    breakdown.push({ metric: 'Budget Adherence', score: budgetPoints, max: 25, detail: budgets.length > 0 ? `${budgets.length} budgets tracked` : 'No budgets set' });

    // 3. Investment Diversification (0-25 points)
    const investments = await Investment.find({ user: userId }).lean();
    let diversePoints = 0;
    if (investments.length > 0) {
        const types = new Set(investments.map(i => i.assetType));
        const typeCount = types.size;
        diversePoints = Math.min(25, typeCount * 5 + (investments.length >= 5 ? 5 : 0));
    }
    score += diversePoints;
    breakdown.push({ metric: 'Investment Diversification', score: diversePoints, max: 25, detail: `${investments.length} holdings across ${new Set(investments.map(i => i.assetType)).size} types` });

    // 4. Emergency Fund (0-25 points)
    const liquidTypes = ['FD', 'Gold', 'Bond'];
    const liquidAssets = investments.filter(i => liquidTypes.includes(i.assetType)).reduce((s, i) => s + (i.investedAmount || 0), 0);
    const monthlyExpense = expenses || 1;
    const runwayMonths = Math.round(liquidAssets / monthlyExpense);
    const emergencyPoints = Math.min(25, runwayMonths * 4);
    score += emergencyPoints;
    breakdown.push({ metric: 'Emergency Fund', score: emergencyPoints, max: 25, detail: `${runwayMonths} months runway (ideal: 6+)` });

    // Grade
    let grade, gradeEmoji;
    if (score >= 85) { grade = 'Excellent'; gradeEmoji = '🌟'; }
    else if (score >= 70) { grade = 'Good'; gradeEmoji = '✅'; }
    else if (score >= 50) { grade = 'Fair'; gradeEmoji = '🟡'; }
    else if (score >= 30) { grade = 'Needs Work'; gradeEmoji = '⚠️'; }
    else { grade = 'Critical'; gradeEmoji = '🔴'; }

    return {
        success: true,
        data: { score, grade, breakdown, income, expenses, savingsRate: Math.round(savingsRate), investmentCount: investments.length, runwayMonths },
        message: `${gradeEmoji} **Financial Health Score: ${score}/100** (${grade})\n\n${breakdown.map(b => `• ${b.metric}: ${b.score}/${b.max} — ${b.detail}`).join('\n')}\n\n${score < 70 ? '💡 Focus on areas with lower scores to improve your financial health.' : '🎉 Great financial discipline! Keep it up.'}`,
        chartData: {
            type: 'bar',
            data: breakdown.map(b => ({ metric: b.metric, Score: b.score, Max: b.max })),
            xKey: 'metric', yKey: 'Score',
            title: `Health Score: ${score}/100`,
            colors: ['#2563EB', '#E5E7EB'],
        },
    };
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS — Registry, Permissions, Schemas, Destructive
// ═══════════════════════════════════════════════════════════════

export const FINANCIAL_TOOL_REGISTRY = {
    getInvestmentHoldingsDetailed,
    getTopHoldings,
    getSectorAllocation,
    getInvestmentsByType,
    getInvestmentGrowthTimeline,
    getGoalsOverview,
    getGoalProgress,
    createGoal,
    getTransactionsByDateRange,
    getIncomeBreakdown,
    getTopMerchants,
    getMonthOverMonthTrend,
    getFinancialHealthScore,
};

export const FINANCIAL_PERMISSION_MAP = {
    getInvestmentHoldingsDetailed: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getTopHoldings:               { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getSectorAllocation:          { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getInvestmentsByType:         { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getInvestmentGrowthTimeline:  { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getGoalsOverview:             { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getGoalProgress:              { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    createGoal:                   { type: 'write', roles: ['user', 'ADMIN', 'MEMBER'] },
    getTransactionsByDateRange:   { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getIncomeBreakdown:           { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getTopMerchants:              { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getMonthOverMonthTrend:       { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getFinancialHealthScore:      { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
};

export const FINANCIAL_SCHEMAS = {
    getInvestmentHoldingsDetailed: { required: [], types: {} },
    getTopHoldings:               { required: [], types: { limit: 'number' }, ranges: { limit: { min: 1, max: 20 } } },
    getSectorAllocation:          { required: [], types: {} },
    getInvestmentsByType:         { required: [], types: { assetType: 'string' } },
    getInvestmentGrowthTimeline:  { required: [], types: {} },
    getGoalsOverview:             { required: [], types: {} },
    getGoalProgress:              { required: [], types: { title: 'string', status: 'string' }, enums: { status: ['active', 'completed', 'failed'] } },
    createGoal:                   { required: ['title', 'targetAmount'], types: { title: 'string', targetAmount: 'number', type: 'string', period: 'string', endDate: 'string' }, ranges: { targetAmount: { min: 1 } }, enums: { type: ['expense_limit', 'income_target', 'savings_target'], period: ['weekly', 'monthly', 'custom'] } },
    getTransactionsByDateRange:   { required: [], types: { startDate: 'string', endDate: 'string', category: 'string', type: 'string', limit: 'number' }, ranges: { limit: { min: 1, max: 100 } }, enums: { type: ['debit', 'credit'] } },
    getIncomeBreakdown:           { required: [], types: { startDate: 'string', endDate: 'string' } },
    getTopMerchants:              { required: [], types: { limit: 'number', startDate: 'string', endDate: 'string' }, ranges: { limit: { min: 1, max: 20 } } },
    getMonthOverMonthTrend:       { required: [], types: { months: 'number' }, ranges: { months: { min: 2, max: 12 } } },
    getFinancialHealthScore:      { required: [], types: {} },
};

export const FINANCIAL_DESTRUCTIVE_TOOLS = new Set([
    // createGoal is write but non-destructive (additive), so not listed here
]);
