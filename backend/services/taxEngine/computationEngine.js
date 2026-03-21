import mongoose from 'mongoose';
import Transaction from '../../models/transaction.js';
import Investment from '../../models/Investment.js';
import RecurringExpense from '../../models/RecurringExpense.js';
import {
    getTaxRules,
    getCurrentFY,
    computeTaxFromSlabs,
    getFYDateRange,
    validateInvestmentEligibility,
    validateExpenseEligibility,
} from '../../utils/taxRules.js';

/**
 * Deterministic Engine: Grabs user financials and applies raw tax rules.
 * Outputs the base tax profile without recommendations or opportunities.
 */
export const computeUserTaxProfile = async (userId, financialYear = null, session = null) => {
    const fy = financialYear || getCurrentFY();
    const rules = getTaxRules(fy);
    const { start, end } = getFYDateRange(fy);
    const userOid = new mongoose.Types.ObjectId(userId);

    // 1. Gather Income
    const incomeAgg = await Transaction.aggregate([
        { $match: { user: userOid, type: 'credit', isDeleted: false, mode: 'PERSONAL', date: { $gte: start, $lte: end } } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ], { session });

    let totalIncome = 0;
    const incomeByCategory = {};
    incomeAgg.forEach((item) => {
        incomeByCategory[item._id] = { amount: parseFloat(item.total.toFixed(2)), count: item.count };
        totalIncome += item.total;
    });

    // 2. Gather Expenses
    const expenseAgg = await Transaction.aggregate([
        { $match: { user: userOid, type: 'debit', isDeleted: false, mode: 'PERSONAL', date: { $gte: start, $lte: end } } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ], { session });

    let totalExpenses = 0;
    const expenseByCategory = {};
    expenseAgg.forEach((item) => {
        expenseByCategory[item._id] = { amount: parseFloat(item.total.toFixed(2)), count: item.count };
        totalExpenses += item.total;
    });

    // 3. Gather Investments
    const investmentsQuery = Investment.find({ user: userOid, buyDate: { $gte: start, $lte: end } });
    if (session) investmentsQuery.session(session);
    const investments = await investmentsQuery.lean();

    // 4. Map Deductions (Utilizing taxRules.js)
    const deductions = {};
    for (const [sectionKey, section] of Object.entries(rules.sections)) {
        deductions[sectionKey] = {
            ...section,
            claimed: 0,
            remaining: section.maxLimit === Infinity ? Infinity : section.maxLimit,
            sources: [],
        };
    }

    for (const inv of investments) {
        const sectionKey = rules.investmentSectionMap[inv.assetType];
        if (sectionKey && deductions[sectionKey]) {
            const validation = validateInvestmentEligibility(inv, sectionKey, rules);
            if (validation.eligible) {
                deductions[sectionKey].claimed += inv.investedAmount || 0;
            }
        }
    }

    for (const [category, data] of Object.entries(expenseByCategory)) {
        const sectionKey = rules.expenseSectionMap[category];
        if (sectionKey && deductions[sectionKey]) {
            const validation = validateExpenseEligibility(category, sectionKey, rules);
            if (validation.eligible) {
                deductions[sectionKey].claimed += data.amount;
            }
        }
    }

    let totalDeductionsClaimed = 0;
    let totalDeductionPossible = 0;
    for (const [key, ded] of Object.entries(deductions)) {
        const limit = ded.maxLimit === Infinity ? ded.claimed : ded.maxLimit;
        ded.claimed = parseFloat(Math.min(ded.claimed, limit).toFixed(2));
        ded.remaining = ded.maxLimit === Infinity ? 0 : parseFloat(Math.max(0, ded.maxLimit - ded.claimed).toFixed(2));
        totalDeductionsClaimed += ded.claimed;
        if (ded.maxLimit !== Infinity) totalDeductionPossible += ded.maxLimit;
    }

    // 5. Compute Taxes 
    // Old Regime
    const oldTaxableIncome = Math.max(0, totalIncome - rules.standardDeduction - totalDeductionsClaimed);
    let oldTax = computeTaxFromSlabs(oldTaxableIncome, rules.oldRegimeSlabs);
    if (oldTaxableIncome <= rules.rebate87A.oldRegime.limit) oldTax = Math.max(0, oldTax - rules.rebate87A.oldRegime.maxRebate);
    const oldCess = parseFloat(((oldTax * rules.cessRate) / 100).toFixed(2));
    const oldTotalTax = parseFloat((oldTax + oldCess).toFixed(2));

    // New Regime
    const newRegimeDeductions = rules.standardDeduction + (deductions['80CCD_1B'] ? deductions['80CCD_1B'].claimed : 0);
    const newTaxableIncome = Math.max(0, totalIncome - newRegimeDeductions);
    let newTax = computeTaxFromSlabs(newTaxableIncome, rules.newRegimeSlabs);
    if (newTaxableIncome <= rules.rebate87A.newRegime.limit) newTax = Math.max(0, newTax - rules.rebate87A.newRegime.maxRebate);
    const newCess = parseFloat(((newTax * rules.cessRate) / 100).toFixed(2));
    const newTotalTax = parseFloat((newTax + newCess).toFixed(2));

    const optimizationScore = totalDeductionPossible > 0 ? Math.min(100, Math.round((totalDeductionsClaimed / totalDeductionPossible) * 100)) : 0;

    return {
        totalIncome,
        totalExpenses,
        expenseByCategory,
        deductions,
        oldTotalTax,
        newTotalTax,
        oldTaxableIncome,
        newTaxableIncome,
        optimizationScore,
        rules
    };
};

/**
 * Simulation Engine: Takes a base profile and adds hypothetical investments,
 * returning the new tax liability without touching the DB.
 * additionalInvestments: { '80C': 50000, '80D_self': 10000 }
 */
export const simulateTaxProfile = (baseProfile, additionalInvestments) => {
    // Deep clone deductions to avoid mutating base profile
    const simDeductions = JSON.parse(JSON.stringify(baseProfile.deductions));
    const rules = baseProfile.rules;

    // Apply hypothetical investments
    for (const [sectionKey, extraAmount] of Object.entries(additionalInvestments)) {
        if (simDeductions[sectionKey]) {
            simDeductions[sectionKey].claimed += extraAmount;
        }
    }

    let totalDeductionsClaimed = 0;
    for (const [key, ded] of Object.entries(simDeductions)) {
        const limit = ded.maxLimit === Infinity ? ded.claimed : ded.maxLimit;
        ded.claimed = parseFloat(Math.min(ded.claimed, limit).toFixed(2));
        ded.remaining = ded.maxLimit === Infinity ? 0 : parseFloat(Math.max(0, ded.maxLimit - ded.claimed).toFixed(2));
        totalDeductionsClaimed += ded.claimed;
    }

    // Recalculate Taxes
    const oldTaxableIncome = Math.max(0, baseProfile.totalIncome - rules.standardDeduction - totalDeductionsClaimed);
    let oldTax = computeTaxFromSlabs(oldTaxableIncome, rules.oldRegimeSlabs);
    if (oldTaxableIncome <= rules.rebate87A.oldRegime.limit) oldTax = Math.max(0, oldTax - rules.rebate87A.oldRegime.maxRebate);
    const oldCess = parseFloat(((oldTax * rules.cessRate) / 100).toFixed(2));
    const oldTotalTax = parseFloat((oldTax + oldCess).toFixed(2));

    const newRegimeDeductions = rules.standardDeduction + (simDeductions['80CCD_1B'] ? simDeductions['80CCD_1B'].claimed : 0);
    const newTaxableIncome = Math.max(0, baseProfile.totalIncome - newRegimeDeductions);
    let newTax = computeTaxFromSlabs(newTaxableIncome, rules.newRegimeSlabs);
    if (newTaxableIncome <= rules.rebate87A.newRegime.limit) newTax = Math.max(0, newTax - rules.rebate87A.newRegime.maxRebate);
    const newCess = parseFloat(((newTax * rules.cessRate) / 100).toFixed(2));
    const newTotalTax = parseFloat((newTax + newCess).toFixed(2));

    return {
        oldTotalTax,
        newTotalTax,
        oldTaxableIncome,
        newTaxableIncome,
        deductions: simDeductions,
        recommendedRegime: oldTotalTax <= newTotalTax ? 'Old Regime' : 'New Regime'
    };
};
