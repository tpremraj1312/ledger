/**
 * Agent Executor (Layer 2) — Execution & Orchestration
 * NEVER trusts NLP layer blindly. Contains 7 security sub-systems:
 *   1. Tool Permission Matrix (RBAC) — DB-side role verification
 *   2. Idempotency Control (SHA-256 dedup)
 *   3. Strict Schema Validation
 *   4. Confirmation Hardening (nonce + expiry)
 *   5. Tool Call Limiter (per-message + per-window)
 *   6. Ownership & Family Boundary Enforcement
 *   7. Post-execution LLM contextual synthesis (now via agentReasoner)
 *
 * v2 Enhancements:
 *   - Parallel tool execution via plan DAG
 *   - Multi-chart aggregation
 *   - Fallback chains for empty results
 *   - Structured reasoning integration
 */

import crypto from 'crypto';
import mongoose from 'mongoose';
import AgentLog from '../models/AgentLog.js';
import User from '../models/user.js';
import {
    TOOL_REGISTRY,
    TOOL_PERMISSION_MAP,
    TOOL_SCHEMAS,
    DESTRUCTIVE_TOOLS,
} from './agentTools.js';
import { resolveUserRole } from './agentContextBuilder.js';
import { generateInsights } from './agentReasoner.js';

// ═══════════════════════════════════════════════════════════════
// 2. IDEMPOTENCY CONTROL — In-memory dedup store
// ═══════════════════════════════════════════════════════════════
const idempotencyStore = new Map();
const IDEMPOTENCY_WINDOW_MS = 15000; // 15 seconds

// Purge expired keys every 30 seconds
setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of idempotencyStore) {
        if (now - timestamp > IDEMPOTENCY_WINDOW_MS * 2) {
            idempotencyStore.delete(key);
        }
    }
}, 30000);

