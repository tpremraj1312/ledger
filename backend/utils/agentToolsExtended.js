/**
 * Extended Agent Tools — New tools for family actions, investment analytics,
 * tax optimization, simulations, and utility operations.
 * 
 * Imported and merged into the main TOOL_REGISTRY in agentTools.js.
 */

import mongoose from 'mongoose';
import Transaction from '../models/transaction.js';
import Budget from '../models/budget.js';
import Investment from '../models/Investment.js';
import FamilyGroup from '../models/FamilyGroup.js';
import FamilyInvite from '../models/FamilyInvite.js';
import User from '../models/user.js';
import RecurringExpense from '../models/RecurringExpense.js';
import AgentLog from '../models/AgentLog.js';
import { computeTaxSummary } from '../services/taxService.js';
import {
    computePortfolioAnalytics,
    computeRebalancingSuggestions,
    detectUnderperformers,
    simulateSIP,
    estimateCapitalGains,
} from './investmentAnalytics.js';
import { invalidateUserContext } from './agentContextBuilder.js';
import crypto from 'crypto';

const fmt = (amount) => {
    if (amount === undefined || amount === null) return '₹0';
    return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const getCurrentMonthRange = () => {
    const now = new Date();
    return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
};

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

// ═══════════════════════════════════════════════════════════════
// FAMILY ACTION TOOLS
// ═══════════════════════════════════════════════════════════════

export const inviteFamilyMember = async (userId, params) => {
    const { email } = params;
    const user = await User.findById(userId);
    if (!user?.currentFamilyId) return { success: false, data: null, message: '❌ You are not in a family group.' };

    const group = await FamilyGroup.findById(user.currentFamilyId);
    if (!group) return { success: false, data: null, message: '❌ Family group not found.' };

    const member = group.members.find(m => m.user?.toString() === userId.toString());
    if (!member || member.role !== 'ADMIN') {
        return { success: false, data: null, message: '🔒 Only ADMIN can invite members.' };
    }

    // Check if already a member
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
        const isMember = group.members.some(m => m.user?.toString() === existingUser._id.toString());
        if (isMember) return { success: false, data: null, message: `❌ ${email} is already a member of this family.` };
        if (existingUser.currentFamilyId) return { success: false, data: null, message: `❌ ${email} is already in another family group.` };
    }

    // Check for existing pending invite
    const existingInvite = await FamilyInvite.findOne({ groupId: group._id, email: email.toLowerCase(), used: false, expiresAt: { $gt: new Date() } });
    if (existingInvite) return { success: false, data: null, message: `⏳ An invite to ${email} is already pending.` };

    // Create invite
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await FamilyInvite.create({
        groupId: group._id,
        invitedBy: userId,
        email: email.toLowerCase(),
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return {
        success: true,
        data: { email, groupName: group.name, expiresIn: '7 days' },
        message: `📧 Invitation sent to ${email} to join "${group.name}". Valid for 7 days.`,
    };
};

export const removeFamilyMember = async (userId, params) => {
    const { email, memberId } = params;
    const user = await User.findById(userId);
    if (!user?.currentFamilyId) return { success: false, data: null, message: '❌ You are not in a family group.' };

    const group = await FamilyGroup.findById(user.currentFamilyId).populate('members.user', 'email username');
    if (!group) return { success: false, data: null, message: '❌ Family group not found.' };

    const adminMember = group.members.find(m => m.user?._id?.toString() === userId.toString());
    if (!adminMember || adminMember.role !== 'ADMIN') {
        return { success: false, data: null, message: '🔒 Only ADMIN can remove members.' };
    }

    const target = group.members.find(m => {
        if (memberId) return m.user?._id?.toString() === memberId;
        if (email) return m.user?.email === email.toLowerCase();
        return false;
    });

    if (!target) return { success: false, data: null, message: '❌ Member not found in this family.' };
    if (target.user?._id?.toString() === userId.toString()) return { success: false, data: null, message: '❌ You cannot remove yourself.' };

    group.members = group.members.filter(m => m.user?._id?.toString() !== target.user?._id?.toString());
    await group.save();

    // Clear family from removed user
    await User.findByIdAndUpdate(target.user._id, { currentFamilyId: null });

    return {
        success: true,
        data: { removedUser: target.user?.username, email: target.user?.email },
        message: `✅ Removed ${target.user?.username || 'member'} from "${group.name}".`,
    };
};

export const changeMemberRole = async (userId, params) => {
    const { email, memberId, newRole } = params;
    const validRoles = ['ADMIN', 'MEMBER', 'VIEWER'];
    if (!validRoles.includes(newRole)) return { success: false, data: null, message: `❌ Invalid role. Use: ${validRoles.join(', ')}` };

    const user = await User.findById(userId);
    if (!user?.currentFamilyId) return { success: false, data: null, message: '❌ You are not in a family group.' };

    const group = await FamilyGroup.findById(user.currentFamilyId).populate('members.user', 'email username');
    if (!group) return { success: false, data: null, message: '❌ Family group not found.' };

    const adminMember = group.members.find(m => m.user?._id?.toString() === userId.toString());
    if (!adminMember || adminMember.role !== 'ADMIN') {
        return { success: false, data: null, message: '🔒 Only ADMIN can change roles.' };
    }

    const target = group.members.find(m => {
        if (memberId) return m.user?._id?.toString() === memberId;
        if (email) return m.user?.email === email.toLowerCase();
        return false;
    });
    if (!target) return { success: false, data: null, message: '❌ Member not found.' };

    const oldRole = target.role;
    target.role = newRole;
    await group.save();

    return {
        success: true,
        data: { member: target.user?.username, oldRole, newRole },
        message: `✅ Changed ${target.user?.username}'s role from ${oldRole} to ${newRole}.`,
    };
};

export const getFamilyMembers = async (userId) => {
    const user = await User.findById(userId);
    if (!user?.currentFamilyId) return { success: false, data: null, message: '❌ Not in a family group.' };

    const group = await FamilyGroup.findById(user.currentFamilyId).populate('members.user', 'username email');
    if (!group) return { success: false, data: null, message: '❌ Family group not found.' };

    const members = group.members.map(m => ({
        name: m.user?.username || 'Unknown',
        email: m.user?.email || '',
        role: m.role,
        joinedAt: m.joinedAt,
    }));

    return {
        success: true,
        data: { groupName: group.name, members },
        message: `👨‍👩‍👧‍👦 "${group.name}" has ${members.length} members: ${members.map(m => `${m.name} (${m.role})`).join(', ')}`,
    };
};

// ═══════════════════════════════════════════════════════════════
// INVESTMENT ANALYTICS TOOLS
// ═══════════════════════════════════════════════════════════════

export const getPortfolioAnalytics = async (userId) => {
    const investments = await Investment.find({ user: userId }).lean();
    if (investments.length === 0) return { success: true, data: null, message: '📈 No investments found. Add investments to see analytics.' };

    const analytics = computePortfolioAnalytics(investments);

    return {
        success: true,
        data: analytics,
        message: `📈 Portfolio Analytics:\n• ${analytics.holdingCount} holdings worth ${fmt(analytics.totalInvested)}\n• Diversification: ${analytics.diversificationScore}/100\n• Concentration Risk: ${analytics.concentrationRisk}\n• Expected CAGR: ${analytics.expectedCAGR}%\n• Risk Score: ${analytics.riskScore}% volatility\n• Max Drawdown Risk: ${analytics.maxDrawdownRisk}%`,
        chartData: {
            type: 'pie',
            data: analytics.allocation.map(a => ({ name: a.assetType, value: a.invested })),
            nameKey: 'name', valueKey: 'value',
            title: 'Asset Allocation', colors: CHART_COLORS,
        },
    };
};

export const getRebalancingSuggestions = async (userId) => {
    const investments = await Investment.find({ user: userId }).lean();
    if (investments.length === 0) return { success: true, data: null, message: '📈 No investments to rebalance.' };

    const result = computeRebalancingSuggestions(investments);

    const suggestionText = result.suggestions.length > 0
        ? result.suggestions.map(s => `• ${s.message}`).join('\n')
        : '✅ Your portfolio is well-balanced!';

    return {
        success: true,
        data: result,
        message: `🔄 Rebalancing Suggestions (Score: ${result.diversificationScore}/100):\n${suggestionText}`,
    };
};

export const getUnderperformers = async (userId) => {
    const investments = await Investment.find({ user: userId }).lean();
    const underperformers = detectUnderperformers(investments);

    if (underperformers.length === 0) {
        return { success: true, data: { underperformers: [] }, message: '✅ No underperforming assets detected (all holdings < 6 months or performing well).' };
    }

    return {
        success: true,
        data: { underperformers },
        message: `⚠️ ${underperformers.length} holdings need review:\n${underperformers.map(u => `• ${u.name} (${u.assetType}) — held ${u.yearsHeld}y, benchmark ${u.benchmarkCAGR}% CAGR`).join('\n')}`,
    };
};

export const simulateSIPTool = async (userId, params) => {
    const { monthlyAmount = 5000, annualReturn = 12, years = 10 } = params;
    const result = simulateSIP(monthlyAmount, annualReturn, years);

    return {
        success: true,
        data: result,
        message: `🔮 SIP Projection:\n• Monthly: ${fmt(monthlyAmount)} | Return: ${annualReturn}% | Duration: ${years}y\n• Total Invested: ${fmt(result.totalInvested)}\n• Future Value: ${fmt(result.futureValue)}\n• Wealth Gained: ${fmt(result.wealthGained)}`,
        chartData: {
            type: 'area',
            data: result.yearlyBreakdown.map(y => ({ year: `Year ${y.year}`, Invested: y.invested, Value: y.value })),
            xKey: 'year', yKey: 'Value',
            title: `SIP Growth (${fmt(monthlyAmount)}/mo @ ${annualReturn}%)`,
            colors: ['#10B981'],
        },
    };
};

export const estimateCapitalGainsTool = async (userId) => {
    const investments = await Investment.find({ user: userId }).lean();
    if (investments.length === 0) return { success: true, data: null, message: '📈 No investments found.' };

    const result = estimateCapitalGains(investments);

    return {
        success: true,
        data: result,
        message: `🧾 Capital Gains Estimate:\n• Total Invested: ${fmt(result.totalInvested)}\n• Est. Current Value: ${fmt(result.totalEstValue)}\n• Est. Gains: ${fmt(result.totalEstGain)}\n• Est. Tax Liability: ${fmt(result.totalEstTax)}`,
    };
};

// ═══════════════════════════════════════════════════════════════
// TAX TOOLS
// ═══════════════════════════════════════════════════════════════

export const compareRegimes = async (userId, params) => {
    try {
        const result = await computeTaxSummary(userId, params?.financialYear);
        const old = result.taxLiability.oldRegime;
        const nw = result.taxLiability.newRegime;

        return {
            success: true,
            data: result.taxLiability,
            message: `🧾 Tax Regime Comparison (${result.fyLabel}):\n\n📋 OLD REGIME:\n• Taxable Income: ${fmt(old.taxableIncome)}\n• Tax: ${fmt(old.tax)} + Cess: ${fmt(old.cess)}\n• Total: ${fmt(old.total)}\n\n📋 NEW REGIME:\n• Taxable Income: ${fmt(nw.taxableIncome)}\n• Tax: ${fmt(nw.tax)} + Cess: ${fmt(nw.cess)}\n• Total: ${fmt(nw.total)}\n\n✅ Recommended: ${result.taxLiability.recommendedRegime} (saves ${fmt(result.taxLiability.savingByChoosingRecommended)})`,
            chartData: {
                type: 'bar',
                data: [
                    { regime: 'Old Regime', Tax: old.total },
                    { regime: 'New Regime', Tax: nw.total },
                ],
                xKey: 'regime', yKey: 'Tax',
                title: 'Tax Regime Comparison', colors: ['#EF4444', '#10B981'],
            },
        };
    } catch {
        return { success: false, data: null, message: '❌ Unable to compare regimes. Ensure income data exists.' };
    }
};

export const getUnused80C = async (userId) => {
    try {
        const result = await computeTaxSummary(userId);
        const sections = result.deductions.sections || [];
        const section80C = sections.find(s => s.sectionKey === '80C');

        if (!section80C) return { success: true, data: null, message: 'ℹ️ No 80C section data available.' };

        const recs = result.recommendations.filter(r => r.sectionKey === '80C');

        return {
            success: true,
            data: { section80C, recommendations: recs, optimizationScore: result.optimizationScore },
            message: `🧾 Section 80C Status:\n• Limit: ${fmt(section80C.limit)}\n• Claimed: ${fmt(section80C.claimed)} (${section80C.percentage}%)\n• Remaining: ${fmt(section80C.remaining)}\n\n${recs.length > 0 ? '💡 Suggestions:\n' + recs.map(r => `• ${r.instrument}: ${r.why}`).join('\n') : '✅ 80C fully utilized!'}`,
        };
    } catch {
        return { success: false, data: null, message: '❌ Unable to fetch 80C data.' };
    }
};

export const estimateTaxSavingForInvestment = async (userId, params) => {
    const { amount = 0, instrument = 'ELSS' } = params;
    try {
        const result = await computeTaxSummary(userId);
        const oldTaxable = result.taxLiability.oldRegime.taxableIncome;

        // Simple marginal rate estimation
        let marginalRate = 0;
        if (oldTaxable > 1500000) marginalRate = 30;
        else if (oldTaxable > 1250000) marginalRate = 25;
        else if (oldTaxable > 1000000) marginalRate = 20;
        else if (oldTaxable > 750000) marginalRate = 15;
        else if (oldTaxable > 500000) marginalRate = 10;
        else if (oldTaxable > 300000) marginalRate = 5;

        const taxSaving = Math.round(amount * (marginalRate / 100) * 1.04); // Include cess

        return {
            success: true,
            data: { amount, instrument, marginalRate, taxSaving },
            message: `💰 If you invest ${fmt(amount)} in ${instrument}:\n• Your marginal tax rate: ${marginalRate}%\n• Estimated tax saving: ${fmt(taxSaving)} (incl. cess)\n• Net cost of investment: ${fmt(amount - taxSaving)}`,
        };
    } catch {
        return { success: false, data: null, message: '❌ Unable to estimate. Ensure income data exists.' };
    }
};

export const switchTaxRegime = async (userId, params) => {
    const { regime } = params;
    if (!['Old', 'New'].includes(regime)) return { success: false, data: null, message: '❌ Regime must be "Old" or "New".' };

    await User.findByIdAndUpdate(userId, { 'settings.tax.regime': regime });
    invalidateUserContext(userId.toString());

    return {
        success: true,
        data: { regime },
        message: `✅ Tax regime switched to ${regime} Regime. This will be used for future tax calculations.`,
    };
};

// ═══════════════════════════════════════════════════════════════
// SIMULATION & FORECASTING TOOLS
// ═══════════════════════════════════════════════════════════════

export const forecastMonthlySavings = async (userId, params) => {
    const { targetSaving = 10000 } = params;
    const { start, end } = getCurrentMonthRange();

    const transactions = await Transaction.find({
        user: userId, type: 'debit', isDeleted: false, mode: 'PERSONAL', date: { $gte: start, $lte: end },
    }).lean();

    const byCategory = {};
    transactions.forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + t.amount; });

    // Identify discretionary categories
    const discretionary = ['Shopping', 'Entertainment', 'Dining', 'Subscriptions', 'Travel', 'Lifestyle', 'Food'];
    const savingOpps = [];
    let totalPossibleSaving = 0;

    for (const [cat, amount] of Object.entries(byCategory)) {
        const isDiscretionary = discretionary.some(d => cat.toLowerCase().includes(d.toLowerCase()));
        if (isDiscretionary && amount > 500) {
            const suggestedCut = Math.round(amount * 0.3); // Suggest 30% cut
            savingOpps.push({ category: cat, currentSpend: Math.round(amount), suggestedCut, newSpend: Math.round(amount * 0.7) });
            totalPossibleSaving += suggestedCut;
        }
    }

    const achievable = totalPossibleSaving >= targetSaving;

    return {
        success: true,
        data: { targetSaving, totalPossibleSaving, achievable, opportunities: savingOpps },
        message: `🎯 Saving ${fmt(targetSaving)}/month:\n• Total possible savings: ${fmt(totalPossibleSaving)} ${achievable ? '✅ Achievable!' : '⚠️ Stretch goal'}\n\n${savingOpps.map(o => `• Cut ${o.category} by 30%: Save ${fmt(o.suggestedCut)} (${fmt(o.currentSpend)} → ${fmt(o.newSpend)})`).join('\n')}`,
    };
};

