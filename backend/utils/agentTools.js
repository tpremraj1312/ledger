/**
 * Agent Tools — All tool functions the AI Agent can invoke.
 * Each tool: receives (userId, params) → returns { success, data, message, chartData? }
 *
 * Also exports:
 *   TOOL_PERMISSION_MAP  — role-based access control per tool
 *   TOOL_SCHEMAS          — strict parameter validation schemas
 *   DESTRUCTIVE_TOOLS     — set of tools requiring confirmation
 */

import mongoose from 'mongoose';
import Transaction from '../models/transaction.js';
import Budget from '../models/budget.js';
import Investment from '../models/Investment.js';
import Gamification from '../models/Gamification.js';
import FamilyGroup from '../models/FamilyGroup.js';
import User from '../models/user.js';
import { computeTaxSummary } from '../services/taxService.js';
import { getGamificationProfile } from '../services/xpService.js';
import { calculateWellnessScore } from '../services/wellnessService.js';

// ═══════════════════════════════════════════════════════════════
// TOOL PERMISSION MAP — 'read' or 'write', allowed roles
// ═══════════════════════════════════════════════════════════════
export const TOOL_PERMISSION_MAP = {
    // Expense tools
    addExpense: { type: 'write', roles: ['user', 'ADMIN', 'MEMBER'] },
    getExpenseSummary: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getSpendingTrend: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    deleteExpense: { type: 'write', roles: ['user', 'ADMIN'] },
    updateExpense: { type: 'write', roles: ['user', 'ADMIN'] },
    getSpendingByCategory: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getMonthlyComparison: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getWeeklyTrend: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    // Budget tools
    createBudget: { type: 'write', roles: ['user', 'ADMIN'] },
    getBudgetStatus: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    compareBudgetVsExpense: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    forecastOverspending: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    // Family tools
    getFamilySummary: { type: 'read', roles: ['ADMIN', 'MEMBER'] },
    getContributionBreakdown: { type: 'read', roles: ['ADMIN', 'MEMBER'] },
    // Investment tools
    getPortfolioOverview: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getAssetAllocation: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    // Tax tools
    getTaxLiability: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getDeductionUsage: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getTaxSavings: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    // Gamification tools
    getQuestStatus: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getXPProgress: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getStreak: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    // Settings tools
    updatePreference: { type: 'write', roles: ['user', 'ADMIN', 'MEMBER'] },
};

// ═══════════════════════════════════════════════════════════════
// DESTRUCTIVE TOOLS — require user confirmation before execution
// ═══════════════════════════════════════════════════════════════
export const DESTRUCTIVE_TOOLS = new Set([
    'deleteExpense',
    'updateExpense',
]);

