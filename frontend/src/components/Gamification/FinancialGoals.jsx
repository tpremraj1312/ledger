import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, X, Trash2, TrendingDown, TrendingUp, PiggyBank, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

const TYPE_CONFIG = {
    expense_limit: {
        label: 'Expense Limit',
        icon: TrendingDown,
        color: 'rose',
        bgColor: 'bg-rose-50',
        textColor: 'text-rose-600',
        borderColor: 'border-rose-200',
        barColor: 'bg-rose-500',
        desc: 'Stay under a spending limit',
    },
    income_target: {
        label: 'Income Target',
        icon: TrendingUp,
        color: 'emerald',
        bgColor: 'bg-emerald-50',
        textColor: 'text-emerald-600',
        borderColor: 'border-emerald-200',
        barColor: 'bg-emerald-500',
        desc: 'Reach an income goal',
    },
    savings_target: {
        label: 'Savings Target',
        icon: PiggyBank,
        color: 'indigo',
        bgColor: 'bg-indigo-50',
        textColor: 'text-indigo-600',
        borderColor: 'border-indigo-200',
        barColor: 'bg-indigo-500',
        desc: 'Build your savings',
    },
};

const formatCurrency = (amt) => `₹${(amt || 0).toLocaleString('en-IN')}`;

const GoalCard = ({ goal, onDelete }) => {
    const cfg = TYPE_CONFIG[goal.type] || TYPE_CONFIG.expense_limit;
    const Icon = cfg.icon;
    const isCompleted = goal.status === 'completed';
    const isFailed = goal.status === 'failed';

    let progress;
    if (goal.type === 'expense_limit') {
        // For expense limits: lower is better. Show how much of the limit is used.
        progress = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
    } else {
        progress = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
    }

    const daysLeft = Math.max(0, Math.ceil((new Date(goal.endDate) - new Date()) / (1000 * 60 * 60 * 24)));

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-5 rounded-xl border ${isCompleted ? 'bg-emerald-50/40 border-emerald-200' : isFailed ? 'bg-red-50/40 border-red-200' : 'bg-white border-gray-100'} shadow-sm`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${cfg.bgColor}`}>
                        <Icon size={18} className={cfg.textColor} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-900">{goal.title}</h4>
                        <span className={`text-xs font-medium ${cfg.textColor} ${cfg.bgColor} px-2 py-0.5 rounded-full`}>
                            {cfg.label}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isCompleted && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={12} /> Done
                        </span>
                    )}
                    {isFailed && (
                        <span className="text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <AlertTriangle size={12} /> Missed
                        </span>
                    )}
                    {!isCompleted && !isFailed && (
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                            {daysLeft}d left
                        </span>
                    )}
                    <button
                        onClick={() => onDelete(goal._id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <div className="mb-2">
                <div className="flex justify-between text-xs font-medium text-gray-500 mb-1.5">
                    <span>{goal.type === 'expense_limit' ? 'Spent' : 'Reached'}</span>
                    <span>{formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                        className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : isFailed ? 'bg-red-400' : goal.type === 'expense_limit' && progress > 85 ? 'bg-amber-500' : cfg.barColor}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                </div>
            </div>

            {goal.type === 'expense_limit' && !isCompleted && !isFailed && (
                <p className="text-xs text-gray-500 mt-1">
                    {formatCurrency(Math.max(0, goal.targetAmount - goal.currentAmount))} remaining budget
                </p>
            )}
        </motion.div>
    );
};

const FinancialGoals = ({ goals = [], onCreate, onDelete }) => {
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        title: '',
        type: 'expense_limit',
        targetAmount: '',
        period: 'monthly',
        startDate: new Date().toISOString().split('T')[0],
        endDate: (() => {
            const d = new Date();
            d.setMonth(d.getMonth() + 1);
            return d.toISOString().split('T')[0];
        })(),
    });

    const activeGoals = goals.filter(g => g.status === 'active');
    const completedGoals = goals.filter(g => g.status === 'completed' || g.status === 'failed');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await onCreate({ ...form, targetAmount: Number(form.targetAmount) });
        setForm(prev => ({ ...prev, title: '', targetAmount: '' }));
        setShowForm(false);
        setSubmitting(false);
    };

    return (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 rounded-xl">
                        <Target className="text-indigo-600" size={20} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Financial Goals</h3>
                        <p className="text-sm text-gray-500">Track your financial targets</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition shadow-sm"
                >
                    {showForm ? <X size={16} /> : <Plus size={16} />}
                    {showForm ? 'Cancel' : 'New Goal'}
                </button>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleSubmit}
                        className="mb-6 bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-4"
                    >
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Goal Name</label>
                            <input
                                value={form.title}
                                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                                placeholder="e.g., Reduce monthly spending"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                                <select
                                    value={form.type}
                                    onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                                >
                                    <option value="expense_limit">Expense Limit</option>
                                    <option value="income_target">Income Target</option>
                                    <option value="savings_target">Savings Target</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Amount (₹)</label>
                                <input
                                    type="number"
                                    value={form.targetAmount}
                                    onChange={e => setForm(p => ({ ...p, targetAmount: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                                    placeholder="20000"
                                    required
                                    min="1"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
                                <input
                                    type="date"
                                    value={form.startDate}
                                    onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
                                <input
                                    type="date"
                                    value={form.endDate}
                                    onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-indigo-200/50"
                        >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} />}
                            {submitting ? 'Creating...' : 'Create Goal'}
                        </button>
                    </motion.form>
                )}
            </AnimatePresence>

            {activeGoals.length > 0 ? (
                <div className="space-y-3 mb-6">
                    <AnimatePresence>
                        {activeGoals.map(goal => (
                            <GoalCard key={goal._id} goal={goal} onDelete={onDelete} />
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                !showForm && (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl mb-6">
                        <Target size={40} className="mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500 font-medium mb-1">No active goals</p>
                        <p className="text-sm text-gray-400">Set a financial target to start tracking</p>
                    </div>
                )
            )}

            {completedGoals.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Past Goals</h4>
                    <div className="space-y-2">
                        {completedGoals.slice(0, 5).map(goal => (
                            <GoalCard key={goal._id} goal={goal} onDelete={onDelete} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinancialGoals;
