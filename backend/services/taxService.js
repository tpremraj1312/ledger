/**
 * Tax Computation Service
 * All tax math is server-side. No AI here — pure computation.
 * Includes: eligibility validation, priority scoring, expense pattern detection.
 */

import mongoose from 'mongoose';
import Transaction from '../models/transaction.js';
import Investment from '../models/Investment.js';
import RecurringExpense from '../models/RecurringExpense.js';
import {
    getTaxRules,
    getCurrentFY,
    computeTaxFromSlabs,
    getFYDateRange,
    validateInvestmentEligibility,
    validateExpenseEligibility,
} from '../utils/taxRules.js';

/**
 * Main entry point: compute full tax summary for a user.
 */
export const computeTaxSummary = async (userId, financialYear) => {
    const fy = financialYear || getCurrentFY();
    const rules = getTaxRules(fy);
    const { start, end } = getFYDateRange(fy);
    const userOid = new mongoose.Types.ObjectId(userId);

    // ── 1. Query Income (credits) ──
    const incomeAgg = await Transaction.aggregate([
        {
            $match: {
                user: userOid,
                type: 'credit',
                isDeleted: false,
                mode: 'PERSONAL',
                date: { $gte: start, $lte: end },
            },
        },
        {
            $group: {
                _id: '$category',
                total: { $sum: '$amount' },
                count: { $sum: 1 },
            },
        },
    ]);

    const incomeByCategory = {};
    let totalIncome = 0;
    incomeAgg.forEach((item) => {
        incomeByCategory[item._id] = {
            amount: parseFloat(item.total.toFixed(2)),
            count: item.count,
        };
        totalIncome += item.total;
    });
    totalIncome = parseFloat(totalIncome.toFixed(2));

    // Monthly income average
    const monthsInFY = Math.max(1, Math.min(12,
        Math.ceil((Math.min(end, new Date()) - start) / (1000 * 60 * 60 * 24 * 30))
    ));
    const monthlyIncomeAvg = parseFloat((totalIncome / monthsInFY).toFixed(2));

    // ── 2. Query Expenses (debits) ──
    const expenseAgg = await Transaction.aggregate([
        {
            $match: {
                user: userOid,
                type: 'debit',
                isDeleted: false,
                mode: 'PERSONAL',
                date: { $gte: start, $lte: end },
            },
        },
        {
            $group: {
                _id: '$category',
                total: { $sum: '$amount' },
                count: { $sum: 1 },
            },
        },
    ]);

    const expenseByCategory = {};
    let totalExpenses = 0;
    expenseAgg.forEach((item) => {
        expenseByCategory[item._id] = {
            amount: parseFloat(item.total.toFixed(2)),
            count: item.count,
        };
        totalExpenses += item.total;
    });
    totalExpenses = parseFloat(totalExpenses.toFixed(2));

    const monthlyExpenseAvg = parseFloat((totalExpenses / monthsInFY).toFixed(2));

    // ── 3. Query Investments (All Time) ──
    const investments = await Investment.find({
        user: userOid,
    }).lean();

    let totalInvested = 0;
    const investmentsByType = {};
    investments.forEach((inv) => {
        totalInvested += inv.investedAmount || 0;
        const type = inv.assetType || 'Other';
        if (!investmentsByType[type]) {
            investmentsByType[type] = { amount: 0, count: 0, items: [] };
        }
        investmentsByType[type].amount += inv.investedAmount || 0;
        investmentsByType[type].count += 1;
        investmentsByType[type].items.push({
            name: inv.name,
            amount: inv.investedAmount || 0,
        });
    });
    totalInvested = parseFloat(totalInvested.toFixed(2));

    // ── 4. Query Recurring Expenses ──
    let recurringTotal = 0;
    try {
        const recurringExpenses = await RecurringExpense.find({
            user: userOid,
            status: 'active',
        }).lean();

        recurringExpenses.forEach((rec) => {
            // Map recurring expenses to deductions if applicable
            const section = rules.expenseSectionMap[rec.category];
            if (section) {
                // Estimate annual from frequency
                let annualAmount = rec.amount || 0;
                if (rec.frequency === 'monthly') annualAmount *= 12;
                else if (rec.frequency === 'quarterly') annualAmount *= 4;
                else if (rec.frequency === 'biannual') annualAmount *= 2;
                recurringTotal += annualAmount;
            }
        });
    } catch (e) {
        // RecurringExpense model might not be populated — graceful fallback
    }

    // ── 5. Savings Rate ──
    const savingsRate = totalIncome > 0
        ? parseFloat(((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1))
        : 0;

    // ── 6. Map deductions claimed (WITH ELIGIBILITY VALIDATION) ──
    const deductions = {};
    const eligibilityLog = []; // Track eligibility decisions

    // Initialize all sections to zero
    for (const [sectionKey, section] of Object.entries(rules.sections)) {
        deductions[sectionKey] = {
            ...section,
            claimed: 0,
            remaining: section.maxLimit === Infinity ? Infinity : section.maxLimit,
            sources: [],
            eligibilityNotes: [],
        };
    }

    // Map investments → sections (WITH VALIDATION)
    for (const inv of investments) {
        const sectionKey = rules.investmentSectionMap[inv.assetType];
        if (sectionKey && deductions[sectionKey]) {
            const validation = validateInvestmentEligibility(inv, sectionKey, rules);

            if (validation.eligible) {
                const amount = inv.investedAmount || 0;
                deductions[sectionKey].claimed += amount;
                deductions[sectionKey].sources.push({
                    type: 'investment',
                    name: inv.name,
                    assetType: inv.assetType,
                    amount,
                    eligible: true,
                });
            } else {
                deductions[sectionKey].eligibilityNotes.push({
                    item: inv.name,
                    reason: validation.reason,
                });
                eligibilityLog.push({
                    section: sectionKey,
                    item: inv.name,
                    eligible: false,
                    reason: validation.reason,
                });
            }
        }
    }

    // Map expenses → sections (WITH VALIDATION)
    for (const [category, data] of Object.entries(expenseByCategory)) {
        const sectionKey = rules.expenseSectionMap[category];
        if (sectionKey && deductions[sectionKey]) {
            const validation = validateExpenseEligibility(category, sectionKey, rules);

            if (validation.eligible) {
                deductions[sectionKey].claimed += data.amount;
                deductions[sectionKey].sources.push({
                    type: 'expense',
                    name: category,
                    amount: data.amount,
                    eligible: true,
                });
            } else {
                deductions[sectionKey].eligibilityNotes.push({
                    item: category,
                    reason: validation.reason,
                });
            }
        }
    }

    // Cap claimed at limit and compute remaining
    let totalDeductionsClaimed = 0;
    let totalDeductionPossible = 0;

    for (const [key, ded] of Object.entries(deductions)) {
        const limit = ded.maxLimit === Infinity ? ded.claimed : ded.maxLimit;
        ded.claimed = parseFloat(Math.min(ded.claimed, limit).toFixed(2));
        ded.remaining = ded.maxLimit === Infinity
            ? 0
            : parseFloat(Math.max(0, ded.maxLimit - ded.claimed).toFixed(2));
        totalDeductionsClaimed += ded.claimed;
        if (ded.maxLimit !== Infinity) {
            totalDeductionPossible += ded.maxLimit;
        }
    }

    totalDeductionsClaimed = parseFloat(totalDeductionsClaimed.toFixed(2));

    // ── 7. Compute Taxable Income & Tax Liability ──

    // --- Old Regime ---
    const oldTaxableIncome = Math.max(0, totalIncome - rules.standardDeduction - totalDeductionsClaimed);
    let oldTax = computeTaxFromSlabs(oldTaxableIncome, rules.oldRegimeSlabs);

    // Apply 87A rebate for old regime
    if (oldTaxableIncome <= rules.rebate87A.oldRegime.limit) {
        oldTax = Math.max(0, oldTax - rules.rebate87A.oldRegime.maxRebate);
    }

    // Add cess
    const oldCess = parseFloat(((oldTax * rules.cessRate) / 100).toFixed(2));
    const oldTotalTax = parseFloat((oldTax + oldCess).toFixed(2));

    // --- New Regime ---
    // New regime only allows standard deduction + 80CCD(1B) for NPS
    const newRegimeDeductions = rules.standardDeduction +
        (deductions['80CCD_1B'] ? deductions['80CCD_1B'].claimed : 0);
    const newTaxableIncome = Math.max(0, totalIncome - newRegimeDeductions);
    let newTax = computeTaxFromSlabs(newTaxableIncome, rules.newRegimeSlabs);

    // Apply 87A rebate for new regime
    if (newTaxableIncome <= rules.rebate87A.newRegime.limit) {
        newTax = Math.max(0, newTax - rules.rebate87A.newRegime.maxRebate);
    }

    const newCess = parseFloat(((newTax * rules.cessRate) / 100).toFixed(2));
    const newTotalTax = parseFloat((newTax + newCess).toFixed(2));

    // Recommended regime
    const recommendedRegime = oldTotalTax <= newTotalTax ? 'Old Regime' : 'New Regime';
    const taxSavingByRegime = parseFloat(Math.abs(oldTotalTax - newTotalTax).toFixed(2));

    // ── 8. Compute Tax Optimization Score ──
    const utilizationPercentage = totalDeductionPossible > 0
        ? (totalDeductionsClaimed / totalDeductionPossible) * 100
        : 0;
    const optimizationScore = Math.min(100, Math.round(utilizationPercentage));

    // ── 9. Generate Recommendations (WITH PRIORITY SCORING) ──
    const recommendations = [];
    const marginalRate = getMarginalRate(oldTaxableIncome, rules.oldRegimeSlabs);

    for (const recGroup of rules.recommendations) {
        const section = recGroup.section;
        const ded = deductions[section];

        if (!ded || ded.remaining <= 0) continue;

        for (const instrument of recGroup.instruments) {
            const maxInvestable = ded.remaining;
            const estimatedSaving = parseFloat(((maxInvestable * marginalRate) / 100).toFixed(2));

            // Weighted priority score
            const normalizedRemaining = ded.maxLimit !== Infinity
                ? ded.remaining / ded.maxLimit
                : 0.5;
            const normalizedSavings = totalIncome > 0
                ? estimatedSaving / (totalIncome * 0.3) // Normalize against 30% of income
                : 0;
            const ease = instrument.implementationEase || 0.5;

            const priorityScore = parseFloat((
                (normalizedRemaining * 0.4) +
                (Math.min(1, normalizedSavings) * 0.4) +
                (ease * 0.2)
            ).toFixed(3));

            const priority = priorityScore > 0.75 ? 'high'
                : priorityScore > 0.4 ? 'medium'
                    : 'low';

            recommendations.push({
                section: ded.name,
                sectionKey: section,
                instrument: instrument.name,
                description: instrument.description,
                why: `You have ₹${ded.remaining.toLocaleString('en-IN')} unused under ${ded.name}. Investing here can save up to ₹${estimatedSaving.toLocaleString('en-IN')} in taxes.`,
                estimatedTaxSaving: estimatedSaving,
                maxInvestable,
                riskLevel: instrument.riskLevel,
                lockIn: instrument.lockIn,
                expectedReturn: instrument.expectedReturn,
                wealthImpact: instrument.wealthImpact,
                priority,
                priorityScore,
                implementationEase: ease,
            });
        }
    }

    // ── 10. Expense Pattern Detection ──
    const patternInsights = [];

    for (const pattern of rules.expensePatternRules) {
        // Check if user has spending in trigger categories
        let triggerSpending = 0;
        for (const cat of pattern.triggerCategories) {
            for (const [expCat, data] of Object.entries(expenseByCategory)) {
                if (expCat.toLowerCase().includes(cat.toLowerCase())) {
                    triggerSpending += data.amount;
                }
            }
        }

        // Check if the corresponding deduction section has claims
        const targetDed = deductions[pattern.checkMissing];
        const hasClaimed = targetDed && targetDed.claimed > 0;

        // For NPS pattern, always trigger if not claimed (no trigger categories needed)
        const shouldTrigger = pattern.triggerCategories.length === 0
            ? !hasClaimed
            : (triggerSpending >= pattern.threshold && !hasClaimed);

        if (shouldTrigger) {
            const rec = pattern.recommendation;
            const estimatedSaving = targetDed
                ? parseFloat(((targetDed.remaining * marginalRate) / 100).toFixed(2))
                : 0;

            patternInsights.push({
                id: pattern.id,
                title: rec.title,
                description: rec.description,
                section: rec.section,
                sectionName: targetDed ? targetDed.name : rec.section,
                triggerAmount: triggerSpending,
                priority: rec.priority,
                estimatedTaxSaving: estimatedSaving,
                maxDeduction: targetDed ? targetDed.remaining : 0,
            });

            // Also add to recommendations list
            recommendations.push({
                section: targetDed ? targetDed.name : rec.section,
                sectionKey: rec.section,
                instrument: rec.title,
                description: rec.description,
                why: triggerSpending > 0
                    ? `You spent ₹${triggerSpending.toLocaleString('en-IN')} on related expenses but haven't claimed any deduction under ${targetDed?.name || rec.section}. This is a missed opportunity.`
                    : `You are not utilizing the deduction available under ${targetDed?.name || rec.section}. Consider investing to save on taxes.`,
                estimatedTaxSaving: estimatedSaving,
                maxInvestable: targetDed ? targetDed.remaining : 0,
                riskLevel: 'N/A',
                lockIn: 'Varies',
                expectedReturn: 'Tax saving + coverage',
                wealthImpact: rec.description,
                priority: rec.priority,
                priorityScore: rec.priority === 'high' ? 0.85 : rec.priority === 'medium' ? 0.55 : 0.25,
                implementationEase: rec.implementationEase || 0.5,
                source: 'pattern_detection',
            });
        }
    }

    // Sort recommendations by priority score (descending)
    recommendations.sort((a, b) => b.priorityScore - a.priorityScore);

    // ── 11. Deduction Utilization Data (for charts) ──
    const deductionUtilization = Object.entries(deductions)
        .filter(([_, d]) => d.maxLimit !== Infinity)
        .map(([key, d]) => ({
            section: d.name,
            sectionKey: key,
            limit: d.maxLimit,
            claimed: d.claimed,
            remaining: d.remaining,
            percentage: d.maxLimit > 0 ? parseFloat(((d.claimed / d.maxLimit) * 100).toFixed(1)) : 0,
            sources: d.sources,
            eligibilityNotes: d.eligibilityNotes,
        }));

    // ── 12. Potential Savings ──
    const totalPotentialSaving = parseFloat(
        recommendations
            .filter((r, i, arr) => arr.findIndex(x => x.sectionKey === r.sectionKey) === i) // Dedupe by section
            .reduce((sum, r) => sum + r.estimatedTaxSaving, 0)
            .toFixed(2)
    );

    // ── 13. Income Breakdown (for chart) ──
    const incomeBreakdown = Object.entries(incomeByCategory).map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalIncome > 0 ? parseFloat(((data.amount / totalIncome) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.amount - a.amount);

    // ── 14. Expense Breakdown (for chart) ──
    const expenseBreakdown = Object.entries(expenseByCategory).map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalExpenses > 0 ? parseFloat(((data.amount / totalExpenses) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.amount - a.amount);

    return {
        financialYear: fy,
        fyLabel: rules.label,
        income: {
            total: totalIncome,
            monthly: monthlyIncomeAvg,
            breakdown: incomeBreakdown,
            sourceCount: Object.keys(incomeByCategory).length,
        },
        expenses: {
            total: totalExpenses,
            monthly: monthlyExpenseAvg,
            breakdown: expenseBreakdown,
            categoryCount: Object.keys(expenseByCategory).length,
        },
        investments: {
            total: totalInvested,
            count: investments.length,
            byType: investmentsByType,
        },
        savingsRate,
        deductions: {
            total: totalDeductionsClaimed,
            totalPossible: totalDeductionPossible,
            sections: deductionUtilization,
        },
        taxLiability: {
            oldRegime: {
                taxableIncome: parseFloat(oldTaxableIncome.toFixed(2)),
                tax: parseFloat(oldTax.toFixed(2)),
                cess: oldCess,
                total: oldTotalTax,
            },
            newRegime: {
                taxableIncome: parseFloat(newTaxableIncome.toFixed(2)),
                tax: parseFloat(newTax.toFixed(2)),
                cess: newCess,
                total: newTotalTax,
            },
            recommendedRegime,
            savingByChoosingRecommended: taxSavingByRegime,
        },
        optimizationScore,
        recommendations,
        patternInsights,
        eligibilityLog,
        totalPotentialSaving,
        standardDeduction: rules.standardDeduction,
    };
};

/**
 * Helper: Get marginal tax rate for a given income under given slabs.
 */
function getMarginalRate(taxableIncome, slabs) {
    let marginalRate = 0;
    for (const slab of slabs) {
        if (taxableIncome >= slab.min) {
            marginalRate = slab.rate;
        }
    }
    return marginalRate;
}
