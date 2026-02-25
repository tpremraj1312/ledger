import React from 'react';
import { Heart, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';

const METRIC_CONFIG = [
    { key: 'savingsRate', label: 'Savings Rate', max: 25, color: 'emerald' },
    { key: 'budgetAdherence', label: 'Budget Adherence', max: 25, color: 'blue' },
    { key: 'overspendingFrequency', label: 'Spending Control', max: 20, color: 'purple' },
    { key: 'expenseDistribution', label: 'Expense Balance', max: 15, color: 'amber' },
    { key: 'consistency', label: 'Consistency', max: 15, color: 'indigo' },
];

const LABEL_COLORS = {
    Excellent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Good: 'bg-blue-50 text-blue-700 border-blue-200',
    Average: 'bg-amber-50 text-amber-700 border-amber-200',
    Poor: 'bg-red-50 text-red-700 border-red-200',
};

const WellnessMeter = ({ wellness }) => {
    if (!wellness) return null;

    const { score = 50, label = 'Average', metrics = {}, tips = [] } = wellness;

    const circumference = 2 * Math.PI * 60;
    const offset = circumference - (score / 100) * circumference;
    const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444';

    return (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-emerald-100 rounded-xl">
                    <Heart className="text-emerald-600" size={20} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-900">Financial Wellness Score</h3>
                    <p className="text-sm text-gray-500">Monthly financial health snapshot</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-10 md:gap-12 mb-10">
                {/* Circular Progress */}
                <div className="relative w-40 h-40 md:w-48 md:h-48 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                        <circle cx="70" cy="70" r="60" stroke="#f3f4f6" strokeWidth="12" fill="none" />
                        <motion.circle
                            cx="70" cy="70" r="60"
                            stroke={scoreColor}
                            strokeWidth="12"
                            fill="none"
                            strokeLinecap="round"
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: offset }}
                            transition={{ duration: 1.4, ease: 'easeOut' }}
                            strokeDasharray={circumference}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-5xl md:text-6xl font-black text-gray-900">{score}</span>
                        <span className={`mt-1 px-4 py-1 text-xs md:text-sm font-semibold rounded-full border ${LABEL_COLORS[label] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {label}
                        </span>
                    </div>
                </div>

                {/* Metrics */}
                <div className="flex-1 w-full space-y-4">
                    {METRIC_CONFIG.map(m => {
                        const val = metrics[m.key] || 0;
                        const pct = Math.min(100, (val / m.max) * 100);
                        return (
                            <div key={m.key}>
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-sm font-medium text-gray-700">{m.label}</span>
                                    <span className="text-sm font-semibold text-gray-600">{val}/{m.max}</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div
                                        className={`h-full bg-${m.color}-500 rounded-full`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 1, delay: 0.2 + METRIC_CONFIG.indexOf(m) * 0.15 }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {tips?.length > 0 && (
                <div className="bg-emerald-50/60 rounded-2xl p-5 border border-emerald-100">
                    <div className="flex items-center gap-2.5 mb-3">
                        <Lightbulb size={18} className="text-emerald-600" />
                        <h4 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider">Improvement Tips</h4>
                    </div>
                    <ul className="space-y-2.5 text-sm text-emerald-800">
                        {tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2.5">
                                <span className="text-emerald-500 mt-0.5">•</span>
                                <span>{tip}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default WellnessMeter;