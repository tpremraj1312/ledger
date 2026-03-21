/**
 * Agent Controller — API orchestration layer
 * Handles SSE streaming, conversation management, and memory control.
 *
 * v2 Enhancements:
 *   - New SSE events: plan, insight, charts (progressive rendering)
 *   - Step-by-step plan broadcasting
 *   - Multi-chart streaming
 */

import ChatConversation from '../models/ChatConversation.js';
import { processNLP, summarizeOlderMessages } from '../utils/agentNLP.js';
import { executeAgentAction } from '../utils/agentExecutor.js';

const SUMMARIZE_THRESHOLD = 20; // Summarize when messages exceed this count

// ═══════════════════════════════════════════════════════════════
// 1. SEND MESSAGE — Main chat endpoint with SSE streaming
// ═══════════════════════════════════════════════════════════════
export const sendMessage = async (req, res) => {
    const { message, conversationId, confirmAction } = req.body;
    const userId = req.user._id;

    if (!message && !confirmAction) {
        return res.status(400).json({ message: 'Message is required.' });
    }

    try {
        // ── Set up SSE ──
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        const sendSSE = (event, data) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        // ── Get or create conversation ──
        let conversation;
        if (conversationId) {
            conversation = await ChatConversation.findOne({ _id: conversationId, userId });
            if (!conversation) {
                sendSSE('error', { message: 'Conversation not found.' });
                return res.end();
            }
        } else {
            conversation = new ChatConversation({ userId, messages: [] });
        }

        // ── Save user message ──
        if (message) {
            conversation.addMessage('user', message);
        }

        sendSSE('status', { phase: 'thinking', message: 'Analyzing your request...' });

        // ── Memory Token Control: Summarize older messages if threshold exceeded ──
        if (conversation.messages.length > SUMMARIZE_THRESHOLD && !conversation.contextSummary) {
            sendSSE('status', { phase: 'memory', message: 'Optimizing conversation context...' });
            conversation.contextSummary = await summarizeOlderMessages(conversation.messages);
        }

        // ── Handle confirmation flow ──
        if (confirmAction) {
            sendSSE('status', { phase: 'executing', message: 'Processing confirmed action...' });

            const result = await executeAgentAction(
                { intent: { type: 'confirm_action' }, toolCalls: [], textResponse: '', plan: { steps: [] } },
                req.user,
                conversation,
                { confirmAction }
            );

            // Save assistant response
            conversation.addMessage('assistant', result.text, {
                chartData: result.chartData || null,
                actionResult: result.actionResult || null,
                suggestions: result.suggestions || [],
                responseType: result.chartData ? 'chart' : 'text',
            });

            await conversation.save();

            // Stream the response
            await streamText(sendSSE, result.text);
            sendSSE('complete', {
                conversationId: conversation._id,
                chartData: result.chartData || null,
                charts: result.charts || [],
                actionResult: result.actionResult || null,
                suggestions: result.suggestions || [],
                insights: result.insights || [],
                actions: result.actions || [],
                dataSources: result.dataSources || [],
                confirmationRequired: false,
            });

            return res.end();
        }

        // ── NLP Layer (Layer 1) — Intent Router + Query Planner ──
        sendSSE('status', { phase: 'understanding', message: 'Understanding your request...' });

        const nlpResult = await processNLP(
            message,
            conversation.messages.slice(0, -1),
            conversation.contextSummary || '',
            userId.toString()
        );

        // ── Broadcast the execution plan (for stepper UI) ──
        if (nlpResult.plan?.steps?.length > 0) {
            const planSteps = nlpResult.plan.steps.map(stepGroup => {
                const tools = (Array.isArray(stepGroup) ? stepGroup : [stepGroup]);
                return tools.map(tc => ({
                    name: tc.name,
                    label: getToolLabel(tc.name),
                }));
            });
            sendSSE('plan', { steps: planSteps, intent: nlpResult.intent });
        }

        sendSSE('status', {
            phase: 'executing',
            message: nlpResult.toolCalls?.length > 0
                ? `Running ${nlpResult.toolCalls.length} analysis tools...`
                : 'Generating response...',
        });

        // ── Execution Layer (Layer 2) with step callbacks ──
        let stepIndex = 0;
        const result = await executeAgentAction(nlpResult, req.user, conversation, {
            onStepComplete: (stepGroup, stepResults) => {
                stepIndex++;
                sendSSE('status', {
                    phase: 'executing',
                    message: `Step ${stepIndex} complete — analyzing results...`,
                    stepIndex,
                });
            },
        });

        // ── Stream insights progressively (before full text) ──
        if (result.insights && result.insights.length > 0) {
            sendSSE('insight', { insights: result.insights });
        }

        // ── Stream charts data ──
        if (result.charts && result.charts.length > 0) {
            sendSSE('charts', { charts: result.charts });
        }

        // Save assistant response
        conversation.addMessage('assistant', result.text, {
            chartData: result.chartData || null,
            actionResult: result.actionResult || null,
            confirmationRequired: result.confirmationRequired || false,
            pendingAction: result.pendingAction || null,
            suggestions: result.suggestions || [],
            responseCards: result.responseCards || [],
            responseType: result.responseType || (result.chartData ? 'chart' : result.confirmationRequired ? 'confirmation' : 'text'),
        });

        await conversation.save();

        // ── Stream the response text ──
        await streamText(sendSSE, result.text);

        // ── Send final complete event ──
        sendSSE('complete', {
            conversationId: conversation._id,
            // v2 fields
            charts: result.charts || [],
            insights: result.insights || [],
            actions: result.actions || [],
            dataSources: result.dataSources || [],
            executedPlan: result.executedPlan || [],
            // Legacy fields
            chartData: result.chartData || null,
            actionResult: result.actionResult || null,
            suggestions: result.suggestions || [],
            confirmationRequired: result.confirmationRequired || false,
            pendingAction: result.pendingAction || null,
            responseCards: result.responseCards || [],
            responseType: result.responseType || 'text',
        });

        res.end();
    } catch (error) {
        console.error('Agent sendMessage error:', error);
        try {
            res.write(`event: error\ndata: ${JSON.stringify({ message: 'An error occurred. Please try again.' })}\n\n`);
            res.end();
        } catch {
            // Response may already be closed
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// STREAMING HELPER — word-by-word with natural cadence
// ═══════════════════════════════════════════════════════════════
const streamText = async (sendSSE, text) => {
    const words = text.split(' ');
    const chunkSize = 3; // Send 3 words at a time for smoother flow

    for (let i = 0; i < words.length; i += chunkSize) {
        const chunk = words.slice(i, i + chunkSize).join(' ');
        sendSSE('token', { text: chunk + (i + chunkSize < words.length ? ' ' : '') });
        await new Promise(r => setTimeout(r, 30)); // 30ms between chunks
    }
};

// ═══════════════════════════════════════════════════════════════
// TOOL LABEL MAP — human-readable names for the stepper UI
// ═══════════════════════════════════════════════════════════════
const TOOL_LABEL_MAP = {
    getExpenseSummary: '📊 Expense Summary',
    getSpendingTrend: '📈 Spending Trend',
    getSpendingByCategory: '📊 Category Breakdown',
    getMonthlyComparison: '📊 Monthly Comparison',
    getWeeklyTrend: '📈 Weekly Trend',
    getBudgetStatus: '📋 Budget Status',
    compareBudgetVsExpense: '📊 Budget vs Actual',
    forecastOverspending: '🔮 Overspend Forecast',
    getPortfolioOverview: '📈 Portfolio Overview',
    getPortfolioAnalytics: '📈 Deep Analytics',
    getRebalancingSuggestions: '🔄 Rebalancing',
    getUnderperformers: '⚠️ Underperformers',
    simulateSIP: '🔮 SIP Simulation',
    estimateCapitalGains: '🧾 Capital Gains',
    getTaxLiability: '🧾 Tax Liability',
    getDeductionUsage: '🧾 Deductions',
    compareRegimes: '⚖️ Regime Comparison',
    getUnused80C: '🧾 80C Analysis',
    forecastMonthlySavings: '🎯 Savings Plan',
    simulateRetirement: '🔮 Retirement Sim',
    simulateLoan: '🏦 Loan Calculator',
    whatIfScenario: '🔮 What-If Analysis',
    detectSubscriptionLeaks: '🔍 Subscriptions',
    getAnomalies: '⚠️ Anomaly Detection',
    getCashRunway: '💰 Cash Runway',
    getRecentTransactions: '📋 Recent Transactions',
    searchTransactions: '🔍 Search Results',
    addExpense: '✅ Add Expense',
    addIncome: '✅ Add Income',
    createBudget: '📋 Create Budget',
    getFamilySummary: '👨‍👩‍👧 Family Summary',
    getContributionBreakdown: '📊 Contributions',
    getQuestStatus: '🏆 Quest Status',
    getXPProgress: '⭐ XP Progress',
    getStreak: '🔥 Streak',
};

const getToolLabel = (toolName) => {
    return TOOL_LABEL_MAP[toolName] || toolName.replace(/([A-Z])/g, ' $1').trim();
};

// ═══════════════════════════════════════════════════════════════
// 2. GET CONVERSATIONS — List user's chat history
// ═══════════════════════════════════════════════════════════════
export const getConversations = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const conversations = await ChatConversation.find({ userId: req.user._id })
            .select('title createdAt updatedAt')
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const total = await ChatConversation.countDocuments({ userId: req.user._id });

        res.json({ conversations, total, page, pages: Math.ceil(total / limit) });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ message: 'Failed to fetch conversations.' });
    }
};