// ═══════════════════════════════════════════════════════════════
// TOOL SCHEMAS — strict runtime validation
// Each: { required: [...], types: { field: 'type' }, ranges: { field: { min, max } }, enums: { field: [...] } }
// ═══════════════════════════════════════════════════════════════
export const TOOL_SCHEMAS = {
    addExpense: {
        required: ['amount', 'category'],
        types: { amount: 'number', category: 'string', description: 'string', date: 'string', type: 'string' },
        ranges: { amount: { min: 0.01 } },
        enums: { type: ['debit', 'credit'] },
    },
    getExpenseSummary: {
        required: [],
        types: { startDate: 'string', endDate: 'string', category: 'string' },
    },
    getSpendingTrend: {
        required: [],
        types: { months: 'number' },
        ranges: { months: { min: 1, max: 12 } },
    },
    deleteExpense: {
        required: ['expenseId'],
        types: { expenseId: 'string' },
    },
    updateExpense: {
        required: ['expenseId'],
        types: { expenseId: 'string', amount: 'number', category: 'string', description: 'string' },
        ranges: { amount: { min: 0.01 } },
    },
    getSpendingByCategory: {
        required: [],
        types: { startDate: 'string', endDate: 'string' },
    },
    getMonthlyComparison: {
        required: [],
        types: { months: 'number' },
        ranges: { months: { min: 2, max: 12 } },
    },
    getWeeklyTrend: {
        required: [],
        types: { weeks: 'number' },
        ranges: { weeks: { min: 1, max: 12 } },
    },
    createBudget: {
        required: ['category', 'amount'],
        types: { category: 'string', amount: 'number', period: 'string', type: 'string' },
        ranges: { amount: { min: 0 } },
        enums: { period: ['Monthly', 'Weekly', 'Quarterly', 'Yearly'], type: ['expense', 'income'] },
    },
    getBudgetStatus: { required: [], types: {} },
    compareBudgetVsExpense: { required: [], types: { category: 'string' } },
    forecastOverspending: { required: [], types: {} },
    getFamilySummary: { required: [], types: {} },
    getContributionBreakdown: { required: [], types: {} },
    getPortfolioOverview: { required: [], types: {} },
    getAssetAllocation: { required: [], types: {} },
    getTaxLiability: { required: [], types: { financialYear: 'string' } },
    getDeductionUsage: { required: [], types: {} },
    getTaxSavings: { required: [], types: {} },
    getQuestStatus: { required: [], types: {} },
    getXPProgress: { required: [], types: {} },
    getStreak: { required: [], types: {} },
    updatePreference: {
        required: ['category', 'preferences'],
        types: { category: 'string', preferences: 'object' },
    },
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════
const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '₹0.00';
    return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getCurrentMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
};

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

// ═══════════════════════════════════════════════════════════════
// TOOL IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════

// ──────── EXPENSE TOOLS ────────

export const addExpense = async (userId, params) => {
    const {
        amount,
        category,
        description = '',
        date = new Date().toISOString().split('T')[0],
        type = 'debit'
    } = params;

    const tx = await Transaction.create({
        user: userId,
        type,
        category,
        amount,
        description,
        date: new Date(date),
        source: 'manual',
        status: 'completed',
        mode: 'PERSONAL',
    });

    return {
        success: true,
        data: { id: tx._id, amount: tx.amount, category: tx.category, date: tx.date },
        message: `✅ Recorded ${type} of ${formatCurrency(amount)} under "${category}".`,
    };
};

export const getExpenseSummary = async (userId, params) => {
    const { start, end } = getCurrentMonthRange();
    const startDate = params.startDate ? new Date(params.startDate) : start;
    const endDate = params.endDate ? new Date(params.endDate) : end;

    const query = { user: userId, type: 'debit', isDeleted: false, date: { $gte: startDate, $lte: endDate } };
    if (params.category && params.category !== 'All') query.category = params.category;

    const transactions = await Transaction.find(query).lean();
    const totalExpenses = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = await Transaction.find({ user: userId, type: 'credit', isDeleted: false, date: { $gte: startDate, $lte: endDate } }).lean().then(txs => txs.reduce((s, t) => s + t.amount, 0));

    const byCategory = {};
    transactions.forEach(t => {
        byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });

    const breakdown = Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amt]) => ({
            category: cat,
            amount: amt,
            percentage: totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0,
        }));

    return {
        success: true,
        data: { totalExpenses, totalIncome, savings: totalIncome - totalExpenses, transactionCount: transactions.length, breakdown },
        message: `💰 This period: ${formatCurrency(totalExpenses)} spent across ${breakdown.length} categories. Income: ${formatCurrency(totalIncome)}.`,
        chartData: {
            type: 'pie',
            data: breakdown.slice(0, 8),
            nameKey: 'category',
            valueKey: 'amount',
            title: 'Expense Breakdown',
            colors: CHART_COLORS,
        },
    };
};

