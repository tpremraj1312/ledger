/**
 * Agent Executor (Layer 2) — Execution & Orchestration
 * NEVER trusts NLP layer blindly. Contains 7 security sub-systems:
 *   1. Tool Permission Matrix (RBAC) — DB-side role verification
 *   2. Idempotency Control (SHA-256 dedup)
 *   3. Strict Schema Validation
 *   4. Confirmation Hardening (nonce + expiry)
 *   5. Tool Call Limiter (per-message + per-window)
 *   6. Ownership & Family Boundary Enforcement
 *   7. Post-execution LLM contextual synthesis
 */

import crypto from 'crypto';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import AgentLog from '../models/AgentLog.js';
import User from '../models/user.js';
import {
    TOOL_REGISTRY,
    TOOL_PERMISSION_MAP,
    TOOL_SCHEMAS,
    DESTRUCTIVE_TOOLS,
} from './agentTools.js';
import { resolveUserRole, buildUserContext } from './agentContextBuilder.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const synthesisModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

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
// MAIN EXECUTOR — processes NLP output and executes tools
// ═══════════════════════════════════════════════════════════════

/**
 * Execute the NLP layer's tool calls with full security enforcement.
 *
 * @param {Object} nlpResult   — { intent, toolCalls, textResponse, responseType }
 * @param {Object} user        — authenticated Mongoose user document
 * @param {Object} conversation — ChatConversation document (for pending confirmations)
 * @param {Object} options      — { confirmAction?: { nonce } }
 * @returns {Object} — { text, chartData?, actionResult?, confirmationRequired?, pendingAction?, suggestions[] }
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
    if (nlpResult.intent === 'confirm_action' && conversation?.pendingConfirmation) {
        return await handleConfirmation(user, conversation, conversation.pendingConfirmation.nonce);
    }

    // ─── No tool calls — pure text response ───
    if (!nlpResult.toolCalls || nlpResult.toolCalls.length === 0) {
        return {
            text: nlpResult.textResponse || "I'm here to help with your finances. Try asking about your spending, budget, or investments!",
            suggestions: getDefaultSuggestions(),
        };
    }

    // ═══ 5. TOOL CALL LIMITER ═══
    const limitCheck = checkToolCallLimit(conversationId, nlpResult.toolCalls.length);
    if (!limitCheck.allowed) {
        await logAction({ userId, conversationId, intent: nlpResult.intent, action: 'tool_limit_exceeded', toolName: '', success: false, denied: true, denialReason: limitCheck.reason, duration: Date.now() - startTime });
        return { text: `⚠️ ${limitCheck.reason}`, suggestions: getDefaultSuggestions() };
    }

    // ─── Execute each tool call ───
    const results = [];
    let lastChartData = null;
    let confirmationNeeded = null;

    for (const toolCall of nlpResult.toolCalls) {
        const { name: toolName, params = {} } = toolCall;

        // ═══ 1. TOOL PERMISSION MATRIX ═══
        const permission = TOOL_PERMISSION_MAP[toolName];
        if (!permission) {
            await logAction({ userId, conversationId, intent: nlpResult.intent, action: 'unknown_tool', toolName, success: false, denied: true, denialReason: `Tool "${toolName}" does not exist`, duration: Date.now() - startTime });
            results.push({ success: false, message: `I don't have a tool called "${toolName}".` });
            continue;
        }

        // Role check: DB-verified, NEVER trust frontend
        const userRole = await resolveUserRole(user._id.toString());
        const hasPermission = permission.roles.includes('user') || permission.roles.includes(userRole);
        if (!hasPermission) {
            await logAction({ userId, conversationId, intent: nlpResult.intent, action: 'permission_denied', toolName, success: false, denied: true, denialReason: `DB role "${userRole}" not in allowed: ${permission.roles.join(',')}`, duration: Date.now() - startTime });
            results.push({ success: false, message: `🔒 You don't have permission for "${toolName}". Your role: ${userRole}. Required: ${permission.roles.join(' or ')}.` });
            continue;
        }

        // ═══ 3. STRICT SCHEMA VALIDATION ═══
        const validation = validateParams(toolName, params);
        if (!validation.valid) {
            await logAction({ userId, conversationId, intent: nlpResult.intent, action: 'validation_failed', toolName, success: false, denied: true, denialReason: validation.errors.join('; '), duration: Date.now() - startTime });
            results.push({ success: false, message: `⚠️ Invalid parameters for "${toolName}": ${validation.errors.join(', ')}` });
            continue;
        }

        // ═══ 4. CONFIRMATION HARDENING ═══
        if (DESTRUCTIVE_TOOLS.has(toolName)) {
            const pending = createPendingConfirmation(toolName, params);
            conversation.pendingConfirmation = pending;
            await conversation.save();

            confirmationNeeded = {
                toolName,
                params,
                nonce: pending.nonce,
                message: getConfirmationMessage(toolName, params),
            };

            await logAction({ userId, conversationId, intent: nlpResult.intent, action: 'confirmation_requested', toolName, success: true, duration: Date.now() - startTime });
            break; // Stop processing — wait for confirmation
        }

        // ═══ 2. IDEMPOTENCY CONTROL ═══
        const idempotency = checkIdempotency(userId, toolName, params);
        if (idempotency.isDuplicate) {
            await logAction({ userId, conversationId, intent: nlpResult.intent, action: 'duplicate_blocked', toolName, success: false, denied: true, denialReason: 'Duplicate request within dedup window', duration: Date.now() - startTime });
            results.push({ success: false, message: `⏳ This action was just performed. Please wait a moment before retrying.` });
            continue;
        }

        // ═══ 6. OWNERSHIP ENFORCEMENT (inside tools) + EXECUTE ═══
        try {
            const toolFn = TOOL_REGISTRY[toolName];
            const toolResult = await toolFn(user._id, params);

            // 5. Loop detection
            const loopCheck = recordToolExecution(conversationId, toolName);
            if (loopCheck.loopDetected) {
                await logAction({ userId, conversationId, intent: nlpResult.intent, action: 'loop_detected', toolName, success: false, denied: true, denialReason: `Loop: "${toolName}" called 3+ times`, duration: Date.now() - startTime });
            }

            results.push(toolResult);
            if (toolResult.chartData) lastChartData = toolResult.chartData;

            await logAction({ userId, conversationId, intent: nlpResult.intent, action: 'executed', toolName, success: toolResult.success, duration: Date.now() - startTime });
        } catch (error) {
            console.error(`Tool execution error [${toolName}]:`, error);
            results.push({ success: false, message: `An error occurred while executing "${toolName}".` });
            await logAction({ userId, conversationId, intent: nlpResult.intent, action: 'execution_error', toolName, success: false, error: error.message, duration: Date.now() - startTime });
        }
    }

    // ─── Build final response ───
    if (confirmationNeeded) {
        return {
            text: confirmationNeeded.message,
            confirmationRequired: true,
            pendingAction: { toolName: confirmationNeeded.toolName, nonce: confirmationNeeded.nonce },
            suggestions: ['✅ Yes, confirm', '❌ No, cancel'],
            responseType: 'confirmation',
        };
    }

    // ─── Post-execution LLM synthesis ───
    const toolMessages = results.map(r => r.message).filter(Boolean);
    const nlpText = nlpResult.textResponse || '';
    let finalText = '';

    // If NLP already provided a contextual response, use it with tool data
    if (nlpText && nlpText.length > 20) {
        finalText = nlpText + '\n\n' + toolMessages.join('\n\n');
    } else {
        // Try to synthesize a contextual response from tool results
        finalText = await synthesizeResponse(user._id.toString(), toolMessages, nlpResult.intent);
    }

    // Build response cards from tool results
    const responseCards = results
        .filter(r => r.success && r.data)
        .map(r => ({
            type: determineCardType(nlpResult.responseType, r),
            data: r.data,
            message: r.message,
        }));

    return {
        text: finalText,
        chartData: lastChartData,
        actionResult: results.length === 1 ? results[0].data : results.map(r => r.data),
        responseCards,
        responseType: nlpResult.responseType || 'text',
        suggestions: getSuggestionsForIntent(nlpResult.intent),
    };
};

// ═══════════════════════════════════════════════════════════════
// CONFIRMATION HANDLER
// ═══════════════════════════════════════════════════════════════
const handleConfirmation = async (user, conversation, nonce) => {
    const pending = conversation.pendingConfirmation;
    if (!pending) {
        return { text: "There's no pending action to confirm.", suggestions: getDefaultSuggestions() };
    }

    // Validate nonce
    if (pending.nonce !== nonce) {
        await logAction({ userId: user._id.toString(), conversationId: conversation._id, intent: 'confirm_action', action: 'nonce_mismatch', toolName: pending.toolName, success: false, denied: true, denialReason: 'Nonce mismatch — possible replay attack' });
        return { text: '🔒 Security check failed. Please re-initiate the action.', suggestions: getDefaultSuggestions() };
    }

    // Check expiry
    if (new Date() > new Date(pending.expiresAt)) {
        conversation.pendingConfirmation = null;
        await conversation.save();
        await logAction({ userId: user._id.toString(), conversationId: conversation._id, intent: 'confirm_action', action: 'confirmation_expired', toolName: pending.toolName, success: false, denied: true, denialReason: 'Confirmation expired (60s)' });
        return { text: '⏰ Confirmation expired. Please request the action again.', suggestions: getDefaultSuggestions() };
    }

    // Execute the confirmed tool
    const toolFn = TOOL_REGISTRY[pending.toolName];
    if (!toolFn) {
        conversation.pendingConfirmation = null;
        await conversation.save();
        return { text: '❌ The confirmed action is no longer available.', suggestions: getDefaultSuggestions() };
    }

    try {
        const result = await toolFn(user._id, pending.params);
        conversation.pendingConfirmation = null;
        await conversation.save();

        await logAction({ userId: user._id.toString(), conversationId: conversation._id, intent: 'confirm_action', action: 'confirmed_executed', toolName: pending.toolName, success: result.success });

        return {
            text: result.message || 'Action completed.',
            chartData: result.chartData,
            actionResult: result.data,
            suggestions: getSuggestionsForIntent('post_action'),
        };
    } catch (error) {
        conversation.pendingConfirmation = null;
        await conversation.save();
        console.error('Confirmed action error:', error);
        return { text: '❌ An error occurred while executing the confirmed action.', suggestions: getDefaultSuggestions() };
    }
};

// ═══════════════════════════════════════════════════════════════
// POST-EXECUTION SYNTHESIS — LLM contextual response
// ═══════════════════════════════════════════════════════════════
const synthesizeResponse = async (userId, toolMessages, intent) => {
    if (toolMessages.length === 0) return 'Done!';

    const combinedData = toolMessages.join('\n\n');

    try {
        let financialContext = '';
        try { financialContext = await buildUserContext(userId); } catch { /* ignore */ }

        const prompt = `You are a premium financial AI assistant. Based on the tool results below and the user's financial context, write a brief, insightful response (2-4 sentences max). Be specific with numbers. Don't repeat the raw data — add VALUE with interpretation, trend analysis, or actionable advice.

${financialContext ? `User Context:\n${financialContext}\n` : ''}
Tool Results:
${combinedData}

Intent: ${intent}

Write a concise, personalized response:`;

        const result = await synthesisModel.generateContent(prompt);
        const synthesis = result.response.text().trim();

        if (synthesis && synthesis.length > 10 && synthesis.length < 1000) {
            return synthesis + '\n\n' + combinedData;
        }
    } catch (err) {
        console.error('Synthesis error:', err.message);
    }

    return combinedData;
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
        'expense_query': ['Show spending trend', 'Compare months', 'Budget status', 'Detect anomalies'],
        'expense_action': ['Show expense summary', 'Budget status', 'Recent transactions'],
        'budget_query': ['Compare budget vs expense', 'Forecast overspending', 'Savings forecast'],
        'investment_query': ['Portfolio analytics', 'Rebalancing suggestions', 'Capital gains estimate'],
        'tax_query': ['Compare regimes', 'Unused 80C capacity', 'Tax saving for ELSS'],
        'gamification_query': ['XP progress', 'Show streak', 'Quest status'],
        'family_query': ['Family members', 'Contribution breakdown', 'Family summary'],
        'simulation_query': ['Simulate SIP', 'Retirement projection', 'Loan calculator'],
        'savings_query': ['Subscription leaks', 'What-if spending cut', 'Cash runway'],
        'post_action': ['Show expense summary', 'Budget status', 'Recent transactions'],
    };
    return map[intent] || getDefaultSuggestions();
};

