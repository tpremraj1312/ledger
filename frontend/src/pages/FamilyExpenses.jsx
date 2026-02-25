import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DollarSign, Plus, Edit3, Trash2, X, Filter, Calendar, Loader2,
    TrendingUp, TrendingDown, Clock, AlertCircle, Activity
} from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import {
    getFamilyTransactions, addFamilyTransaction,
    editFamilyTransaction, deleteFamilyTransaction
} from '../services/familyService';

const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const formatDateForInput = (date) => {
    const d = new Date(date || Date.now());
    return d.toISOString().split('T')[0];
};

const FamilyExpenses = () => {
    const { group, isAdmin, isMember, refreshFamilyFinancialData, members, hasGroup } = useFamily();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTx, setEditingTx] = useState(null);
    const [formData, setFormData] = useState({ type: 'debit', amount: '', category: '', date: formatDateForInput(), description: '' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Filters
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        memberId: '',
        category: '',
        type: 'all',
        startDate: '',
        endDate: ''
    });

    const loadTransactions = useCallback(async () => {
        if (!hasGroup) return;
        setLoading(true);
        try {
            const apiFilters = {};
            if (filters.memberId) apiFilters.memberId = filters.memberId;
            if (filters.category) apiFilters.category = filters.category;
            if (filters.type !== 'all') apiFilters.type = filters.type;
            if (filters.startDate) apiFilters.startDate = filters.startDate;
            if (filters.endDate) apiFilters.endDate = filters.endDate;

            const data = await getFamilyTransactions(apiFilters);
            setTransactions(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [hasGroup, filters]);

    useEffect(() => { loadTransactions(); }, [loadTransactions]);

    const stats = useMemo(() => {
        const debit = transactions.filter(t => t.type === 'debit');
        const credit = transactions.filter(t => t.type === 'credit');
        const totalExpense = debit.reduce((s, t) => s + t.amount, 0);
        const totalIncome = credit.reduce((s, t) => s + t.amount, 0);
        return {
            totalExpense,
            totalIncome,
            count: transactions.length,
            avgExpense: debit.length > 0 ? totalExpense / debit.length : 0
        };
    }, [transactions]);

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetFilters = () => {
        setFilters({ memberId: '', category: '', type: 'all', startDate: '', endDate: '' });
    };

    const openAdd = () => {
        setEditingTx(null);
        setFormData({ type: 'debit', amount: '', category: '', date: formatDateForInput(), description: '' });
        setError(''); setModalOpen(true);
    };

    const openEdit = (tx) => {
        setEditingTx(tx);
        setFormData({
            type: tx.type,
            amount: tx.amount,
            category: tx.category,
            date: formatDateForInput(tx.date),
            description: tx.description || ''
        });
        setError(''); setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setError(''); setSubmitting(true);
        try {
            if (editingTx) {
                await editFamilyTransaction(editingTx._id, formData);
            } else {
                await addFamilyTransaction(formData);
            }
            setModalOpen(false);
            await loadTransactions();
            await refreshFamilyFinancialData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save transaction.');
        } finally { setSubmitting(false); }
    };

    const handleDelete = async (txId) => {
        if (!window.confirm('Delete this transaction?')) return;
        try {
            await deleteFamilyTransaction(txId);
            await loadTransactions();
            await refreshFamilyFinancialData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete.');
        }
    };

    const categories = [...new Set(transactions.map(t => t.category))].sort();
    const canEdit = isAdmin || isMember;

    if (!hasGroup) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 text-gray-300">
                    <DollarSign size={40} />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Family Group</h3>
                <p className="text-sm text-gray-500 max-w-sm">Create or join a family group to start tracking shared expenses.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Family Expenses</h1>
                            <p className="text-sm text-gray-500 mt-0.5">Track and manage shared spending</p>
                        </div>
                    </motion.div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-3 rounded-xl border transition-all ${showFilters ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Filter size={18} />
                    </button>
                    {canEdit && (
                        <button onClick={openAdd}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2">
                            <Plus size={18} />
                            Add Expense
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Expenses', value: stats.totalExpense, color: 'text-red-600', bg: 'bg-red-50', icon: TrendingDown },
                    { label: 'Total Income', value: stats.totalIncome, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: TrendingUp },
                    { label: 'Average Expense', value: stats.avgExpense, color: 'text-blue-600', bg: 'bg-blue-50', icon: Activity },
                    { label: 'Transactions', value: stats.count, color: 'text-gray-800', bg: 'bg-gray-50', icon: Clock, isRaw: true }
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                                <stat.icon size={16} />
                            </div>
                            <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                        </div>
                        <p className={`text-xl font-bold ${stat.color}`}>
                            {stat.isRaw ? stat.value : formatCurrency(stat.value)}
                        </p>
                    </motion.div>
                ))}
            </div>

            {/* Filters */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                    >
                        <div className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Member</label>
                                    <select
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-emerald-200 outline-none"
                                        value={filters.memberId}
                                        onChange={e => handleFilterChange('memberId', e.target.value)}
                                    >
                                        <option value="">All Members</option>
                                        {members.map(m => {
                                            const uid = m.user?._id || m.user;
                                            const uname = m.user?.username || 'Member';
                                            return <option key={uid} value={uid}>{uname}</option>;
                                        })}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Category</label>
                                    <select
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-emerald-200 outline-none"
                                        value={filters.category}
                                        onChange={e => handleFilterChange('category', e.target.value)}
                                    >
                                        <option value="">All Categories</option>
                                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-emerald-200 outline-none"
                                        value={filters.startDate}
                                        onChange={e => handleFilterChange('startDate', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-emerald-200 outline-none"
                                        value={filters.endDate}
                                        onChange={e => handleFilterChange('endDate', e.target.value)}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={resetFilters}
                                        className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-medium transition-all"
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Transactions Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center mb-4 text-gray-300">
                            <DollarSign size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800">No Transactions</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-xs">No transactions found for the selected filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    <th className="text-left text-xs font-medium text-gray-500 px-6 py-4">Date</th>
                                    <th className="text-left text-xs font-medium text-gray-500 px-6 py-4">Member</th>
                                    <th className="text-left text-xs font-medium text-gray-500 px-6 py-4">Category</th>
                                    <th className="text-right text-xs font-medium text-gray-500 px-6 py-4">Amount</th>
                                    {canEdit && <th className="text-right text-xs font-medium text-gray-500 px-6 py-4">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {transactions.map((tx) => (
                                    <tr key={tx._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2.5 h-2.5 rounded-full ${tx.type === 'debit' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                                <span className="text-sm font-medium text-gray-900">{formatDate(tx.date)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center text-xs font-bold">
                                                    {(tx.spentBy?.username || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm text-gray-700">{tx.spentBy?.username || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-md">{tx.category}</span>
                                            {tx.description && <p className="text-xs text-gray-400 mt-1 truncate max-w-[150px]">{tx.description}</p>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-sm font-semibold ${tx.type === 'debit' ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {tx.type === 'debit' ? '-' : '+'}{formatCurrency(tx.amount)}
                                            </span>
                                        </td>
                                        {canEdit && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button onClick={() => openEdit(tx)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                                        <Edit3 size={15} />
                                                    </button>
                                                    {isAdmin && (
                                                        <button onClick={() => handleDelete(tx._id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                                            <Trash2 size={15} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
                        onClick={() => setModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {editingTx ? 'Edit Transaction' : 'Add Transaction'}
                                </h3>
                                <button onClick={() => setModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex items-center gap-2 mb-4">
                                    <AlertCircle size={16} className="text-red-500 shrink-0" />
                                    <p className="text-xs text-red-600">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
                                    {['debit', 'credit'].map(t => (
                                        <label key={t} className={`flex-1 flex items-center justify-center py-2.5 rounded-md text-xs font-medium cursor-pointer transition-all
                                            ${formData.type === t
                                                ? (t === 'debit' ? 'bg-white text-red-600 shadow-sm' : 'bg-white text-emerald-600 shadow-sm')
                                                : 'text-gray-500 hover:text-gray-700'}`}>
                                            <input type="radio" name="type" value={t} checked={formData.type === t}
                                                onChange={e => setFormData({ ...formData, type: e.target.value })} className="hidden" />
                                            {t === 'debit' ? 'Expense' : 'Income'}
                                        </label>
                                    ))}
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                                        <input type="number" step="0.01" min="0.01" required value={formData.amount}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                            className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 outline-none"
                                            placeholder="0.00" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Category</label>
                                    <input type="text" required value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 outline-none"
                                        placeholder="e.g., Groceries" />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Date</label>
                                    <input type="date" required value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 outline-none" />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Description (optional)</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 outline-none h-20 resize-none"
                                        placeholder="Add a note..."
                                    />
                                </div>

                                <button type="submit" disabled={submitting}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
                                    {submitting ? 'Saving...' : editingTx ? 'Update Transaction' : 'Add Transaction'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FamilyExpenses;
