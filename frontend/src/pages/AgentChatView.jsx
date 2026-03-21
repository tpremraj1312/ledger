import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot, Send, X, Plus, Trash2, MessageSquare, ChevronLeft,
    Sparkles, Loader2, CheckCircle, BarChart3,
    ArrowRight, History, Brain, TrendingUp, TrendingDown,
    Shield, AlertTriangle, Calculator, Target, Wallet,
    PieChart as PieChartIcon, Activity, Zap, RefreshCw,
    DollarSign, Users, FileText, Search, ChevronRight,
    Lightbulb, Database, Play, Info, ArrowUpRight, Flame
} from 'lucide-react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';
import {
    sendAgentMessage, getConversations, getConversation,
    deleteConversation, clearAllHistory
} from '../services/agentService';

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════
const COLORS = {
    primary: '#2563EB',
    primaryLight: '#DBEAFE',
    accent: '#7C3AED',
    success: '#059669',
    successLight: '#D1FAE5',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    info: '#0891B2',
    infoLight: '#CFFAFE',
    chart: ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777', '#0891B2', '#65A30D'],
};

// ═══════════════════════════════════════════════════════════════
// EXECUTION PLAN STEPPER — shows multi-step analysis progress
// ═══════════════════════════════════════════════════════════════
const PlanStepper = ({ steps, currentStep, isComplete }) => {
    if (!steps || steps.length === 0) return null;
    const flatSteps = steps.flat();
    if (flatSteps.length <= 1) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 px-4 py-2.5 mx-4 mb-2 bg-gradient-to-r from-blue-50/80 to-violet-50/80 rounded-xl border border-blue-100/60 overflow-x-auto"
        >
            <Brain size={13} className="text-blue-500 flex-shrink-0" />
            <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider flex-shrink-0 mr-1">Plan</span>
            {flatSteps.map((step, i) => {
                const isDone = isComplete || i < currentStep;
                const isActive = !isComplete && i === currentStep;
                return (
                    <React.Fragment key={i}>
                        {i > 0 && <ChevronRight size={10} className="text-gray-300 flex-shrink-0" />}
                        <span className={`text-[10px] font-medium whitespace-nowrap px-1.5 py-0.5 rounded-md transition-all duration-300 flex-shrink-0 ${isDone
                            ? 'text-emerald-600 bg-emerald-50'
                            : isActive
                                ? 'text-blue-700 bg-blue-100 animate-pulse'
                                : 'text-gray-400'
                            }`}>
                            {isDone ? '✓ ' : isActive ? '● ' : ''}{step.label || step.name}
                        </span>
                    </React.Fragment>
                );
            })}
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════════════
// INSIGHT CARD v2 — typed cards with severity & actions
// ═══════════════════════════════════════════════════════════════
const InsightCardV2 = ({ insight, onAction }) => {
    if (!insight) return null;

    const configs = {
        warning: { icon: <AlertTriangle size={14} />, bg: 'bg-amber-50', border: 'border-amber-200', iconColor: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
        opportunity: { icon: <Lightbulb size={14} />, bg: 'bg-emerald-50', border: 'border-emerald-200', iconColor: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
        metric: { icon: <BarChart3 size={14} />, bg: 'bg-blue-50', border: 'border-blue-200', iconColor: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
        tip: { icon: <Info size={14} />, bg: 'bg-violet-50', border: 'border-violet-200', iconColor: 'text-violet-600', badge: 'bg-violet-100 text-violet-700' },
    };

    const config = configs[insight.type] || configs.tip;
    const severityDot = {
        high: 'bg-red-500',
        medium: 'bg-amber-400',
        low: 'bg-emerald-400',
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className={`${config.bg} border ${config.border} rounded-xl p-3 flex gap-2.5 items-start`}
        >
            <div className={`${config.iconColor} mt-0.5 flex-shrink-0`}>{config.icon}</div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${config.badge}`}>
                        {insight.type}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full ${severityDot[insight.severity] || severityDot.medium}`} />
                </div>
                <p className="text-xs font-semibold text-gray-800 mb-0.5">{insight.title}</p>
                <p className="text-[11px] text-gray-600 leading-relaxed">{insight.body}</p>
            </div>
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════════════
// INLINE ACTION BUTTONS — clickable tool triggers from reasoning
// ═══════════════════════════════════════════════════════════════
const InlineActions = ({ actions, onAction }) => {
    if (!actions || actions.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-1.5 mt-2">
            {actions.map((action, i) => (
                <button
                    key={i}
                    onClick={() => onAction(action)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold bg-gradient-to-r from-blue-50 to-violet-50 text-blue-700 rounded-lg border border-blue-100/80 hover:shadow-md hover:from-blue-100 hover:to-violet-100 transition-all duration-200 hover:-translate-y-px"
                >
                    <Play size={9} className="fill-blue-600" />
                    {action.label}
                </button>
            ))}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// DATA SOURCE ATTRIBUTION — trust footer
// ═══════════════════════════════════════════════════════════════
const DataAttribution = ({ sources }) => {
    if (!sources || sources.length === 0) return null;

    const labelMap = {
        getExpenseSummary: 'Expenses', getSpendingTrend: 'Trends', getSpendingByCategory: 'Categories',
        getBudgetStatus: 'Budgets', compareBudgetVsExpense: 'Budget Analysis', forecastOverspending: 'Forecast',
        getPortfolioOverview: 'Portfolio', getPortfolioAnalytics: 'Analytics', getRebalancingSuggestions: 'Rebalancing',
        getTaxLiability: 'Tax Data', compareRegimes: 'Regimes', getUnused80C: '80C Usage',
        getRecentTransactions: 'Transactions', getAnomalies: 'Anomalies', getCashRunway: 'Cash Runway',
        forecastMonthlySavings: 'Savings', getQuestStatus: 'Gamification', getDeductionUsage: 'Deductions',
        getInvestmentHoldingsDetailed: 'Holdings', getTopHoldings: 'Top Holdings', getSectorAllocation: 'Allocation',
        getInvestmentsByType: 'Holdings by Type', getInvestmentGrowthTimeline: 'Growth Timeline',
        getGoalsOverview: 'Goals', getGoalProgress: 'Goal Progress', createGoal: 'Goal Created',
        getTransactionsByDateRange: 'Transactions', getIncomeBreakdown: 'Income', getTopMerchants: 'Merchants',
        getMonthOverMonthTrend: 'Monthly Trend', getFinancialHealthScore: 'Health Score',
    };

    return (
        <div className="flex items-center gap-1.5 mt-2 px-1">
            <Database size={9} className="text-gray-300" />
            <span className="text-[9px] text-gray-300">
                Based on: {sources.map(s => labelMap[s] || s.replace(/([A-Z])/g, ' $1').trim()).join(' · ')}
            </span>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// MULTI-CHART CAROUSEL — tabbed view for multiple charts
// ═══════════════════════════════════════════════════════════════
const ChartCarousel = ({ charts }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    if (!charts || charts.length === 0) return null;

    // If only one chart, render it directly
    if (charts.length === 1) return <SingleChart chartData={charts[0]} />;

    const current = charts[activeIndex];

    return (
        <div className="my-3">
            {/* Tab bar */}
            <div className="flex gap-1 mb-2 overflow-x-auto px-1">
                {charts.map((chart, i) => (
                    <button
                        key={i}
                        onClick={() => setActiveIndex(i)}
                        className={`text-[9px] font-semibold px-2.5 py-1 rounded-md whitespace-nowrap transition-all ${activeIndex === i
                            ? 'bg-blue-100 text-blue-700 shadow-sm'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        {chart.title || `Chart ${i + 1}`}
                    </button>
                ))}
            </div>
            <SingleChart chartData={current} />
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// SINGLE CHART RENDERER
// ═══════════════════════════════════════════════════════════════
const fmtCurrency = (value) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${Math.round(value)}`;
};

const tooltipStyle = { borderRadius: '12px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', fontSize: '11px', padding: '8px 12px' };

const CurrencyTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={tooltipStyle} className="bg-white">
            <p className="text-[10px] font-semibold text-gray-700 mb-1">{label}</p>
            {payload.map((entry, i) => (
                <p key={i} className="text-[10px]" style={{ color: entry.color }}>
                    {entry.name}: {typeof entry.value === 'number' ? fmtCurrency(entry.value) : entry.value}
                </p>
            ))}
        </div>
    );
};

const SingleChart = ({ chartData }) => {
    if (!chartData || !chartData.data || chartData.data.length === 0) return null;
    const { type, data, xKey, yKey, nameKey, valueKey, title, colors = COLORS.chart } = chartData;

    return (
        <div className="p-4 bg-gradient-to-br from-slate-50/80 to-gray-50/80 rounded-xl border border-gray-100/80 backdrop-blur-sm">
            {title && <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">{title}</p>}
            <ResponsiveContainer width="100%" height={240}>
                {type === 'bar' ? (
                    <BarChart data={data} margin={{ top: 5, right: 5, left: -5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey={xKey} tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                        <YAxis tick={{ fontSize: 9 }} stroke="#9CA3AF" tickFormatter={fmtCurrency} />
                        <Tooltip content={<CurrencyTooltip />} />
                        {Object.keys(data[0] || {}).filter(k => k !== xKey).map((key, i) => (
                            <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[6, 6, 0, 0]} />
                        ))}
                    </BarChart>
                ) : type === 'line' ? (
                    <LineChart data={data} margin={{ top: 5, right: 5, left: -5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey={xKey} tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                        <YAxis tick={{ fontSize: 9 }} stroke="#9CA3AF" tickFormatter={fmtCurrency} />
                        <Tooltip content={<CurrencyTooltip />} />
                        <Line type="monotone" dataKey={yKey} stroke={colors[0]} strokeWidth={2.5} dot={{ r: 3.5, fill: colors[0] }} />
                    </LineChart>
                ) : type === 'area' ? (
                    <AreaChart data={data} margin={{ top: 5, right: 5, left: -5, bottom: 5 }}>
                        <defs>
                            <linearGradient id={`areaGrad_${title}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colors[0]} stopOpacity={0.25} />
                                <stop offset="95%" stopColor={colors[0]} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey={xKey} tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                        <YAxis tick={{ fontSize: 9 }} stroke="#9CA3AF" tickFormatter={fmtCurrency} />
                        <Tooltip content={<CurrencyTooltip />} />
                        <Area type="monotone" dataKey={yKey} stroke={colors[0]} strokeWidth={2.5} fill={`url(#areaGrad_${title})`} />
                    </AreaChart>
                ) : type === 'pie' ? (
                    <PieChart>
                        <Pie data={data} dataKey={valueKey || 'value'} nameKey={nameKey || 'name'} cx="50%" cy="50%" outerRadius={80} innerRadius={42} paddingAngle={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: '9px' }}>
                            {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => typeof value === 'number' ? fmtCurrency(value) : value} contentStyle={tooltipStyle} />
                    </PieChart>
                ) : null}
            </ResponsiveContainer>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// RESPONSE CARD COMPONENTS (legacy — kept for backward compat)
// ═══════════════════════════════════════════════════════════════

const ActionCard = ({ data, message }) => {
    if (!data) return null;
    const isInvite = message?.includes('Invitation') || message?.includes('invite');
    const isUpdate = message?.includes('Updated') || message?.includes('Changed') || message?.includes('Switched');

    let icon = <CheckCircle size={18} />;
    let bgColor = 'bg-emerald-50'; let borderColor = 'border-emerald-200'; let iconColor = 'text-emerald-600'; let label = 'Action Completed';

    if (isInvite) { icon = <Users size={18} />; label = 'Invite Sent'; bgColor = 'bg-blue-50'; borderColor = 'border-blue-200'; iconColor = 'text-blue-600'; }
    if (isUpdate) { icon = <RefreshCw size={18} />; label = 'Updated'; bgColor = 'bg-violet-50'; borderColor = 'border-violet-200'; iconColor = 'text-violet-600'; }

    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`${bgColor} border ${borderColor} rounded-xl p-4 my-2`}>
            <div className="flex items-center gap-2 mb-2">
                <div className={`${iconColor}`}>{icon}</div>
                <span className={`text-xs font-bold uppercase tracking-wider ${iconColor}`}>{label}</span>
            </div>
            {data.amount && <p className="text-lg font-bold text-gray-900">₹{Number(data.amount).toLocaleString('en-IN')}</p>}
            {data.category && <p className="text-sm text-gray-600">{data.category}</p>}
            {data.email && <p className="text-sm text-gray-600">{data.email}</p>}
            {data.groupName && <p className="text-xs text-gray-500 mt-1">Group: {data.groupName}</p>}
        </motion.div>
    );
};

const LegacyInsightCard = ({ data, message }) => {
    const isWarning = message?.includes('⚠️') || message?.includes('OVER') || message?.includes('risk');
    const bg = isWarning ? 'bg-amber-50 border-amber-200' : 'bg-sky-50 border-sky-200';
    const iconColor = isWarning ? 'text-amber-600' : 'text-sky-600';
    const icon = isWarning ? <AlertTriangle size={16} /> : <Activity size={16} />;
    const label = isWarning ? 'Warning' : 'Insight';

    return (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`${bg} border rounded-xl p-4 my-2`}>
            <div className="flex items-center gap-2 mb-1">
                <span className={iconColor}>{icon}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${iconColor}`}>{label}</span>
            </div>
            {message && <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{message}</p>}
        </motion.div>
    );
};

const SimulationCard = ({ data, message }) => {
    if (!data) return null;
    return (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-4 my-2">
            <div className="flex items-center gap-2 mb-2">
                <Calculator size={16} className="text-violet-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Simulation</span>
            </div>
            {message && <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{message}</p>}
            {data.futureValue && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="bg-white/70 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-gray-500 uppercase">Invested</p>
                        <p className="text-sm font-bold text-gray-900">₹{Number(data.totalInvested || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-white/70 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-gray-500 uppercase">Future Value</p>
                        <p className="text-sm font-bold text-emerald-700">₹{Number(data.futureValue || 0).toLocaleString('en-IN')}</p>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

const ComparisonCard = ({ data, message }) => {
    if (!data) return null;
    const old = data.oldRegime;
    const nw = data.newRegime;
    if (!old || !nw) return <LegacyInsightCard data={data} message={message} />;

    return (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-200 rounded-xl p-4 my-2">
            <div className="flex items-center gap-2 mb-3">
                <FileText size={16} className="text-gray-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Tax Regime Comparison</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Old Regime</p>
                    <p className="text-lg font-bold text-gray-900">₹{Number(old.total).toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-gray-500">Tax + Cess</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">New Regime</p>
                    <p className="text-lg font-bold text-gray-900">₹{Number(nw.total).toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-gray-500">Tax + Cess</p>
                </div>
            </div>
            {data.recommendedRegime && (
                <div className="mt-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-xs text-emerald-700 font-medium">✅ Recommended: {data.recommendedRegime} — saves ₹{Number(data.savingByChoosingRecommended || 0).toLocaleString('en-IN')}</p>
                </div>
            )}
        </motion.div>
    );
};

const ResponseCards = ({ cards }) => {
    if (!cards || cards.length === 0) return null;
    return cards.map((card, i) => {
        switch (card.type) {
            case 'action_card': return <ActionCard key={i} data={card.data} message={card.message} />;
            case 'warning': return <LegacyInsightCard key={i} data={card.data} message={card.message} />;
            case 'simulation': return <SimulationCard key={i} data={card.data} message={card.message} />;
            case 'comparison': return <ComparisonCard key={i} data={card.data} message={card.message} />;
            case 'insight_card': return <LegacyInsightCard key={i} data={card.data} message={card.message} />;
            default: return <LegacyInsightCard key={i} data={card.data} message={card.message} />;
        }
    });
};

// ═══════════════════════════════════════════════════════════════
// TYPING INDICATOR
// ═══════════════════════════════════════════════════════════════
const TypingIndicator = ({ statusText }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-start gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/20">
            <Bot size={15} className="text-white" />
        </div>
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm">
                <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                {statusText && <span className="text-[10px] text-gray-400 ml-1">{statusText}</span>}
            </div>
        </div>
    </motion.div>
);

// ═══════════════════════════════════════════════════════════════
// SUGGESTION CHIPS
// ═══════════════════════════════════════════════════════════════
const SuggestionChips = ({ suggestions, onSelect }) => {
    if (!suggestions || suggestions.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-1.5 mt-2">
            {suggestions.map((s, i) => (
                <button key={i} onClick={() => onSelect(s)} className="px-2.5 py-1 text-[11px] font-medium bg-blue-50/80 text-blue-600 rounded-full border border-blue-100/80 hover:bg-blue-100 hover:shadow-sm transition-all duration-200 hover:-translate-y-px">
                    {s}
                </button>
            ))}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// EXPANDABLE TEXT — truncates long responses with show more/less
// ═══════════════════════════════════════════════════════════════
const ExpandableText = ({ text, previewLength = 500 }) => {
    const [expanded, setExpanded] = useState(false);
    if (!text || text.length <= previewLength) return text;

    return (
        <>
            {expanded ? text : text.substring(0, previewLength) + '…'}
            <button
                onClick={(e) => { e.stopPropagation(); setExpanded(p => !p); }}
                className="block mt-1.5 text-[10px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
                {expanded ? '▲ Show less' : '▼ Show more'}
            </button>
        </>
    );
};

// ═══════════════════════════════════════════════════════════════
// MESSAGE BUBBLE — v2 with insights, actions, charts, attribution
// ═══════════════════════════════════════════════════════════════
const MessageBubble = ({ message, onConfirm, onCancel, onSuggestionSelect, onAction }) => {
    const isUser = message.role === 'user';
    const meta = message.metadata || {};

    return (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={`flex items-start gap-2.5 px-4 py-1.5 ${isUser ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isUser
                ? 'bg-gray-800 text-white text-[10px] font-bold shadow-sm'
                : 'bg-gradient-to-br from-blue-600 to-violet-600 shadow-lg shadow-blue-600/15'
                }`}>
                {isUser ? 'U' : <Bot size={14} className="text-white" />}
            </div>

            <div className={`max-w-[82%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${isUser
                    ? 'bg-gray-800 text-white rounded-2xl rounded-tr-sm shadow-sm'
                    : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100/80 shadow-sm'
                    }`}>
                    {!isUser && message.content && message.content.length > 600 ? (
                        <ExpandableText text={message.content} />
                    ) : (
                        message.content
                    )}
                </div>

                {/* v2: Insight Cards */}
                {!isUser && meta.insights && meta.insights.length > 0 && (
                    <div className="space-y-1.5 mt-2 w-full">
                        {meta.insights.map((insight, i) => (
                            <InsightCardV2 key={i} insight={insight} onAction={onAction} />
                        ))}
                    </div>
                )}

                {/* v2: Inline Actions */}
                {!isUser && meta.actions && meta.actions.length > 0 && (
                    <InlineActions actions={meta.actions} onAction={onAction} />
                )}

                {/* Legacy Response Cards */}
                {!isUser && meta.responseCards && meta.responseCards.length > 0 && (
                    <ResponseCards cards={meta.responseCards} />
                )}

                {/* v2: Multi-chart carousel */}
                {!isUser && meta.charts && meta.charts.length > 0 && (
                    <ChartCarousel charts={meta.charts} />
                )}

                {/* Legacy: Single chart */}
                {!isUser && meta.chartData && !(meta.charts && meta.charts.length > 0) && (
                    <SingleChart chartData={meta.chartData} />
                )}

                {/* Confirmation */}
                {meta.confirmationRequired && meta.pendingAction && (
                    <div className="flex gap-2 mt-2">
                        <button onClick={() => onConfirm(meta.pendingAction.nonce)} className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100 hover:bg-red-100 transition-all">
                            <CheckCircle size={13} /> Confirm
                        </button>
                        <button onClick={onCancel} className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-100 transition-all">
                            <X size={13} /> Cancel
                        </button>
                    </div>
                )}

                {/* v2: Data Source Attribution */}
                {!isUser && meta.dataSources && meta.dataSources.length > 0 && (
                    <DataAttribution sources={meta.dataSources} />
                )}

                {/* Suggestions */}
                {!isUser && meta.suggestions && meta.suggestions.length > 0 && !meta.confirmationRequired && (
                    <SuggestionChips suggestions={meta.suggestions} onSelect={onSuggestionSelect} />
                )}

                <p className="text-[9px] text-gray-300 mt-1 px-1">
                    {new Date(message.timestamp || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════════════
// WELCOME SUGGESTIONS — Organized by capability
// ═══════════════════════════════════════════════════════════════
const WELCOME_GROUPS = [
    { label: '💰 Spending', icon: <Wallet size={13} />, items: ['Show my spending this month', 'Top merchants this month', 'Monthly trend'] },
    { label: '📊 Analytics', icon: <BarChart3 size={13} />, items: ['Budget status', 'Financial health score', 'Cash runway analysis'] },
    { label: '📈 Investments', icon: <TrendingUp size={13} />, items: ['List my investments', 'Sector allocation', 'Investment growth timeline'] },
    { label: '🎯 Goals & Tax', icon: <Target size={13} />, items: ['My goals', 'Compare tax regimes', 'Income breakdown'] },
];

// ═══════════════════════════════════════════════════════════════
// FINANCIAL HEALTH PULSE — live metrics on welcome screen
// ═══════════════════════════════════════════════════════════════
const HealthPulse = ({ onSelect }) => {
    const pulseItems = [
        { icon: <TrendingDown size={14} />, label: "What's draining my wallet?", color: 'text-red-500', bg: 'bg-red-50/80' },
        { icon: <Shield size={14} />, label: "Am I on track this month?", color: 'text-emerald-600', bg: 'bg-emerald-50/80' },
        { icon: <Zap size={14} />, label: "Quick financial health check", color: 'text-amber-500', bg: 'bg-amber-50/80' },
        { icon: <Target size={14} />, label: "How can I optimize my taxes?", color: 'text-violet-600', bg: 'bg-violet-50/80' },
    ];

    return (
        <div className="grid grid-cols-2 gap-2 max-w-md mx-auto mb-6">
            {pulseItems.map((item, i) => (
                <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i }}
                    onClick={() => onSelect(item.label)}
                    className={`${item.bg} p-3 rounded-xl border border-gray-100/60 text-left hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group`}
                >
                    <div className={`${item.color} mb-1.5`}>{item.icon}</div>
                    <p className="text-[11px] font-medium text-gray-700 leading-snug group-hover:text-gray-900">{item.label}</p>
                </motion.button>
            ))}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const AgentChatView = () => {
    const [conversations, setConversations] = useState([]);
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const [statusText, setStatusText] = useState('');
    const [showSidebar, setShowSidebar] = useState(true);
    const [showMobileHistory, setShowMobileHistory] = useState(false);
    // v2 state
    const [planSteps, setPlanSteps] = useState(null);
    const [currentPlanStep, setCurrentPlanStep] = useState(0);
    const [isPlanComplete, setIsPlanComplete] = useState(false);
    const [streamingInsights, setStreamingInsights] = useState([]);
    const [streamingCharts, setStreamingCharts] = useState([]);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const streamAbortRef = useRef(null);

    useEffect(() => { loadConversations(); }, []);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamingText]);

    const loadConversations = async () => {
        try { const data = await getConversations(); setConversations(data.conversations || []); } catch { }
    };

    const loadConversation = async (id) => {
        try { const data = await getConversation(id); setMessages(data.messages || []); setActiveConversationId(id); setShowMobileHistory(false); } catch { }
    };

    const handleNewConversation = () => {
        setActiveConversationId(null); setMessages([]); setStreamingText(''); setShowMobileHistory(false);
        setPlanSteps(null); setCurrentPlanStep(0); setIsPlanComplete(false);
        inputRef.current?.focus();
    };

    const handleDeleteConversation = async (id) => {
        try {
            await deleteConversation(id);
            setConversations(prev => prev.filter(c => c._id !== id));
            if (activeConversationId === id) { setActiveConversationId(null); setMessages([]); }
        } catch { }
    };

    const handleClearAll = async () => {
        if (!confirm('Delete all conversation history?')) return;
        try { await clearAllHistory(); setConversations([]); setActiveConversationId(null); setMessages([]); } catch { }
    };

    // Execute an inline action from reasoning
    const handleInlineAction = useCallback((action) => {
        if (!action.action || !action.label) return;
        // Construct a natural message from the action
        const msg = `${action.label}`;
        handleSend(msg);
    }, []);

    const handleSend = useCallback(async (msgText) => {
        const text = (msgText || inputValue).trim();
        if (!text || isLoading) return;

        setInputValue(''); setIsLoading(true); setStreamingText(''); setStatusText('');
        setPlanSteps(null); setCurrentPlanStep(0); setIsPlanComplete(false);
        setStreamingInsights([]); setStreamingCharts([]);

        const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);

        let fullText = '';

        streamAbortRef.current = sendAgentMessage(text, activeConversationId, null, {
            onToken: (t) => { fullText += t; setStreamingText(fullText); },
            onStatus: (d) => {
                setStatusText(d.message || '');
                if (d.stepIndex !== undefined) setCurrentPlanStep(d.stepIndex);
            },
            // v2: Plan broadcast
            onPlan: (data) => {
                if (data.steps) setPlanSteps(data.steps);
            },
            // v2: Progressive insights
            onInsight: (data) => {
                if (data.insights) setStreamingInsights(data.insights);
            },
            // v2: Charts data
            onCharts: (data) => {
                if (data.charts) setStreamingCharts(data.charts);
            },
            onComplete: (data) => {
                setStreamingText(''); setStatusText(''); setIsLoading(false);
                setIsPlanComplete(true);
                setMessages(prev => [...prev, {
                    role: 'assistant', content: fullText, timestamp: new Date().toISOString(),
                    metadata: {
                        // v2 fields
                        charts: data.charts || streamingCharts || [],
                        insights: data.insights || streamingInsights || [],
                        actions: data.actions || [],
                        dataSources: data.dataSources || [],
                        executedPlan: data.executedPlan || [],
                        // Legacy fields
                        chartData: data.chartData || null,
                        confirmationRequired: data.confirmationRequired || false,
                        pendingAction: data.pendingAction || null,
                        suggestions: data.suggestions || [],
                        responseCards: data.responseCards || [],
                        responseType: data.responseType || 'text',
                    },
                }]);
                // Reset streaming state
                setPlanSteps(null); setStreamingInsights([]); setStreamingCharts([]);
                if (data.conversationId) { setActiveConversationId(data.conversationId); loadConversations(); }
            },
            onError: (e) => {
                setStreamingText(''); setStatusText(''); setIsLoading(false);
                setPlanSteps(null); setStreamingInsights([]); setStreamingCharts([]);
                setMessages(prev => [...prev, {
                    role: 'assistant', content: `❌ ${e || 'An error occurred.'}`, timestamp: new Date().toISOString(),
                    metadata: { suggestions: ['Show my spending', 'Budget status'] },
                }]);
            },
        });
    }, [inputValue, isLoading, activeConversationId, streamingInsights, streamingCharts]);

    const handleConfirm = useCallback((nonce) => {
        if (isLoading) return;
        setIsLoading(true); setStreamingText(''); setStatusText('');
        let fullText = '';
        streamAbortRef.current = sendAgentMessage(null, activeConversationId, { nonce }, {
            onToken: (t) => { fullText += t; setStreamingText(fullText); },
            onStatus: (d) => setStatusText(d.message || ''),
            onPlan: () => { },
            onInsight: () => { },
            onCharts: () => { },
            onComplete: (data) => {
                setStreamingText(''); setStatusText(''); setIsLoading(false);
                setMessages(prev => [...prev, {
                    role: 'assistant', content: fullText, timestamp: new Date().toISOString(),
                    metadata: {
                        chartData: data.chartData, charts: data.charts || [],
                        suggestions: data.suggestions || [], responseCards: data.responseCards || [],
                        insights: data.insights || [], actions: data.actions || [],
                        dataSources: data.dataSources || [],
                    },
                }]);
                loadConversations();
            },
            onError: (e) => { setStreamingText(''); setIsLoading(false); setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${e}`, timestamp: new Date().toISOString() }]); },
        });
    }, [isLoading, activeConversationId]);

    const handleCancel = () => {
        setMessages(prev => [...prev, { role: 'assistant', content: '✅ Action cancelled.', timestamp: new Date().toISOString(), metadata: { suggestions: ['Show my spending', 'Budget status'] } }]);
    };

    const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

    return (
        <div className="flex h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] -m-4 sm:-m-4 lg:-m-8 overflow-hidden bg-[#FAFBFC]">

            {/* ═══════ Sidebar ═══════ */}
            <AnimatePresence>
                {showSidebar && (
                    <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="hidden lg:flex flex-col bg-white border-r border-gray-100 overflow-hidden flex-shrink-0">
                        <div className="p-4 border-b border-gray-100 flex-shrink-0">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-600/20">
                                        <Brain size={14} className="text-white" />
                                    </div>
                                    <h2 className="text-sm font-bold text-gray-900">Conversations</h2>
                                </div>
                                <div className="flex items-center gap-0.5">
                                    <button onClick={handleNewConversation} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="New Chat"><Plus size={15} /></button>
                                    {conversations.length > 0 && <button onClick={handleClearAll} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Clear All"><Trash2 size={13} /></button>}
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
                            {conversations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <MessageSquare size={24} className="text-gray-300 mb-2" />
                                    <p className="text-xs text-gray-400">No conversations yet</p>
                                </div>
                            ) : conversations.map((conv) => (
                                <div key={conv._id} className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${activeConversationId === conv._id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`} onClick={() => loadConversation(conv._id)}>
                                    <MessageSquare size={13} className="flex-shrink-0 opacity-40" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-medium truncate">{conv.title}</p>
                                        <p className="text-[9px] text-gray-400">{new Date(conv.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv._id); }} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all">
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* ═══════ Main Chat ═══════ */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-white/95 backdrop-blur-lg border-b border-gray-100/80 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <button onClick={() => setShowSidebar(p => !p)} className="hidden lg:block p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                            <ChevronLeft size={16} className={`transition-transform ${showSidebar ? '' : 'rotate-180'}`} />
                        </button>
                        <button onClick={() => setShowMobileHistory(true)} className="lg:hidden p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"><History size={16} /></button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                                <Sparkles size={16} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-[13px] font-bold text-gray-900">Ledger AI</h1>
                                <p className="text-[9px] text-emerald-500 font-semibold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" /> Agentic Intelligence · 60+ tools
                                </p>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleNewConversation} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="New Chat"><Plus size={16} /></button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-0.5">
                    {messages.length === 0 && !isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full px-4">
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }} className="text-center max-w-xl">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-blue-600/25">
                                    <Bot size={30} className="text-white" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 mb-1">Ledger AI Agent</h2>
                                <p className="text-xs text-gray-500 mb-5 leading-relaxed max-w-sm mx-auto">
                                    Your Agentic Financial Intelligence Platform — Analyze, plan, simulate, and optimize your finances with real-time data.
                                </p>

                                {/* v2: Financial Health Pulse */}
                                <HealthPulse onSelect={(q) => handleSend(q)} />

                                <div className="space-y-3 max-w-lg mx-auto">
                                    {WELCOME_GROUPS.map((group, gi) => (
                                        <div key={gi}>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 text-left pl-1">{group.label}</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {group.items.map((s, si) => (
                                                    <button key={si} onClick={() => handleSend(s)} className="text-left px-2.5 py-1.5 bg-white text-[11px] text-gray-600 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 hover:shadow-sm">
                                                        <span className="flex items-center gap-1.5"><ArrowRight size={10} className="text-blue-400 flex-shrink-0" />{s}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, i) => (
                                <MessageBubble key={i} message={msg} onConfirm={handleConfirm} onCancel={handleCancel} onSuggestionSelect={(s) => handleSend(s)} onAction={handleInlineAction} />
                            ))}

                            {/* v2: Plan Stepper (visible during loading) */}
                            {isLoading && planSteps && (
                                <PlanStepper steps={planSteps} currentStep={currentPlanStep} isComplete={isPlanComplete} />
                            )}

                            {/* v2: Progressive Insights (visible during loading) */}
                            {isLoading && streamingInsights.length > 0 && (
                                <div className="px-4 space-y-1.5 mb-2">
                                    {streamingInsights.map((insight, i) => (
                                        <InsightCardV2 key={i} insight={insight} />
                                    ))}
                                </div>
                            )}

                            {/* v2: Progressive Charts (visible during loading) */}
                            {isLoading && streamingCharts.length > 0 && (
                                <div className="px-4 mb-2">
                                    <ChartCarousel charts={streamingCharts} />
                                </div>
                            )}

                            {isLoading && streamingText && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2.5 px-4 py-1.5">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/15">
                                        <Bot size={14} className="text-white" />
                                    </div>
                                    <div className="px-3.5 py-2.5 bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100/80 shadow-sm text-[13px] leading-relaxed max-w-[82%] whitespace-pre-wrap">
                                        {streamingText}
                                        <span className="inline-block w-1 h-3.5 bg-blue-500 ml-0.5 animate-pulse rounded-sm" />
                                    </div>
                                </motion.div>
                            )}

                            <AnimatePresence>
                                {isLoading && !streamingText && <TypingIndicator statusText={statusText} />}
                            </AnimatePresence>

                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Input */}
                <div className="px-3 sm:px-4 py-3 bg-white/95 backdrop-blur-lg border-t border-gray-100/80 flex-shrink-0">
                    <div className="flex items-end gap-2 max-w-3xl mx-auto">
                        <div className="flex-1 relative">
                            <textarea
                                ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
                                placeholder="Ask anything about your finances..."
                                rows={1} disabled={isLoading}
                                className="w-full px-4 py-2.5 bg-gray-50/80 text-[13px] text-gray-800 rounded-xl border border-gray-200/80 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 resize-none placeholder:text-gray-400 transition-all"
                                style={{ maxHeight: '120px' }}
                                onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                            />
                        </div>
                        <button onClick={() => handleSend()} disabled={isLoading || !inputValue.trim()} className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center ${isLoading || !inputValue.trim() ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-600/25 hover:shadow-xl hover:-translate-y-px'}`}>
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* ═══════ Mobile Drawer ═══════ */}
            <AnimatePresence>
                {showMobileHistory && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="lg:hidden fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" onClick={() => setShowMobileHistory(false)}>
                        <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', bounce: 0 }} className="fixed left-0 top-0 h-full w-72 bg-white z-50 flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="text-sm font-bold text-gray-900">Chat History</h2>
                                <div className="flex items-center gap-1.5">
                                    <button onClick={handleNewConversation} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg"><Plus size={15} /></button>
                                    <button onClick={() => setShowMobileHistory(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"><X size={16} /></button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
                                {conversations.length === 0 ? (
                                    <p className="text-center text-xs text-gray-400 py-12">No conversations yet</p>
                                ) : conversations.map((conv) => (
                                    <div key={conv._id} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${activeConversationId === conv._id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`} onClick={() => loadConversation(conv._id)}>
                                        <MessageSquare size={13} className="flex-shrink-0 opacity-40" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-medium truncate">{conv.title}</p>
                                            <p className="text-[9px] text-gray-400">{new Date(conv.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv._id); }} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={11} /></button>
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