const generateIdempotencyKey = (userId, toolName, params) => {
    const timeWindow = Math.floor(Date.now() / 10000); // 10s windows
    const payload = `${userId}:${toolName}:${JSON.stringify(params)}:${timeWindow}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
};

const checkIdempotency = (userId, toolName, params) => {
    const perm = TOOL_PERMISSION_MAP[toolName];
    if (!perm || perm.type !== 'write') return { isDuplicate: false };

    const key = generateIdempotencyKey(userId, toolName, params);
    if (idempotencyStore.has(key)) {
        return { isDuplicate: true, key };
    }
    idempotencyStore.set(key, Date.now());
    return { isDuplicate: false, key };
};

// ═══════════════════════════════════════════════════════════════
// 3. STRICT SCHEMA VALIDATION
// ═══════════════════════════════════════════════════════════════
const validateParams = (toolName, params) => {
    const schema = TOOL_SCHEMAS[toolName];
    if (!schema) return { valid: true };

    const errors = [];

    // Check required fields
    if (schema.required) {
        for (const field of schema.required) {
            if (params[field] === undefined || params[field] === null || params[field] === '') {
                errors.push(`Missing required field: "${field}"`);
            }
        }
    }

    // Check types
    if (schema.types) {
        for (const [field, expectedType] of Object.entries(schema.types)) {
            if (params[field] !== undefined && params[field] !== null) {
                const actualType = typeof params[field];
                if (expectedType === 'number' && actualType === 'string') {
                    const parsed = Number(params[field]);
                    if (!isNaN(parsed)) {
                        params[field] = parsed; // auto-coerce string → number
                    } else {
                        errors.push(`"${field}" must be a number, got "${params[field]}"`);
                    }
                } else if (actualType !== expectedType) {
                    errors.push(`"${field}" must be type ${expectedType}, got ${actualType}`);
                }
            }
        }
    }

    // Check ranges
    if (schema.ranges) {
        for (const [field, range] of Object.entries(schema.ranges)) {
            const val = params[field];
            if (val !== undefined && val !== null) {
                if (range.min !== undefined && val < range.min) {
                    errors.push(`"${field}" must be >= ${range.min}, got ${val}`);
                }
                if (range.max !== undefined && val > range.max) {
                    errors.push(`"${field}" must be <= ${range.max}, got ${val}`);
                }
            }
        }
    }

    // Check enums
    if (schema.enums) {
        for (const [field, allowed] of Object.entries(schema.enums)) {
            const val = params[field];
            if (val !== undefined && val !== null && !allowed.includes(val)) {
                errors.push(`"${field}" must be one of [${allowed.join(', ')}], got "${val}"`);
            }
        }
    }

    return { valid: errors.length === 0, errors };
};

// ═══════════════════════════════════════════════════════════════
// 4. CONFIRMATION HARDENING — nonce generation
// ═══════════════════════════════════════════════════════════════
const generateNonce = () => crypto.randomBytes(16).toString('hex');

const createPendingConfirmation = (toolName, params) => ({
    toolName,
    params,
    nonce: generateNonce(),
    expiresAt: new Date(Date.now() + 60000), // 60 seconds
});

// ═══════════════════════════════════════════════════════════════
// 5. TOOL CALL LIMITER — per-message and per-window tracking
// ═══════════════════════════════════════════════════════════════
const conversationToolCounts = new Map();
const TOOL_WINDOW_MS = 5 * 60 * 1000;
const MAX_TOOLS_PER_MESSAGE = 5;
const MAX_TOOLS_PER_WINDOW = 20;

const checkToolCallLimit = (conversationId, toolCallCount) => {
    // Per-message limit
    if (toolCallCount > MAX_TOOLS_PER_MESSAGE) {
        return { allowed: false, reason: `Maximum ${MAX_TOOLS_PER_MESSAGE} tool calls per message.` };
    }

    // Per-window limit
    const convId = conversationId?.toString() || 'unknown';
    const now = Date.now();
    let windowData = conversationToolCounts.get(convId);

    if (!windowData || now - windowData.windowStart > TOOL_WINDOW_MS) {
        windowData = { windowStart: now, count: 0, tools: [] };
        conversationToolCounts.set(convId, windowData);
    }

    if (windowData.count + toolCallCount > MAX_TOOLS_PER_WINDOW) {
        return { allowed: false, reason: `Tool execution limit reached (${MAX_TOOLS_PER_WINDOW} per 5 minutes). Please wait.` };
    }

    return { allowed: true };
};

const recordToolExecution = (conversationId, toolName) => {
    const convId = conversationId?.toString() || 'unknown';
    const data = conversationToolCounts.get(convId);
    if (data) {
        data.count += 1;
        data.tools.push(toolName);

        // Loop detection — same tool called 3+ times in window
        const toolFreq = data.tools.filter(t => t === toolName).length;
        if (toolFreq >= 3) {
            return { loopDetected: true, toolName };
        }
    }
    return { loopDetected: false };
};

// Purge old window data every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of conversationToolCounts) {
        if (now - data.windowStart > TOOL_WINDOW_MS * 2) {
            conversationToolCounts.delete(key);
        }
    }
}, 10 * 60 * 1000);

// ═══════════════════════════════════════════════════════════════
// LOGGING HELPER
// ═══════════════════════════════════════════════════════════════
const logAction = async (data) => {
    try {
        await AgentLog.create(data);
    } catch (err) {
        console.error('AgentLog write error:', err.message);
    }
};

// ═══════════════════════════════════════════════════════════════
// FALLBACK MAP — alternative tools when primary returns empty
// ═══════════════════════════════════════════════════════════════
const FALLBACK_MAP = {
    getSpendingByCategory: 'getRecentTransactions',
    getExpenseSummary: 'getRecentTransactions',
    getBudgetStatus: 'getExpenseSummary',
    getPortfolioAnalytics: 'getPortfolioOverview',
    getAssetAllocation: 'getPortfolioOverview',
    compareBudgetVsExpense: 'getBudgetStatus',
};

const isEmptyResult = (result) => {
    if (!result || !result.success) return true;
    if (!result.data) return true;
    // Check common empty patterns
    if (Array.isArray(result.data) && result.data.length === 0) return true;
    const dataValues = Object.values(result.data);
    if (dataValues.every(v => v === 0 || v === null || (Array.isArray(v) && v.length === 0))) return true;
    return false;
};

// ═══════════════════════════════════════════════════════════════
// SINGLE TOOL EXECUTOR — with all security checks
// ═══════════════════════════════════════════════════════════════
const executeSingleTool = async (toolName, params, user, conversation, startTime) => {
    const userId = user._id.toString();
    const conversationId = conversation?._id;

    // ═══ 1. TOOL PERMISSION MATRIX ═══
    const permission = TOOL_PERMISSION_MAP[toolName];
    if (!permission) {
        await logAction({ userId, conversationId, intent: 'tool_execution', action: 'unknown_tool', toolName, success: false, denied: true, denialReason: `Tool "${toolName}" does not exist`, duration: Date.now() - startTime });
        return { toolName, success: false, message: `I don't have a tool called "${toolName}".`, data: null };
    }

    // Role check: DB-verified, NEVER trust frontend
    const userRole = await resolveUserRole(user._id.toString());
    const hasPermission = permission.roles.includes('user') || permission.roles.includes(userRole);
    if (!hasPermission) {
        await logAction({ userId, conversationId, intent: 'tool_execution', action: 'permission_denied', toolName, success: false, denied: true, denialReason: `DB role "${userRole}" not in allowed: ${permission.roles.join(',')}`, duration: Date.now() - startTime });
        return { toolName, success: false, message: `🔒 You don't have permission for "${toolName}". Your role: ${userRole}. Required: ${permission.roles.join(' or ')}.`, data: null };
    }

    // ═══ 3. STRICT SCHEMA VALIDATION ═══
    const validation = validateParams(toolName, params);
    if (!validation.valid) {
        await logAction({ userId, conversationId, intent: 'tool_execution', action: 'validation_failed', toolName, success: false, denied: true, denialReason: validation.errors.join('; '), duration: Date.now() - startTime });
        return { toolName, success: false, message: `⚠️ Invalid parameters for "${toolName}": ${validation.errors.join(', ')}`, data: null };
    }

    // ═══ 4. CONFIRMATION HARDENING ═══
    if (DESTRUCTIVE_TOOLS.has(toolName)) {
        // Return a special confirmation result
        const pending = createPendingConfirmation(toolName, params);
        if (conversation) {
            conversation.pendingConfirmation = pending;
            await conversation.save();
        }
        return {
            toolName,
            success: true,
            needsConfirmation: true,
            confirmationData: {
                toolName,
                params,
                nonce: pending.nonce,
                message: getConfirmationMessage(toolName, params),
            },
            message: getConfirmationMessage(toolName, params),
            data: null,
        };
    }

    // ═══ 2. IDEMPOTENCY CONTROL ═══
    const idempotency = checkIdempotency(userId, toolName, params);
    if (idempotency.isDuplicate) {
        await logAction({ userId, conversationId, intent: 'tool_execution', action: 'duplicate_blocked', toolName, success: false, denied: true, denialReason: 'Duplicate request within dedup window', duration: Date.now() - startTime });
        return { toolName, success: false, message: `⏳ This action was just performed. Please wait a moment before retrying.`, data: null };
    }

    // ═══ 6. OWNERSHIP ENFORCEMENT (inside tools) + EXECUTE ═══
    try {
        const toolFn = TOOL_REGISTRY[toolName];
        const toolResult = await toolFn(user._id, params);

        // 5. Loop detection
        const loopCheck = recordToolExecution(conversationId, toolName);
        if (loopCheck.loopDetected) {
            await logAction({ userId, conversationId, intent: 'tool_execution', action: 'loop_detected', toolName, success: false, denied: true, denialReason: `Loop: "${toolName}" called 3+ times`, duration: Date.now() - startTime });
        }

        await logAction({ userId, conversationId, intent: 'tool_execution', action: 'executed', toolName, success: toolResult.success, duration: Date.now() - startTime });

        return { toolName, ...toolResult };
    } catch (error) {
        console.error(`Tool execution error [${toolName}]:`, error);
        await logAction({ userId, conversationId, intent: 'tool_execution', action: 'execution_error', toolName, success: false, error: error.message, duration: Date.now() - startTime });
        return { toolName, success: false, message: `An error occurred while executing "${toolName}".`, data: null };
    }
};