export const simulateRetirement = async (userId, params) => {
    const { currentAge = 30, retirementAge = 60, monthlyExpense = 50000, inflationRate = 6 } = params;

    const user = await User.findById(userId).lean();
    const investments = await Investment.find({ user: userId }).lean();
    const totalInvested = investments.reduce((s, i) => s + (i.investedAmount || 0), 0);

    const yearsToRetirement = retirementAge - currentAge;
    const inflatedExpense = monthlyExpense * Math.pow(1 + inflationRate / 100, yearsToRetirement);
    const annualExpenseAtRetirement = inflatedExpense * 12;
    const requiredCorpus = annualExpenseAtRetirement * 25; // 4% rule

    // Estimate corpus growth
    const estCAGR = 10; // Conservative
    const projectedCorpus = totalInvested * Math.pow(1 + estCAGR / 100, yearsToRetirement);
    const gap = requiredCorpus - projectedCorpus;
    const monthlySIPNeeded = gap > 0 ? Math.round(gap / ((Math.pow(1 + estCAGR / 1200, yearsToRetirement * 12) - 1) / (estCAGR / 1200))) : 0;

    return {
        success: true,
        data: { currentAge, retirementAge, yearsToRetirement, monthlyExpense, inflatedExpense: Math.round(inflatedExpense), requiredCorpus: Math.round(requiredCorpus), currentCorpus: totalInvested, projectedCorpus: Math.round(projectedCorpus), gap: Math.round(Math.max(0, gap)), monthlySIPNeeded },
        message: `🔮 Retirement Simulation:\n• Retire at ${retirementAge} (${yearsToRetirement}y away)\n• Monthly expense at retirement: ${fmt(Math.round(inflatedExpense))} (${inflationRate}% inflation)\n• Required corpus: ${fmt(Math.round(requiredCorpus))}\n• Current investments: ${fmt(totalInvested)}\n• Projected value: ${fmt(Math.round(projectedCorpus))}\n• ${gap > 0 ? `Gap: ${fmt(Math.round(gap))} — Need ${fmt(monthlySIPNeeded)}/mo SIP` : '✅ On track!'}`,
    };
};

