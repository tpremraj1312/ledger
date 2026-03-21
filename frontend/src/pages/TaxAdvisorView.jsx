import React, { useState, useCallback, useEffect } from 'react';
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
    Cell, PieChart, Pie,
} from 'recharts';
import {
    Loader2, AlertTriangle, Shield, TrendingUp, ChevronDown, ChevronUp,
    Sparkles, ArrowRight, Info, CheckCircle2, Target, Zap, Clock, AlertCircle,
    DollarSign, PiggyBank, BarChart3, ArrowUpRight, ArrowDownRight,
    Lightbulb, Heart, GraduationCap, Home, Calculator, Play, X
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

const PRIORITY_STYLES = {
    'high': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', label: 'HIGH PRIORITY' },
    'medium': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: 'MEDIUM' },
    'low': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', label: 'LOW' },
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
        <div className="relative w-32 h-32 sm:w-36 sm:h-36 mx-auto">
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
const RecommendationCard = ({ rec, index, onInvestNow, onSimulate }) => {
    const [expanded, setExpanded] = useState(false);
    const risk = RISK_COLORS[rec.riskLevel] || RISK_COLORS['N/A'];
    const priority = PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES['medium'];

    return (
        <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: index * 0.06 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
        >
            <div
                className="p-4 sm:p-5 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {/* Priority Badge */}
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${priority.bg} ${priority.text} ${priority.border} border flex items-center gap-1`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`}></span>
                                {priority.label}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${risk.bg} ${risk.text} ${risk.border} border`}>
                                {rec.riskLevel}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                {rec.sectionKey || rec.section}
                            </span>
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 mt-2">{rec.instrument}</h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{rec.description}</p>
                        {rec.source === 'pattern_detection' && (
                            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                                <Lightbulb size={10} />
                                Pattern Detected
                            </span>
                        )}
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
                                    <p className="text-xs text-teal-800 leading-relaxed font-medium">{rec.actionDetails?.why || rec.why}</p>
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
                                    <p className="text-xs font-bold text-gray-800">{rec.meta?.expectedReturn || rec.expectedReturn}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 col-span-2 sm:col-span-1">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Target size={12} className="text-gray-400" />
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Max Invest</p>
                                    </div>
                                    <p className="text-xs font-bold text-gray-800">{formatCurrency(rec.actionDetails?.maxInvestable || rec.maxInvestable)}</p>
                                </div>
                            </div>

                            <div className="bg-blue-50/70 rounded-xl p-3 mb-4 border border-blue-100">
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Wealth Impact</p>
                                <p className="text-xs text-blue-800 leading-relaxed">{rec.meta?.wealthImpact || rec.wealthImpact}</p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onSimulate(rec); }}
                                    className="flex-1 bg-white border-2 border-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <Play size={14} className="text-indigo-500" />
                                    Simulate Scenario
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onInvestNow(); }}
                                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:from-emerald-600 hover:to-teal-700 transition-all shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <TrendingUp size={14} />
                                    Invest Now
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ── AI Action Item Card ──
const ActionItemCard = ({ item, index }) => {
    const urgencyStyles = {
        high: 'border-l-red-500 bg-red-50/30',
        medium: 'border-l-amber-500 bg-amber-50/30',
        low: 'border-l-blue-500 bg-blue-50/30',
    };

    return (
        <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: index * 0.08 }}
            className={`border-l-4 rounded-r-xl p-4 ${urgencyStyles[item.urgency] || urgencyStyles.medium}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${item.urgency === 'high' ? 'bg-red-100 text-red-700' : item.urgency === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                            {item.urgency}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500">{item.section}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{item.action}</p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.reasoning}</p>
                </div>
                <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-emerald-600">{item.estimatedSaving}</p>
                    <p className="text-[10px] text-gray-400">saving</p>
                </div>
            </div>
        </motion.div>
    );
};


// ── Simulator Modal Component ──
const SimulatorModal = ({ isOpen, onClose, rec, baseTax }) => {
    const [sliderValue, setSliderValue] = useState(0);
    const [simResult, setSimResult] = useState(null);
    const [isSimulating, setIsSimulating] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setSliderValue(0);
            setSimResult(null);
        }
    }, [isOpen]);

    const handleSimulation = async (val) => {
        if (!rec) return;
        setIsSimulating(true);
        try {
            const sectionKey = rec.sectionKey || rec.section;
            const res = await api.post('/api/tax/simulate', {
                additionalInvestments: { [sectionKey]: val }
            });
            setSimResult(res.data);
        } catch (err) {
            console.error('Simulation error:', err);
        } finally {
            setIsSimulating(false);
        }
    };

    // Debounce slider updates for API calls
    useEffect(() => {
        if (sliderValue > 0) {
            const timeoutId = setTimeout(() => {
                handleSimulation(sliderValue);
            }, 300);
            return () => clearTimeout(timeoutId);
        } else {
            setSimResult(null);
        }
    }, [sliderValue, rec]);

    if (!isOpen || !rec) return null;

    const maxLimit = rec.actionDetails?.maxInvestable || rec.maxInvestable || 150000;
    const currentTax = baseTax;
    const newTax = simResult ? simResult.simulatedTax : currentTax;
    const taxSaved = simResult ? simResult.netTaxSaved : 0;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
                >
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white relative">
                        <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 p-1.5 rounded-full hover:bg-white/30 transition">
                            <X size={16} />
                        </button>
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={18} className="text-purple-300" />
                            <h3 className="text-lg font-black tracking-wide">Tax Simulator</h3>
                        </div>
                        <p className="text-sm font-medium text-white/80">{rec.instrument}</p>
                    </div>

                    <div className="p-6">
                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-sm font-bold text-gray-700">Hypothetical Investment</label>
                                <span className="text-lg font-black text-indigo-600">{formatCurrency(sliderValue)}</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max={maxLimit}
                                step="1000"
                                value={sliderValue}
                                onChange={(e) => setSliderValue(Number(e.target.value))}
                                className="w-full h-3 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between items-center mt-2 text-xs font-semibold text-gray-400">
                                <span>₹0</span>
                                <span>Max: {formatCurrency(maxLimit)}</span>
                            </div>
                        </div>

                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-6 relative overflow-hidden">
                            {isSimulating && (
                                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
                                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                </div>
                            )}
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Current Tax</p>
                                    <p className="text-lg font-bold text-gray-900">{formatCurrency(currentTax)}</p>
                                </div>
                                <ArrowRight size={16} className="text-gray-300" />
                                <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-1">New Tax</p>
                                    <p className="text-lg font-black text-indigo-600">{formatCurrency(newTax)}</p>
                                </div>
                            </div>
                            <div className="bg-emerald-50 text-emerald-700 py-3 px-4 rounded-xl flex items-center justify-between border border-emerald-100">
                                <span className="text-sm font-bold flex items-center gap-2">
                                    <TrendingUp size={16} /> Net Tax Saved
                                </span>
                                <span className="text-xl font-black">{formatCurrency(taxSaved)}</span>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full bg-gray-900 text-white font-bold tracking-wide uppercase text-sm py-3.5 rounded-xl hover:bg-gray-800 transition active:scale-[0.98]"
                        >
                            Done
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};