export const getSpendingTrend = async (userId, params) => {
    const months = params.months || 6;
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const transactions = await Transaction.find({
        user: userId, type: 'debit', isDeleted: false, date: { $gte: startDate },
    }).lean();

    const monthlyData = {};
    for (let i = 0; i < months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[key] = 0;
    }
    transactions.forEach(t => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key in monthlyData) monthlyData[key] += t.amount;
    });

    const chartArr = Object.entries(monthlyData).sort().map(([month, amount]) => ({ month, amount: Math.round(amount) }));

    return {
        success: true,
        data: { trend: chartArr },
        message: `📈 Spending trend for the last ${months} months.`,
        chartData: {
            type: 'area',
            data: chartArr,
            xKey: 'month',
            yKey: 'amount',
            title: `Spending Trend (${months} months)`,
            colors: ['#3B82F6'],
        },
    };
};

export const deleteExpense = async (userId, params) => {
    const tx = await Transaction.findOne({ _id: params.expenseId, user: userId, isDeleted: false });
    if (!tx) return { success: false, data: null, message: '❌ Expense not found or already deleted.' };

    tx.isDeleted = true;
    await tx.save();

    return {
        success: true,
        data: { id: tx._id, amount: tx.amount, category: tx.category },
        message: `🗑️ Deleted expense: ${formatCurrency(tx.amount)} (${tx.category}).`,
    };
};

export const updateExpense = async (userId, params) => {
    const tx = await Transaction.findOne({ _id: params.expenseId, user: userId, isDeleted: false });
    if (!tx) return { success: false, data: null, message: '❌ Expense not found.' };

    if (params.amount !== undefined) tx.amount = params.amount;
    if (params.category) tx.category = params.category;
    if (params.description !== undefined) tx.description = params.description;
    await tx.save();

    return {
        success: true,
        data: { id: tx._id, amount: tx.amount, category: tx.category },
        message: `✏️ Updated expense to ${formatCurrency(tx.amount)} (${tx.category}).`,
    };
};

export const getSpendingByCategory = async (userId, params) => {
    const { start, end } = getCurrentMonthRange();
    const startDate = params.startDate ? new Date(params.startDate) : start;
    const endDate = params.endDate ? new Date(params.endDate) : end;

    const transactions = await Transaction.find({
        user: userId, type: 'debit', isDeleted: false, date: { $gte: startDate, $lte: endDate },
    }).lean();

    const byCategory = {};
    transactions.forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + t.amount; });
    const data = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount: Math.round(amount) }));

    return {
        success: true, data: { categories: data },
        message: `📊 Spending breakdown by category.`,
        chartData: { type: 'bar', data, xKey: 'category', yKey: 'amount', title: 'Spending by Category', colors: CHART_COLORS },
    };
};

export const getMonthlyComparison = async (userId, params) => {
    const months = params.months || 3;
    const now = new Date();
    const result = [];

    for (let i = 0; i < months; i++) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
        const monthLabel = monthStart.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

        const expense = await Transaction.find({ user: userId, type: 'debit', isDeleted: false, date: { $gte: monthStart, $lte: monthEnd } }).lean().then(txs => txs.reduce((s, t) => s + t.amount, 0));
        const income = await Transaction.find({ user: userId, type: 'credit', isDeleted: false, date: { $gte: monthStart, $lte: monthEnd } }).lean().then(txs => txs.reduce((s, t) => s + t.amount, 0));

        result.push({ month: monthLabel, expense: Math.round(expense), income: Math.round(income) });
    }

    return {
        success: true, data: { comparison: result.reverse() },
        message: `📊 ${months}-month income vs expense comparison.`,
        chartData: { type: 'bar', data: result, xKey: 'month', yKey: 'expense', title: `${months}-Month Comparison`, colors: ['#EF4444', '#10B981'] },
    };
};

