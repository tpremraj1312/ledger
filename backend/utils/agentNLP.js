/**
 * Agent NLP Layer (Layer 1) — Intelligence & Understanding
 * Uses Google Gemini for:
 *   - Intent detection with financial context
 *   - Entity extraction
 *   - Tool call generation
 *   - Contextual reasoning over real user data
 *   - Structured response formatting
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { TOOL_PERMISSION_MAP } from './agentTools.js';
import { buildUserContext } from './agentContextBuilder.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

// ═══════════════════════════════════════════════════════════════
// TOOL DEFINITIONS — passed to LLM as function schema (ALL tools)
// ═══════════════════════════════════════════════════════════════
const TOOL_DESCRIPTIONS = {
    // Core Expense
    addExpense: 'Add a new expense transaction. Params: amount (number, required), category (string, required), description (string), date (YYYY-MM-DD), type ("debit"/"credit", default "debit")',
    getExpenseSummary: 'Get expense summary with category breakdown. Params: startDate, endDate, category',
    getSpendingTrend: 'Spending trend over months. Params: months (1-12, default 6)',
    deleteExpense: 'Delete expense by ID. Params: expenseId (required). DESTRUCTIVE.',
    updateExpense: 'Update expense. Params: expenseId (required), amount, category, description. DESTRUCTIVE.',
    getSpendingByCategory: 'Category-wise spending breakdown. Params: startDate, endDate',
    getMonthlyComparison: 'Income vs expense comparison. Params: months (2-12, default 3)',
    getWeeklyTrend: 'Weekly spending trend. Params: weeks (1-12, default 4)',
    // Budget
    createBudget: 'Create/update budget. Params: category (required), amount (required), period, type',
    getBudgetStatus: 'All budget statuses this month.',
    compareBudgetVsExpense: 'Budget vs actual spending. Params: category (optional)',
    forecastOverspending: 'Forecast budget overruns based on current rate.',
    // Family
    getFamilySummary: 'Family group summary with expenses.',
    getContributionBreakdown: 'Family member spending breakdown.',
    getFamilyMembers: 'List all family members with roles.',
    inviteFamilyMember: 'Invite someone to family by email. Params: email (required). ADMIN only.',
    removeFamilyMember: 'Remove family member. Params: email or memberId. ADMIN only. DESTRUCTIVE.',
    changeMemberRole: 'Change member role. Params: email/memberId, newRole (ADMIN/MEMBER/VIEWER). ADMIN only. DESTRUCTIVE.',
    // Investment
    getPortfolioOverview: 'Basic portfolio overview with allocation.',
    getAssetAllocation: 'Asset allocation breakdown.',
    getPortfolioAnalytics: 'DEEP portfolio analysis: diversification score, concentration risk, expected CAGR, volatility, sector exposure, drawdown risk.',
    getRebalancingSuggestions: 'Portfolio rebalancing suggestions vs target allocation.',
    getUnderperformers: 'Detect underperforming holdings.',
    simulateSIP: 'SIP growth projection. Params: monthlyAmount, annualReturn (%), years',
    estimateCapitalGains: 'Estimate STCG/LTCG tax liability for all holdings.',
    // Tax
    getTaxLiability: 'Calculate total tax liability. Params: financialYear',
    getDeductionUsage: 'Tax deduction usage across sections.',
    getTaxSavings: 'Estimated tax savings.',
    compareRegimes: 'Side-by-side Old vs New regime comparison with slab breakdown. Params: financialYear',
    getUnused80C: 'Show unused 80C capacity with instrument suggestions.',
    estimateTaxSavingForInvestment: 'Calculate tax saving for a specific investment. Params: amount (required), instrument',
    switchTaxRegime: 'Switch tax regime preference. Params: regime ("Old"/"New"). DESTRUCTIVE.',
    // Simulation & Forecasting
    forecastMonthlySavings: 'Analyze how to achieve target monthly savings. Params: targetSaving',
    simulateRetirement: 'Retirement corpus projection. Params: currentAge, retirementAge, monthlyExpense, inflationRate',
    simulateLoan: 'Loan EMI calculator. Params: loanAmount, interestRate, tenureYears',
    whatIfScenario: 'What-if spending reduction impact. Params: category (required), reductionPercent',
    detectSubscriptionLeaks: 'Find unnecessary recurring subscriptions.',
    // Utility
    getRecentTransactions: 'Last N transactions. Params: limit (default 10), type (debit/credit)',
    searchTransactions: 'Search transactions. Params: keyword, category, minAmount, maxAmount, startDate, endDate',
    addIncome: 'Record income. Params: amount (required), category, description, date',
    getAnomalies: 'Detect unusual spending spikes.',
    getCashRunway: 'Emergency fund & cash runway analysis.',
    undoLastAction: 'Undo the last agent write action. DESTRUCTIVE.',
    // Gamification
    getQuestStatus: 'Gamification level, XP, title, badges.',
    getXPProgress: 'XP progress towards next level.',
    getStreak: 'Current and longest daily streak.',
    // Settings
    updatePreference: 'Update user preferences. Params: category, preferences (object)',
};

const TOOL_LIST = Object.entries(TOOL_DESCRIPTIONS)
    .map(([name, desc]) => `- ${name}: ${desc}`)
    .join('\n');

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT — Premium Financial Agent Persona
// ═══════════════════════════════════════════════════════════════
const buildSystemPrompt = (financialContext) => `You are Ledger AI — a Premium Financial Intelligence Agent for an Indian personal finance platform.

YOU HAVE ACCESS TO THE USER'S REAL FINANCIAL DATA (shown below). Use it to give SPECIFIC, PERSONALIZED advice. NEVER give generic answers when you have real data.

${financialContext}

YOUR CAPABILITIES:
You can perform REAL actions (add/delete/update expenses, create budgets, invite family members, switch tax regimes) and fetch deep analytics (portfolio analysis, tax optimization, spending trends, simulations).

AVAILABLE TOOLS:
${TOOL_LIST}

RESPONSE RULES:
1. Analyze the user's message and determine the best tool(s) to call.
2. Extract parameters from the message and conversation context.
3. ALWAYS reference the user's actual financial data in your textResponse — cite real numbers.
4. For general questions without tools needed, give advice based on the financial context above.
5. For ambiguous requests, ask for clarification — do NOT guess.
6. For follow-up messages, use conversation context to resolve references.
7. Maximum 5 tool calls per response.
8. All monetary values are in Indian Rupees (₹).
9. Use today's date if no date is specified.
10. NEVER fabricate data. Only use tool results and the context above.
11. When providing insights, be specific: "Your food spending is ₹12,000 (28% of total)" not "You spend a lot on food."
12. For actionable advice, tie it to real numbers from the context.

RESPONSE TYPES — use the most appropriate:
- "text" — conversational responses, advice, explanations
- "action_card" — when performing an action (add expense, invite member, switch regime)
- "insight_card" — spending alerts, risk warnings, savings opportunities
- "chart" — when data visualization would help understanding
- "comparison" — side-by-side comparisons (regimes, months, budgets)
- "simulation" — projections and what-if scenarios
- "warning" — overspending, risk concentration, anomalies
- "table" — structured tabular data (transactions, deductions)

OUTPUT FORMAT — respond with ONLY valid JSON:
{
  "intent": "brief intent description",
  "toolCalls": [
    { "name": "toolName", "params": { "key": "value" } }
  ],
  "textResponse": "Personalized response text referencing real data. This is shown alongside tool results.",
  "responseType": "text|action_card|insight_card|chart|comparison|simulation|warning|table",
  "needsConfirmation": false
}

If the user is confirming a previous action (e.g., "yes", "confirm", "go ahead"), respond with:
{
  "intent": "confirm_action",
  "toolCalls": [],
  "textResponse": "",
  "responseType": "text",
  "needsConfirmation": false
}`;

// ═══════════════════════════════════════════════════════════════
// MEMORY TOKEN CONTROL
// ═══════════════════════════════════════════════════════════════
const MAX_CONTEXT_MESSAGES = 10;

export const prepareContext = (messages, contextSummary = '') => {
    const contextMessages = [];

    if (contextSummary) {
        contextMessages.push({
            role: 'user',
            parts: [{ text: `[Previous conversation summary: ${contextSummary}]` }],
        });
    }

    const recentMessages = messages.slice(-MAX_CONTEXT_MESSAGES);
    for (const msg of recentMessages) {
        contextMessages.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        });
    }

    return contextMessages;
};

export const summarizeOlderMessages = async (messages) => {
    if (messages.length <= MAX_CONTEXT_MESSAGES) return '';

    const olderMessages = messages.slice(0, -MAX_CONTEXT_MESSAGES);
    const summaryText = olderMessages.map(m => `${m.role}: ${m.content.substring(0, 100)}`).join('\n');

    try {
        const result = await model.generateContent(
            `Summarize this financial conversation in 2-3 sentences, preserving key data, actions, and preferences:\n\n${summaryText}`
        );
        return result.response.text().substring(0, 500);
    } catch {
        return olderMessages
            .filter(m => m.role === 'user')
            .map(m => m.content.substring(0, 50))
            .join('; ')
            .substring(0, 300);
    }
};

// ═══════════════════════════════════════════════════════════════
// MAIN NLP PROCESSING — Now with context injection
// ═══════════════════════════════════════════════════════════════

/**
 * Process a user message through the NLP layer.
 * @param {string} userMessage
 * @param {Array} conversationHistory
 * @param {string} contextSummary
 * @param {string} userId — Required for financial context injection
 * @returns {Object} — { intent, toolCalls, textResponse, responseType, needsConfirmation }
 */