export const simulateLoan = async (userId, params) => {
    const { loanAmount = 1000000, interestRate = 8.5, tenureYears = 20 } = params;

    const monthlyRate = interestRate / 12 / 100;
    const months = tenureYears * 12;
    const emi = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
    const totalPayment = emi * months;
    const totalInterest = totalPayment - loanAmount;

    return {
        success: true,
        data: { loanAmount, interestRate, tenureYears, emi: Math.round(emi), totalPayment: Math.round(totalPayment), totalInterest: Math.round(totalInterest) },
        message: `🏦 Loan Simulation:\n• Loan: ${fmt(loanAmount)} @ ${interestRate}% for ${tenureYears} years\n• Monthly EMI: ${fmt(Math.round(emi))}\n• Total Payment: ${fmt(Math.round(totalPayment))}\n• Total Interest: ${fmt(Math.round(totalInterest))}`,
    };
};

export const whatIfScenario = async (userId, params) => {
    const { category, reductionPercent = 50 } = params;
    const { start, end } = getCurrentMonthRange();

    const transactions = await Transaction.find({
        user: userId, type: 'debit', isDeleted: false, mode: 'PERSONAL', category, date: { $gte: start, $lte: end },
    }).lean();

    const currentSpend = transactions.reduce((s, t) => s + t.amount, 0);
    const savedAmount = Math.round(currentSpend * (reductionPercent / 100));
    const annualSaving = savedAmount * 12;

    // SIP impact of annual saving
    const sipGrowth = simulateSIP(savedAmount, 12, 5);

    return {
        success: true,
        data: { category, currentSpend: Math.round(currentSpend), reductionPercent, savedPerMonth: savedAmount, annualSaving, sipGrowthIn5Years: sipGrowth.futureValue },
        message: `🔮 What If: Cut "${category}" by ${reductionPercent}%:\n• Current: ${fmt(Math.round(currentSpend))}/mo\n• You'd save: ${fmt(savedAmount)}/mo (${fmt(annualSaving)}/year)\n• If invested at 12% CAGR for 5 years: ${fmt(sipGrowth.futureValue)}`,
    };
};

