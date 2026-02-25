import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Gauge, Plus, X, Copy, Trash2, Save, Loader2, AlertTriangle,
    ChevronLeft, ChevronRight, Target, Wallet, CheckCircle2, Activity
} from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import {
    getFamilyBudgetUsage, upsertFamilyBudget, copyPreviousFamilyBudget
} from '../services/familyService';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const FamilyBudgetView = () => {
    const { group, isAdmin, members, refreshFamilyFinancialData, hasGroup } = useFamily();
    const now = new Date();
    const [month, setMonth] = useState(now.getUTCMonth() + 1);
    const [year, setYear] = useState(now.getUTCFullYear());
    const [budgetData, setBudgetData] = useState(null);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copying, setCopying] = useState(false);
    const [error, setError] = useState('');
    const [newCat, setNewCat] = useState({ name: '', allocatedAmount: '' });
    const [addingCat, setAddingCat] = useState(false);

    const loadBudget = useCallback(async () => {
        if (!hasGroup) return;
        setLoading(true);
        try {
            const data = await getFamilyBudgetUsage(month, year);
            setBudgetData(data);
            setCategories(data.budget?.categories || []);
        } catch (err) {
            console.error(err);
        } finally { setLoading(false); }
    }, [hasGroup, month, year]);

    useEffect(() => { loadBudget(); }, [loadBudget]);

    const handleSave = async () => {
        setSaving(true); setError('');
        try {
            await upsertFamilyBudget({ month, year, categories });
            await loadBudget();
            await refreshFamilyFinancialData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save budget.');
        } finally { setSaving(false); }
    };

    const handleCopyPrev = async () => {
        setCopying(true); setError('');
        try {
            await copyPreviousFamilyBudget(month, year);
            await loadBudget();
        } catch (err) {
            setError(err.response?.data?.message || 'No previous month budget found.');
        } finally { setCopying(false); }
    };

    const addCategory = () => {
        if (!newCat.name.trim() || !newCat.allocatedAmount) return;
        setCategories(prev => [...prev, { name: newCat.name.trim(), allocatedAmount: parseFloat(newCat.allocatedAmount) }]);
        setNewCat({ name: '', allocatedAmount: '' });
        setAddingCat(false);
    };

    const removeCategory = (idx) => {
        setCategories(prev => prev.filter((_, i) => i !== idx));
    };

    const updateCategoryAmount = (idx, amount) => {
        setCategories(prev => prev.map((c, i) => i === idx ? { ...c, allocatedAmount: parseFloat(amount) || 0 } : c));
    };

    const totalAllocated = categories.reduce((s, c) => s + (c.allocatedAmount || 0), 0);
    const totalSpent = (budgetData?.categoryUsage || []).reduce((s, c) => s + c.spent, 0);

    if (!hasGroup) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 text-gray-300">
                    <Gauge size={40} />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Family Group</h3>
                <p className="text-sm text-gray-500 max-w-sm">Create or join a family group to manage shared budgets.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                        <Gauge size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Family Budget</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Allocate and track shared spending limits</p>
                    </div>
                </div>

                {/* Month Selector */}
                <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                    <button
                        onClick={() => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else { setMonth(m => m - 1); } }}
                        className="p-2.5 hover:bg-gray-50 rounded-lg transition-all text-gray-400 hover:text-indigo-600"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <div className="px-6 text-center min-w-[140px]">
                        <span className="text-sm font-semibold text-gray-900">{MONTHS[month - 1]}</span>
                        <span className="text-xs text-indigo-500 font-medium ml-1.5">{year}</span>
                    </div>
                    <button
                        onClick={() => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else { setMonth(m => m + 1); } }}
                        className="p-2.5 hover:bg-gray-50 rounded-lg transition-all text-gray-400 hover:text-indigo-600"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-600">
                    <AlertTriangle size={18} className="shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-32">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Summary Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Budget Summary Card */}
                        <div className="bg-gray-900 rounded-2xl p-8 text-white shadow-lg">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Total Budget</p>
                            <h2 className="text-3xl font-bold mb-1">{formatCurrency(totalAllocated)}</h2>
                            <div className="flex justify-between items-center mt-6 text-sm">
                                <div>
                                    <p className="text-xs text-gray-400 mb-0.5">Spent</p>
                                    <p className="font-semibold">{formatCurrency(totalSpent)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400 mb-0.5">Usage</p>
                                    <p className={`font-semibold ${totalSpent > totalAllocated ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {totalAllocated > 0 ? ((totalSpent / totalAllocated) * 100).toFixed(1) : 0}%
                                    </p>
                                </div>
                            </div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-4">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min((totalSpent / (totalAllocated || 1)) * 100, 100)}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className={`h-full rounded-full ${totalSpent > totalAllocated ? 'bg-red-500' : 'bg-indigo-500'}`}
                                />
                            </div>
                        </div>

                        {/* Member Breakdown */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <h3 className="text-sm font-semibold text-gray-900 mb-5 flex items-center gap-2">
                                <Target size={16} className="text-indigo-500" />
                                Member Spending
                            </h3>
                            <div className="space-y-5">
                                {budgetData?.memberBreakdown?.length > 0 ? budgetData.memberBreakdown.map((m, i) => (
                                    <div key={i}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center text-xs font-bold">
                                                {(m.name || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-medium text-gray-800">{m.name}</span>
                                                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(m.totalSpent)}</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${(m.totalSpent / (totalSpent || 1)) * 100}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-sm text-gray-400 text-center py-4">No spending activity yet</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Categories Area */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                    <Wallet size={16} className="text-indigo-500" />
                                    Budget Categories
                                </h3>
                                {isAdmin && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCopyPrev}
                                            disabled={copying}
                                            className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                                        >
                                            <Copy size={14} className={copying ? 'animate-pulse' : ''} />
                                            {copying ? 'Copying...' : 'Copy Previous'}
                                        </button>
                                        <button
                                            onClick={() => setAddingCat(true)}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-all"
                                        >
                                            <Plus size={14} />
                                            Add Category
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <AnimatePresence mode="popLayout">
                                    {addingCat && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex flex-wrap gap-3 items-end"
                                        >
                                            <div className="flex-1 min-w-[200px]">
                                                <label className="text-xs font-medium text-indigo-600 mb-1.5 block">Category Name</label>
                                                <input type="text" value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })}
                                                    className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-200 outline-none" placeholder="e.g., Groceries" />
                                            </div>
                                            <div className="w-40">
                                                <label className="text-xs font-medium text-indigo-600 mb-1.5 block">Amount (₹)</label>
                                                <input type="number" value={newCat.allocatedAmount} onChange={e => setNewCat({ ...newCat, allocatedAmount: e.target.value })}
                                                    className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-200 outline-none" placeholder="0.00" />
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={addCategory} className="p-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"><CheckCircle2 size={18} /></button>
                                                <button onClick={() => setAddingCat(false)} className="p-2.5 bg-white text-gray-400 border border-indigo-200 rounded-lg hover:text-red-500 transition-all"><X size={18} /></button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {categories.length === 0 && !addingCat ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-center">
                                            <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center mb-4 text-gray-300">
                                                <Wallet size={32} />
                                            </div>
                                            <h4 className="text-lg font-semibold text-gray-800">No Categories Set</h4>
                                            <p className="text-sm text-gray-500 mt-1">Add budget categories for {MONTHS[month - 1]}</p>
                                        </div>
                                    ) : (
                                        categories.map((cat, idx) => {
                                            const usage = (budgetData?.categoryUsage || []).find(u => u.name === cat.name);
                                            const spent = usage?.spent || 0;
                                            const progress = cat.allocatedAmount > 0 ? (spent / cat.allocatedAmount) * 100 : 0;

                                            return (
                                                <motion.div
                                                    key={cat.name + idx}
                                                    layout
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="p-5 bg-gray-50/50 border border-gray-100 rounded-xl hover:bg-white transition-all"
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-sm font-bold text-indigo-500">
                                                                {cat.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-semibold text-gray-900">{cat.name}</h4>
                                                                <p className="text-xs text-gray-500">{formatCurrency(spent)} spent</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {isAdmin ? (
                                                                <>
                                                                    <div className="relative">
                                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
                                                                        <input
                                                                            type="number"
                                                                            value={cat.allocatedAmount}
                                                                            onChange={e => updateCategoryAmount(idx, e.target.value)}
                                                                            className="w-28 pl-7 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-right focus:ring-2 focus:ring-indigo-200 outline-none"
                                                                        />
                                                                    </div>
                                                                    <button onClick={() => removeCategory(idx)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <span className="text-sm font-semibold text-gray-900">{formatCurrency(cat.allocatedAmount)}</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between text-xs text-gray-500">
                                                            <span className="flex items-center gap-1.5"><Activity size={12} /> Usage</span>
                                                            <span className={`font-medium ${progress > 100 ? 'text-red-500' : 'text-gray-700'}`}>
                                                                {progress.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${Math.min(progress, 100)}%` }}
                                                                transition={{ duration: 1, ease: "circOut" }}
                                                                className={`h-full rounded-full ${progress > 100 ? 'bg-red-500' : progress > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                                            />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })
                                    )}
                                </AnimatePresence>
                            </div>

                            {isAdmin && categories.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-gray-100 flex justify-end">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-8 py-3 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        {saving ? 'Saving...' : 'Save Budget'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FamilyBudgetView;
