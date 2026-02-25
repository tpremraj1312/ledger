import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot, Send, X, Plus, Trash2, MessageSquare, ChevronLeft,
    Sparkles, Loader2, AlertTriangle, CheckCircle, BarChart3,
    Clock, ArrowRight, History, MoreVertical, Brain
} from 'lucide-react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';
import {
    sendAgentMessage, getConversations, getConversation,
    deleteConversation, clearAllHistory
} from '../services/agentService';

// ═══════════════════════════════════════════════════════════════
// CHART COLORS
// ═══════════════════════════════════════════════════════════════
const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

// ═══════════════════════════════════════════════════════════════
// INLINE CHART RENDERER
// ═══════════════════════════════════════════════════════════════
const ChatChart = ({ chartData }) => {
    if (!chartData || !chartData.data || chartData.data.length === 0) return null;

    const { type, data, xKey, yKey, nameKey, valueKey, title, colors = CHART_COLORS } = chartData;

    return (
        <div className="my-3 p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-100">
            {title && <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</p>}
            <ResponsiveContainer width="100%" height={220}>
                {type === 'bar' ? (
                    <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                        <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', fontSize: '12px' }} />
                        {Object.keys(data[0] || {}).filter(k => k !== xKey).map((key, i) => (
                            <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
                        ))}
                    </BarChart>
                ) : type === 'line' ? (
                    <LineChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                        <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', fontSize: '12px' }} />
                        <Line type="monotone" dataKey={yKey} stroke={colors[0]} strokeWidth={2.5} dot={{ r: 4, fill: colors[0] }} />
                    </LineChart>
                ) : type === 'area' ? (
                    <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                        <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={colors[0]} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                        <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', fontSize: '12px' }} />
                        <Area type="monotone" dataKey={yKey} stroke={colors[0]} strokeWidth={2.5} fill="url(#areaGrad)" />
                    </AreaChart>
                ) : type === 'pie' ? (
                    <PieChart>
                        <Pie data={data} dataKey={valueKey || 'amount'} nameKey={nameKey || 'category'} cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: '10px' }}>
                            {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', fontSize: '12px' }} />
                    </PieChart>
                ) : null}
            </ResponsiveContainer>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// TYPING INDICATOR
// ═══════════════════════════════════════════════════════════════
const TypingIndicator = ({ statusText }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-start gap-3 px-4 py-3"
    >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-md">
            <Bot size={16} className="text-white" />
        </div>
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 px-4 py-2.5 bg-white rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            {statusText && <p className="text-[10px] text-gray-400 ml-1">{statusText}</p>}
        </div>
    </motion.div>
);

// ═══════════════════════════════════════════════════════════════
// SUGGESTION CHIPS
// ═══════════════════════════════════════════════════════════════
const SuggestionChips = ({ suggestions, onSelect }) => {
    if (!suggestions || suggestions.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {suggestions.map((s, i) => (
                <button
                    key={i}
                    onClick={() => onSelect(s)}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-full border border-blue-100 hover:bg-blue-100 hover:shadow-sm transition-all duration-200 hover:-translate-y-0.5"
                >
                    {s}
                </button>
            ))}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// MESSAGE BUBBLE
// ═══════════════════════════════════════════════════════════════
const MessageBubble = ({ message, onConfirm, onCancel, onSuggestionSelect }) => {
    const isUser = message.role === 'user';
    const meta = message.metadata || {};

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex items-start gap-3 px-4 py-2 ${isUser ? 'flex-row-reverse' : ''}`}
        >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${isUser
                ? 'bg-gradient-to-br from-gray-700 to-gray-900 text-white text-xs font-bold'
                : 'bg-gradient-to-br from-blue-500 to-violet-600'
                }`}>
                {isUser ? 'U' : <Bot size={16} className="text-white" />}
            </div>

            {/* Content */}
            <div className={`max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${isUser
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-sm shadow-md'
                    : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm'
                    }`}>
                    {message.content}
                </div>

                {/* Chart */}
                {meta.chartData && <ChatChart chartData={meta.chartData} />}

                {/* Confirmation buttons */}
                {meta.confirmationRequired && meta.pendingAction && (
                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={() => onConfirm(meta.pendingAction.nonce)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100 hover:bg-red-100 transition-all"
                        >
                            <CheckCircle size={14} /> Confirm
                        </button>
                        <button
                            onClick={onCancel}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-100 transition-all"
                        >
                            <X size={14} /> Cancel
                        </button>
                    </div>
                )}

                {/* Suggestions */}
                {!isUser && meta.suggestions && meta.suggestions.length > 0 && !meta.confirmationRequired && (
                    <SuggestionChips suggestions={meta.suggestions} onSelect={onSuggestionSelect} />
                )}

                {/* Timestamp */}
                <p className="text-[10px] text-gray-300 mt-1 px-1">
                    {new Date(message.timestamp || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════════════
// MAIN AGENT CHAT VIEW
// ═══════════════════════════════════════════════════════════════
const AgentChatView = () => {
    // ── State ──
    const [conversations, setConversations] = useState([]);
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const [statusText, setStatusText] = useState('');
    const [showSidebar, setShowSidebar] = useState(true);
    const [showMobileHistory, setShowMobileHistory] = useState(false);
    const [menuOpen, setMenuOpen] = useState(null);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const streamAbortRef = useRef(null);

    // ── Load conversations on mount ──
    useEffect(() => {
        loadConversations();
    }, []);

    // ── Auto-scroll ──
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingText]);

    const loadConversations = async () => {
        try {
            const data = await getConversations();
            setConversations(data.conversations || []);
        } catch { /* silently fail */ }
    };

    const loadConversation = async (id) => {
        try {
            const data = await getConversation(id);
            setMessages(data.messages || []);
            setActiveConversationId(id);
            setShowMobileHistory(false);
        } catch { /* silently fail */ }
    };

    const handleNewConversation = () => {
        setActiveConversationId(null);
        setMessages([]);
        setStreamingText('');
        setShowMobileHistory(false);
        inputRef.current?.focus();
    };

    const handleDeleteConversation = async (id) => {
        try {
            await deleteConversation(id);
            setConversations(prev => prev.filter(c => c._id !== id));
            if (activeConversationId === id) {
                setActiveConversationId(null);
                setMessages([]);
            }
        } catch { /* silently fail */ }
        setMenuOpen(null);
    };

    const handleClearAll = async () => {
        if (!confirm('Delete all conversation history?')) return;
        try {
            await clearAllHistory();
            setConversations([]);
            setActiveConversationId(null);
            setMessages([]);
        } catch { /* silently fail */ }
    };

    // ── Send message ──
    const handleSend = useCallback(async (msgText) => {
        const text = (msgText || inputValue).trim();
        if (!text || isLoading) return;

        setInputValue('');
        setIsLoading(true);
        setStreamingText('');
        setStatusText('');

        // Add user message optimistically
        const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);

        let fullText = '';
        let completionData = {};

        streamAbortRef.current = sendAgentMessage(
            text,
            activeConversationId,
            null,
            {
                onToken: (tokenText) => {
                    fullText += tokenText;
                    setStreamingText(fullText);
                },
                onStatus: (data) => {
                    setStatusText(data.message || '');
                },
                onComplete: (data) => {
                    completionData = data;
                    setStreamingText('');
                    setStatusText('');
                    setIsLoading(false);

                    // Add assistant message
                    const assistantMsg = {
                        role: 'assistant',
                        content: fullText,
                        timestamp: new Date().toISOString(),
                        metadata: {
                            chartData: data.chartData || null,
                            confirmationRequired: data.confirmationRequired || false,
                            pendingAction: data.pendingAction || null,
                            suggestions: data.suggestions || [],
                        },
                    };
                    setMessages(prev => [...prev, assistantMsg]);

                    // Update conversation ID
                    if (data.conversationId) {
                        setActiveConversationId(data.conversationId);
                        loadConversations();
                    }
                },
                onError: (errMsg) => {
                    setStreamingText('');
                    setStatusText('');
                    setIsLoading(false);
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `❌ ${errMsg || 'An error occurred. Please try again.'}`,
                        timestamp: new Date().toISOString(),
                        metadata: { suggestions: ['Show my spending', 'Budget status'] },
                    }]);
                },
            }
        );
    }, [inputValue, isLoading, activeConversationId]);

    // ── Confirm destructive action ──
    const handleConfirm = useCallback((nonce) => {
        if (isLoading) return;
        setIsLoading(true);
        setStreamingText('');
        setStatusText('');

        let fullText = '';

        streamAbortRef.current = sendAgentMessage(
            null,
            activeConversationId,
            { nonce },
            {
                onToken: (t) => { fullText += t; setStreamingText(fullText); },
                onStatus: (d) => setStatusText(d.message || ''),
                onComplete: (data) => {
                    setStreamingText('');
                    setStatusText('');
                    setIsLoading(false);
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: fullText,
                        timestamp: new Date().toISOString(),
                        metadata: { chartData: data.chartData, suggestions: data.suggestions || [] },
                    }]);
                    loadConversations();
                },
                onError: (e) => {
                    setStreamingText('');
                    setIsLoading(false);
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `❌ ${e}`,
                        timestamp: new Date().toISOString(),
                    }]);
                },
            }
        );
    }, [isLoading, activeConversationId]);

    const handleCancel = () => {
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: '✅ Action cancelled.',
            timestamp: new Date().toISOString(),
            metadata: { suggestions: ['Show my spending', 'Budget status', 'Add expense'] },
        }]);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ── Welcome suggestions ──
    const welcomeSuggestions = [
        'Show my spending this month',
        'Budget status',
        'Show spending trend',
        'Add 500 for groceries',
        'Compare last 3 months',
        'My investment portfolio',
        'Show my XP progress',
        'Tax liability',
    ];

    return (
        <div className="flex h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] -m-4 sm:-m-4 lg:-m-8 overflow-hidden">

            {/* ════════ Conversation Sidebar (Desktop) ════════ */}
            <AnimatePresence>
                {showSidebar && (
                    <motion.aside
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 280, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="hidden lg:flex flex-col bg-gradient-to-b from-slate-50 to-white border-r border-gray-100 overflow-hidden flex-shrink-0"
                    >
                        {/* Sidebar Header */}
                        <div className="p-4 border-b border-gray-100 flex-shrink-0">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center shadow-md">
                                        <Brain size={16} className="text-white" />
                                    </div>
                                    <h2 className="text-sm font-bold text-gray-900">Conversations</h2>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={handleNewConversation} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="New Chat">
                                        <Plus size={16} />
                                    </button>
                                    {conversations.length > 0 && (
                                        <button onClick={handleClearAll} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Clear All">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Conversation List */}
                        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
                            {conversations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                    <MessageSquare size={28} className="text-gray-300 mb-2" />
                                    <p className="text-xs text-gray-400">No conversations yet</p>
                                </div>
                            ) : (
                                conversations.map((conv) => (
                                    <div
                                        key={conv._id}
                                        className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${activeConversationId === conv._id
                                            ? 'bg-blue-50 text-blue-700 shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                                            }`}
                                        onClick={() => loadConversation(conv._id)}
                                    >
                                        <MessageSquare size={14} className="flex-shrink-0 opacity-50" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate">{conv.title}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                                {new Date(conv.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv._id); }}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* ════════ Main Chat Area ════════ */}
            <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-50/50 to-white min-w-0">

                {/* Chat Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-md border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowSidebar(prev => !prev)}
                            className="hidden lg:block p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                        >
                            <ChevronLeft size={18} className={`transition-transform ${showSidebar ? '' : 'rotate-180'}`} />
                        </button>
                        <button
                            onClick={() => setShowMobileHistory(true)}
                            className="lg:hidden p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                        >
                            <History size={18} />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Sparkles size={18} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-sm font-bold text-gray-900">Ledger AI</h1>
                                <p className="text-[10px] text-emerald-500 font-medium">● Online</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleNewConversation}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="New Chat"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-1">
                    {messages.length === 0 && !isLoading ? (
                        /* ═══ Empty State / Welcome ═══ */
                        <div className="flex flex-col items-center justify-center h-full px-4">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.4 }}
                                className="text-center max-w-lg"
                            >
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/25">
                                    <Bot size={36} className="text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Ledger AI Agent</h2>
                                <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                                    Your Financial Copilot — I can track expenses, manage budgets,
                                    analyze investments, optimize taxes, and visualize your finances.
                                </p>

                                <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                                    {welcomeSuggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSend(s)}
                                            className="text-left px-3 py-2.5 bg-white text-xs text-gray-600 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5"
                                        >
                                            <span className="flex items-center gap-2">
                                                <ArrowRight size={12} className="text-blue-400 flex-shrink-0" />
                                                {s}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, i) => (
                                <MessageBubble
                                    key={i}
                                    message={msg}
                                    onConfirm={handleConfirm}
                                    onCancel={handleCancel}
                                    onSuggestionSelect={(s) => handleSend(s)}
                                />
                            ))}

                            {/* Streaming text (in-progress assistant message) */}
                            {isLoading && streamingText && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3 px-4 py-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-md">
                                        <Bot size={16} className="text-white" />
                                    </div>
                                    <div className="px-4 py-2.5 bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm text-sm leading-relaxed max-w-[80%] whitespace-pre-wrap">
                                        {streamingText}
                                        <span className="inline-block w-1.5 h-4 bg-blue-400 ml-0.5 animate-pulse rounded-sm" />
                                    </div>
                                </motion.div>
                            )}

                            {/* Typing indicator (before streaming starts) */}
                            <AnimatePresence>
                                {isLoading && !streamingText && <TypingIndicator statusText={statusText} />}
                            </AnimatePresence>

                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Input Bar */}
                <div className="px-3 sm:px-4 py-3 bg-white/95 backdrop-blur-md border-t border-gray-100 flex-shrink-0">
                    <div className="flex items-end gap-2 max-w-3xl mx-auto">
                        <div className="flex-1 relative">
                            <textarea
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask anything about your finances..."
                                rows={1}
                                className="w-full px-4 py-3 pr-12 bg-gray-50 text-sm text-gray-800 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none placeholder:text-gray-400 transition-all"
                                style={{ maxHeight: '120px' }}
                                onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                                disabled={isLoading}
                            />
                        </div>
                        <button
                            onClick={() => handleSend()}
                            disabled={isLoading || !inputValue.trim()}
                            className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${isLoading || !inputValue.trim()
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5'
                                }`}
                        >
                            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* ════════ Mobile History Drawer ════════ */}
            <AnimatePresence>
                {showMobileHistory && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="lg:hidden fixed inset-0 bg-black/50 z-50"
                        onClick={() => setShowMobileHistory(false)}
                    >
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', bounce: 0 }}
                            className="fixed left-0 top-0 h-full w-80 bg-white z-50 flex flex-col shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                                <h2 className="text-sm font-bold text-gray-900">Chat History</h2>
                                <div className="flex items-center gap-2">
                                    <button onClick={handleNewConversation} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg"><Plus size={16} /></button>
                                    <button onClick={() => setShowMobileHistory(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"><X size={18} /></button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                                {conversations.length === 0 ? (
                                    <p className="text-center text-xs text-gray-400 py-12">No conversations yet</p>
                                ) : conversations.map((conv) => (
                                    <div
                                        key={conv._id}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${activeConversationId === conv._id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                                        onClick={() => loadConversation(conv._id)}
                                    >
                                        <MessageSquare size={14} className="flex-shrink-0 opacity-50" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate">{conv.title}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{new Date(conv.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv._id); }}
                                            className="p-1 text-gray-400 hover:text-red-500"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AgentChatView;