export const detectSubscriptionLeaks = async (userId) => {
    const recurring = await RecurringExpense.find({ user: userId, status: 'active' }).lean();

    if (recurring.length === 0) return { success: true, data: { subscriptions: [] }, message: '✅ No active subscriptions found.' };

    const total = recurring.reduce((s, r) => s + r.amount, 0);
    const nonEssential = recurring.filter(r => !r.isEssential);

    return {
        success: true,
        data: { subscriptions: recurring.map(r => ({ name: r.description || r.category, amount: r.amount, frequency: r.frequency, isEssential: r.isEssential })), total, leakAmount: nonEssential.reduce((s, r) => s + r.amount, 0) },
        message: `🔍 Subscription Analysis:\n• ${recurring.length} active subscriptions totaling ${fmt(total)}/cycle\n• ${nonEssential.length} non-essential subscriptions (${fmt(nonEssential.reduce((s, r) => s + r.amount, 0))} potential savings)\n${nonEssential.map(r => `• ⚠️ ${r.description || r.category}: ${fmt(r.amount)}/${r.frequency}`).join('\n')}`,
    };
};

// ═══════════════════════════════════════════════════════════════
// UTILITY TOOLS
// ═══════════════════════════════════════════════════════════════

export const getRecentTransactions = async (userId, params) => {
    const { limit = 10, type } = params;
    const query = { user: userId, isDeleted: false, mode: 'PERSONAL' };
    if (type) query.type = type;

    const txs = await Transaction.find(query).sort({ date: -1 }).limit(limit).lean();

    return {
        success: true,
        data: { transactions: txs.map(t => ({ id: t._id, type: t.type, category: t.category, amount: t.amount, description: t.description, date: t.date })) },
        message: `📋 Last ${txs.length} transactions:\n${txs.map(t => `• ${t.type === 'debit' ? '🔴' : '🟢'} ${fmt(t.amount)} — ${t.category}${t.description ? ` (${t.description})` : ''} — ${new Date(t.date).toLocaleDateString('en-IN')}`).join('\n')}`,
    };
};

