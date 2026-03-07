/**
 * Tax AI Narrative Generator (Structured JSON Output)
 * Uses Gemini to generate structured, personalized tax insights.
 * AI does NOT compute numbers — only interprets pre-computed data.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '₹0';
    return `₹${Number(amount).toLocaleString('en-IN')}`;
};

/**
 * Generate structured AI insights from a pre-computed tax summary.
 * @param {object} summary — the full output from taxService.computeTaxSummary()
 * @returns {object} — Structured JSON with insights
 */
export const generateTaxNarrative = async (summary) => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // ── Build Structured Financial Context ──
        const deductionDetails = summary.deductions.sections
            .map(s => `  - ${s.section}: ${formatCurrency(s.claimed)} / ${formatCurrency(s.limit)} (${s.percentage}% used, ${formatCurrency(s.remaining)} remaining)`)
            .join('\n');

        const topRecommendations = summary.recommendations
            .slice(0, 6)
            .map(r => `  - [${r.priority?.toUpperCase() || 'MEDIUM'}] ${r.instrument} under ${r.section}: can save ${formatCurrency(r.estimatedTaxSaving)}`)
            .join('\n');

        const patternWarnings = (summary.patternInsights || [])
            .map(p => `  - ${p.title}: ${p.description}`)
            .join('\n');

        const incomeBreakdown = (summary.income.breakdown || [])
            .map(i => `  - ${i.category}: ${formatCurrency(i.amount)} (${i.percentage}%)`)
            .join('\n');

        const expenseBreakdown = (summary.expenses.breakdown || [])
            .slice(0, 8)
            .map(e => `  - ${e.category}: ${formatCurrency(e.amount)} (${e.percentage}%)`)
            .join('\n');

        const prompt = `
You are an expert Indian Chartered Accountant providing personalized tax advisory. Analyze the following financial data and provide structured insights.

═══ USER FINANCIAL SUMMARY (${summary.fyLabel}) ═══

INCOME:
- Gross Annual Income: ${formatCurrency(summary.income.total)}
- Monthly Average: ${formatCurrency(summary.income.monthly)}
- Income Sources (${summary.income.sourceCount}):
${incomeBreakdown || '  - No income data available'}

EXPENSES:
- Total Annual Expenses: ${formatCurrency(summary.expenses.total)}
- Monthly Average: ${formatCurrency(summary.expenses.monthly)}
- Top Expense Categories:
${expenseBreakdown || '  - No expense data available'}

SAVINGS:
- Savings Rate: ${summary.savingsRate}%
- Net Savings: ${formatCurrency(summary.income.total - summary.expenses.total)}

INVESTMENTS:
- Total Tax-Saving Investments: ${formatCurrency(summary.investments.total)}
- Number of Investments: ${summary.investments.count}

═══ DEDUCTION UTILIZATION ═══
${deductionDetails || '  - No deductions claimed yet'}

Total Deductions Claimed: ${formatCurrency(summary.deductions.total)} / ${formatCurrency(summary.deductions.totalPossible)}
Tax Optimization Score: ${summary.optimizationScore}/100

═══ TAX REGIME COMPARISON ═══
- Old Regime Tax: ${formatCurrency(summary.taxLiability.oldRegime.total)} (Taxable: ${formatCurrency(summary.taxLiability.oldRegime.taxableIncome)})
- New Regime Tax: ${formatCurrency(summary.taxLiability.newRegime.total)} (Taxable: ${formatCurrency(summary.taxLiability.newRegime.taxableIncome)})
- Recommended: ${summary.taxLiability.recommendedRegime} (saves ${formatCurrency(summary.taxLiability.savingByChoosingRecommended)})

═══ TOP RECOMMENDATIONS ═══
${topRecommendations || '  - No additional recommendations — all deductions maximized!'}

═══ DETECTED PATTERNS ═══
${patternWarnings || '  - No missed opportunities detected'}

Total Potential Additional Saving: ${formatCurrency(summary.totalPotentialSaving)}

═══ INSTRUCTIONS ═══
1. Provide a personalized assessment as if you are their CA.
2. Be specific — reference actual amounts from the data above.
3. For action items, provide concrete actions with specific amounts.
4. For regime advice, explain the math briefly.
5. Do NOT invent or recalculate numbers — use only the figures provided.
6. Use ₹ for currency and Indian number formatting.
7. Keep each field concise and actionable.
8. If income is low or zero, acknowledge it and suggest foundational actions.

═══ RESPONSE FORMAT ═══
You MUST respond with ONLY valid JSON (no markdown, no code fences, no extra text). Use this exact schema:
{
  "overallAssessment": "A 2-3 sentence overall assessment of tax planning status",
  "strengths": ["Thing user is doing well 1", "Thing user is doing well 2"],
  "improvements": ["Improvement area 1", "Improvement area 2"],
  "regimeAdvice": "Which regime is better and why, with brief math",
  "actionItems": [
    {
      "action": "Specific action to take",
      "section": "Tax section (e.g. Section 80C)",
      "estimatedSaving": "₹XX,XXX",
      "urgency": "high|medium|low",
      "reasoning": "Why this action is recommended"
    }
  ],
  "incomeInsights": "Analysis of income pattern and tax bracket implications",
  "expenseInsights": "Analysis of spending patterns and deduction opportunities"
}

Respond ONLY with the JSON object. No other text before or after.
`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        let text = response.text();

        // Strip markdown code fences if present (Gemini sometimes wraps JSON in ```json blocks)
        text = text.trim();
        if (text.startsWith('```')) {
            text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
        }

        try {
            const parsed = JSON.parse(text);
            return parsed;
        } catch (parseErr) {
            console.warn('Tax AI: Failed to parse JSON, using text as assessment:', parseErr.message);
            // Fallback: return text as overall assessment
            return {
                overallAssessment: text,
                strengths: [],
                improvements: [],
                regimeAdvice: `The ${summary.taxLiability.recommendedRegime} is recommended based on your current deductions.`,
                actionItems: [],
                incomeInsights: '',
                expenseInsights: '',
            };
        }
    } catch (error) {
        console.error('Tax AI Narrative Error:', error);
        return {
            overallAssessment: 'Unable to generate AI insights at this time. Your tax summary and recommendations above are based on accurate server-side calculations.',
            strengths: [],
            improvements: [],
            regimeAdvice: `Based on calculations, the ${summary.taxLiability.recommendedRegime} appears optimal for you.`,
            actionItems: [],
            incomeInsights: '',
            expenseInsights: '',
        };
    }
};