export const getWeeklyTrend = async (userId, params) => {
    const weeks = params.weeks || 4;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - weeks * 7);

    const transactions = await Transaction.find({
        user: userId, type: 'debit', isDeleted: false, date: { $gte: startDate },
    }).lean();

    const weeklyData = {};
    transactions.forEach(t => {
        const d = new Date(t.date);
        d.setDate(d.getDate() - d.getDay());
        const key = d.toISOString().split('T')[0];
        weeklyData[key] = (weeklyData[key] || 0) + t.amount;
    });

    const data = Object.entries(weeklyData).sort().map(([week, amount]) => ({ week, amount: Math.round(amount) }));

    return {
        success: true, data: { weeks: data },
        message: `📈 Weekly spending trend.`,
        chartData: { type: 'line', data, xKey: 'week', yKey: 'amount', title: `Weekly Trend (${weeks}w)`, colors: ['#8B5CF6'] },
    };
};

// ──────── BUDGET TOOLS ────────

export const createBudget = async (userId, params) => {
    const { category, amount, period = 'Monthly', type = 'expense' } = params;
    const now = new Date();

    const budget = await Budget.findOneAndUpdate(
        { user: userId, category, month: now.getMonth() + 1, year: now.getFullYear(), period, type },
        { amount, updatedAt: now },
        { upsert: true, new: true }
    );

    return {
        success: true,
        data: { id: budget._id, category, amount, period },
        message: `📋 Budget set: ${formatCurrency(amount)} for "${category}" (${period}).`,
    };
};

export const getBudgetStatus = async (userId) => {
    const now = new Date();
    const budgets = await Budget.find({ user: userId, month: now.getMonth() + 1, year: now.getFullYear(), type: 'expense' }).lean();
    const { start, end } = getCurrentMonthRange();

    const results = [];
    for (const b of budgets) {
        const spent = await Transaction.find({
            user: userId, type: 'debit', isDeleted: false, category: b.category, date: { $gte: start, $lte: end },
        }).lean().then(txs => txs.reduce((s, t) => s + t.amount, 0));

        results.push({
            category: b.category,
            budget: b.amount,
            spent: Math.round(spent),
            remaining: Math.round(b.amount - spent),
            percentage: b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0,
        });
    }

    return {
        success: true,
        data: { budgets: results },
        message: `📋 Budget status for ${results.length} categories.`,
        chartData: {
            type: 'bar',
            data: results.map(r => ({ category: r.category, Budget: r.budget, Spent: r.spent })),
            xKey: 'category', yKey: 'Spent',
            title: 'Budget vs Spent',
            colors: ['#3B82F6', '#EF4444'],
        },
    };
};

export const compareBudgetVsExpense = async (userId, params) => {
    const result = await getBudgetStatus(userId);
    const overBudget = result.data.budgets.filter(b => b.percentage > 100);
    const underBudget = result.data.budgets.filter(b => b.percentage <= 100);

    result.message = `📊 ${overBudget.length} categories over budget, ${underBudget.length} within budget.`;
    if (overBudget.length > 0) {
        result.message += ` ⚠️ Over: ${overBudget.map(b => `${b.category} (${b.percentage}%)`).join(', ')}.`;
    }
    return result;
};

export const forecastOverspending = async (userId) => {
    const now = new Date();
    const daysPassed = now.getDate();
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = totalDays - daysPassed;

    const status = await getBudgetStatus(userId);
    const forecasts = status.data.budgets.map(b => {
        const dailyRate = daysPassed > 0 ? b.spent / daysPassed : 0;
        const projectedTotal = Math.round(dailyRate * totalDays);
        const willOverspend = projectedTotal > b.budget;
        return { ...b, dailyRate: Math.round(dailyRate), projectedTotal, willOverspend };
    });

    const atRisk = forecasts.filter(f => f.willOverspend);
    return {
        success: true,
        data: { forecasts, daysRemaining, daysPassed },
        message: `🔮 ${atRisk.length} categories at risk of overspending with ${daysRemaining} days left.`,
        chartData: {
            type: 'bar',
            data: forecasts.map(f => ({ category: f.category, Budget: f.budget, Projected: f.projectedTotal })),
            xKey: 'category', yKey: 'Projected',
            title: 'Budget Forecast',
            colors: ['#3B82F6', '#F59E0B'],
        },
    };
};