// ═══════════════════════════════════════════════════════════════
// MAIN EXECUTOR — processes NLP output with DAG-style execution
// ═══════════════════════════════════════════════════════════════

/**
 * Execute the NLP layer's plan with full security enforcement.
 *
 * @param {Object} nlpResult   — { intent, plan, toolCalls, textResponse, responseType }
 * @param {Object} user        — authenticated Mongoose user document
 * @param {Object} conversation — ChatConversation document
 * @param {Object} options      — { confirmAction?: { nonce }, onStepComplete?: fn }
 * @returns {Object} — { text, charts[], insights[], actions[], dataSources[], ... }
 */
export const executeAgentAction = async (nlpResult, user, conversation, options = {}) => {
    const userId = user._id.toString();
    const conversationId = conversation?._id;
    const startTime = Date.now();

    // ─── Handle explicit confirmation ───
    if (options.confirmAction?.nonce && conversation?.pendingConfirmation) {
        return await handleConfirmation(user, conversation, options.confirmAction.nonce);
    }

    // ─── Handle confirm intent from NLP ───
    if (nlpResult.intent?.type === 'confirm_action' && conversation?.pendingConfirmation) {
        return await handleConfirmation(user, conversation, conversation.pendingConfirmation.nonce);
    }

    // ─── No tool calls — pure text response ───
    const flatToolCalls = nlpResult.toolCalls || nlpResult.plan?.steps?.flat() || [];
    if (flatToolCalls.length === 0) {
        return {
            text: nlpResult.textResponse || "I'm here to help with your finances. Try asking about your spending, budget, or investments!",
            charts: [],
            insights: [],
            actions: [],
            dataSources: [],
            suggestions: getDefaultSuggestions(),
            responseType: nlpResult.responseType || 'text',
        };
    }

    // ═══ 5. TOOL CALL LIMITER ═══
    const limitCheck = checkToolCallLimit(conversationId, flatToolCalls.length);
    if (!limitCheck.allowed) {
        await logAction({ userId, conversationId, intent: nlpResult.intent?.type, action: 'tool_limit_exceeded', toolName: '', success: false, denied: true, denialReason: limitCheck.reason, duration: Date.now() - startTime });
        return {
            text: `⚠️ ${limitCheck.reason}`,
            charts: [],
            insights: [],
            actions: [],
            dataSources: [],
            suggestions: getDefaultSuggestions(),
        };
    }

    // ─── Execute plan step-by-step (parallel within steps) ───
    const allResults = [];
    const allCharts = [];
    let confirmationNeeded = null;

    // Use plan.steps (DAG) if available, otherwise treat toolCalls as a single parallel group
    const steps = nlpResult.plan?.steps?.length > 0
        ? nlpResult.plan.steps
        : [flatToolCalls];

    for (const stepGroup of steps) {
        if (confirmationNeeded) break;

        // Execute all tools in this step group concurrently
        const groupCalls = (Array.isArray(stepGroup) ? stepGroup : [stepGroup]).map(
            async (toolCall) => {
                const { name: toolName, params = {} } = toolCall;
                let result = await executeSingleTool(toolName, params, user, conversation, startTime);

                // Check for confirmation requirement
                if (result.needsConfirmation) {
                    confirmationNeeded = result.confirmationData;
                    return result;
                }

                // Fallback chain: if result is empty, try the fallback tool
                if (isEmptyResult(result) && FALLBACK_MAP[toolName]) {
                    const fallbackName = FALLBACK_MAP[toolName];
                    const fallbackResult = await executeSingleTool(fallbackName, params, user, conversation, startTime);
                    if (!isEmptyResult(fallbackResult)) {
                        result = fallbackResult;
                    }
                }

                return result;
            }
        );

        const groupResults = await Promise.all(groupCalls);

        for (const result of groupResults) {
            allResults.push(result);
            if (result.chartData) allCharts.push(result.chartData);
        }

        // Notify step completion for SSE streaming
        if (options.onStepComplete) {
            options.onStepComplete(stepGroup, groupResults);
        }
    }

    // ─── Confirmation response ───
    if (confirmationNeeded) {
        return {
            text: confirmationNeeded.message,
            confirmationRequired: true,
            pendingAction: { toolName: confirmationNeeded.toolName, nonce: confirmationNeeded.nonce },
            suggestions: ['✅ Yes, confirm', '❌ No, cancel'],
            responseType: 'confirmation',
            charts: [],
            insights: [],
            actions: [],
            dataSources: [],
        };
    }

    // ─── Reasoning Layer (Layer 3) — generate structured insights ───
    const userQuery = nlpResult.intent?.normalizedQuery || '';
    const intentType = nlpResult.intent?.type || 'query';
    const reasoning = await generateInsights(userId, allResults, intentType, userQuery);

    // ─── Build final text ───
    let finalText = '';
    if (nlpResult.textResponse && nlpResult.textResponse.length > 20) {
        finalText = nlpResult.textResponse;
    }
    if (reasoning.summary && reasoning.summary.length > 10) {
        finalText = finalText ? finalText + '\n\n' + reasoning.summary : reasoning.summary;
    }
    if (!finalText) {
        finalText = allResults.map(r => r.message).filter(Boolean).join('\n\n');
    }

    // ─── Build response cards from tool results (backward compatible) ───
    const responseCards = allResults
        .filter(r => r.success && r.data)
        .map(r => ({
            type: determineCardType(nlpResult.responseType, r),
            data: r.data,
            message: r.message,
        }));

    return {
        text: finalText,
        // v2: Multi-chart, insights, actions, attribution
        charts: allCharts,
        insights: reasoning.insights || [],
        actions: reasoning.actions || [],
        dataSources: reasoning.dataSources || [],
        // Legacy compatibility
        chartData: allCharts.length > 0 ? allCharts[0] : null,
        actionResult: allResults.length === 1 ? allResults[0].data : allResults.map(r => r.data),
        responseCards,
        responseType: nlpResult.responseType || 'text',
        suggestions: getSuggestionsForIntent(intentType),
        // Plan metadata for frontend stepper
        executedPlan: nlpResult.plan?.steps || [],
    };
};

