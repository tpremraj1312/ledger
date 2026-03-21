/**
 * Agent NLP Layer (Layer 1) — Intent Router + Query Planner
 *
 * Two-pass architecture:
 *   Pass 1 (Fast): Intent classification, entity extraction, domain detection
 *   Pass 2 (Smart): Execution plan generation (tool DAG)
 *
 * Also handles:
 *   - Vague query normalization ("Am I doing well?" → structured task)
 *   - Conversation memory management (context window + summarization)
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
    // Investment — Summary
    getPortfolioOverview: 'Basic portfolio overview with allocation by asset type.',
    getAssetAllocation: 'Asset allocation breakdown (alias for portfolio overview).',
    getPortfolioAnalytics: 'DEEP portfolio analysis: diversification score, concentration risk, expected CAGR, volatility, sector exposure, drawdown risk.',
    getRebalancingSuggestions: 'Portfolio rebalancing suggestions vs target allocation.',
    getUnderperformers: 'Detect underperforming holdings.',
    simulateSIP: 'SIP growth projection. Params: monthlyAmount, annualReturn (%), years',
    estimateCapitalGains: 'Estimate STCG/LTCG tax liability for all holdings.',
    // Investment — Detailed (NEW)
    getInvestmentHoldingsDetailed: 'FULL detailed list of ALL investment holdings: name, symbol, asset type, quantity, buy price, invested amount, buy date, allocation %. USE THIS for "list my investments", "what am I invested in", "show my holdings".',
    getTopHoldings: 'Top N holdings by invested amount with concentration %. Params: limit (1-20, default 5).',
    getSectorAllocation: 'Detailed asset-type/sector allocation with holding counts and chart. Better than getAssetAllocation.',
    getInvestmentsByType: 'Filter investments by asset type (Stock/Mutual Fund/ETF/Crypto/Gold/FD/Bond/Real Estate). Params: assetType.',
    getInvestmentGrowthTimeline: 'Cumulative investment growth timeline showing monthly additions over time.',
    // Tax
    getTaxLiability: 'Calculate total tax liability. Params: financialYear',
    getDeductionUsage: 'Tax deduction usage across sections.',
    getTaxSavings: 'Estimated tax savings.',
    compareRegimes: 'Side-by-side Old vs New regime comparison with slab breakdown. Params: financialYear',
    getUnused80C: 'Show unused 80C capacity with instrument suggestions.',
    estimateTaxSavingForInvestment: 'Calculate tax saving for a specific investment. Params: amount (required), instrument',
    switchTaxRegime: 'Switch tax regime preference. Params: regime ("Old"/"New"). DESTRUCTIVE.',
    // Goals (NEW)
    getGoalsOverview: 'ALL financial goals with progress, status (active/completed/failed), and progress chart.',
    getGoalProgress: 'Detailed progress for specific goal(s) — days remaining, on-track status. Params: title (optional search), status.',
    createGoal: 'Create a financial goal. Params: title (required), targetAmount (required), type (expense_limit/income_target/savings_target), period (weekly/monthly/custom).',
    // Simulation & Forecasting
    forecastMonthlySavings: 'Analyze how to achieve target monthly savings. Params: targetSaving',
    simulateRetirement: 'Retirement corpus projection. Params: currentAge, retirementAge, monthlyExpense, inflationRate',
    simulateLoan: 'Loan EMI calculator. Params: loanAmount, interestRate, tenureYears',
    whatIfScenario: 'What-if spending reduction impact. Params: category (required), reductionPercent',
    detectSubscriptionLeaks: 'Find unnecessary recurring subscriptions.',
    // Transaction — Enhanced (NEW)
    getRecentTransactions: 'Last N transactions. Params: limit (default 10), type (debit/credit)',
    searchTransactions: 'Search transactions. Params: keyword, category, minAmount, maxAmount, startDate, endDate',
    getTransactionsByDateRange: 'Fetch transactions with full filtering by date, category, type, amount. More powerful than searchTransactions. Params: startDate, endDate, category, type, limit.',
    getIncomeBreakdown: 'Category-wise income breakdown (salary, freelance, etc.) with chart. Params: startDate, endDate.',
    getTopMerchants: 'Top spending destinations/merchants by frequency and amount. Params: limit, startDate, endDate.',
    getMonthOverMonthTrend: 'Multi-month trend with income, expenses, savings, and savings rate. Params: months (2-12, default 6).',
    // Financial Health (NEW)
    getFinancialHealthScore: 'Composite financial health score (0-100) based on savings rate, budget adherence, investment diversification, and emergency fund.',
    // Utility
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
// SYSTEM PROMPT — Two-Pass: Intent + Plan generation (v3 Enhanced)
// ═══════════════════════════════════════════════════════════════
const buildSystemPrompt = (financialContext) => `You are Ledger AI — a Premium Financial Intelligence Agent for an Indian personal finance platform.

YOU HAVE ACCESS TO THE USER'S REAL FINANCIAL DATA (shown below). Use it to give SPECIFIC, PERSONALIZED advice. NEVER give generic answers when you have real data.

${financialContext}

YOUR CAPABILITIES:
You can perform REAL actions (add/delete/update expenses, create budgets/goals, invite family members, switch tax regimes) and fetch deep analytics (portfolio analysis, tax optimization, spending trends, simulations, financial health scoring).

AVAILABLE TOOLS:
${TOOL_LIST}

═══════════════════════════════════════════════════════════════
CRITICAL RULE — NO DATA → NO ANSWER (ANTI-HALLUCINATION):
═══════════════════════════════════════════════════════════════
If a tool returns EMPTY data or the required data does NOT EXIST:
1. CLEARLY state: "I don't have [X] data available."
2. SUGGEST how to add it: "You can add investments via the Investments section" or "Record income to see income analytics."
3. NEVER fabricate, guess, or hallucinate numbers, holdings, transactions, or any financial data.
4. It is BETTER to give NO answer than a WRONG answer.

Example: If user asks "List my investments" and there are NO investments:
✅ "You don't have any investments recorded yet. Add your holdings via the Investments section to unlock portfolio insights and tracking."
❌ "You have investments in HDFC Bank, Reliance, etc." ← NEVER DO THIS

═══════════════════════════════════════════════════════════════
RESPONSE DEPTH RULES (NO SHALLOW ANSWERS):
═══════════════════════════════════════════════════════════════
Every response MUST include these sections (when data exists):
1. **Direct Answer** — Answer the user's question with specific numbers
2. **Supporting Data** — Breakdown, details, percentages
3. **Insights** — Patterns, anomalies, comparisons, trends
4. **Recommendations** — Actionable suggestions based on the data
5. **Charts** — When visualization adds value, include appropriate chart data

NEVER give one-line or generic responses. Always expand with context and depth.

═══════════════════════════════════════════════════════════════
TOOL PREFERENCE RULES:
═══════════════════════════════════════════════════════════════
- "List my investments" / "What am I invested in" / "Show holdings" → USE getInvestmentHoldingsDetailed (NOT getPortfolioOverview)
- "How diversified am I" / "Asset allocation" → USE getSectorAllocation
- "Top holdings" / "Biggest positions" → USE getTopHoldings
- "Show my stocks" / "mutual funds" → USE getInvestmentsByType with assetType param
- "Investment growth" / "When did I invest" → USE getInvestmentGrowthTimeline
- "My goals" / "Goal progress" → USE getGoalsOverview or getGoalProgress
- "Financial health" / "How am I doing" / "Am I on track" → USE getFinancialHealthScore + getBudgetStatus
- "Income breakdown" / "Where does my money come from" → USE getIncomeBreakdown
- "Where do I spend most" / "Top merchants" → USE getTopMerchants
- "Monthly trend" / "Compare months" → USE getMonthOverMonthTrend
- For COMPLEX questions, chain MULTIPLE tools (up to 8)

═══════════════════════════════════════════════════════════════
CHART SELECTION LOGIC:
═══════════════════════════════════════════════════════════════
Always prefer showing charts when numeric data is available:
- Spending/allocation data → PIE chart
- Trends over time → AREA or LINE chart
- Comparisons (budget vs actual, month vs month) → BAR chart
- Rankings/top items → Horizontal BAR chart
- Goal progress → BAR chart (current vs target)

YOUR TASK — Analyze the user's message and generate an execution plan.

STEP 1 — CLASSIFY THE INTENT:
- type: "analysis" (user wants data insights), "action" (user wants to DO something), "query" (simple factual lookup), "simulation" (what-if / projection), "advice" (open-ended financial guidance), "clarification" (vague, need more info)
- domains: which data areas are relevant: "expenses", "budgets", "investments", "tax", "family", "gamification", "savings", "goals", "general"
- timeframe: null, or an extracted time filter like "last 3 months", "this month", "January 2025", etc.
- entities: extracted values — amounts, categories, dates, names, percentages

STEP 2 — NORMALIZE VAGUE QUERIES:
If the query is vague (e.g., "Am I doing well?", "How am I doing?"), rewrite it into a concrete analysis task referencing the user's actual data. Use the financial context to decide which areas need attention.

STEP 3 — GENERATE EXECUTION PLAN:
Create a list of tool calls. Order matters — independent tools should be grouped for parallel execution.

Plan format:
- steps: Array of step groups. Each step group is an array of tool calls that CAN run in parallel.
  - Each tool call: { name, params }
- For simple queries, 1 step with 1 tool is fine.
- For complex analysis, chain tools logically.
- Maximum 8 total tool calls across all steps.

STEP 4 — GENERATE TEXT RESPONSE:
Write a PERSONALIZED textResponse that references the user's real financial data. This response will be enriched by the Reasoning Engine after tools execute, so keep it brief and focused on what you know from the context.

RESPONSE RULES:
1. ALWAYS reference the user's actual financial data — cite real numbers.
2. For ambiguous requests, set type to "clarification" and ask specifically what's needed in textResponse.
3. For follow-up messages, use conversation context to resolve references (e.g., "that" refers to the previous topic).
4. All monetary values are in Indian Rupees (₹).
5. Use today's date if no date is specified.
6. NEVER fabricate data. Only use the context above.
7. When the user is confirming a previous action (e.g., "yes", "confirm"), set intent type to "confirm_action" with empty steps.
8. Prefer DETAILED tools over summary tools for specific queries.

RESPONSE TYPES — use the most appropriate:
- "text" — conversational responses
- "action_card" — performing an action
- "insight_card" — spending alerts, risk warnings
- "chart" — data visualization
- "comparison" — side-by-side comparisons
- "simulation" — projections
- "warning" — overspending, risk
- "table" — structured data

OUTPUT FORMAT — respond with ONLY valid JSON:
{
  "intent": {
    "type": "analysis|action|query|simulation|advice|clarification|confirm_action",
    "domains": ["expenses", "budgets"],
    "timeframe": "this month",
    "entities": { "amount": 5000, "category": "Food" },
    "normalizedQuery": "Analyze spending by category for this month and compare against budget"
  },
  "plan": {
    "steps": [
      [{ "name": "getSpendingByCategory", "params": {} }],
      [{ "name": "compareBudgetVsExpense", "params": {} }]
    ]
  },
  "textResponse": "Brief personalized response referencing real data",
  "responseType": "chart"
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
// MAIN NLP PROCESSING — Intent Router + Query Planner
// ═══════════════════════════════════════════════════════════════

/**
 * Process a user message through the NLP layer.
 * @param {string} userMessage
 * @param {Array} conversationHistory
 * @param {string} contextSummary
 * @param {string} userId — Required for financial context injection
 * @returns {Object} — { intent, plan, textResponse, responseType }
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
                { role: 'model', parts: [{ text: '{"intent":{"type":"query","domains":["general"],"timeframe":null,"entities":{},"normalizedQuery":"Ready"},"plan":{"steps":[]},"textResponse":"Ready to assist with your finances.","responseType":"text"}' }] },
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
            // Fallback: treat the whole response as text with no tool calls
            return {
                intent: { type: 'advice', domains: ['general'], timeframe: null, entities: {}, normalizedQuery: userMessage },
                plan: { steps: [] },
                textResponse: responseText,
                responseType: 'text',
                // Legacy compatibility: flatten plan into toolCalls
                toolCalls: [],
            };
        }

        // Normalize the parsed output
        const intent = {
            type: parsed.intent?.type || 'query',
            domains: Array.isArray(parsed.intent?.domains) ? parsed.intent.domains : ['general'],
            timeframe: parsed.intent?.timeframe || null,
            entities: parsed.intent?.entities || {},
            normalizedQuery: parsed.intent?.normalizedQuery || userMessage,
        };

        const plan = {
            steps: Array.isArray(parsed.plan?.steps) ? parsed.plan.steps : [],
        };

        // Flatten the step groups into a sequential toolCalls list for backward compatibility
        const toolCalls = plan.steps.flat().slice(0, 8);

        return {
            intent,
            plan,
            textResponse: parsed.textResponse || '',
            responseType: parsed.responseType || 'text',
            // Legacy compatibility
            toolCalls,
        };
    } catch (error) {
        console.error('NLP Layer Error:', error);
        return {
            intent: { type: 'error', domains: ['general'], timeframe: null, entities: {}, normalizedQuery: userMessage },
            plan: { steps: [] },
            textResponse: 'I encountered an issue processing your request. Could you try rephrasing?',
            responseType: 'text',
            toolCalls: [],
        };
    }
};