export const searchTransactions = async (userId, params) => {
    const { keyword, category, minAmount, maxAmount, startDate, endDate, limit = 20 } = params;
    const query = { user: userId, isDeleted: false };

    if (keyword) query.$or = [
        { category: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
    ];
    if (category) query.category = { $regex: category, $options: 'i' };
    if (minAmount || maxAmount) {
        query.amount = {};
        if (minAmount) query.amount.$gte = minAmount;
        if (maxAmount) query.amount.$lte = maxAmount;
    }
    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
    }

    const txs = await Transaction.find(query).sort({ date: -1 }).limit(limit).lean();

    return {
        success: true,
        data: { results: txs.map(t => ({ id: t._id, type: t.type, category: t.category, amount: t.amount, description: t.description, date: t.date })), count: txs.length },
        message: txs.length > 0
            ? `🔍 Found ${txs.length} transactions:\n${txs.slice(0, 10).map(t => `• ${fmt(t.amount)} — ${t.category} (${new Date(t.date).toLocaleDateString('en-IN')})`).join('\n')}`
            : '🔍 No transactions found matching your criteria.',
    };
};

export const addIncome = async (userId, params) => {
    const { amount, category = 'Salary', description = '', date = new Date().toISOString().split('T')[0] } = params;

    const tx = await Transaction.create({
        user: userId, type: 'credit', category, amount, description,
        date: new Date(date), source: 'manual', status: 'completed', mode: 'PERSONAL',
    });
    invalidateUserContext(userId.toString());

    return {
        success: true,
        data: { id: tx._id, amount: tx.amount, category: tx.category },
        message: `✅ Income recorded: ${fmt(amount)} under "${category}".`,
    };
};