// ══════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──
// ══════════════════════════════════════════════════════════════
const TaxAdvisorView = ({ setActiveTab }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true); // Start loading immediately
    const [error, setError] = useState('');
    const [activeSimRec, setActiveSimRec] = useState(null);
    const [isSimOpen, setIsSimOpen] = useState(false);

    // Auto-fetch on mount
    const fetchFullAnalysis = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/api/tax/full-analysis');
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load tax analysis');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFullAnalysis();
    }, [fetchFullAnalysis]);

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                {/* Header Skeleton */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-xl w-9 h-9" />
                        <div className="space-y-2">
                            <div className="h-6 w-48 bg-gray-200 rounded" />
                            <div className="h-3 w-24 bg-gray-200 rounded" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-28 bg-gray-100 rounded-full" />
                        <div className="h-8 w-20 bg-gray-100 rounded-xl" />
                    </div>
                </div>
                {/* Summary Cards Skeleton */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="relative overflow-hidden bg-gray-100 rounded-2xl p-4 sm:p-5" style={{ minHeight: 100 }}>
                            <div className="space-y-3">
                                <div className="h-2.5 w-20 bg-gray-200 rounded" />
                                <div className="h-6 w-28 bg-gray-200 rounded" />
                                <div className="h-2 w-24 bg-gray-200 rounded" />
                            </div>
                            <div className="absolute inset-0 bg-shimmer animate-shimmer" />
                        </div>
                    ))}
                </div>
                {/* Tax Liability + Potential Savings Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-5">
                        <div className="space-y-3">
                            <div className="h-4 w-40 bg-gray-200 rounded" />
                            <div className="h-7 w-32 bg-gray-200 rounded" />
                            <div className="h-3 w-48 bg-gray-200 rounded" />
                        </div>
                        <div className="absolute inset-0 bg-shimmer animate-shimmer" />
                    </div>
                    <div className="relative overflow-hidden bg-gray-100 rounded-2xl p-5">
                        <div className="space-y-3">
                            <div className="h-4 w-44 bg-gray-200 rounded" />
                            <div className="h-7 w-28 bg-gray-200 rounded" />
                            <div className="h-3 w-36 bg-gray-200 rounded" />
                        </div>
                        <div className="absolute inset-0 bg-shimmer animate-shimmer" />
                    </div>
                </div>
                {/* Score + Deductions Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
                        <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
                        <div className="flex items-center justify-center h-40">
                            <div className="w-32 h-32 bg-gray-200 rounded-full" />
                        </div>
                        <div className="h-3 w-3/4 bg-gray-200 rounded mx-auto mt-3" />
                        <div className="absolute inset-0 bg-shimmer animate-shimmer" />
                    </div>
                    <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
                        <div className="h-4 w-36 bg-gray-200 rounded mb-4" />
                        <div className="space-y-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i}>
                                    <div className="flex justify-between mb-1">
                                        <div className="h-2.5 w-24 bg-gray-200 rounded" />
                                        <div className="h-2.5 w-20 bg-gray-200 rounded" />
                                    </div>
                                    <div className="h-2.5 w-full bg-gray-200 rounded-full" />
                                </div>
                            ))}
                        </div>
                        <div className="absolute inset-0 bg-shimmer animate-shimmer" />
                    </div>
                </div>
                {/* Recommendations Skeleton */}
                <div className="space-y-3">
                    <div className="h-5 w-40 bg-gray-200 rounded" />
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 space-y-2">
                                    <div className="flex gap-2">
                                        <div className="h-4 w-20 bg-gray-200 rounded-full" />
                                        <div className="h-4 w-16 bg-gray-200 rounded-full" />
                                        <div className="h-4 w-14 bg-gray-200 rounded-full" />
                                    </div>
                                    <div className="h-3.5 w-3/5 bg-gray-200 rounded" />
                                    <div className="h-2.5 w-4/5 bg-gray-200 rounded" />
                                </div>
                                <div className="space-y-1 text-right">
                                    <div className="h-5 w-24 bg-gray-200 rounded" />
                                    <div className="h-2 w-14 bg-gray-200 rounded ml-auto" />
                                </div>
                            </div>
                            <div className="absolute inset-0 bg-shimmer animate-shimmer" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center px-4">
                <AlertTriangle className="text-red-500 w-12 h-12" />
                <p className="text-red-600 font-medium">{error}</p>
                <button
                    onClick={fetchFullAnalysis}
                    className="bg-teal-500 text-white px-6 py-2 rounded-xl hover:bg-teal-600 transition-colors text-sm font-medium"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!data) return null;

    const ai = data.aiInsights || {};

    // ── Prepare Chart Data ──
    const regimeData = [
        { name: 'Old Regime', value: data.taxLiability.oldRegime.total, fill: CHART_COLORS[0] },
        { name: 'New Regime', value: data.taxLiability.newRegime.total, fill: CHART_COLORS[2] },
    ];

    const deductionChartData = data.deductions.sections.map((s, i) => ({
        name: s.section.replace('Section ', ''),
        claimed: s.claimed,
        remaining: s.remaining,
        fill: CHART_COLORS[i % CHART_COLORS.length],
    }));

    const incomeChartData = (data.income.breakdown || []).map((item, i) => ({
        name: item.category,
        value: item.amount,
        fill: CHART_COLORS[i % CHART_COLORS.length],
    }));

    const savingsComparison = [
        { name: 'Current Tax', value: Math.min(data.taxLiability.oldRegime.total, data.taxLiability.newRegime.total) },
        { name: 'After Optimization', value: Math.max(0, Math.min(data.taxLiability.oldRegime.total, data.taxLiability.newRegime.total) - data.totalPotentialSaving) },
    ];

    const highPriorityCount = data.recommendations.filter(r => r.priority === 'high').length;
    const patternCount = (data.patternInsights || []).length;

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
                    <div className="flex items-center gap-3">
                        {highPriorityCount > 0 && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-full border border-red-100 flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                {highPriorityCount} High Priority
                            </span>
                        )}
                        <button
                            onClick={fetchFullAnalysis}
                            className="text-xs font-semibold text-teal-600 hover:text-teal-700 bg-teal-50 px-4 py-2 rounded-xl hover:bg-teal-100 transition-colors"
                        >
                            ↻ Refresh
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* ── Financial Summary Cards ── */}
            <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 lg:grid-cols-4 gap-3"
            >
                {[
                    {
                        label: 'Annual Income',
                        value: formatCurrency(data.income.total),
                        sub: `${data.income.sourceCount} source(s) · ₹${formatCurrencyCompact(data.income.monthly).replace('₹', '')}/mo`,
                        gradient: 'from-blue-500 to-indigo-600',
                        icon: <DollarSign size={18} />,
                    },
                    {
                        label: 'Annual Expenses',
                        value: formatCurrency(data.expenses.total),
                        sub: `${data.expenses.categoryCount} categories · ₹${formatCurrencyCompact(data.expenses.monthly).replace('₹', '')}/mo`,
                        gradient: 'from-rose-500 to-pink-600',
                        icon: <ArrowDownRight size={18} />,
                    },
                    {
                        label: 'Tax-Saving Investments',
                        value: formatCurrency(data.investments.total),
                        sub: `${data.investments.count} investment(s)`,
                        gradient: 'from-emerald-500 to-teal-600',
                        icon: <Target size={18} />,
                    },
                    {
                        label: 'Savings Rate',
                        value: `${data.savingsRate}%`,
                        sub: data.savingsRate >= 30 ? 'Healthy savings' : data.savingsRate >= 15 ? 'Room to improve' : 'Needs attention',
                        gradient: data.savingsRate >= 30 ? 'from-emerald-500 to-green-600' : data.savingsRate >= 15 ? 'from-amber-500 to-orange-600' : 'from-red-500 to-rose-600',
                        icon: <PiggyBank size={18} />,
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

            {/* ── Estimated Tax + Potential Savings ── */}
            <motion.div variants={cardVariants} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Calculator size={16} className="text-amber-500" />
                        <h3 className="text-sm font-bold text-gray-900">Estimated Tax Liability</h3>
                    </div>
                    <p className="text-2xl font-black text-gray-900">
                        {formatCurrency(Math.min(data.taxLiability.oldRegime.total, data.taxLiability.newRegime.total))}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Under {data.taxLiability.recommendedRegime}
                        {data.taxLiability.savingByChoosingRecommended > 0 &&
                            ` (saves ${formatCurrency(data.taxLiability.savingByChoosingRecommended)} vs other)`
                        }
                    </p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full -mr-6 -mt-6" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={16} />
                            <h3 className="text-sm font-bold">Potential Additional Savings</h3>
                        </div>
                        <p className="text-2xl font-black">{formatCurrency(data.totalPotentialSaving)}</p>
                        <p className="text-[10px] text-white/70 font-semibold mt-1">
                            {data.recommendations.length} recommendation(s) available
                        </p>
                    </div>
                </div>
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

            {/* ── Income Breakdown + Regime Comparison ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Income Breakdown */}
                {incomeChartData.length > 0 && (
                    <motion.div
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6"
                    >
                        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <BarChart3 size={16} className="text-indigo-500" />
                            Income Breakdown
                        </h3>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={incomeChartData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={75}
                                        innerRadius={45}
                                        paddingAngle={2}
                                    >
                                        {incomeChartData.map((entry, i) => (
                                            <Cell key={i} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip {...COMMON_TOOLTIP_PROPS} formatter={(value) => formatCurrency(value)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            {(data.income.breakdown || []).slice(0, 4).map((item, i) => (
                                <div key={item.category} className="flex items-center gap-2 text-xs">
                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}></span>
                                    <span className="text-gray-600 truncate">{item.category}</span>
                                    <span className="text-gray-400 ml-auto">{item.percentage}%</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Regime Comparison */}
                <motion.div
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6"
                >
                    <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                        <Shield size={16} className="text-blue-500" />
                        Tax Regime Comparison
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">
                        Recommended: <span className="font-bold text-teal-600">{data.taxLiability.recommendedRegime}</span>
                        {data.taxLiability.savingByChoosingRecommended > 0 && (
                            <span className="ml-1">(saves {formatCurrency(data.taxLiability.savingByChoosingRecommended)})</span>
                        )}
                    </p>

                    <div className="h-[180px] mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={regimeData} layout="horizontal">
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                <XAxis dataKey="name" {...COMMON_AXIS_PROPS} />
                                <YAxis {...COMMON_AXIS_PROPS} tickFormatter={formatCurrencyCompact} />
                                <Tooltip {...COMMON_TOOLTIP_PROPS} formatter={(value) => formatCurrency(value)} />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]} name="Tax Liability">
                                    {regimeData.map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Regime Details */}
                    <div className="space-y-2">
                        {[
                            { label: 'Old Regime', data: data.taxLiability.oldRegime, recommended: data.taxLiability.recommendedRegime === 'Old Regime' },
                            { label: 'New Regime', data: data.taxLiability.newRegime, recommended: data.taxLiability.recommendedRegime === 'New Regime' },
                        ].map((r) => (
                            <div
                                key={r.label}
                                className={`rounded-xl p-3 border ${r.recommended ? 'bg-teal-50/80 border-teal-200' : 'bg-gray-50 border-gray-100'}`}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-bold text-gray-800">{r.label}</span>
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
                </motion.div>
            </div>

            {/* ── Pattern Insights (Missed Opportunities) ── */}
            {patternCount > 0 && (
                <motion.div variants={cardVariants} initial="hidden" animate="visible">
                    <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl p-5 sm:p-6 border border-violet-100">
                        <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                            <Lightbulb size={16} className="text-violet-500" />
                            Detected Opportunities
                        </h3>
                        <p className="text-xs text-gray-500 mb-4">Smart analysis detected {patternCount} potential tax optimization(s) from your spending patterns</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {data.patternInsights.map((p, i) => (
                                <div key={p.id} className="bg-white rounded-xl p-4 border border-violet-100 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-violet-100 rounded-lg flex-shrink-0">
                                            {p.section === '80D_self' && <Heart size={16} className="text-violet-600" />}
                                            {p.section === '80E' && <GraduationCap size={16} className="text-violet-600" />}
                                            {p.section === '24b' && <Home size={16} className="text-violet-600" />}
                                            {p.section === '80CCD_1B' && <PiggyBank size={16} className="text-violet-600" />}
                                            {!['80D_self', '80E', '24b', '80CCD_1B'].includes(p.section) && <Lightbulb size={16} className="text-violet-600" />}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-bold text-gray-900">{p.title}</h4>
                                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{p.description}</p>
                                            {p.triggerAmount > 0 && (
                                                <p className="text-xs text-violet-600 font-semibold mt-2">
                                                    Related spending: {formatCurrency(p.triggerAmount)}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{p.sectionName}</span>
                                                <span className="text-xs font-bold text-emerald-600">Save {formatCurrency(p.estimatedTaxSaving)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ── AI-Powered Insights ── */}
            {ai.overallAssessment && (
                <motion.div
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6"
                >
                    <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Sparkles size={16} className="text-violet-500" />
                        AI-Powered Tax Insights
                    </h3>

                    {/* Overall Assessment */}
                    <div className="bg-gradient-to-br from-violet-50/80 to-purple-50/80 rounded-xl p-4 mb-4 border border-violet-100">
                        <p className="text-sm text-gray-700 leading-relaxed">{ai.overallAssessment}</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        {/* Strengths */}
                        {ai.strengths?.length > 0 && (
                            <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
                                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <CheckCircle2 size={12} /> What You're Doing Well
                                </p>
                                <ul className="space-y-1.5">
                                    {ai.strengths.map((s, i) => (
                                        <li key={i} className="text-xs text-emerald-800 leading-relaxed flex items-start gap-2">
                                            <span className="text-emerald-500 mt-0.5">•</span>
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Improvements */}
                        {ai.improvements?.length > 0 && (
                            <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100">
                                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <ArrowUpRight size={12} /> Areas to Improve
                                </p>
                                <ul className="space-y-1.5">
                                    {ai.improvements.map((s, i) => (
                                        <li key={i} className="text-xs text-amber-800 leading-relaxed flex items-start gap-2">
                                            <span className="text-amber-500 mt-0.5">•</span>
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Income & Expense Insights */}
                    {(ai.incomeInsights || ai.expenseInsights) && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                            {ai.incomeInsights && (
                                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                                    <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                        <DollarSign size={12} /> Income Analysis
                                    </p>
                                    <p className="text-xs text-blue-800 leading-relaxed">{ai.incomeInsights}</p>
                                </div>
                            )}
                            {ai.expenseInsights && (
                                <div className="bg-rose-50/50 rounded-xl p-4 border border-rose-100">
                                    <p className="text-[10px] font-bold text-rose-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                        <ArrowDownRight size={12} /> Expense Analysis
                                    </p>
                                    <p className="text-xs text-rose-800 leading-relaxed">{ai.expenseInsights}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Regime Advice */}
                    {ai.regimeAdvice && (
                        <div className="bg-teal-50/50 rounded-xl p-4 mb-4 border border-teal-100">
                            <p className="text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <Shield size={12} /> Regime Recommendation
                            </p>
                            <p className="text-xs text-teal-800 leading-relaxed">{ai.regimeAdvice}</p>
                        </div>
                    )}

                    {/* AI Action Items */}
                    {ai.actionItems?.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <Zap size={12} /> Recommended Actions
                            </p>
                            <div className="space-y-2">
                                {ai.actionItems.map((item, i) => (
                                    <ActionItemCard key={i} item={item} index={i} />
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

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

            {/* ── Actionable Recommendations ── */}
            <motion.div variants={cardVariants} initial="hidden" animate="visible">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        Actionable Recommendations
                    </h3>
                    <div className="flex items-center gap-2">
                        {highPriorityCount > 0 && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-100">
                                {highPriorityCount} high priority
                            </span>
                        )}
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                            {data.recommendations.length} total
                        </span>
                    </div>
                </div>

                {data.recommendations.length > 0 ? (
                    <div className="space-y-3">
                        {data.recommendations.map((rec, i) => (
                            <RecommendationCard
                                key={`${rec.sectionKey}-${rec.instrument}-${i}`}
                                rec={rec}
                                index={i}
                                onInvestNow={() => setActiveTab('investments')}
                                onSimulate={(rec) => {
                                    setActiveSimRec(rec);
                                    setIsSimOpen(true);
                                }}
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

            <SimulatorModal 
                isOpen={isSimOpen} 
                onClose={() => setIsSimOpen(false)} 
                rec={activeSimRec} 
                baseTax={data ? Math.min(data.taxLiability?.oldRegime?.total || 0, data.taxLiability?.newRegime?.total || 0) : 0} 
            />
        </div>
    );
};

export default TaxAdvisorView;