// ──────── FAMILY TOOLS ────────

export const getFamilySummary = async (userId) => {
    const user = await User.findById(userId);
    if (!user?.currentFamilyId) return { success: false, data: null, message: '❌ You are not in a family group.' };

    const group = await FamilyGroup.findById(user.currentFamilyId).populate('members.userId', 'username email');
    if (!group) return { success: false, data: null, message: '❌ Family group not found.' };

    const { start, end } = getCurrentMonthRange();
    const familyTxs = await Transaction.find({
        familyGroupId: group._id, isDeleted: false, mode: 'FAMILY', date: { $gte: start, $lte: end },
    }).lean();

    const totalExpense = familyTxs.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

    return {
        success: true,
        data: { name: group.name, members: group.members.length, totalExpense, transactionCount: familyTxs.length },
        message: `👨‍👩‍👧‍👦 Family "${group.name}": ${group.members.length} members, ${formatCurrency(totalExpense)} spent this month.`,
    };
};

export const getContributionBreakdown = async (userId) => {
    const user = await User.findById(userId);
    if (!user?.currentFamilyId) return { success: false, data: null, message: '❌ Not in a family group.' };

    const group = await FamilyGroup.findById(user.currentFamilyId).populate('members.userId', 'username');
    const { start, end } = getCurrentMonthRange();
    const familyTxs = await Transaction.find({
        familyGroupId: group._id, isDeleted: false, mode: 'FAMILY', type: 'debit', date: { $gte: start, $lte: end },
    }).populate('spentBy', 'username').lean();

    const byMember = {};
    familyTxs.forEach(t => {
        const name = t.spentBy?.username || 'Unknown';
        byMember[name] = (byMember[name] || 0) + t.amount;
    });

    const data = Object.entries(byMember).map(([member, amount]) => ({ member, amount: Math.round(amount) }));

    return {
        success: true, data: { contributions: data },
        message: `📊 Family contribution breakdown.`,
        chartData: { type: 'pie', data, nameKey: 'member', valueKey: 'amount', title: 'Family Contributions', colors: CHART_COLORS },
    };
};

// ──────── INVESTMENT TOOLS ────────

export const getPortfolioOverview = async (userId) => {
    const investments = await Investment.find({ user: userId }).lean();
    if (investments.length === 0) return { success: true, data: { investments: [] }, message: '📈 No investments found.' };

    const totalInvested = investments.reduce((s, i) => s + i.investedAmount, 0);
    const byType = {};
    investments.forEach(i => { byType[i.assetType] = (byType[i.assetType] || 0) + i.investedAmount; });
    const breakdown = Object.entries(byType).map(([type, amount]) => ({ assetType: type, invested: Math.round(amount) }));

    return {
        success: true,
        data: { totalInvested, count: investments.length, breakdown },
        message: `📈 Portfolio: ${formatCurrency(totalInvested)} across ${investments.length} investments.`,
        chartData: { type: 'pie', data: breakdown, nameKey: 'assetType', valueKey: 'invested', title: 'Portfolio Allocation', colors: CHART_COLORS },
    };
};

export const getAssetAllocation = async (userId) => {
    return getPortfolioOverview(userId);
};

// ──────── TAX TOOLS ────────

export const getTaxLiability = async (userId, params) => {
    try {
        const result = await computeTaxSummary(userId, params.financialYear);
        return {
            success: true,
            data: result,
            message: `🧾 Tax liability: ${formatCurrency(result.taxPayable || 0)}. Effective rate: ${result.effectiveRate || 0}%.`,
        };
    } catch {
        return { success: false, data: null, message: '❌ Unable to compute tax. Make sure you have income data.' };
    }
};