// ═══════════════════════════════════════════════════════════════
// CONFIRMATION HANDLER
// ═══════════════════════════════════════════════════════════════
const handleConfirmation = async (user, conversation, nonce) => {
    const pending = conversation.pendingConfirmation;
    if (!pending) {
        return { text: "There's no pending action to confirm.", suggestions: getDefaultSuggestions(), charts: [], insights: [], actions: [], dataSources: [] };
    }

    // Validate nonce
    if (pending.nonce !== nonce) {
        await logAction({ userId: user._id.toString(), conversationId: conversation._id, intent: 'confirm_action', action: 'nonce_mismatch', toolName: pending.toolName, success: false, denied: true, denialReason: 'Nonce mismatch — possible replay attack' });
        return { text: '🔒 Security check failed. Please re-initiate the action.', suggestions: getDefaultSuggestions(), charts: [], insights: [], actions: [], dataSources: [] };
    }

    // Check expiry
    if (new Date() > new Date(pending.expiresAt)) {
        conversation.pendingConfirmation = null;
        await conversation.save();
        await logAction({ userId: user._id.toString(), conversationId: conversation._id, intent: 'confirm_action', action: 'confirmation_expired', toolName: pending.toolName, success: false, denied: true, denialReason: 'Confirmation expired (60s)' });
        return { text: '⏰ Confirmation expired. Please request the action again.', suggestions: getDefaultSuggestions(), charts: [], insights: [], actions: [], dataSources: [] };
    }

    // Execute the confirmed tool
    const toolFn = TOOL_REGISTRY[pending.toolName];
    if (!toolFn) {
        conversation.pendingConfirmation = null;
        await conversation.save();
        return { text: '❌ The confirmed action is no longer available.', suggestions: getDefaultSuggestions(), charts: [], insights: [], actions: [], dataSources: [] };
    }

    try {
        const result = await toolFn(user._id, pending.params);
        conversation.pendingConfirmation = null;
        await conversation.save();

        await logAction({ userId: user._id.toString(), conversationId: conversation._id, intent: 'confirm_action', action: 'confirmed_executed', toolName: pending.toolName, success: result.success });

        return {
            text: result.message || 'Action completed.',
            chartData: result.chartData,
            charts: result.chartData ? [result.chartData] : [],
            actionResult: result.data,
            suggestions: getSuggestionsForIntent('post_action'),
            insights: [],
            actions: [],
            dataSources: [pending.toolName],
        };
    } catch (error) {
        conversation.pendingConfirmation = null;
        await conversation.save();
        console.error('Confirmed action error:', error);
        return { text: '❌ An error occurred while executing the confirmed action.', suggestions: getDefaultSuggestions(), charts: [], insights: [], actions: [], dataSources: [] };
    }
};

