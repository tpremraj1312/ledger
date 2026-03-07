/**
 * Tax Projection Simulator
 * Simulates tax liability based on hypothetical income, investments, and deductions.
 * Allows users to plan ahead and see the impact of future financial decisions.
 */

import {
    getTaxRules,
    getCurrentFY,
    computeTaxFromSlabs,
} from '../utils/taxRules.js';

/**
 * Simulate tax projection based on expected inputs.
 * @param {object} params
 * @param {number} params.expectedIncome — projected annual income
 * @param {object} params.futureInvestments — planned investments by section
 * @param {object} params.futureDeductions — additional deductions by section
 * @param {string} [params.financialYear] — FY to use for rules
 * @param {object} [params.currentSummary] — optional current tax summary for comparison
 * @returns {object} — Projection results
 */
export const simulateTaxProjection = (params) => {
    const {
        expectedIncome = 0,
        futureInvestments = {},
        futureDeductions = {},
        financialYear,
        currentSummary,
    } = params;

    const fy = financialYear || getCurrentFY();
    const rules = getTaxRules(fy);

    // ── Compute deductions from future investments + deductions ──
    let totalDeductions = 0;
    const deductionBreakdown = {};

    for (const [sectionKey, section] of Object.entries(rules.sections)) {
        const investmentAmount = futureInvestments[sectionKey] || 0;
        const deductionAmount = futureDeductions[sectionKey] || 0;
        const currentClaimed = currentSummary?.deductions?.sections?.find(
            s => s.sectionKey === sectionKey
        )?.claimed || 0;

        const totalForSection = currentClaimed + investmentAmount + deductionAmount;
        const cappedAmount = section.maxLimit === Infinity
            ? totalForSection
            : Math.min(totalForSection, section.maxLimit);

        deductionBreakdown[sectionKey] = {
            name: section.name,
            currentClaimed,
            futureInvestment: investmentAmount,
            futureDeduction: deductionAmount,
            total: parseFloat(cappedAmount.toFixed(2)),
            limit: section.maxLimit === Infinity ? 'No limit' : section.maxLimit,
            remaining: section.maxLimit === Infinity
                ? 0
                : parseFloat(Math.max(0, section.maxLimit - cappedAmount).toFixed(2)),
        };

        if (section.maxLimit !== Infinity) {
            totalDeductions += cappedAmount;
        }
    }

    // ── Old Regime Projection ──
    const oldTaxableIncome = Math.max(0, expectedIncome - rules.standardDeduction - totalDeductions);
    let oldTax = computeTaxFromSlabs(oldTaxableIncome, rules.oldRegimeSlabs);

    if (oldTaxableIncome <= rules.rebate87A.oldRegime.limit) {
        oldTax = Math.max(0, oldTax - rules.rebate87A.oldRegime.maxRebate);
    }

    const oldCess = parseFloat(((oldTax * rules.cessRate) / 100).toFixed(2));
    const oldTotalTax = parseFloat((oldTax + oldCess).toFixed(2));

    // ── New Regime Projection ──
    const newRegimeDeductions = rules.standardDeduction +
        (deductionBreakdown['80CCD_1B']?.total || 0);
    const newTaxableIncome = Math.max(0, expectedIncome - newRegimeDeductions);
    let newTax = computeTaxFromSlabs(newTaxableIncome, rules.newRegimeSlabs);

    if (newTaxableIncome <= rules.rebate87A.newRegime.limit) {
        newTax = Math.max(0, newTax - rules.rebate87A.newRegime.maxRebate);
    }

    const newCess = parseFloat(((newTax * rules.cessRate) / 100).toFixed(2));
    const newTotalTax = parseFloat((newTax + newCess).toFixed(2));

    // ── Comparison with current ──
    const currentTax = currentSummary
        ? Math.min(
            currentSummary.taxLiability.oldRegime.total,
            currentSummary.taxLiability.newRegime.total
        )
        : null;

    const projectedTax = Math.min(oldTotalTax, newTotalTax);
    const recommendedRegime = oldTotalTax <= newTotalTax ? 'Old Regime' : 'New Regime';
    const taxSavingFromProjection = currentTax !== null
        ? parseFloat((currentTax - projectedTax).toFixed(2))
        : 0;

    // ── Effective tax rate ──
    const effectiveTaxRate = expectedIncome > 0
        ? parseFloat(((projectedTax / expectedIncome) * 100).toFixed(2))
        : 0;

    return {
        financialYear: fy,
        fyLabel: rules.label,
        input: {
            expectedIncome,
            futureInvestments,
            futureDeductions,
        },
        projectedTax: {
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
            optimalTax: projectedTax,
            savingByChoosingRecommended: parseFloat(Math.abs(oldTotalTax - newTotalTax).toFixed(2)),
        },
        deductions: {
            total: parseFloat(totalDeductions.toFixed(2)),
            breakdown: deductionBreakdown,
        },
        comparison: currentTax !== null ? {
            currentTax,
            projectedTax,
            savings: taxSavingFromProjection,
            percentageImprovement: currentTax > 0
                ? parseFloat(((taxSavingFromProjection / currentTax) * 100).toFixed(1))
                : 0,
        } : null,
        effectiveTaxRate,
        standardDeduction: rules.standardDeduction,
    };
};
