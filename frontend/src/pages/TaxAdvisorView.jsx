import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { useFinancial } from '../context/FinancialContext';
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
    Lightbulb, Heart, GraduationCap, Home, Calculator, Play, X, RefreshCw
} from 'lucide-react';

/* ─── Helpers ─── */
const fmt = (amount) => {
    if (amount === undefined || amount === null) return '₹0';
    return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

/* ─── Shared design tokens (aligned with HomeView) ─── */
const CARD = 'bg-white rounded-2xl shadow-sm border border-gray-100/80';
const SECTION_TITLE = 'text-lg md:text-xl font-bold text-gray-900';
const PILL = 'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border';

/* ────────────────────────────────────────────────────── */
/* ─── Score Gauge ─── */
/* ────────────────────────────────────────────────────── */
const ScoreGauge = ({ score }) => {
    const c = 2 * Math.PI * 52;
    const off = c - (score / 100) * c;
    const color = score >= 70 ? '#059669' : score >= 40 ? '#D97706' : '#DC2626';
    return (
        <div className="relative w-28 h-28 mx-auto">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#F3F4F6" strokeWidth="10" />
                <motion.circle cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: off }}
                    transition={{ duration: 1, ease: 'easeOut' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black" style={{ color }}>{score}</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">/ 100</span>
            </div>
        </div>
    );
};

/* ────────────────────────────────────────────────────── */
/* ─── Utilization Bar ─── */
/* ────────────────────────────────────────────────────── */
const UtilizationBar = ({ section, claimed, limit, percentage }) => (
    <div className="mb-3 last:mb-0">
        <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-gray-700 truncate max-w-[55%]">{section}</span>
            <span className="text-xs text-gray-500">{fmt(claimed)} / {fmt(limit)}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <motion.div className="h-full rounded-full"
                style={{ background: percentage >= 80 ? '#059669' : percentage >= 40 ? '#D97706' : '#93C5FD' }}
                initial={{ width: 0 }} animate={{ width: `${Math.min(percentage, 100)}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }} />
        </div>
    </div>
);

/* ────────────────────────────────────────────────────── */
/* ─── Recommendation Card ─── */
/* ────────────────────────────────────────────────────── */
const RISK = {
    'Very Low': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    'Low': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    'Moderate': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    'Moderate-High': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    'High': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    'N/A': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
};
const PRIO = {
    high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', label: 'HIGH' },
    medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: 'MEDIUM' },
    low: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', label: 'LOW' },
};

const RecommendationCard = ({ rec, index, onInvestNow, onSimulate }) => {
    const [open, setOpen] = useState(false);
    const risk = RISK[rec.riskLevel] || RISK['N/A'];
    const prio = PRIO[rec.priority] || PRIO.medium;

    return (
        <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: index * 0.05 }}
            className={`${CARD} overflow-hidden hover:shadow-md transition-shadow`}>
            <div className="p-4 cursor-pointer" onClick={() => setOpen(!open)}>
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                            <span className={`${PILL} ${prio.bg} ${prio.text} ${prio.border} flex items-center gap-1`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />{prio.label}
                            </span>
                            <span className={`${PILL} ${risk.bg} ${risk.text} ${risk.border}`}>{rec.riskLevel}</span>
                            <span className={`${PILL} bg-gray-50 text-gray-500 border-gray-200`}>{rec.sectionKey || rec.section}</span>
                        </div>
                        <h4 className="text-sm font-bold text-gray-900">{rec.instrument}</h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{rec.description}</p>
                        {rec.source === 'pattern_detection' && (
                            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
                                <Lightbulb size={10} /> Pattern Detected
                            </span>
                        )}
                    </div>
                    <div className="text-right flex-shrink-0">
                        <p className="text-lg font-black text-emerald-600">{fmt(rec.estimatedTaxSaving)}</p>
                        <p className="text-[10px] text-gray-400 font-semibold">tax saving</p>
                        <button className="mt-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="px-4 pb-4 border-t border-gray-50 pt-3">
                            <div className="bg-teal-50/70 rounded-xl p-3 mb-3 border border-teal-100">
                                <div className="flex items-start gap-2">
                                    <Info size={13} className="text-teal-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-teal-800 leading-relaxed font-medium">{rec.actionDetails?.why || rec.why}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-3">
                                {[
                                    { icon: <Clock size={11} />, label: 'Lock-in', val: rec.lockIn },
                                    { icon: <TrendingUp size={11} />, label: 'Returns', val: rec.meta?.expectedReturn || rec.expectedReturn },
                                    { icon: <Target size={11} />, label: 'Max Invest', val: fmt(rec.actionDetails?.maxInvestable || rec.maxInvestable) },
                                ].map(m => (
                                    <div key={m.label} className="bg-gray-50/80 rounded-xl p-2.5">
                                        <div className="flex items-center gap-1 mb-0.5">
                                            <span className="text-gray-400">{m.icon}</span>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{m.label}</p>
                                        </div>
                                        <p className="text-xs font-bold text-gray-800">{m.val}</p>
                                    </div>
                                ))}
                            </div>

                            {(rec.meta?.wealthImpact || rec.wealthImpact) && (
                                <div className="bg-blue-50/60 rounded-xl p-3 mb-3 border border-blue-100">
                                    <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Wealth Impact</p>
                                    <p className="text-xs text-blue-800 leading-relaxed">{rec.meta?.wealthImpact || rec.wealthImpact}</p>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); onSimulate(rec); }}
                                    className="flex-1 bg-white border border-gray-200 text-gray-700 py-2 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5">
                                    <Play size={12} className="text-indigo-500" /> Simulate
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onInvestNow(); }}
                                    className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-all shadow-sm flex items-center justify-center gap-1.5">
                                    <TrendingUp size={12} /> Invest Now
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

/* ────────────────────────────────────────────────────── */
/* ─── AI Action Item ─── */
/* ────────────────────────────────────────────────────── */
const ActionItemCard = ({ item, index }) => {
    const u = { high: 'border-l-red-400 bg-red-50/30', medium: 'border-l-amber-400 bg-amber-50/30', low: 'border-l-blue-400 bg-blue-50/30' };
    return (
        <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: index * 0.06 }}
            className={`border-l-[3px] rounded-r-xl p-3.5 ${u[item.urgency] || u.medium}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${item.urgency === 'high' ? 'bg-red-100 text-red-700' : item.urgency === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{item.urgency}</span>
                        <span className="text-[10px] font-bold text-gray-400">{item.section}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{item.action}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.reasoning}</p>
                </div>
                <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-emerald-600">{item.estimatedSaving}</p>
                    <p className="text-[10px] text-gray-400">saving</p>
                </div>
            </div>
        </motion.div>
    );
};

/* ────────────────────────────────────────────────────── */
/* ─── Simulator Modal ─── */
/* ────────────────────────────────────────────────────── */
const SimulatorModal = ({ isOpen, onClose, rec, baseTax }) => {
    const [val, setVal] = useState(0);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => { if (!isOpen) { setVal(0); setResult(null); } }, [isOpen]);

    useEffect(() => {
        if (val <= 0 || !rec) { setResult(null); return; }
        const t = setTimeout(async () => {
            setLoading(true);
            try {
                const r = await api.post('/api/tax/simulate', { additionalInvestments: { [rec.sectionKey || rec.section]: val } });
                setResult(r.data);
            } catch { } finally { setLoading(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [val, rec]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen || !rec) return null;

    const max = rec.actionDetails?.maxInvestable || rec.maxInvestable || 150000;
    const newTax = result ? result.simulatedTax : baseTax;
    const saved = result ? result.netTaxSaved : 0;

    return (
        <div className="fixed inset-0 z-[9999]" style={{ isolation: 'isolate' }}>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Container - centered */}
            <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
                    className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 overflow-hidden pointer-events-auto"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                <Calculator size={14} className="text-indigo-500" /> Tax Simulator
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">{rec.instrument}</p>
                        </div>
                        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                        {/* Slider */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-semibold text-gray-700">Hypothetical Investment</label>
                                <span className="text-sm font-black text-indigo-600">{fmt(val)}</span>
                            </div>
                            <input type="range" min="0" max={max} step="1000" value={val}
                                onChange={e => setVal(Number(e.target.value))}
                                className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                            <div className="flex justify-between mt-1 text-[10px] font-semibold text-gray-400">
                                <span>₹0</span><span>Max: {fmt(max)}</span>
                            </div>
                        </div>

                        {/* Results */}
                        <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-4 relative">
                            {loading && (
                                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
                                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                                </div>
                            )}
                            <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-200">
                                <div className="text-center flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Current Tax</p>
                                    <p className="text-base font-bold text-gray-900">{fmt(baseTax)}</p>
                                </div>
                                <ArrowRight size={14} className="text-gray-300 mx-2" />
                                <div className="text-center flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-0.5">New Tax</p>
                                    <p className="text-base font-black text-indigo-600">{fmt(newTax)}</p>
                                </div>
                            </div>
                            
                            <div className="bg-emerald-50 text-emerald-700 py-2.5 px-3 rounded-lg flex items-center justify-between border border-emerald-100 mb-3">
                                <span className="text-xs font-semibold flex items-center gap-1.5">
                                    <TrendingUp size={13} /> Net Tax Saved
                                </span>
                                <span className="text-lg font-black">{fmt(saved)}</span>
                            </div>

                            {/* Smart Analysis Delta */}
                            {result && (result.oldRegimeSaving > 0 || result.newRegimeSaving > 0) && (
                                <div className="grid grid-cols-2 gap-3 pt-1 mb-3 border-t border-gray-100">
                                    {result.oldRegimeSaving > 0 && (
                                        <div>
                                            <p className="text-[8px] font-bold text-gray-400 uppercase">Old Regime Saving</p>
                                            <p className="text-[11px] font-bold text-indigo-600">+{fmt(result.oldRegimeSaving)}</p>
                                        </div>
                                    )}
                                    {result.newRegimeSaving > 0 && (
                                        <div>
                                            <p className="text-[8px] font-bold text-gray-400 uppercase">New Regime Saving</p>
                                            <p className="text-[11px] font-bold text-indigo-600">+{fmt(result.newRegimeSaving)}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Pocket CA Insight */}
                            <div className="bg-indigo-50/50 rounded-lg p-2.5 flex gap-2 items-start border border-indigo-100/50">
                                <Sparkles size={12} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                                <p className="text-[10px] text-indigo-900 leading-relaxed font-medium italic">
                                    {result?.insight || "Adjust the slider to simulate impact on your tax liability."}
                                </p>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-3">
                            <p className="text-[10px] text-amber-700 leading-relaxed text-center">
                                This is a simulation based on your current income and expense patterns. Actual savings may vary.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 pb-4">
                        <button onClick={onClose}
                            className="w-full bg-gray-900 text-white font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-800 transition-all">
                            Done
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════════════════ */
/* ─── INVEST MODAL ─── */
/* ══════════════════════════════════════════════════════ */
const InvestModal = ({ isOpen, onClose, rec, setActiveTab }) => {
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen || !rec) return null;

    const handleRedirect = () => {
        const sec = rec.sectionKey || '';
        if (['80D_self', '80D_parents', '24b', 'HRA', 'LTA'].includes(sec)) {
            setActiveTab('expenses');
        } else {
            setActiveTab('investments');
        }
        onClose();
    };

    const getGuidance = () => {
        const sec = rec.sectionKey;
        if (sec === '80C') return {
            title: 'Section 80C Expert Guide',
            desc: 'You can claim up to ₹1,50,000 per financial year by investing in highly regulated, tax-saving instruments.',
            bullets: ['PPF (Long term, safe)', 'ELSS Mutual Funds (Best for growth)', 'Tax-Saver 5Y Fixed Deposits', 'Life Insurance Premiums']
        };
        if (sec === '80CCD_1B') return {
            title: 'NPS Retirement Planning',
            desc: 'An additional exclusive deduction of ₹50,000 above the 80C limit for retirement.',
            bullets: ['Low cost management', 'Tier I Account mandatory', 'Equity & Debt asset allocation']
        };
        if (sec === '80D_self' || sec === '80D_parents') return {
            title: 'Health Insurance Optimization',
            desc: 'Deductions on medical insurance premiums for self and family.',
            bullets: ['Up to ₹25k for self/family', 'Additional ₹25k-50k for parents', 'Includes Preventive checkups']
        };
        return {
            title: 'Optimization Strategy',
            desc: rec.description || 'Actionable steps to reduce your tax burden in this category.',
            bullets: ['Verify eligibility criteria', 'Keep digital proofs ready', 'Log records in Ledger immediately']
        };
    };

    const guide = getGuidance();
    const remaining = rec.actionDetails?.maxInvestable || rec.maxInvestable || 0;
    const limit = rec.maxLimit || 150000;
    const progress = Math.max(0, Math.min(100, (1 - (remaining / limit)) * 100));

    return (
        <div className="fixed inset-0 z-[9999]" style={{ isolation: 'isolate' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="absolute inset-0 flex items-center justify-center p-4 min-h-full pointer-events-none">
                <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
                    className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 overflow-hidden pointer-events-auto"
                    onClick={e => e.stopPropagation()}>
                    
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-50 rounded-lg"><Lightbulb size={16} className="text-blue-600" /></div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">Expert Guidance</h3>
                                <p className="text-[10px] text-gray-500">Sec {rec.sectionKey}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-all"><X size={16} /></button>
                    </div>

                    <div className="p-5 space-y-4">
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Current Progress</span>
                                <span className="text-xs font-bold text-blue-600">{fmt(limit - remaining)} / {fmt(limit)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-blue-600 rounded-full" />
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-gray-900 mb-1">{guide.title}</h4>
                            <p className="text-xs text-gray-500 leading-relaxed">{guide.desc}</p>
                        </div>

                        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                            <p className="text-[10px] font-bold text-blue-700 uppercase mb-2 tracking-wider">Top Strategies</p>
                            <ul className="space-y-2">
                                {guide.bullets.map((b, i) => (
                                    <li key={i} className="text-[11px] text-gray-700 flex gap-2">
                                        <TrendingUp size={12} className="text-blue-500 mt-0.5 flex-shrink-0" /> {b}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-amber-50 rounded-lg p-3 flex gap-2 border border-amber-100">
                            <Info size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] text-amber-800 leading-tight">Log your transactions in the Ledger dashboard to automatically track and applying savings.</p>
                        </div>

                        <button onClick={handleRedirect}
                            className="w-full bg-gray-900 text-white font-bold text-sm py-3 rounded-xl hover:bg-black transition-all shadow-md flex items-center justify-center gap-2">
                            Go to Tracker <ArrowRight size={14} />
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════════════════ */
/* ─── MAIN COMPONENT ─── */
/* ══════════════════════════════════════════════════════ */
const TaxAdvisorView = ({ setActiveTab }) => {
    const { refreshData, data: globalData } = useFinancial();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [simRec, setSimRec] = useState(null);
    const [simOpen, setSimOpen] = useState(false);
    const [investRec, setInvestRec] = useState(null);
    const [investOpen, setInvestOpen] = useState(false);

    const fetch = useCallback(async () => {
        setLoading(true); setError('');
        try { const r = await api.get('/api/tax/full-analysis'); setData(r.data); }
        catch (e) { setError(e.response?.data?.message || 'Failed to load tax analysis'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetch(); }, [fetch, globalData]);

    /* ── Loading Skeleton ── */
    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-100 rounded-xl" />
                    <div className="space-y-2"><div className="h-5 w-44 bg-gray-200 rounded" /><div className="h-3 w-20 bg-gray-200 rounded" /></div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="relative overflow-hidden bg-gray-100 rounded-2xl p-5" style={{ minHeight: 90 }}>
                            <div className="space-y-2.5"><div className="h-2.5 w-16 bg-gray-200 rounded" /><div className="h-5 w-24 bg-gray-200 rounded" /><div className="h-2 w-20 bg-gray-200 rounded" /></div>
                            <div className="absolute inset-0 bg-shimmer animate-shimmer" />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[1, 2].map(i => (
                        <div key={i} className="relative overflow-hidden bg-white rounded-2xl border border-gray-100/80 p-5">
                            <div className="space-y-3"><div className="h-4 w-36 bg-gray-200 rounded" /><div className="h-6 w-28 bg-gray-200 rounded" /><div className="h-3 w-40 bg-gray-200 rounded" /></div>
                            <div className="absolute inset-0 bg-shimmer animate-shimmer" />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {[1, 2].map(i => (
                        <div key={i} className={`relative overflow-hidden ${CARD} p-5`}>
                            <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
                            <div className="flex justify-center"><div className="w-28 h-28 bg-gray-200 rounded-full" /></div>
                            <div className="absolute inset-0 bg-shimmer animate-shimmer" />
                        </div>
                    ))}
                </div>
                <div className="space-y-3">
                    <div className="h-5 w-40 bg-gray-200 rounded" />
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className={`relative overflow-hidden ${CARD} p-4`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 space-y-2"><div className="flex gap-2"><div className="h-4 w-16 bg-gray-200 rounded-full" /><div className="h-4 w-14 bg-gray-200 rounded-full" /></div><div className="h-3.5 w-3/5 bg-gray-200 rounded" /><div className="h-2.5 w-4/5 bg-gray-200 rounded" /></div>
                                <div className="space-y-1"><div className="h-5 w-20 bg-gray-200 rounded" /><div className="h-2 w-12 bg-gray-200 rounded ml-auto" /></div>
                            </div>
                            <div className="absolute inset-0 bg-shimmer animate-shimmer" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    /* ── Error ── */
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
                <AlertTriangle className="text-red-500 w-12 h-12" />
                <p className="text-red-600 font-medium">{error}</p>
                <button onClick={fetch} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm">Retry</button>
            </div>
        );
    }

    if (!data) return null;

    const ai = data.aiInsights || {};
    const regimeData = [
        { name: 'Old Regime', value: data.taxLiability.oldRegime.total, fill: CHART_COLORS[0] },
        { name: 'New Regime', value: data.taxLiability.newRegime.total, fill: CHART_COLORS[2] },
    ];
    const incomeChartData = (data.income.breakdown || []).map((item, i) => ({
        name: item.category, value: item.amount, fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
    const savingsComparison = [
        { name: 'Current Tax', value: Math.min(data.taxLiability.oldRegime.total, data.taxLiability.newRegime.total) },
        { name: 'After Optimization', value: Math.max(0, Math.min(data.taxLiability.oldRegime.total, data.taxLiability.newRegime.total) - data.totalPotentialSaving) },
    ];
    const highCount = data.recommendations.filter(r => r.priority === 'high').length;
    const patternCount = (data.patternInsights || []).length;

    return (
        <div className="space-y-6 md:space-y-8">
            {/* ── Header ── */}
            <motion.div variants={cardVariants} initial="hidden" animate="visible">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-50 rounded-xl"><Shield className="w-5 h-5 text-teal-600" /></div>
                        <div>
                            <h2 className={SECTION_TITLE}>Tax Optimizer</h2>
                            <p className="text-xs text-gray-500">{data.fyLabel}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {highCount > 0 && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />{highCount} High Priority
                            </span>
                        )}
                        <button onClick={fetch} className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all" title="Refresh"><RefreshCw size={16} /></button>
                    </div>
                </div>
            </motion.div>

            {/* ── Summary Cards ── */}
            <motion.div variants={cardVariants} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {[
                    { label: 'Annual Income', value: fmt(data.income.total), sub: `${data.income.sourceCount} source(s) · ${formatCurrencyCompact(data.income.monthly)}/mo`, color: 'text-blue-700', bg: 'bg-blue-50/80', icon: <DollarSign size={14} /> },
                    { label: 'Annual Expenses', value: fmt(data.expenses.total), sub: `${data.expenses.categoryCount} categories`, color: 'text-rose-700', bg: 'bg-rose-50/80', icon: <ArrowDownRight size={14} /> },
                    { label: 'Tax Investments', value: fmt(data.investments.total), sub: `${data.investments.count} instrument(s)`, color: 'text-emerald-700', bg: 'bg-emerald-50/80', icon: <Target size={14} /> },
                    { label: 'Savings Rate', value: `${data.savingsRate}%`, sub: data.savingsRate >= 30 ? 'Healthy' : data.savingsRate >= 15 ? 'Room to improve' : 'Needs attention', color: data.savingsRate >= 30 ? 'text-emerald-700' : data.savingsRate >= 15 ? 'text-amber-700' : 'text-red-700', bg: data.savingsRate >= 30 ? 'bg-emerald-50/80' : data.savingsRate >= 15 ? 'bg-amber-50/80' : 'bg-red-50/80', icon: <PiggyBank size={14} /> },
                ].map(card => (
                    <div key={card.label} className={`p-4 md:p-5 rounded-2xl shadow-sm ${card.bg} border border-gray-100/80`}>
                        <div className={`flex items-center gap-1.5 mb-1.5 ${card.color} opacity-70`}>
                            {card.icon}
                            <p className="text-[10px] font-bold uppercase tracking-wider">{card.label}</p>
                        </div>
                        <p className={`text-lg md:text-xl font-bold ${card.color}`}>{card.value}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{card.sub}</p>
                    </div>
                ))}
            </motion.div>

            {/* ── Tax Liability + Potential Savings ── */}
            <motion.div variants={cardVariants} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className={`${CARD} p-5`}>
                    <div className="flex items-center gap-2 mb-3">
                        <Calculator size={14} className="text-amber-500" />
                        <h3 className="text-sm font-bold text-gray-900">Estimated Tax Liability</h3>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{fmt(Math.min(data.taxLiability.oldRegime.total, data.taxLiability.newRegime.total))}</p>
                    <p className="text-xs text-gray-500 mt-1">
                        Under {data.taxLiability.recommendedRegime}
                        {data.taxLiability.savingByChoosingRecommended > 0 && ` (saves ${fmt(data.taxLiability.savingByChoosingRecommended)} vs other)`}
                    </p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-bl-full -mr-4 -mt-4" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3 opacity-80">
                            <Sparkles size={14} /><h3 className="text-sm font-bold">Potential Additional Savings</h3>
                        </div>
                        <p className="text-2xl font-black">{fmt(data.totalPotentialSaving)}</p>
                        <p className="text-[10px] text-white/70 font-semibold mt-1">{data.recommendations.length} recommendation(s)</p>
                    </div>
                </div>
            </motion.div>

            {/* ── Score + Deductions ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <motion.div variants={cardVariants} initial="hidden" animate="visible" className={`${CARD} p-5`}>
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Zap size={14} className="text-teal-500" /> Optimization Score
                    </h3>
                    <ScoreGauge score={data.optimizationScore} />
                    <p className="text-center text-xs text-gray-500 mt-2">
                        {data.optimizationScore >= 70 ? '🎉 Excellent optimization!' : data.optimizationScore >= 40 ? '💡 Room to optimize further.' : '🚀 Significant savings available!'}
                    </p>
                    <div className="mt-3 bg-gray-50/80 rounded-xl p-2.5 text-center">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Deductions Used</p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">{fmt(data.deductions.total)} / {fmt(data.deductions.totalPossible)}</p>
                    </div>
                </motion.div>

                <motion.div variants={cardVariants} initial="hidden" animate="visible" className={`${CARD} p-5`}>
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Target size={14} className="text-amber-500" /> Deduction Utilization
                    </h3>
                    {data.deductions.sections.length > 0 ? (
                        <div className="space-y-0.5">
                            {data.deductions.sections.map(s => <UtilizationBar key={s.sectionKey} section={s.section} claimed={s.claimed} limit={s.limit} percentage={s.percentage} />)}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-8">No deduction data available yet.</p>
                    )}
                </motion.div>
            </div>

            {/* ── Income Breakdown + Regime Comparison ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {incomeChartData.length > 0 && (
                    <motion.div variants={cardVariants} initial="hidden" animate="visible" className={`${CARD} p-5`}>
                        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <BarChart3 size={14} className="text-indigo-500" /> Income Breakdown
                        </h3>
                        <div className="h-[180px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={incomeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={68} innerRadius={42} paddingAngle={2}>
                                        {incomeChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                    </Pie>
                                    <Tooltip {...COMMON_TOOLTIP_PROPS} formatter={v => fmt(v)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 mt-2">
                            {(data.income.breakdown || []).slice(0, 4).map((item, i) => (
                                <div key={item.category} className="flex items-center gap-1.5 text-xs">
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                    <span className="text-gray-600 truncate">{item.category}</span>
                                    <span className="text-gray-400 ml-auto">{item.percentage}%</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                <motion.div variants={cardVariants} initial="hidden" animate="visible" className={`${CARD} p-5`}>
                    <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
                        <Shield size={14} className="text-blue-500" /> Regime Comparison
                    </h3>
                    <p className="text-xs text-gray-400 mb-3">
                        Recommended: <span className="font-bold text-teal-600">{data.taxLiability.recommendedRegime}</span>
                        {data.taxLiability.savingByChoosingRecommended > 0 && <span className="ml-1">(saves {fmt(data.taxLiability.savingByChoosingRecommended)})</span>}
                    </p>
                    <div className="h-[160px] mb-3">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={regimeData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                <XAxis dataKey="name" {...COMMON_AXIS_PROPS} />
                                <YAxis {...COMMON_AXIS_PROPS} tickFormatter={formatCurrencyCompact} />
                                <Tooltip {...COMMON_TOOLTIP_PROPS} formatter={v => fmt(v)} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Tax Liability">
                                    {regimeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                        {[
                            { label: 'Old Regime', d: data.taxLiability.oldRegime, rec: data.taxLiability.recommendedRegime === 'Old Regime' },
                            { label: 'New Regime', d: data.taxLiability.newRegime, rec: data.taxLiability.recommendedRegime === 'New Regime' },
                        ].map(r => (
                            <div key={r.label} className={`rounded-xl p-2.5 border ${r.rec ? 'bg-teal-50/60 border-teal-200' : 'bg-gray-50/80 border-gray-100'}`}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-gray-800">{r.label}</span>
                                    {r.rec && <span className="text-[9px] font-bold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><CheckCircle2 size={9} /> Best</span>}
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div><p className="text-gray-400 font-semibold">Taxable</p><p className="font-bold text-gray-800">{fmt(r.d.taxableIncome)}</p></div>
                                    <div><p className="text-gray-400 font-semibold">Tax</p><p className="font-bold text-gray-800">{fmt(r.d.tax)}</p></div>
                                    <div><p className="text-gray-400 font-semibold">Total</p><p className="font-bold text-gray-800">{fmt(r.d.total)}</p></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* ── Pattern Insights ── */}
            {patternCount > 0 && (
                <motion.div variants={cardVariants} initial="hidden" animate="visible">
                    <div className="bg-violet-50/60 rounded-2xl p-5 border border-violet-100">
                        <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
                            <Lightbulb size={14} className="text-violet-500" /> Detected Opportunities
                        </h3>
                        <p className="text-xs text-gray-500 mb-3">{patternCount} optimization(s) from your spending</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {data.patternInsights.map(p => (
                                <div key={p.id} className="bg-white rounded-xl p-3.5 border border-violet-100/60 shadow-sm">
                                    <div className="flex items-start gap-2.5">
                                        <div className="p-1.5 bg-violet-100 rounded-lg flex-shrink-0">
                                            {p.section === '80D_self' && <Heart size={13} className="text-violet-600" />}
                                            {p.section === '80E' && <GraduationCap size={13} className="text-violet-600" />}
                                            {p.section === '24b' && <Home size={13} className="text-violet-600" />}
                                            {p.section === '80CCD_1B' && <PiggyBank size={13} className="text-violet-600" />}
                                            {!['80D_self', '80E', '24b', '80CCD_1B'].includes(p.section) && <Lightbulb size={13} className="text-violet-600" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs font-bold text-gray-900">{p.title}</h4>
                                            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{p.description}</p>
                                            {p.triggerAmount > 0 && <p className="text-[11px] text-violet-600 font-semibold mt-1">Related: {fmt(p.triggerAmount)}</p>}
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{p.sectionName}</span>
                                                <span className="text-xs font-bold text-emerald-600">Save {fmt(p.estimatedTaxSaving)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ── AI Insights ── */}
            {ai.overallAssessment && (
                <motion.div variants={cardVariants} initial="hidden" animate="visible" className={`${CARD} p-5`}>
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Sparkles size={14} className="text-violet-500" /> AI-Powered Tax Insights
                    </h3>

                    <div className="bg-violet-50/60 rounded-xl p-3.5 mb-3 border border-violet-100">
                        <p className="text-xs text-gray-700 leading-relaxed">{ai.overallAssessment}</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
                        {ai.strengths?.length > 0 && (
                            <div className="bg-emerald-50/50 rounded-xl p-3.5 border border-emerald-100">
                                <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest mb-1.5 flex items-center gap-1"><CheckCircle2 size={10} /> What You're Doing Well</p>
                                <ul className="space-y-1">{ai.strengths.map((s, i) => <li key={i} className="text-xs text-emerald-800 leading-relaxed flex gap-1.5"><span className="text-emerald-500 mt-0.5">•</span>{s}</li>)}</ul>
                            </div>
                        )}
                        {ai.improvements?.length > 0 && (
                            <div className="bg-amber-50/50 rounded-xl p-3.5 border border-amber-100">
                                <p className="text-[9px] font-bold text-amber-700 uppercase tracking-widest mb-1.5 flex items-center gap-1"><ArrowUpRight size={10} /> Areas to Improve</p>
                                <ul className="space-y-1">{ai.improvements.map((s, i) => <li key={i} className="text-xs text-amber-800 leading-relaxed flex gap-1.5"><span className="text-amber-500 mt-0.5">•</span>{s}</li>)}</ul>
                            </div>
                        )}
                    </div>

                    {(ai.incomeInsights || ai.expenseInsights) && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
                            {ai.incomeInsights && (
                                <div className="bg-blue-50/50 rounded-xl p-3.5 border border-blue-100">
                                    <p className="text-[9px] font-bold text-blue-700 uppercase tracking-widest mb-1 flex items-center gap-1"><DollarSign size={10} /> Income Analysis</p>
                                    <p className="text-xs text-blue-800 leading-relaxed">{ai.incomeInsights}</p>
                                </div>
                            )}
                            {ai.expenseInsights && (
                                <div className="bg-rose-50/50 rounded-xl p-3.5 border border-rose-100">
                                    <p className="text-[9px] font-bold text-rose-700 uppercase tracking-widest mb-1 flex items-center gap-1"><ArrowDownRight size={10} /> Expense Analysis</p>
                                    <p className="text-xs text-rose-800 leading-relaxed">{ai.expenseInsights}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {ai.regimeAdvice && (
                        <div className="bg-teal-50/50 rounded-xl p-3.5 mb-3 border border-teal-100">
                            <p className="text-[9px] font-bold text-teal-700 uppercase tracking-widest mb-1 flex items-center gap-1"><Shield size={10} /> Regime Recommendation</p>
                            <p className="text-xs text-teal-800 leading-relaxed">{ai.regimeAdvice}</p>
                        </div>
                    )}

                    {ai.actionItems?.length > 0 && (
                        <div>
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1"><Zap size={10} /> Recommended Actions</p>
                            <div className="space-y-2">{ai.actionItems.map((item, i) => <ActionItemCard key={i} item={item} index={i} />)}</div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* ── Savings Projection ── */}
            <motion.div variants={cardVariants} initial="hidden" animate="visible"
                className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-bl-full -mr-10 -mt-10" />
                <div className="relative z-10">
                    <h3 className="text-sm font-bold mb-0.5 flex items-center gap-1.5"><Sparkles size={14} /> Savings Projection</h3>
                    <p className="text-[10px] text-white/60 font-semibold mb-4">If all recommendations are followed</p>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-white/60 mb-0.5">Current</p>
                            <p className="text-lg font-black">{fmt(savingsComparison[0].value)}</p>
                        </div>
                        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-white/60 mb-0.5">After</p>
                            <p className="text-lg font-black">{fmt(savingsComparison[1].value)}</p>
                        </div>
                        <div className="bg-white/25 backdrop-blur-sm rounded-xl p-3 text-center ring-1 ring-white/30">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-white/80 mb-0.5">You Save</p>
                            <p className="text-lg font-black">{fmt(data.totalPotentialSaving)}</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── Recommendations ── */}
            <motion.div variants={cardVariants} initial="hidden" animate="visible">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-500" /> Recommendations
                    </h3>
                    <div className="flex items-center gap-1.5">
                        {highCount > 0 && <span className="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">{highCount} high</span>}
                        <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{data.recommendations.length} total</span>
                    </div>
                </div>
                {data.recommendations.length > 0 ? (
                    <div className="space-y-2.5">
                        {data.recommendations.map((rec, i) => (
                            <RecommendationCard key={`${rec.sectionKey}-${rec.instrument}-${i}`} rec={rec} index={i}
                                onInvestNow={(r) => { setInvestRec(r || rec); setInvestOpen(true); }}
                                onSimulate={r => { setSimRec(r); setSimOpen(true); }} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-emerald-50/60 rounded-2xl p-8 text-center border border-emerald-100">
                        <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
                        <p className="text-sm font-semibold text-emerald-800">All deduction limits maximized!</p>
                        <p className="text-xs text-emerald-600 mt-0.5">Your tax planning looks great.</p>
                    </div>
                )}
            </motion.div>

            {/* ── Disclaimer ── */}
            <motion.div variants={cardVariants} initial="hidden" animate="visible"
                className="bg-amber-50/50 rounded-xl p-3 border border-amber-100 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <AlertCircle size={12} className="text-amber-500" />
                    <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">Disclaimer</p>
                </div>
                <p className="text-[10px] text-amber-600 leading-relaxed">
                    Indicative analysis based on recorded data. Consult a qualified CA for accurate filing. Rules subject to change.
                </p>
            </motion.div>

            <SimulatorModal isOpen={simOpen} onClose={() => setSimOpen(false)} rec={simRec}
                baseTax={data ? Math.min(data.taxLiability?.oldRegime?.total || 0, data.taxLiability?.newRegime?.total || 0) : 0} />

            <InvestModal isOpen={investOpen} onClose={() => setInvestOpen(false)} rec={investRec} setActiveTab={setActiveTab} />
        </div>
    );
};

export default TaxAdvisorView;
