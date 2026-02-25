import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import {
    COMMON_AXIS_PROPS,
    COMMON_TOOLTIP_PROPS,
    CHART_COLORS,
    formatCurrencyCompact,
} from '../utils/chartStyles';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, Legend, PieChart, Pie,
} from 'recharts';
import {
    Loader2, AlertTriangle, Shield, TrendingUp, ChevronDown, ChevronUp,
    Sparkles, ArrowRight, Info, CheckCircle2, Target, Zap, Clock, AlertCircle,
} from 'lucide-react';

const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '₹0';
    return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const RISK_COLORS = {
    'Very Low': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    'Low': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    'Moderate': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    'Moderate-High': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    'High': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    'N/A': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
};

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// ── Radial Score Gauge ──
const ScoreGauge = ({ score }) => {
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (score / 100) * circumference;
    const color = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444';

    return (
        <div className="relative w-36 h-36 mx-auto">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#F3F4F6" strokeWidth="10" />
                <motion.circle
                    cx="60" cy="60" r="54" fill="none"
                    stroke={color}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                    className="text-3xl font-black"
                    style={{ color }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    {score}
                </motion.span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">/ 100</span>
            </div>
        </div>
    );
};

// ── Deduction Utilization Bar ──
const UtilizationBar = ({ section, claimed, limit, percentage }) => (
    <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-gray-700 truncate max-w-[55%]">{section}</span>
            <span className="text-xs text-gray-500">
                {formatCurrency(claimed)} / {formatCurrency(limit)}
            </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <motion.div
                className="h-full rounded-full"
                style={{
                    background: percentage >= 80 ? '#10B981' : percentage >= 40 ? '#F59E0B' : '#93C5FD',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(percentage, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
            />
        </div>
    </div>
);

// ── Recommendation Card ──
const RecommendationCard = ({ rec, index, onInvestNow }) => {
    const [expanded, setExpanded] = useState(false);
    const risk = RISK_COLORS[rec.riskLevel] || RISK_COLORS['N/A'];

    return (
        <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: index * 0.08 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
        >
            <div
                className="p-4 sm:p-5 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${risk.bg} ${risk.text} ${risk.border} border`}>
                                {rec.riskLevel}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                {rec.section}
                            </span>
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 mt-2">{rec.instrument}</h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{rec.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <p className="text-lg font-black text-emerald-600">{formatCurrency(rec.estimatedTaxSaving)}</p>
                        <p className="text-[10px] text-gray-400 font-semibold">tax saving</p>
                        <button className="mt-2 text-gray-400 hover:text-gray-600 transition-colors">
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-gray-50 pt-4">
                            <div className="bg-gradient-to-r from-teal-50/80 to-emerald-50/80 rounded-xl p-3 mb-3 border border-teal-100">
                                <div className="flex items-start gap-2">
                                    <Info size={14} className="text-teal-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-teal-800 leading-relaxed font-medium">{rec.why}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Clock size={12} className="text-gray-400" />
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lock-in</p>
                                    </div>
                                    <p className="text-xs font-bold text-gray-800">{rec.lockIn}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <TrendingUp size={12} className="text-gray-400" />
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Returns</p>
                                    </div>
                                    <p className="text-xs font-bold text-gray-800">{rec.expectedReturn}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 col-span-2 sm:col-span-1">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Target size={12} className="text-gray-400" />
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Max Invest</p>
                                    </div>
                                    <p className="text-xs font-bold text-gray-800">{formatCurrency(rec.maxInvestable)}</p>
                                </div>
                            </div>

                            <div className="bg-blue-50/70 rounded-xl p-3 mb-4 border border-blue-100">
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Wealth Impact</p>
                                <p className="text-xs text-blue-800 leading-relaxed">{rec.wealthImpact}</p>
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); onInvestNow(); }}
                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:from-emerald-600 hover:to-teal-700 transition-all shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <TrendingUp size={14} />
                                Invest Now
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ══════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──
// ══════════════════════════════════════════════════════════════
const TaxAdvisorView = ({ setActiveTab }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [narrative, setNarrative] = useState('');
    const [narrativeLoading, setNarrativeLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);

    const fetchSummary = useCallback(async () => {
        setLoading(true);
        setError('');
        setNarrative('');
        try {
            const res = await api.get('/api/tax/summary');
            setData(res.data);
            setHasFetched(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load tax summary');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchNarrative = useCallback(async () => {
        if (!data) return;
        setNarrativeLoading(true);
        try {
            const res = await api.post('/api/tax/ai-explain', { summary: data });
            setNarrative(res.data.narrative);
        } catch (err) {
            setNarrative('Failed to generate AI insights. Please try again.');
        } finally {
            setNarrativeLoading(false);
        }
    }, [data]);

    // ── Welcome / Entry State ──
    if (!hasFetched && !loading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4"
            >
                <div className="p-5 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-3xl mb-6">
                    <Shield className="w-12 h-12 text-teal-600" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">Tax Saving Advisor</h2>
                <p className="text-gray-500 max-w-md leading-relaxed mb-8">
                    Analyze your income, expenses and investments to discover tax-saving opportunities.
                    Get personalized recommendations tailored to your financial profile.
                </p>
                <button
                    onClick={fetchSummary}
                    className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-8 py-3.5 rounded-2xl font-bold text-sm uppercase tracking-wider hover:from-teal-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center gap-2"
                >
                    <Zap size={18} />
                    Analyze My Taxes
                </button>
                <p className="text-[10px] text-gray-400 mt-4 max-w-xs">
                    Uses your existing income records, expenses, and investments. No duplicate data created.
                </p>
            </motion.div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="animate-spin text-teal-600 w-12 h-12" />
                <p className="text-gray-600 font-medium">Computing your tax summary...</p>
                <p className="text-xs text-gray-400">Analyzing income, expenses, and investments</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center px-4">
                <AlertTriangle className="text-red-500 w-12 h-12" />
                <p className="text-red-600 font-medium">{error}</p>
                <button
                    onClick={fetchSummary}
                    className="bg-teal-500 text-white px-6 py-2 rounded-xl hover:bg-teal-600 transition-colors text-sm font-medium"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!data) return null;

    // ── Prepare Chart Data ──
    const regimeData = [
        { name: 'Old Regime', value: data.taxLiability.oldRegime.total, fill: CHART_COLORS[0] },
        { name: 'New Regime', value: data.taxLiability.newRegime.total, fill: CHART_COLORS[1] },
    ];

    const deductionChartData = data.deductions.sections.map((s, i) => ({
        name: s.section.replace('Section ', ''),
        claimed: s.claimed,
        remaining: s.remaining,
        fill: CHART_COLORS[i % CHART_COLORS.length],
    }));

    const savingsComparison = [
        { name: 'Current Tax', value: Math.min(data.taxLiability.oldRegime.total, data.taxLiability.newRegime.total) },
        { name: 'After Optimization', value: Math.max(0, Math.min(data.taxLiability.oldRegime.total, data.taxLiability.newRegime.total) - data.totalPotentialSaving) },
    ];

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <motion.div variants={cardVariants} initial="hidden" animate="visible">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-xl">
                                <Shield className="w-5 h-5 text-teal-600" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black text-gray-900">Tax Saving Advisor</h2>
                        </div>
                        <p className="text-sm text-gray-500 ml-11">{data.fyLabel}</p>
                    </div>
                    <button
                        onClick={fetchSummary}
                        className="text-xs font-semibold text-teal-600 hover:text-teal-700 bg-teal-50 px-4 py-2 rounded-xl hover:bg-teal-100 transition-colors"
                    >
                        ↻ Refresh Analysis
                    </button>
                </div>
            </motion.div>

            {/* ── Summary Cards ── */}
            <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 lg:grid-cols-4 gap-3"
            >
                {[
                    {
                        label: 'Taxable Income',
                        value: formatCurrency(data.income.total),
                        sub: `${Object.keys(data.income.byCategory).length} source(s)`,
                        gradient: 'from-blue-500 to-indigo-600',
                        icon: <TrendingUp size={18} />,
                    },
                    {
                        label: 'Tax-Saving Investments',
                        value: formatCurrency(data.investments.total),
                        sub: `${data.investments.count} investment(s)`,
                        gradient: 'from-emerald-500 to-teal-600',
                        icon: <Target size={18} />,
                    },
                    {
                        label: 'Estimated Tax',
                        value: formatCurrency(Math.min(data.taxLiability.oldRegime.total, data.taxLiability.newRegime.total)),
                        sub: data.taxLiability.recommendedRegime,
                        gradient: 'from-amber-500 to-orange-600',
                        icon: <Shield size={18} />,
                    },
                    {
                        label: 'Potential Saving',
                        value: formatCurrency(data.totalPotentialSaving),
                        sub: `${data.recommendations.length} recommendation(s)`,
                        gradient: 'from-violet-500 to-purple-600',
                        icon: <Sparkles size={18} />,
                    },
                ].map((card, i) => (
                    <motion.div
                        key={card.label}
                        variants={cardVariants}
                        transition={{ delay: i * 0.08 }}
                        className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-4 sm:p-5 text-white shadow-lg relative overflow-hidden`}
                    >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-bl-full -mr-4 -mt-4" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2 opacity-80">
                                {card.icon}
                                <p className="text-[10px] font-bold uppercase tracking-widest">{card.label}</p>
                            </div>
                            <p className="text-xl sm:text-2xl font-black">{card.value}</p>
                            <p className="text-[10px] text-white/70 font-semibold mt-1">{card.sub}</p>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* ── Tax Optimization Score + Deduction Utilization ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Score */}
                <motion.div
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6"
                >
                    <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Zap size={16} className="text-teal-500" />
                        Tax Optimization Score
                    </h3>
                    <ScoreGauge score={data.optimizationScore} />
                    <p className="text-center text-xs text-gray-500 mt-3">
                        {data.optimizationScore >= 70
                            ? '🎉 Excellent! You\'re making great use of deductions.'
                            : data.optimizationScore >= 40
                                ? '💡 Good start — room to optimize further.'
                                : '🚀 Significant savings opportunity available!'}
                    </p>
                    <div className="mt-4 bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Deductions Used</p>
                        <p className="text-sm font-black text-gray-900 mt-1">
                            {formatCurrency(data.deductions.total)} / {formatCurrency(data.deductions.totalPossible)}
                        </p>
                    </div>
                </motion.div>

                {/* Deduction Utilization */}
                <motion.div
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6"
                >
                    <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Target size={16} className="text-amber-500" />
                        Deduction Utilization
                    </h3>
                    <div className="space-y-1">
                        {data.deductions.sections.length > 0 ? (
                            data.deductions.sections.map((s) => (
                                <UtilizationBar
                                    key={s.sectionKey}
                                    section={s.section}
                                    claimed={s.claimed}
                                    limit={s.limit}
                                    percentage={s.percentage}
                                />
                            ))
                        ) : (
                            <p className="text-sm text-gray-400 text-center py-8">No deduction data available yet.</p>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* ── Regime Comparison Chart ── */}
            <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6"
            >
                <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <BarChart size={16} className="text-blue-500" />
                    Tax Regime Comparison
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                    Recommended: <span className="font-bold text-teal-600">{data.taxLiability.recommendedRegime}</span>
                    {data.taxLiability.savingByChoosingRecommended > 0 && (
                        <span className="ml-1">(saves {formatCurrency(data.taxLiability.savingByChoosingRecommended)})</span>
                    )}
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Regime Bar Chart */}
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={regimeData} layout="horizontal">
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                <XAxis dataKey="name" {...COMMON_AXIS_PROPS} />
                                <YAxis {...COMMON_AXIS_PROPS} tickFormatter={formatCurrencyCompact} />
                                <Tooltip {...COMMON_TOOLTIP_PROPS} />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]} name="Tax Liability">
                                    {regimeData.map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Regime Details */}
                    <div className="space-y-3">
                        {[
                            { label: 'Old Regime', data: data.taxLiability.oldRegime, recommended: data.taxLiability.recommendedRegime === 'Old Regime' },
                            { label: 'New Regime', data: data.taxLiability.newRegime, recommended: data.taxLiability.recommendedRegime === 'New Regime' },
                        ].map((r) => (
                            <div
                                key={r.label}
                                className={`rounded-xl p-4 border ${r.recommended ? 'bg-teal-50/80 border-teal-200' : 'bg-gray-50 border-gray-100'}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-bold text-gray-800">{r.label}</span>
                                    {r.recommended && (
                                        <span className="text-[10px] font-bold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <CheckCircle2 size={10} /> Recommended
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <p className="text-gray-400 font-semibold">Taxable</p>
                                        <p className="font-bold text-gray-800">{formatCurrency(r.data.taxableIncome)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 font-semibold">Tax</p>
                                        <p className="font-bold text-gray-800">{formatCurrency(r.data.tax)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 font-semibold">Total + Cess</p>
                                        <p className="font-bold text-gray-800">{formatCurrency(r.data.total)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* ── Savings Projection ── */}
            <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-2xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-bl-full -mr-12 -mt-12" />
                <div className="relative z-10">
                    <h3 className="text-base font-bold mb-1 flex items-center gap-2">
                        <Sparkles size={16} />
                        Savings Projection
                    </h3>
                    <p className="text-[10px] text-white/60 font-semibold mb-4">If all recommendations are followed</p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white/15 backdrop-blur-md rounded-xl p-4 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Current Tax</p>
                            <p className="text-2xl font-black">{formatCurrency(savingsComparison[0].value)}</p>
                        </div>
                        <div className="bg-white/15 backdrop-blur-md rounded-xl p-4 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">After Optimization</p>
                            <p className="text-2xl font-black">{formatCurrency(savingsComparison[1].value)}</p>
                        </div>
                        <div className="bg-white/25 backdrop-blur-md rounded-xl p-4 text-center ring-2 ring-white/30">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/80 mb-1">You Could Save</p>
                            <p className="text-2xl font-black">{formatCurrency(data.totalPotentialSaving)}</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── AI Insights ── */}
            <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6"
            >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <Sparkles size={16} className="text-violet-500" />
                        AI-Powered Tax Insights
                    </h3>
                    <button
                        onClick={fetchNarrative}
                        disabled={narrativeLoading}
                        className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:from-violet-600 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                    >
                        {narrativeLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        {narrativeLoading ? 'Generating...' : 'Generate AI Insights'}
                    </button>
                </div>

                {narrative ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-gradient-to-br from-violet-50/80 to-purple-50/80 rounded-xl p-4 sm:p-5 border border-violet-100"
                    >
                        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                            {narrative.split('\n').map((line, i) => (
                                <p key={i} className="mb-2 text-sm" dangerouslySetInnerHTML={{
                                    __html: line
                                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                }} />
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <div className="text-center py-8 text-gray-400">
                        <Sparkles size={32} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Click "Generate AI Insights" for a personalized explanation</p>
                        <p className="text-[10px] mt-1">AI enhances readability — all numbers come from server-side calculations</p>
                    </div>
                )}
            </motion.div>

            {/* ── Recommendations ── */}
            <motion.div variants={cardVariants} initial="hidden" animate="visible">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        Actionable Recommendations
                    </h3>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                        {data.recommendations.length} suggestion{data.recommendations.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {data.recommendations.length > 0 ? (
                    <div className="space-y-3">
                        {data.recommendations.map((rec, i) => (
                            <RecommendationCard
                                key={`${rec.sectionKey}-${rec.instrument}`}
                                rec={rec}
                                index={i}
                                onInvestNow={() => setActiveTab('investments')}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-emerald-50/80 rounded-2xl p-8 text-center border border-emerald-100">
                        <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-3" />
                        <p className="text-sm font-semibold text-emerald-800">You've maximized all deduction limits!</p>
                        <p className="text-xs text-emerald-600 mt-1">Your tax planning looks great.</p>
                    </div>
                )}
            </motion.div>

            {/* ── Disclaimer ── */}
            <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="bg-amber-50/50 rounded-xl p-4 border border-amber-100 text-center"
            >
                <div className="flex items-center justify-center gap-2 mb-1">
                    <AlertCircle size={14} className="text-amber-500" />
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Disclaimer</p>
                </div>
                <p className="text-[10px] text-amber-600 leading-relaxed">
                    This is an indicative tax analysis based on your recorded income and expenses. Consult a qualified
                    Chartered Accountant for accurate tax filing. Tax rules are subject to change.
                </p>
            </motion.div>
        </div>
    );
};

export default TaxAdvisorView;
