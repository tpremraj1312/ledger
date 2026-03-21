/**
 * Agent Reasoner (Layer 3) — Structured Insight Generation
 *
 * Receives raw tool outputs + user context, generates:
 *   - A human-readable summary
 *   - Typed insight cards (warning, opportunity, metric, tip)
 *   - Inline action suggestions
 *   - Data source attribution
 *
 * This replaces the old inline `synthesizeResponse()` in agentExecutor.js.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildUserContext } from './agentContextBuilder.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const reasonerModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

// ═══════════════════════════════════════════════════════════════
// REASONING PROMPT — instructs LLM to produce structured output
// ═══════════════════════════════════════════════════════════════
const REASONER_SYSTEM = `You are a senior financial analyst synthesizing tool results into actionable insights for an Indian personal finance user.

RULES:
1. Reference EXACT numbers from the tool data — never hallucinate.
2. Be concise: summary should be 2-4 sentences max.
3. Each insight must have a type, title, body, and severity.
4. Suggest inline actions when relevant (e.g., "Set a budget" → createBudget tool).
5. Cite which data sources (tool names) each insight comes from.
6. All currency is in Indian Rupees (₹).
7. Do NOT repeat raw tool output — add VALUE with interpretation and advice.

OUTPUT FORMAT — respond with ONLY valid JSON:
{
  "summary": "2-4 sentence personalized analysis referencing real numbers",
  "insights": [
    {
      "type": "warning|opportunity|metric|tip",
      "title": "Short title (5 words max)",
      "body": "One clear sentence with specific numbers",
      "severity": "high|medium|low"
    }
  ],
  "actions": [
    {
      "label": "Button text",
      "action": "toolName",
      "params": { "key": "value" }
    }
  ],
  "dataSources": ["toolName1", "toolName2"]
}`;

// ═══════════════════════════════════════════════════════════════
// MAIN REASONING FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate structured insights from raw tool results.
 *
 * @param {string} userId
 * @param {Array} toolResults — Array of { toolName, success, message, data }
 * @param {string} intent — The classified user intent
 * @param {string} userQuery — Original user message
 * @returns {Object} — { summary, insights[], actions[], dataSources[] }
 */
export const generateInsights = async (userId, toolResults, intent, userQuery) => {
    if (!toolResults || toolResults.length === 0) {
        return {
            summary: "I couldn't find relevant data to analyze. Try asking about your spending, budget, or investments!",
            insights: [],
            actions: [],
            dataSources: [],
        };
    }

    // Collect tool messages and data source names
    const toolData = toolResults
        .filter(r => r.success)
        .map(r => `[Tool: ${r.toolName}]\n${r.message}`)
        .join('\n\n');

    const dataSources = toolResults
        .filter(r => r.success)
        .map(r => r.toolName);

    if (!toolData) {
        return {
            summary: toolResults.map(r => r.message).filter(Boolean).join('\n\n'),
            insights: [],
            actions: [],
            dataSources,
        };
    }

    try {
        let financialContext = '';
        try { financialContext = await buildUserContext(userId); } catch { /* ignore */ }

        const prompt = `${REASONER_SYSTEM}

USER QUERY: "${userQuery}"
INTENT: ${intent}

${financialContext ? `USER CONTEXT:\n${financialContext}\n` : ''}
TOOL RESULTS:
${toolData}

Generate structured insights:`;

        const result = await reasonerModel.generateContent(prompt);
        const responseText = result.response.text();

        // Parse JSON
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
        const cleaned = jsonMatch ? jsonMatch[1] : responseText;

        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            // Fallback: use LLM text as summary
            return {
                summary: responseText.substring(0, 500),
                insights: [],
                actions: [],
                dataSources,
            };
        }

        // Validate and sanitize
        return {
            summary: parsed.summary || toolData,
            insights: Array.isArray(parsed.insights)
                ? parsed.insights.slice(0, 6).map(sanitizeInsight)
                : [],
            actions: Array.isArray(parsed.actions)
                ? parsed.actions.slice(0, 4).map(sanitizeAction)
                : [],
            dataSources: parsed.dataSources || dataSources,
        };
    } catch (err) {
        console.error('Reasoner error:', err.message);
        // Graceful degradation: return tool messages directly
        return {
            summary: toolData,
            insights: [],
            actions: [],
            dataSources,
        };
    }
};

// ═══════════════════════════════════════════════════════════════
// SANITIZERS — ensure frontend receives clean, typed data
// ═══════════════════════════════════════════════════════════════

const VALID_INSIGHT_TYPES = new Set(['warning', 'opportunity', 'metric', 'tip']);
const VALID_SEVERITIES = new Set(['high', 'medium', 'low']);

const sanitizeInsight = (insight) => ({
    type: VALID_INSIGHT_TYPES.has(insight.type) ? insight.type : 'tip',
    title: String(insight.title || '').substring(0, 60),
    body: String(insight.body || '').substring(0, 200),
    severity: VALID_SEVERITIES.has(insight.severity) ? insight.severity : 'medium',
});

const sanitizeAction = (action) => ({
    label: String(action.label || 'Take Action').substring(0, 30),
    action: String(action.action || ''),
    params: typeof action.params === 'object' && action.params !== null ? action.params : {},
});