export const getDeductionUsage = async (userId) => {
    try {
        const result = await computeTaxSummary(userId);
        const deductions = result.deductions || {};
        const data = Object.entries(deductions).filter(([, v]) => typeof v === 'number').map(([section, amount]) => ({ section, amount }));
        return {
            success: true, data: { deductions: data },
            message: `🧾 Deduction usage across ${data.length} sections.`,
            chartData: { type: 'bar', data, xKey: 'section', yKey: 'amount', title: 'Deduction Usage', colors: ['#10B981'] },
        };
    } catch {
        return { success: false, data: null, message: '❌ Unable to fetch deductions.' };
    }
};

export const getTaxSavings = async (userId) => {
    try {
        const result = await computeTaxSummary(userId);
        return {
            success: true,
            data: { taxSaved: result.taxSaved || 0, recommendations: result.recommendations || [] },
            message: `💰 Estimated tax saved: ${formatCurrency(result.taxSaved || 0)}.`,
        };
    } catch {
        return { success: false, data: null, message: '❌ Unable to compute tax savings.' };
    }
};

// ──────── GAMIFICATION TOOLS ────────

export const getQuestStatus = async (userId) => {
    const profile = await getGamificationProfile(userId);
    return {
        success: true,
        data: { level: profile.level, xp: profile.xp, title: profile.title, badges: profile.badges?.length || 0 },
        message: `🏆 Level ${profile.level} — "${profile.title}" | ${profile.xp} XP | ${profile.badges?.length || 0} badges.`,
    };
};

export const getXPProgress = async (userId) => {
    const profile = await getGamificationProfile(userId);
    const currentLevelXP = (profile.level - 1) * 500;
    const nextLevelXP = profile.level * 500;
    const progress = Math.round(((profile.xp - currentLevelXP) / 500) * 100);

    return {
        success: true,
        data: { xp: profile.xp, level: profile.level, progress, nextLevelXP, xpNeeded: nextLevelXP - profile.xp },
        message: `⭐ ${profile.xp} XP (${progress}% to Level ${profile.level + 1}). Need ${nextLevelXP - profile.xp} more XP.`,
    };
};

export const getStreak = async (userId) => {
    const profile = await getGamificationProfile(userId);
    return {
        success: true,
        data: { currentStreak: profile.currentStreak, longestStreak: profile.longestStreak },
        message: `🔥 Current streak: ${profile.currentStreak} days | Longest: ${profile.longestStreak} days.`,
    };
};

// ──────── SETTINGS TOOLS ────────

export const updatePreference = async (userId, params) => {
    const { category, preferences } = params;
    const validCategories = ['notifications', 'financial', 'tax', 'investment', 'gamification', 'ai', 'app'];
    if (!validCategories.includes(category)) {
        return { success: false, data: null, message: `❌ Invalid settings category. Valid: ${validCategories.join(', ')}` };
    }

    const updateKey = `settings.${category}`;
    const user = await User.findByIdAndUpdate(
        userId,
        { $set: { [updateKey]: preferences } },
        { new: true }
    );

    return {
        success: true,
        data: { category, updated: user.settings[category] },
        message: `⚙️ Updated ${category} preferences.`,
    };
};

// ═══════════════════════════════════════════════════════════════
// TOOL REGISTRY — maps tool names to functions
// ═══════════════════════════════════════════════════════════════
export const TOOL_REGISTRY = {
    addExpense,
    getExpenseSummary,
    getSpendingTrend,
    deleteExpense,
    updateExpense,
    getSpendingByCategory,
    getMonthlyComparison,
    getWeeklyTrend,
    createBudget,
    getBudgetStatus,
    compareBudgetVsExpense,
    forecastOverspending,
    getFamilySummary,
    getContributionBreakdown,
    getPortfolioOverview,
    getAssetAllocation,
    getTaxLiability,
    getDeductionUsage,
    getTaxSavings,
    getQuestStatus,
    getXPProgress,
    getStreak,
    updatePreference,
};
