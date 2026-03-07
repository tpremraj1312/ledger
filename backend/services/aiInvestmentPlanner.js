/**
 * AI Investment Planner — Quota-Safe, Non-Hallucinating.
 * 
 * ALL math is pure deterministic computation.
 * AI is ONLY used to explain precomputed values.
 * Hash-based caching prevents redundant AI calls.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// In-memory AI response cache (per user hash)
const aiCache = new Map();
const AI_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ═══════════════════════════════════════════════════════════════
// STATE HASH — Only call AI when financial state changes
// ═══════════════════════════════════════════════════════════════

const computeStateHash = (financialData, portfolio) => {
    const stateKey = JSON.stringify({
        totalInvested: Math.round((portfolio.summary?.totalInvested || 0) / 1000),
        totalValue: Math.round((portfolio.summary?.totalCurrentValue || 0) / 1000),
        holdingsCount: (portfolio.holdings || []).length,
        income: Math.round((financialData.totalIncome || 0) / 100),
        expenses: Math.round((financialData.totalExpense || 0) / 100),
        equityPct: Math.round(portfolio.allocation?.equity || 0),
        debtPct: Math.round(portfolio.allocation?.debt || 0),
    });
    return crypto.createHash('md5').update(stateKey).digest('hex');
};

// ═══════════════════════════════════════════════════════════════
// DETERMINISTIC COMPUTATIONS (No AI, pure math)
// ═══════════════════════════════════════════════════════════════

const computeRiskScore = (portfolio) => {
    const risk = portfolio.riskMetrics || {};
    const volatilityRisk = Math.min(100, (risk.volatilityScore || 0) * 2);
    const concentrationRisk = risk.concentrationRisk === 'High' ? 80 : risk.concentrationRisk === 'Moderate' ? 50 : 20;
    const drawdownRisk = Math.min(100, (risk.maxDrawdownRisk || 0) * 3);
    const overall = Math.round(volatilityRisk * 0.4 + concentrationRisk * 0.3 + drawdownRisk * 0.3);
    return { overall, volatility: Math.round(volatilityRisk), concentration: Math.round(concentrationRisk), drawdown: Math.round(drawdownRisk) };
};

const computeSimpleProjection = (currentValue, expectedCAGR, years) => {
    const rate = (expectedCAGR || 10) / 100;
    const projected = currentValue * Math.pow(1 + rate, years);
    const inflationAdj = currentValue * Math.pow(1 + Math.max(0, rate - 0.06), years);
    return {
        years,
        projected: Math.round(projected),
        inflationAdjusted: Math.round(inflationAdj),
        growth: Math.round(projected - currentValue),
    };
};

const computeCrashImpact = (portfolio) => {
    const totalVal = portfolio.summary?.totalCurrentValue || 0;
    const alloc = portfolio.allocation || {};
    const scenarios = [
        { name: 'Moderate Correction (-15%)', factor: 0.15 },
        { name: 'Severe Crash (-35%)', factor: 0.35 },
        { name: 'Deep Crisis (-55%)', factor: 0.55 },
    ];
    return scenarios.map(sc => {
        const equityLoss = (totalVal * (alloc.equity || 0) / 100) * sc.factor;
        const cryptoLoss = (totalVal * (alloc.crypto || 0) / 100) * sc.factor * 1.5;
        const goldBuffer = (totalVal * (alloc.gold || 0) / 100) * sc.factor * 0.3;
        const impact = -(equityLoss + cryptoLoss) + goldBuffer;
        return {
            scenario: sc.name,
            impact: Math.round(impact),
            portfolioAfter: Math.round(totalVal + impact),
            impactPct: totalVal > 0 ? parseFloat(((impact / totalVal) * 100).toFixed(1)) : 0,
        };
    });
};

const computeFinancialHealth = (financialData, portfolio) => {
    const income = financialData.totalIncome || 0;
    const expenses = financialData.totalExpense || 0;
    const savings = financialData.netSavings || (income - expenses);
    const portfolioValue = portfolio.summary?.totalCurrentValue || 0;
    const alloc = portfolio.allocation || {};

    const savingsRate = income > 0 ? parseFloat(((savings / income) * 100).toFixed(1)) : 0;
    const debtRatio = income > 0 ? parseFloat(((expenses / income) * 100).toFixed(1)) : 100;
    const emergencyMonths = expenses > 0 ? parseFloat((portfolioValue * 0.1 / expenses).toFixed(1)) : 0;

    let emergencyStatus = 'BUILD';
    let emergencyMsg = '';
    if (emergencyMonths >= 6) {
        emergencyStatus = 'ADEQUATE';
        emergencyMsg = `Covers ~${Math.round(emergencyMonths)} months. You are well positioned.`;
    } else if (emergencyMonths >= 3) {
        emergencyStatus = 'GROWING';
        emergencyMsg = `Covers ~${Math.round(emergencyMonths)} months. Target 6 months of expenses.`;
    } else {
        emergencyMsg = `Only ~${Math.round(emergencyMonths)} months covered. Build this to 6 months before aggressive investing.`;
    }

    const currentSIP = Math.round(savings * 0.5);
    const recommendedSIP = Math.round(savings * 0.6);

    // Allocation recommendation based on savings rate
    let recommendedAllocation;
    if (savingsRate > 30) {
        recommendedAllocation = { equity: 60, debt: 20, gold: 10, crypto: 5, cash: 5 };
    } else if (savingsRate > 15) {
        recommendedAllocation = { equity: 50, debt: 25, gold: 10, crypto: 5, cash: 10 };
    } else {
        recommendedAllocation = { equity: 35, debt: 30, gold: 10, crypto: 0, cash: 25 };
    }

    // Rebalancing actions
    const rebalancing = [];
    for (const [asset, target] of Object.entries(recommendedAllocation)) {
        if (asset === 'cash') continue;
        const current = alloc[asset] || 0;
        const diff = current - target;
        if (Math.abs(diff) >= 5) {
            rebalancing.push({
                asset: asset.charAt(0).toUpperCase() + asset.slice(1),
                action: diff > 0 ? 'REDUCE' : 'INCREASE',
                current, target, diff: Math.round(Math.abs(diff)),
            });
        }
    }

    // Tax efficiency hints
    const taxHints = [];
    for (const h of (portfolio.holdings || [])) {
        if (h.unrealizedPL > 100000 && ['Stock', 'Mutual Fund', 'ETF'].includes(h.assetType)) {
            taxHints.push(`LTCG on ${h.name}: Consider harvesting under ₹1L annual exemption.`);
        }
        if (h.unrealizedPL < -5000) {
            taxHints.push(`Tax-loss harvest ${h.name}: Book ₹${Math.abs(h.unrealizedPL).toLocaleString('en-IN')} loss to offset gains.`);
        }
    }

    // Inflation-adjusted returns
    const nominalReturn = portfolio.riskMetrics?.expectedCAGR || 10;
    const realReturn = parseFloat((((1 + nominalReturn / 100) / 1.06 - 1) * 100).toFixed(1));

    return {
        savingsRate,
        debtRatio,
        emergencyStatus,
        emergencyMsg,
        emergencyMonths,
        currentSIP,
        recommendedSIP,
        recommendedAllocation,
        currentAllocation: alloc,
        rebalancing,
        taxHints: taxHints.slice(0, 3),
        nominalReturn,
        realReturn,
        inflationRate: 6,
    };
};

// ═══════════════════════════════════════════════════════════════
// AI NARRATIVE — Only explains precomputed values
// ═══════════════════════════════════════════════════════════════

const generateNarrative = async (riskScore, health, portfolio) => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const s = portfolio.summary || {};

        const prompt = `You are a calm, practical Indian financial advisor. You are given EXACT pre-computed numbers. Your ONLY job is to explain them in simple language.

RULES:
- Do NOT invent any numbers
- Do NOT predict stock performance
- Do NOT mention global statistics or market forecasts
- ONLY explain the values provided below
- Be concise, 1-2 sentences per field

PRE-COMPUTED DATA:
- Portfolio Value: ₹${(s.totalCurrentValue || 0).toLocaleString('en-IN')}
- Total Invested: ₹${(s.totalInvested || 0).toLocaleString('en-IN')}
- XIRR: ${s.xirr || 0}%
- Risk Score: ${riskScore.overall}/100
- Savings Rate: ${health.savingsRate}%
- Emergency Fund: ${health.emergencyStatus} (${health.emergencyMonths} months)
- Equity: ${health.currentAllocation.equity || 0}%, Debt: ${health.currentAllocation.debt || 0}%
- Diversification: ${portfolio.riskMetrics?.diversificationScore || 0}/100

Return ONLY valid JSON:
{
  "grade": "A/B/C/D",
  "summary": "one line overall assessment",
  "riskExplanation": "explain the risk score meaning",
  "topPriority": "single most important action",
  "allocationNote": "comment on current vs ideal allocation"
}`;

        const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
        const raw = await result.response.text();
        return JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch (err) {
        console.error('AI narrative error:', err.message);
        return null;
    }
};

// ═══════════════════════════════════════════════════════════════
// FALLBACK NARRATIVE (No AI needed)
// ═══════════════════════════════════════════════════════════════

const deterministicNarrative = (riskScore, health, portfolio) => {
    const s = portfolio.summary || {};
    const grade = riskScore.overall < 30 ? 'A' : riskScore.overall < 50 ? 'B' : riskScore.overall < 70 ? 'C' : 'D';
    return {
        grade,
        summary: `Portfolio of ₹${(s.totalCurrentValue || 0).toLocaleString('en-IN')} with ${s.xirr || 0}% XIRR and ${health.savingsRate}% savings rate.`,
        riskExplanation: `Risk score ${riskScore.overall}/100. ${riskScore.overall > 60 ? 'Higher than ideal — consider diversifying.' : 'Within acceptable range.'}`,
        topPriority: health.emergencyStatus === 'BUILD' ? 'Build emergency fund to 6 months of expenses first.' : 'Continue systematic investing and review allocation quarterly.',
        allocationNote: health.rebalancing.length > 0 ? `Consider rebalancing: ${health.rebalancing.map(r => `${r.action} ${r.asset} by ${r.diff}%`).join(', ')}.` : 'Allocation looks reasonable. Continue as planned.',
    };
};

// ═══════════════════════════════════════════════════════════════
// MASTER: Generate Full Analysis (with caching)
// ═══════════════════════════════════════════════════════════════

export const generateAIAnalysis = async (financialData, portfolio) => {
    // 1. All deterministic computations
    const riskScore = computeRiskScore(portfolio);
    const health = computeFinancialHealth(financialData, portfolio);
    const projection = computeSimpleProjection(portfolio.summary?.totalCurrentValue || 0, portfolio.riskMetrics?.expectedCAGR || 10, 10);
    const crashImpact = computeCrashImpact(portfolio);

    // 2. Check cache
    const stateHash = computeStateHash(financialData, portfolio);
    const cached = aiCache.get(stateHash);
    let narrative;

    if (cached && (Date.now() - cached.timestamp) < AI_CACHE_TTL) {
        narrative = cached.narrative;
    } else {
        // 3. Try AI (quota-safe)
        narrative = await generateNarrative(riskScore, health, portfolio);
        if (!narrative) {
            narrative = deterministicNarrative(riskScore, health, portfolio);
        }
        // Cache result
        aiCache.set(stateHash, { narrative, timestamp: Date.now() });
        // Prune old entries
        if (aiCache.size > 100) {
            const oldest = [...aiCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
            if (oldest) aiCache.delete(oldest[0]);
        }
    }

    return {
        riskScore,
        health,
        projection,
        crashImpact,
        narrative,
    };
};

// ═══════════════════════════════════════════════════════════════
// PLANNER: Simple deterministic investment plan
// ═══════════════════════════════════════════════════════════════

export const generateInvestmentPlan = (inputs) => {
    const { income = 0, expenses = 0, age = 30, riskPreference = 'moderate', investmentAmount = 0 } = inputs;
    const surplus = income - expenses;
    const savingsRate = income > 0 ? (surplus / income) * 100 : 0;

    // Emergency fund check  
    const emergencyTarget = expenses * 6;
    const emergencyPriority = surplus > 0 && investmentAmount < emergencyTarget;

    // Allocation based on age + risk
    const riskMap = {
        conservative: { equity: 30, debt: 45, gold: 15, crypto: 0, cash: 10 },
        moderate: { equity: 50, debt: 25, gold: 10, crypto: 5, cash: 10 },
        aggressive: { equity: 70, debt: 10, gold: 5, crypto: 10, cash: 5 },
    };

    let allocation = { ...(riskMap[riskPreference] || riskMap.moderate) };

    // Age adjustment: reduce equity by 1% per year over 40
    if (age > 40) {
        const reduction = Math.min(20, age - 40);
        allocation.equity = Math.max(20, allocation.equity - reduction);
        allocation.debt += reduction;
    }

    // High debt ratio adjustment
    if (savingsRate < 15) {
        allocation.equity = Math.max(20, allocation.equity - 15);
        allocation.debt += 10;
        allocation.cash += 5;
    }

    // Recommended SIP
    const recommendedSIP = Math.max(500, Math.round(surplus * 0.5 / 100) * 100);

    // Simple projection: FV = SIP × [(1+r)^n - 1] / r
    const monthlyRate = (allocation.equity > 50 ? 0.12 : 0.09) / 12;
    const projections = [5, 10, 20, 30].map(years => {
        const months = years * 12;
        const fv = recommendedSIP * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
        const inflAdj = fv / Math.pow(1.06, years);
        return { years, corpus: Math.round(fv), inflationAdjusted: Math.round(inflAdj) };
    });

    // Action steps
    const steps = [];
    if (emergencyPriority) steps.push('Build emergency fund of ₹' + emergencyTarget.toLocaleString('en-IN') + ' (6 months expenses) first.');
    if (savingsRate < 20) steps.push('Aim to increase savings rate to at least 20% by cutting discretionary spending.');
    steps.push(`Start a monthly SIP of ₹${recommendedSIP.toLocaleString('en-IN')} split across recommended allocation.`);
    if (allocation.equity >= 50) steps.push('Use index funds (e.g., Nifty 50 ETF) for equity — low cost, diversified.');
    steps.push('Review and rebalance your portfolio every 6 months.');

    return {
        monthlySurplus: Math.round(surplus),
        savingsRate: parseFloat(savingsRate.toFixed(1)),
        recommendedSIP,
        emergencyTarget: Math.round(emergencyTarget),
        emergencyPriority,
        allocation,
        projections,
        steps,
        riskLevel: riskPreference,
        age,
    };
};