export const getAnomalies = async (userId) => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    const transactions = await Transaction.find({
        user: userId, type: 'debit', isDeleted: false, mode: 'PERSONAL', date: { $gte: threeMonthsAgo },
    }).lean();

    // Calculate avg daily spend per category
    const byCategory = {};
    transactions.forEach(t => {
        if (!byCategory[t.category]) byCategory[t.category] = [];
        byCategory[t.category].push(t.amount);
    });

    const anomalies = [];
    for (const [cat, amounts] of Object.entries(byCategory)) {
        const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
        const stdDev = Math.sqrt(amounts.reduce((s, a) => s + Math.pow(a - avg, 2), 0) / amounts.length);

        // Flag transactions > 2 standard deviations above mean
        amounts.forEach((amt, i) => {
            if (amt > avg + 2 * stdDev && amt > 500) {
                anomalies.push({ category: cat, amount: Math.round(amt), average: Math.round(avg), deviation: Math.round((amt - avg) / stdDev) });
            }
        });
    }

    return {
        success: true,
        data: { anomalies: anomalies.slice(0, 10) },
        message: anomalies.length > 0
            ? `⚠️ ${anomalies.length} spending anomalies detected:\n${anomalies.slice(0, 5).map(a => `• ${a.category}: ${fmt(a.amount)} (avg: ${fmt(a.average)}, ${a.deviation}σ deviation)`).join('\n')}`
            : '✅ No unusual spending detected in the last 3 months.',
    };
};

