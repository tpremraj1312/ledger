/**
 * Tax AI Narrative Generator
 * Uses Gemini to generate a plain-English explanation of a pre-computed tax summary.
 * AI does NOT compute numbers — only enhances readability.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
};

/**
 * Generate a personalized AI narrative from a pre-computed tax summary.
 * @param {object} summary — the full output from taxService.computeTaxSummary()
 * @returns {string} — Markdown-formatted narrative
 */
export const generateTaxNarrative = async (summary) => {
    try {
        const prompt = `
You are a friendly, expert Indian tax advisor speaking directly to the user.

Here is their tax summary for ${summary.fyLabel}:

- **Gross Income**: ${formatCurrency(summary.income.total)}
- **Total Expenses**: ${formatCurrency(summary.expenses.total)}
- **Tax-Saving Investments**: ${formatCurrency(summary.investments.total)} across ${summary.investments.count} investments
- **Deductions Claimed**: ${formatCurrency(summary.deductions.total)} out of ${formatCurrency(summary.deductions.totalPossible)} possible
- **Tax Optimization Score**: ${summary.optimizationScore}/100

Tax Liability:
- Old Regime: ${formatCurrency(summary.taxLiability.oldRegime.total)}
- New Regime: ${formatCurrency(summary.taxLiability.newRegime.total)}
- Recommended: ${summary.taxLiability.recommendedRegime}

Deduction Utilization:
${summary.deductions.sections.map(s => `- ${s.section}: ${formatCurrency(s.claimed)}/${formatCurrency(s.limit)} (${s.percentage}%)`).join('\n')}

Top Recommendations:
${summary.recommendations.slice(0, 5).map(r => `- ${r.instrument} under ${r.section}: can save ${formatCurrency(r.estimatedTaxSaving)}`).join('\n')}

Total Potential Additional Saving: ${formatCurrency(summary.totalPotentialSaving)}

Instructions:
1. Write a clear, personalized 3-4 paragraph explanation in simple language.
2. Address the user as "you".
3. Highlight what they're doing well and where they can improve.
4. Suggest specific actions with amounts.
5. Mention the recommended tax regime and why.
6. Keep tone encouraging and professional.
7. Use ₹ for all currency. Use Indian number formatting.
8. Do NOT recalculate any numbers — use the exact figures provided above.
9. Format in clean markdown with bold highlights for key numbers.
10. Keep it under 300 words.
`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return text;
    } catch (error) {
        console.error('Tax AI Narrative Error:', error);
        return 'Unable to generate AI insights at this time. Please try again later. Your tax summary and recommendations above are based on accurate server-side calculations.';
    }
};