// ═══════════════════════════════════════════════════════════════
// CARD TYPE DETECTION
// ═══════════════════════════════════════════════════════════════
const determineCardType = (responseType, toolResult) => {
    if (responseType && responseType !== 'text') return responseType;
    if (toolResult.chartData) return 'chart';
    if (toolResult.message?.includes('✅') || toolResult.message?.includes('Recorded') || toolResult.message?.includes('Created')) return 'action_card';
    if (toolResult.message?.includes('⚠️') || toolResult.message?.includes('OVER') || toolResult.message?.includes('risk')) return 'warning';
    if (toolResult.message?.includes('Projection') || toolResult.message?.includes('Simulation') || toolResult.message?.includes('What If')) return 'simulation';
    return 'insight_card';
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
const getConfirmationMessage = (toolName, params) => {
    const messages = {
        deleteExpense: `⚠️ **Delete Expense**\nAre you sure you want to delete this expense (ID: ${params.expenseId})? This cannot be undone.`,
        updateExpense: `⚠️ **Update Expense**\nUpdate expense ${params.expenseId}?${params.amount ? ` Amount: ₹${params.amount}` : ''}${params.category ? ` Category: ${params.category}` : ''}`,
        removeFamilyMember: `⚠️ **Remove Family Member**\nRemove ${params.email || params.memberId} from the family group?`,
        changeMemberRole: `⚠️ **Change Role**\nChange ${params.email || params.memberId}'s role to ${params.newRole}?`,
        switchTaxRegime: `⚠️ **Switch Tax Regime**\nSwitch to ${params.regime} Regime? This will affect future tax calculations.`,
        undoLastAction: `⚠️ **Undo Last Action**\nRevert the most recent agent action?`,
    };
    return messages[toolName] || `⚠️ Are you sure you want to proceed with "${toolName}"?`;
};

const getDefaultSuggestions = () => [
    'Show my spending',
    'Am I diversified?',
    'Budget status',
    'How can I save more?',
];

const getSuggestionsForIntent = (intent) => {
    const map = {
        'analysis': ['Show spending trend', 'Compare months', 'Budget status', 'Detect anomalies'],
        'action': ['Show expense summary', 'Budget status', 'Recent transactions'],
        'query': ['Compare budget vs expense', 'Forecast overspending', 'Savings forecast'],
        'simulation': ['Simulate SIP', 'Retirement projection', 'Loan calculator'],
        'advice': ['Portfolio analytics', 'Tax saving tips', 'Subscription leaks'],
        'post_action': ['Show expense summary', 'Budget status', 'Recent transactions'],
        // Legacy compatibility
        'expense_query': ['Show spending trend', 'Compare months', 'Budget status', 'Detect anomalies'],
        'expense_action': ['Show expense summary', 'Budget status', 'Recent transactions'],
        'budget_query': ['Compare budget vs expense', 'Forecast overspending', 'Savings forecast'],
        'investment_query': ['Portfolio analytics', 'Rebalancing suggestions', 'Capital gains estimate'],
        'tax_query': ['Compare regimes', 'Unused 80C capacity', 'Tax saving for ELSS'],
        'gamification_query': ['XP progress', 'Show streak', 'Quest status'],
        'family_query': ['Family members', 'Contribution breakdown', 'Family summary'],
        'simulation_query': ['Simulate SIP', 'Retirement projection', 'Loan calculator'],
        'savings_query': ['Subscription leaks', 'What-if spending cut', 'Cash runway'],
    };
    return map[intent] || getDefaultSuggestions();
};