// ═══════════════════════════════════════════════════════════════
// 3. GET SINGLE CONVERSATION
// ═══════════════════════════════════════════════════════════════
export const getConversation = async (req, res) => {
    try {
        const conversation = await ChatConversation.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found.' });
        }

        res.json(conversation);
    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ message: 'Failed to fetch conversation.' });
    }
};

// ═══════════════════════════════════════════════════════════════
// 4. DELETE CONVERSATION
// ═══════════════════════════════════════════════════════════════
export const deleteConversation = async (req, res) => {
    try {
        const result = await ChatConversation.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id,
        });

        if (!result) {
            return res.status(404).json({ message: 'Conversation not found.' });
        }

        res.json({ message: 'Conversation deleted.' });
    } catch (error) {
        console.error('Delete conversation error:', error);
        res.status(500).json({ message: 'Failed to delete conversation.' });
    }
};

// ═══════════════════════════════════════════════════════════════
// 5. CLEAR ALL HISTORY
// ═══════════════════════════════════════════════════════════════
export const clearAllHistory = async (req, res) => {
    try {
        const result = await ChatConversation.deleteMany({ userId: req.user._id });
        res.json({ message: `Deleted ${result.deletedCount} conversations.` });
    } catch (error) {
        console.error('Clear history error:', error);
        res.status(500).json({ message: 'Failed to clear history.' });
    }
};
