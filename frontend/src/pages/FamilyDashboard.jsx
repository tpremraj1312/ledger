import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Users, DollarSign, TrendingUp, TrendingDown, PieChart as PieIcon, Activity,
    UserPlus, Clock, ArrowUpRight, ArrowDownRight, Target, Loader2, ChevronRight
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { useFamily } from '../context/FamilyContext';
import { useAuth } from '../context/authContext';
import {
    COMMON_AXIS_PROPS,
    COMMON_TOOLTIP_PROPS,
    CHART_COLORS,
    formatCurrencyCompact,
    formatDateChart
} from '../utils/chartStyles';
import { createFamilyGroup, getAuditLog } from '../services/familyService';

const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
})}`;

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6'];

const ACTION_LABELS = {
    GROUP_CREATED: 'Group created',
    MEMBER_INVITED: 'Member invited',
    MEMBER_JOINED: 'Member joined',
    MEMBER_REMOVED: 'Member removed',
    MEMBER_LEFT: 'Member left',
    ROLE_CHANGED: 'Role changed',
    GROUP_DISSOLVED: 'Group dissolved',
    TRANSACTION_ADDED: 'Transaction added',
    TRANSACTION_EDITED: 'Transaction edited',
    TRANSACTION_DELETED: 'Transaction deleted',
    BUDGET_UPDATED: 'Budget updated',
};

const FamilyDashboard = ({ setActiveTab }) => {
    const {
        group, loading, hasGroup, familyFinancialData, financialLoading,
        refreshGroup, isAdmin, members
    } = useFamily();
    const { refreshUser } = useAuth();

    const [newGroupName, setNewGroupName] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditLoading, setAuditLoading] = useState(false);

    useEffect(() => {
        if (hasGroup) {
            setAuditLoading(true);
            getAuditLog(1).then(data => {
                setAuditLogs(data.logs || []);
            }).catch(() => { }).finally(() => setAuditLoading(false));
        }
    }, [hasGroup]);

    const handleCreate = async () => {
        if (!newGroupName.trim()) { setError('Please enter a group name.'); return; }
        setCreating(true); setError('');
        try {
            await createFamilyGroup(newGroupName.trim());
            await refreshUser();
            await refreshGroup();
            setNewGroupName('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create group.');
        } finally {
            setCreating(false);
        }
    };

    const fd = familyFinancialData;

    const categoryData = useMemo(() => {
        if (!fd?.categoryBreakdown) return [];
        return Object.entries(fd.categoryBreakdown).map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value).slice(0, 6);
    }, [fd]);

    const memberData = useMemo(() => {
        if (!fd?.memberBreakdown) return [];
        return fd.memberBreakdown.map(m => ({ name: m.name, value: m.totalSpent }));
    }, [fd]);

    const trendData = useMemo(() => {
        if (!fd?.trendData || fd.trendData.length === 0) return [];
        return fd.trendData.map(t => ({
            name: new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            amount: t.amount
        }));
    }, [fd?.trendData]);

    const totalBudget = useMemo(() => {
        return fd?.budgets?.reduce((sum, b) => sum + b.budgeted, 0) || 0;
    }, [fd?.budgets]);

    const budgetUsagePercent = totalBudget > 0 ? (fd?.totalExpense / totalBudget) * 100 : 0;

    if (loading) return (
        <div className="space-y-8 pb-12 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gray-100 rounded-xl w-12 h-12" />
                    <div className="space-y-2">
                        <div className="h-6 w-48 bg-gray-200 rounded" />
                        <div className="h-3 w-32 bg-gray-200 rounded" />
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="h-10 w-36 bg-gray-200 rounded-xl" />
                    <div className="h-10 w-24 bg-gray-200 rounded-xl" />
                </div>
            </div>
            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="relative overflow-hidden bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-gray-100 w-9 h-9" />
                            <div className="h-3 w-20 bg-gray-200 rounded" />
                        </div>
                        <div className="h-6 w-28 bg-gray-200 rounded" />
                        <div className="absolute inset-0 bg-shimmer animate-shimmer" />
                    </div>
                ))}
            </div>
            {/* Charts Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 relative overflow-hidden bg-white rounded-xl border border-gray-100 shadow-sm p-6" style={{ height: 340 }}>
                    <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
                    <div className="absolute left-8 top-14 bottom-8 w-px bg-gray-200" />
                    <div className="absolute left-8 right-6 bottom-8 h-px bg-gray-200" />
                    <div className="absolute bottom-8 left-12 right-8 flex items-end gap-3 h-3/5 px-2">
                        {[40, 70, 30, 85, 55, 60, 45].map((h, j) => (
                            <div key={j} className="flex-1 bg-gray-200 rounded-t" style={{ height: `${h}%` }} />
                        ))}
                    </div>
                    <div className="absolute inset-0 bg-shimmer animate-shimmer" />
                </div>
                <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <div className="h-4 w-28 bg-gray-200 rounded mb-4" />
                    <div className="flex items-center justify-center h-44">
                        <div className="w-36 h-36 bg-gray-200 rounded-full" />
                    </div>
                    <div className="space-y-2 mt-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex justify-between">
                                <div className="h-3 w-20 bg-gray-200 rounded" />
                                <div className="h-3 w-16 bg-gray-200 rounded" />
                            </div>
                        ))}
                    </div>
                    <div className="absolute inset-0 bg-shimmer animate-shimmer" />
                </div>
            </div>
            {/* Activity Feed Skeleton */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="h-4 w-28 bg-gray-200 rounded mb-4" />
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="relative overflow-hidden flex items-start gap-3 p-3 rounded-lg">
                            <div className="w-8 h-8 rounded-lg bg-gray-200 shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3 w-2/5 bg-gray-200 rounded" />
                                <div className="h-2.5 w-3/5 bg-gray-200 rounded" />
                            </div>
                            <div className="h-3 w-16 bg-gray-200 rounded" />
                            <div className="absolute inset-0 bg-shimmer animate-shimmer" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    if (!hasGroup) return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto mt-16">
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
                <div className="w-16 h-16 bg-violet-50 rounded-xl flex items-center justify-center mx-auto mb-6">
                    <Users size={32} className="text-violet-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Create a Family Group</h2>
                <p className="text-sm text-gray-500 mb-6">
                    Track shared expenses, set budgets, and manage finances together with your family.
                </p>
                {error && <p className="text-sm text-red-500 mb-4 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => { setNewGroupName(e.target.value); setError(''); }}
                        placeholder="Family group name"
                        className="flex-1 px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                    />
                    <button onClick={handleCreate} disabled={creating}
                        className="px-6 py-3 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-all disabled:opacity-50">
                        {creating ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </div>
        </motion.div>
    );

    const ChartComponent = React.memo(({ data, type = 'bar' }) => {
        if (!data || data.length === 0) {
            return (
                <div className="h-[300px] flex items-center justify-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-gray-400 text-sm">No data available</p>
                </div>
            );
        }

        return (
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {type === 'bar' ? (
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="name" {...COMMON_AXIS_PROPS} />
                            <YAxis {...COMMON_AXIS_PROPS} tickFormatter={formatCurrencyCompact} />
                            <Tooltip {...COMMON_TOOLTIP_PROPS} />
                            <Bar dataKey="amount" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    ) : (
                        <PieChart>
                            <Pie
                                data={data}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip {...COMMON_TOOLTIP_PROPS} />
                        </PieChart>
                    )}
                </ResponsiveContainer>
            </div>
        );
    });

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-violet-50 rounded-xl text-violet-600">
                        <Users size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
                        <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                            <Activity size={14} className="text-violet-400" />
                            {members.length} member{members.length !== 1 ? 's' : ''} · Active
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => setActiveTab('family-expenses')}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-5 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border border-emerald-100">
                        <DollarSign size={18} />
                        Manage Expenses
                    </button>
                    {isAdmin && (
                        <button onClick={() => setActiveTab('family-members')}
                            className="bg-gray-900 hover:bg-black text-white px-5 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2">
                            <UserPlus size={18} />
                            Invite
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { icon: TrendingUp, label: 'Total Income', value: formatCurrency(fd?.totalIncome), color: '#10B981', tab: 'family-expenses' },
                    { icon: TrendingDown, label: 'Total Expenses', value: formatCurrency(fd?.totalExpense), color: '#EF4444', tab: 'family-expenses' },
                    { icon: DollarSign, label: 'Net Savings', value: formatCurrency(fd?.netSavings), color: '#3B82F6' },
                    { icon: Target, label: 'Members', value: members.length, color: '#8B5CF6', tab: 'family-members' },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`bg-white p-5 rounded-xl border border-gray-100 shadow-sm ${stat.tab ? 'cursor-pointer hover:border-violet-200 hover:shadow-md transition-all' : ''}`}
                        onClick={() => stat.tab && setActiveTab(stat.tab)}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg" style={{ backgroundColor: `${stat.color}15` }}>
                                <stat.icon size={18} style={{ color: stat.color }} />
                            </div>
                            <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                        </div>
                        <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Spending Trend */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Activity size={16} className="text-violet-500" />
                        Spending Trend
                    </h3>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} tickFormatter={formatCurrency} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                                <Area type="monotone" dataKey="amount" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorAmt)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Member Contribution */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <PieIcon size={16} className="text-violet-500" />
                        Member Spending
                    </h3>
                    {memberData.length > 0 ? (
                        <>
                            <div className="h-[180px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={memberData}
                                            innerRadius={55}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {memberData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2 mt-4">
                                {memberData.map((m, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                            <span className="text-xs text-gray-600">{m.name}</span>
                                        </div>
                                        <span className="text-xs font-medium text-gray-900">{formatCurrency(m.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-12">No spending data yet</p>
                    )}
                </div>
            </div>

            {/* Member Insights */}
            {fd?.memberBreakdown?.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-gray-900 mb-4">Member Insights</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {fd.memberBreakdown.map((m, i) => (
                            <div key={i} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center text-sm font-bold">
                                        {(m.name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-900">{m.name}</h4>
                                        <p className="text-xs text-gray-500">{formatCurrency(m.totalSpent)} spent</p>
                                    </div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                                    <span>Share of expenses</span>
                                    <span className="font-medium text-gray-700">{((m.totalSpent / (fd.totalExpense || 1)) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(m.totalSpent / (fd.totalExpense || 1)) * 100}%` }}
                                        className="h-full bg-violet-500 rounded-full"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Activity Feed */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Activity size={16} className="text-violet-500" />
                    Recent Activity
                </h3>
                {auditLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
                ) : auditLogs.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No activity yet</p>
                ) : (
                    <div className="space-y-3">
                        {auditLogs.slice(0, 8).map((log, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                                    {(log.userId?.username || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm font-medium text-gray-900">{ACTION_LABELS[log.action] || log.action}</p>
                                        <span className="text-xs text-gray-400">
                                            {new Date(log.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate">{log.details}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <button onClick={() => setActiveTab('family-expenses')} className="w-full mt-4 py-3 text-xs font-medium text-gray-500 hover:text-violet-600 transition-all border-t border-gray-100 flex items-center justify-center gap-1.5">
                    View All Transactions <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
};

export default FamilyDashboard;