export const getCashRunway = async (userId) => {
    const { start, end } = getCurrentMonthRange();

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
    const monthlySaving = income - expenses;
    const savingsRate = income > 0 ? Math.round((monthlySaving / income) * 100) : 0;

    // Estimate emergency fund months (assuming 6 months of expenses is ideal)
    const monthlyExpense = expenses || 1;
    const investments = await Investment.find({ user: userId }).lean();
    const liquidAssets = investments.filter(i => ['FD', 'Gold', 'Bond'].includes(i.assetType)).reduce((s, i) => s + (i.investedAmount || 0), 0);

    const runwayMonths = monthlyExpense > 0 ? Math.round(liquidAssets / monthlyExpense) : 0;

    return {
        success: true,
        data: { income, expenses, monthlySaving, savingsRate, liquidAssets, runwayMonths },
        message: `💰 Cash Runway:\n• Monthly Income: ${fmt(income)} | Expenses: ${fmt(expenses)}\n• Savings Rate: ${savingsRate}%\n• Liquid Assets: ${fmt(liquidAssets)}\n• Emergency Runway: ${runwayMonths} months (ideal: 6+)`,
    };
};

export const undoLastAction = async (userId) => {
    const lastLog = await AgentLog.findOne({
        userId, action: 'executed', success: true,
        toolName: { $in: ['addExpense', 'addIncome', 'createBudget'] },
    }).sort({ timestamp: -1 }).lean();

    if (!lastLog) return { success: false, data: null, message: '❌ No recent action to undo.' };

    // Soft-delete the last transaction created by agent
    if (['addExpense', 'addIncome'].includes(lastLog.toolName)) {
        const lastTx = await Transaction.findOne({ user: userId, source: 'manual' }).sort({ createdAt: -1 });
        if (lastTx && !lastTx.isDeleted) {
            lastTx.isDeleted = true;
            await lastTx.save();
            invalidateUserContext(userId.toString());
            return {
                success: true,
                data: { undone: lastLog.toolName, transaction: { amount: lastTx.amount, category: lastTx.category } },
                message: `↩️ Undone: ${lastTx.type === 'debit' ? 'Expense' : 'Income'} of ${fmt(lastTx.amount)} (${lastTx.category}) has been removed.`,
            };
        }
    }

    return { success: false, data: null, message: '❌ Could not find the action to undo.' };
};

// ═══════════════════════════════════════════════════════════════
// EXTENDED PERMISSION MAP
// ═══════════════════════════════════════════════════════════════
export const EXTENDED_PERMISSION_MAP = {
    inviteFamilyMember: { type: 'write', roles: ['ADMIN'] },
    removeFamilyMember: { type: 'write', roles: ['ADMIN'] },
    changeMemberRole: { type: 'write', roles: ['ADMIN'] },
    getFamilyMembers: { type: 'read', roles: ['ADMIN', 'MEMBER'] },
    getPortfolioAnalytics: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getRebalancingSuggestions: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getUnderperformers: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    simulateSIP: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    estimateCapitalGains: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    compareRegimes: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getUnused80C: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    estimateTaxSavingForInvestment: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    switchTaxRegime: { type: 'write', roles: ['user', 'ADMIN', 'MEMBER'] },
    forecastMonthlySavings: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    simulateRetirement: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    simulateLoan: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    whatIfScenario: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    detectSubscriptionLeaks: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getRecentTransactions: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    searchTransactions: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    addIncome: { type: 'write', roles: ['user', 'ADMIN', 'MEMBER'] },
    getAnomalies: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    getCashRunway: { type: 'read', roles: ['user', 'ADMIN', 'MEMBER'] },
    undoLastAction: { type: 'write', roles: ['user', 'ADMIN'] },
};

