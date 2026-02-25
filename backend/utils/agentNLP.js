/**
 * Agent NLP Layer (Layer 1) — Intelligence & Understanding
 * Uses Google Gemini 1.5 Flash for:
 *   - Intent detection
 *   - Entity extraction
 *   - Tool call generation
 *   - Response formatting
 *   - Graph requirement detection
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { TOOL_PERMISSION_MAP } from './agentTools.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

// ═══════════════════════════════════════════════════════════════
// TOOL DEFINITIONS — passed to LLM as function schema
// ═══════════════════════════════════════════════════════════════
const TOOL_DEFINITIONS = Object.keys(TOOL_PERMISSION_MAP).map(name => {
    const descriptions = {
        addExpense: 'Add a new expense/income transaction. Params: amount (number, required), category (string, required), description (string), date (YYYY-MM-DD string), type ("debit" or "credit", default "debit")',
        getExpenseSummary: 'Get expense summary for current month or custom date range. Params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), category (string)',
        getSpendingTrend: 'Show spending trend over months. Params: months (number, 1-12, default 6)',
        deleteExpense: 'Delete a specific expense by ID. Params: expenseId (string, required). DESTRUCTIVE — requires confirmation.',
        updateExpense: 'Update a specific expense. Params: expenseId (string, required), amount (number), category (string), description (string). DESTRUCTIVE — requires confirmation.',
        getSpendingByCategory: 'Get spending breakdown by category. Params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)',
        getMonthlyComparison: 'Compare income vs expense across months. Params: months (number, 2-12, default 3)',
        getWeeklyTrend: 'Show weekly spending trend. Params: weeks (number, 1-12, default 4)',
        createBudget: 'Create or update a budget. Params: category (string, required), amount (number, required), period ("Monthly"/"Weekly"/"Quarterly"/"Yearly"), type ("expense"/"income")',
        getBudgetStatus: 'Show budget status for all categories this month. No params.',
        compareBudgetVsExpense: 'Compare budget vs actual spending. Params: category (string, optional filter)',
        forecastOverspending: 'Forecast which budgets will be exceeded based on current spending rate. No params.',
        getFamilySummary: 'Get family group summary. No params. Requires family membership.',
        getContributionBreakdown: 'Show how much each family member spent. No params. Requires family membership.',
        getPortfolioOverview: 'Show investment portfolio overview with allocation. No params.',
        getAssetAllocation: 'Show asset allocation breakdown. No params.',
        getTaxLiability: 'Calculate total tax liability. Params: financialYear (string, optional)',
        getDeductionUsage: 'Show tax deduction usage across sections. No params.',
        getTaxSavings: 'Show estimated tax savings. No params.',
        getQuestStatus: 'Show gamification level, XP, title, badges. No params.',
        getXPProgress: 'Show XP progress towards next level. No params.',
        getStreak: 'Show current and longest daily streak. No params.',
        updatePreference: 'Update user preferences. Params: category (string: "notifications"/"financial"/"tax"/"investment"/"gamification"/"ai"/"app"), preferences (object with settings)',
    };
    return { name, description: descriptions[name] || name };
});

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT — defines agent persona & output constraints
// ═══════════════════════════════════════════════════════════════
const SYSTEM_PROMPT = `You are Ledger AI — a professional Financial Copilot Agent for an Indian personal finance application.

YOUR CAPABILITIES:
You can perform real actions (add/update/delete expenses, create budgets, update settings) and fetch analytics (spending summaries, trends, tax data, investment data, gamification progress).

AVAILABLE TOOLS:
${TOOL_DEFINITIONS.map(t => `- ${t.name}: ${t.description}`).join('\n')}

RULES:
1. Analyze the user's message and determine the best tool(s) to call.
2. Extract all necessary parameters from the user's message and conversation context.
3. If the user's request is a general greeting or question not requiring tools, set toolCalls to an empty array and provide a helpful text response.
4. For ambiguous requests, ask for clarification — do NOT guess.
5. For follow-up messages like "make it 750" or "actually change the category", use conversation context to resolve references.
6. Maximum 3 tool calls per response.
7. All monetary values are in Indian Rupees (₹).
8. Use today's date if no date is specified for actions.
9. When the user asks to "show" or "visualize" data, prefer tools that return chartData.
10. Never fabricate data — only use tool results.

OUTPUT FORMAT — respond with ONLY valid JSON, no markdown, no explanation:
{
  "intent": "brief intent description",
  "toolCalls": [
    { "name": "toolName", "params": { "key": "value" } }
  ],
  "textResponse": "Friendly response text if no tools needed, or additional context",
  "responseType": "text|chart|table|card|comparison|warning",
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
// MEMORY TOKEN CONTROL — sliding window + summarization
// ═══════════════════════════════════════════════════════════════
const MAX_CONTEXT_MESSAGES = 10;

/**
 * Prepares conversation context for the LLM.
 * Uses sliding window of last N messages + contextSummary for older ones.
 * Strips unnecessary metadata to minimize tokens.
 */
