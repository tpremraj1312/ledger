/**
 * Tax Computation Service
 * All tax math is server-side. No AI here — pure computation.
 */

import mongoose from 'mongoose';
import Transaction from '../models/transaction.js';
import Investment from '../models/Investment.js';
import {
    getTaxRules,
    getCurrentFY,
    computeTaxFromSlabs,
    getFYDateRange,
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
            },
        },
    ]);

    const incomeByCategory = {};
    let totalIncome = 0;
    incomeAgg.forEach((item) => {
        incomeByCategory[item._id] = parseFloat(item.total.toFixed(2));
        totalIncome += item.total;
    });
    totalIncome = parseFloat(totalIncome.toFixed(2));

    // ── 2. Query Expenses that map to deductions ──
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
            },
        },
    ]);

    const expenseByCategory = {};
    let totalExpenses = 0;
    expenseAgg.forEach((item) => {
        expenseByCategory[item._id] = parseFloat(item.total.toFixed(2));
        totalExpenses += item.total;
    });
    totalExpenses = parseFloat(totalExpenses.toFixed(2));

    // ── 3. Query Investments in FY ──
    const investments = await Investment.find({
        user: userOid,
        buyDate: { $gte: start, $lte: end },
    }).lean();

    let totalInvested = 0;
    investments.forEach((inv) => {
        totalInvested += inv.investedAmount || 0;
    });
    totalInvested = parseFloat(totalInvested.toFixed(2));

    // ── 4. Map deductions claimed ──
    const deductions = {};

    // Initialize all sections to zero
    for (const [sectionKey, section] of Object.entries(rules.sections)) {
        deductions[sectionKey] = {
            ...section,
            claimed: 0,
            remaining: section.maxLimit === Infinity ? Infinity : section.maxLimit,
            sources: [],
        };
    }

    // Map investments → sections
    for (const inv of investments) {
        const section = rules.investmentSectionMap[inv.assetType];
        if (section && deductions[section]) {
            const amount = inv.investedAmount || 0;
            deductions[section].claimed += amount;
            deductions[section].sources.push({
                type: 'investment',
                name: inv.name,
                assetType: inv.assetType,
                amount,
            });
        }
    }

    // Map expenses → sections
    for (const [category, amount] of Object.entries(expenseByCategory)) {
        const section = rules.expenseSectionMap[category];
        if (section && deductions[section]) {
            deductions[section].claimed += amount;
            deductions[section].sources.push({
                type: 'expense',
                name: category,
                amount,
            });
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

    // ── 5. Compute Taxable Income & Tax Liability ──

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

    // ── 6. Compute Tax Optimization Score ──
    // Based on how much of available deduction limits have been utilized
    const utilizationPercentage = totalDeductionPossible > 0
        ? (totalDeductionsClaimed / totalDeductionPossible) * 100
        : 0;
    const optimizationScore = Math.min(100, Math.round(utilizationPercentage));

    // ── 7. Generate Recommendations ──
    const recommendations = [];

    for (const recGroup of rules.recommendations) {
        const section = recGroup.section;
        const ded = deductions[section];

        if (!ded || ded.remaining <= 0) continue;

        for (const instrument of recGroup.instruments) {
            // Compute estimated tax saving for this instrument
            // Use the user's highest marginal slab rate from old regime
            const marginalRate = getMarginalRate(oldTaxableIncome, rules.oldRegimeSlabs);
            const maxInvestable = ded.remaining;
            const estimatedSaving = parseFloat(((maxInvestable * marginalRate) / 100).toFixed(2));

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
            });
        }
    }

    // ── 8. Deduction Utilization Data (for charts) ──
    const deductionUtilization = Object.entries(deductions)
        .filter(([_, d]) => d.maxLimit !== Infinity)
        .map(([key, d]) => ({
            section: d.name,
            sectionKey: key,
            limit: d.maxLimit,
            claimed: d.claimed,
            remaining: d.remaining,
            percentage: d.maxLimit > 0 ? parseFloat(((d.claimed / d.maxLimit) * 100).toFixed(1)) : 0,
        }));

    // ── 9. Potential Savings (if all recommendations followed) ──
    const totalPotentialSaving = parseFloat(
        recommendations.reduce((sum, r) => sum + r.estimatedTaxSaving, 0).toFixed(2)
    );

    return {
        financialYear: fy,
        fyLabel: rules.label,
        income: {
            total: totalIncome,
            byCategory: incomeByCategory,
        },
        expenses: {
            total: totalExpenses,
            byCategory: expenseByCategory,
        },
        investments: {
            total: totalInvested,
            count: investments.length,
        },
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