export const processNLP = async (userMessage, conversationHistory = [], contextSummary = '', userId = null) => {
    try {
        // Build financial context for this user
        let financialContext = '[FINANCIAL CONTEXT NOT AVAILABLE]';
        if (userId) {
            try {
                financialContext = await buildUserContext(userId);
            } catch (err) {
                console.error('Failed to build user context:', err.message);
            }
        }

        const systemPrompt = buildSystemPrompt(financialContext);
        const contextMessages = prepareContext(conversationHistory, contextSummary);

        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: '{"intent":"ready","toolCalls":[],"textResponse":"Ready to assist with your finances.","responseType":"text","needsConfirmation":false}' }] },
                ...contextMessages,
            ],
        });

        const result = await chat.sendMessage(userMessage);
        const responseText = result.response.text();

        // Parse JSON response
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
        const cleaned = jsonMatch ? jsonMatch[1] : responseText;

        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            return {
                intent: 'general_response',
                toolCalls: [],
                textResponse: responseText,
                responseType: 'text',
                needsConfirmation: false,
            };
        }

        return {
            intent: parsed.intent || 'unknown',
            toolCalls: Array.isArray(parsed.toolCalls) ? parsed.toolCalls.slice(0, 5) : [],
            textResponse: parsed.textResponse || '',
            responseType: parsed.responseType || 'text',
            needsConfirmation: parsed.needsConfirmation || false,
        };
    } catch (error) {
        console.error('NLP Layer Error:', error);
        return {
            intent: 'error',
            toolCalls: [],
            textResponse: 'I encountered an issue processing your request. Could you try rephrasing?',
            responseType: 'text',
            needsConfirmation: false,
        };
    }
};