export const prepareContext = (messages, contextSummary = '') => {
    const contextMessages = [];

    // Add summary of older messages if available
    if (contextSummary) {
        contextMessages.push({
            role: 'user',
            parts: [{ text: `[Previous conversation summary: ${contextSummary}]` }],
        });
    }

    // Take last N messages, strip heavy metadata
    const recentMessages = messages.slice(-MAX_CONTEXT_MESSAGES);
    for (const msg of recentMessages) {
        contextMessages.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        });
    }

    return contextMessages;
};

/**
 * Summarize older messages into a compact context string.
 * Called when message count exceeds threshold.
 */
export const summarizeOlderMessages = async (messages) => {
    if (messages.length <= MAX_CONTEXT_MESSAGES) return '';

    const olderMessages = messages.slice(0, -MAX_CONTEXT_MESSAGES);
    const summaryText = olderMessages.map(m => `${m.role}: ${m.content.substring(0, 100)}`).join('\n');

    try {
        const result = await model.generateContent(
            `Summarize this financial assistant conversation in 2-3 sentences, preserving key financial data, actions taken, and user preferences:\n\n${summaryText}`
        );
        return result.response.text().substring(0, 500);
    } catch {
        // Fallback: simple text extraction
        return olderMessages
            .filter(m => m.role === 'user')
            .map(m => m.content.substring(0, 50))
            .join('; ')
            .substring(0, 300);
    }
};

// ═══════════════════════════════════════════════════════════════
// MAIN NLP PROCESSING FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Process a user message through the NLP layer.
 * @param {string} userMessage — the user's natural language input
 * @param {Array} conversationHistory — previous messages for context
 * @param {string} contextSummary — compressed summary of older messages
 * @returns {Object} — { intent, toolCalls, textResponse, responseType, needsConfirmation }
 */
export const processNLP = async (userMessage, conversationHistory = [], contextSummary = '') => {
    try {
        const contextMessages = prepareContext(conversationHistory, contextSummary);

        // Build the chat with system prompt
        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
                { role: 'model', parts: [{ text: '{"intent":"ready","toolCalls":[],"textResponse":"Ready to assist.","responseType":"text","needsConfirmation":false}' }] },
                ...contextMessages,
            ],
        });

        const result = await chat.sendMessage(userMessage);
        const responseText = result.response.text();

        // Parse JSON response — handle markdown wrapping
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
        const cleaned = jsonMatch ? jsonMatch[1] : responseText;

        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            // If LLM returns non-JSON, treat as text response
            return {
                intent: 'general_response',
                toolCalls: [],
                textResponse: responseText,
                responseType: 'text',
                needsConfirmation: false,
            };
        }

        // Validate structure
        return {
            intent: parsed.intent || 'unknown',
            toolCalls: Array.isArray(parsed.toolCalls) ? parsed.toolCalls.slice(0, 3) : [],
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