// ═══════════════════════════════════════════════════════════════
// EXTENDED SCHEMAS
// ═══════════════════════════════════════════════════════════════
export const EXTENDED_SCHEMAS = {
    inviteFamilyMember: { required: ['email'], types: { email: 'string' } },
    removeFamilyMember: { required: [], types: { email: 'string', memberId: 'string' } },
    changeMemberRole: { required: ['newRole'], types: { email: 'string', memberId: 'string', newRole: 'string' }, enums: { newRole: ['ADMIN', 'MEMBER', 'VIEWER'] } },
    getFamilyMembers: { required: [], types: {} },
    getPortfolioAnalytics: { required: [], types: {} },
    getRebalancingSuggestions: { required: [], types: {} },
    getUnderperformers: { required: [], types: {} },
    simulateSIP: { required: [], types: { monthlyAmount: 'number', annualReturn: 'number', years: 'number' }, ranges: { monthlyAmount: { min: 100 }, annualReturn: { min: 1, max: 50 }, years: { min: 1, max: 40 } } },
    estimateCapitalGains: { required: [], types: {} },
    compareRegimes: { required: [], types: { financialYear: 'string' } },
    getUnused80C: { required: [], types: {} },
    estimateTaxSavingForInvestment: { required: ['amount'], types: { amount: 'number', instrument: 'string' }, ranges: { amount: { min: 1 } } },
    switchTaxRegime: { required: ['regime'], types: { regime: 'string' }, enums: { regime: ['Old', 'New'] } },
    forecastMonthlySavings: { required: [], types: { targetSaving: 'number' }, ranges: { targetSaving: { min: 100 } } },
    simulateRetirement: { required: [], types: { currentAge: 'number', retirementAge: 'number', monthlyExpense: 'number', inflationRate: 'number' } },
    simulateLoan: { required: [], types: { loanAmount: 'number', interestRate: 'number', tenureYears: 'number' } },
    whatIfScenario: { required: ['category'], types: { category: 'string', reductionPercent: 'number' }, ranges: { reductionPercent: { min: 1, max: 100 } } },
    detectSubscriptionLeaks: { required: [], types: {} },
    getRecentTransactions: { required: [], types: { limit: 'number', type: 'string' }, ranges: { limit: { min: 1, max: 50 } } },
    searchTransactions: { required: [], types: { keyword: 'string', category: 'string', minAmount: 'number', maxAmount: 'number', startDate: 'string', endDate: 'string', limit: 'number' } },
    addIncome: { required: ['amount'], types: { amount: 'number', category: 'string', description: 'string', date: 'string' }, ranges: { amount: { min: 0.01 } } },
    getAnomalies: { required: [], types: {} },
    getCashRunway: { required: [], types: {} },
    undoLastAction: { required: [], types: {} },
};

// ═══════════════════════════════════════════════════════════════
// EXTENDED TOOL REGISTRY
// ═══════════════════════════════════════════════════════════════
export const EXTENDED_TOOL_REGISTRY = {
    inviteFamilyMember,
    removeFamilyMember,
    changeMemberRole,
    getFamilyMembers,
    getPortfolioAnalytics,
    getRebalancingSuggestions,
    getUnderperformers,
    simulateSIP: simulateSIPTool,
    estimateCapitalGains: estimateCapitalGainsTool,
    compareRegimes,
    getUnused80C,
    estimateTaxSavingForInvestment,
    switchTaxRegime,
    forecastMonthlySavings,
    simulateRetirement,
    simulateLoan,
    whatIfScenario,
    detectSubscriptionLeaks,
    getRecentTransactions,
    searchTransactions,
    addIncome,
    getAnomalies,
    getCashRunway,
    undoLastAction,
};

// ═══════════════════════════════════════════════════════════════
// EXTENDED DESTRUCTIVE TOOLS
// ═══════════════════════════════════════════════════════════════
export const EXTENDED_DESTRUCTIVE_TOOLS = new Set([
    'removeFamilyMember',
    'changeMemberRole',
    'switchTaxRegime',
    'undoLastAction',
]);
