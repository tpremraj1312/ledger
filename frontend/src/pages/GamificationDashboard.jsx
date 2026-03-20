import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
    Gamepad2, BookOpen, Plus, X, Zap, TrendingUp, Loader2,
    Flame, Shield, Heart, Trophy, Star, ChevronRight, CheckCircle2,
    TrendingDown, PiggyBank, Target
} from 'lucide-react';

import HeroLevelCard from '../components/Gamification/HeroLevelCard';
import PremiumStreakWidget from '../components/Gamification/PremiumStreakWidget';
import WellnessMeter from '../components/Gamification/WellnessMeter';
import QuestBoard from '../components/Gamification/QuestBoard';
import BadgeVault from '../components/Gamification/BadgeVault';
import FinancialGoals from '../components/Gamification/FinancialGoals';
import ActivityFeed from '../components/Gamification/ActivityFeed';
import FinanceQuestRulebook from './FinanceQuestRulebook';

const API = import.meta.env.VITE_BACKEND_URL;

// Motion variants
const fadeUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

const scaleIn = {
    initial: { scale: 0.96, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { duration: 0.35 } },
    exit: { scale: 0.96, opacity: 0 }
};

// Achievement Toast
const AchievementToast = ({ message, type, onClose }) => (
    <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        className="fixed bottom-6 right-6 z-50 max-w-sm"
    >
        <div className={`px-5 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 ${type === 'xp'
            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-indigo-400'
            : type === 'badge'
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white border-amber-400'
                : type === 'challenge'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400'
                    : 'bg-white text-gray-900 border-gray-200'
            }`}>
            <div className="p-2 bg-white/20 rounded-xl">
                {type === 'xp' && <Zap size={20} fill="currentColor" />}
                {type === 'badge' && <Trophy size={20} />}
                {type === 'challenge' && <CheckCircle2 size={20} />}
                {type === 'goal' && <Target size={20} />}
            </div>
            <div className="flex-1">
                <p className="text-sm font-bold">{message}</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition">
                <X size={16} />
            </button>
        </div>
    </motion.div>
);

// XP Breakdown Popover
const XPBreakdownPopover = ({ data, onClose }) => (
    <motion.div
        {...scaleIn}
        className="absolute right-0 top-full z-50 mt-3 w-80 rounded-2xl bg-white/95 backdrop-blur-xl border border-gray-100/80 shadow-xl p-6"
    >
        <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Today's XP</h4>
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-gray-100/80 transition">
                <X size={16} className="text-gray-500" />
            </button>
        </div>

        <div className="flex items-baseline gap-2 mb-5">
            <span className="text-4xl font-black text-indigo-700">{data?.earned || 0}</span>
            <span className="text-lg text-gray-400 font-medium">/ {data?.cap || 50}</span>
        </div>

        <div className="h-1.5 bg-gray-100/70 rounded-full overflow-hidden mb-5">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, ((data?.earned || 0) / (data?.cap || 50)) * 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
            />
        </div>

        {data?.entries?.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {data.entries.map((e, i) => (
                    <div key={i} className="flex justify-between items-center text-sm py-1.5 border-b border-gray-50 last:border-0">
                        <span className="text-gray-600 capitalize">{e.reason?.replace(/_/g, ' ')}</span>
                        <span className="font-semibold text-indigo-600">+{e.amount}</span>
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-sm text-gray-400 text-center py-6">No activity today yet</p>
        )}
    </motion.div>
);

// New Challenge Modal
const ChallengeModal = ({ isOpen, onClose, onSubmit }) => {
    const [form, setForm] = useState({
        title: '', category: 'Food', type: 'spendingLimit',
        targetAmount: '', startDate: '', endDate: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await onSubmit({ ...form, targetAmount: Number(form.targetAmount) });
        setSubmitting(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
                {...scaleIn}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
                <div className="px-8 pt-8 pb-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-gray-900">Create New Challenge</h3>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Challenge Name</label>
                        <input
                            value={form.title}
                            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                            placeholder="e.g., No Coffee Shops This Week"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                            <select
                                value={form.category}
                                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                            >
                                {['Food', 'Transport', 'Shopping', 'Entertainment', 'Savings', 'Investment', 'Total', 'All'].map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Goal Type</label>
                            <select
                                value={form.type}
                                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                            >
                                <option value="spendingLimit">Spending Limit</option>
                                <option value="savingTarget">Saving Target</option>
                                <option value="incomeTarget">Income Target</option>
                                <option value="noSpend">No Spend Days</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Amount (₹)</label>
                        <input
                            type="number"
                            value={form.targetAmount}
                            onChange={e => setForm(p => ({ ...p, targetAmount: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                            placeholder="1500"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
                            <input
                                type="date"
                                value={form.startDate}
                                onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
                            <input
                                type="date"
                                value={form.endDate}
                                onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-indigo-200/50"
                    >
                        {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                        {submitting ? 'Creating...' : 'Launch Challenge'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

// Completed Challenges Section
const CompletedChallenges = ({ challenges = [] }) => {
    if (challenges.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-50 rounded-xl">
                    <Trophy className="text-emerald-600" size={20} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-900">Completed Challenges</h3>
                    <p className="text-sm text-gray-500">{challenges.length} challenge{challenges.length !== 1 ? 's' : ''} conquered</p>
                </div>
            </div>
            <div className="space-y-3">
                {challenges.map(c => (
                    <div key={c._id} className="flex items-center justify-between p-4 bg-emerald-50/40 rounded-xl border border-emerald-100">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-gray-900">{c.title}</p>
                                <p className="text-xs text-gray-500 capitalize">{c.category} · {c.type?.replace(/([A-Z])/g, ' $1').trim()}</p>
                            </div>
                        </div>
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                            +{c.xpReward || 50} XP
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const GamificationDashboard = () => {
    const [tab, setTab] = useState('quest');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showChallengeModal, setShowChallengeModal] = useState(false);
    const [showXPPopover, setShowXPPopover] = useState(false);
    const [toast, setToast] = useState(null);
    const prevDataRef = useRef(null);

    const token = localStorage.getItem('token');
    const headers = { headers: { Authorization: `Bearer ${token}` } };

    const fetchDashboard = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await axios.get(`${API}/api/gamification/dashboard`, headers);
            const newData = res.data;

            // Check for achievements to toast
            if (prevDataRef.current && newData.profile) {
                const prevXP = prevDataRef.current.profile?.xp || 0;
                const newXP = newData.profile?.xp || 0;
                const prevLevel = prevDataRef.current.profile?.level || 1;
                const newLevel = newData.profile?.level || 1;
                const prevBadgeCount = prevDataRef.current.profile?.badges?.length || 0;
                const newBadgeCount = newData.profile?.badges?.length || 0;

                if (newLevel > prevLevel) {
                    setToast({ message: `🎉 Level Up! You're now Level ${newLevel}!`, type: 'xp' });
                    setTimeout(() => setToast(null), 4000);
                } else if (newBadgeCount > prevBadgeCount) {
                    const newestBadge = newData.profile.badges[newData.profile.badges.length - 1];
                    setToast({ message: `${newestBadge?.icon || '🏅'} Badge Unlocked: ${newestBadge?.name || 'New Badge'}!`, type: 'badge' });
                    setTimeout(() => setToast(null), 4000);
                } else if (newXP > prevXP) {
                    setToast({ message: `⚡ +${newXP - prevXP} XP earned!`, type: 'xp' });
                    setTimeout(() => setToast(null), 3000);
                }
            }

            prevDataRef.current = newData;
            setData(newData);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    // Auto-refresh polling every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchDashboard(true); // silent refresh
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchDashboard]);

    const handleMissionAction = async (id, status) => {
        try {
            await axios.patch(`${API}/api/gamification/missions/${id}`, { status }, headers);
            fetchDashboard(true);
        } catch (err) {
            console.error(err);
        }
    };

    const handleGenerateMissions = async () => {
        try {
            await axios.post(`${API}/api/gamification/missions/generate`, {}, headers);
            fetchDashboard(true);
        } catch (err) {
            console.error(err);
        }
    };

    const handleClaimQuest = async (id) => {
        try {
            await axios.post(`${API}/api/gamification/quests/${id}/complete`, {}, headers);
            fetchDashboard(true);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateChallenge = async (payload) => {
        try {
            await axios.post(`${API}/api/gamification/challenges`, payload, headers);
            fetchDashboard(true);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateGoal = async (payload) => {
        try {
            await axios.post(`${API}/api/gamification/goals`, payload, headers);
            fetchDashboard(true);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteGoal = async (id) => {
        try {
            await axios.delete(`${API}/api/gamification/goals/${id}`, headers);
            fetchDashboard(true);
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50/40 pb-20 md:pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 animate-pulse">
                    {/* Header Skeleton */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gray-200" />
                            <div className="space-y-2">
                                <div className="h-7 w-48 bg-gray-200 rounded" />
                                <div className="h-4 w-56 bg-gray-200 rounded" />
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative overflow-hidden h-10 w-36 bg-white rounded-xl border border-gray-200">
                                <div className="absolute inset-0 bg-shimmer animate-shimmer" />
                            </div>
                            <div className="relative overflow-hidden h-10 w-40 bg-white rounded-xl border border-gray-200">
                                <div className="absolute inset-0 bg-shimmer animate-shimmer" />
                            </div>
                        </div>
                    </div>
                    {/* Narrative Skeleton */}
                    <div className="relative overflow-hidden bg-gray-100 rounded-2xl p-6 h-16">
                        <div className="h-4 w-3/4 bg-gray-200 rounded mx-auto" />
                        <div className="absolute inset-0 bg-shimmer animate-shimmer" />
                    </div>
                    {/* Hero Cards Skeleton */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-6" style={{ minHeight: 200 }}>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                                        <div className="space-y-2 flex-1">
                                            <div className="h-4 w-24 bg-gray-200 rounded" />
                                            <div className="h-3 w-16 bg-gray-200 rounded" />
                                        </div>
                                    </div>
                                    <div className="h-2 w-full bg-gray-200 rounded-full" />
                                    <div className="h-3 w-2/3 bg-gray-200 rounded" />
                                    <div className="h-3 w-1/2 bg-gray-200 rounded" />
                                </div>
                                <div className="absolute inset-0 bg-shimmer animate-shimmer" />
                            </div>
                        ))}
                    </div>
                    {/* Quest Board Skeleton */}
                    <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
                        <div className="h-6 w-40 bg-gray-200 rounded mb-6" />
                        <div className="space-y-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="relative overflow-hidden flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                                        <div className="space-y-2 flex-1">
                                            <div className="h-3.5 w-2/5 bg-gray-200 rounded" />
                                            <div className="h-2.5 w-1/3 bg-gray-200 rounded" />
                                        </div>
                                    </div>
                                    <div className="h-8 w-20 bg-gray-200 rounded-lg" />
                                    <div className="absolute inset-0 bg-shimmer animate-shimmer" />
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Badges Skeleton */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                        {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-6" style={{ minHeight: 180 }}>
                                <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
                                <div className="grid grid-cols-4 gap-3">
                                    {Array.from({ length: 8 }).map((_, j) => (
                                        <div key={j} className="h-12 w-12 bg-gray-200 rounded-xl mx-auto" />
                                    ))}
                                </div>
                                <div className="absolute inset-0 bg-shimmer animate-shimmer" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const {
        profile,
        missions = [],
        activeChallenges = [],
        completedChallenges = [],
        wellness,
        todayXP,
        allBadges = [],
        goals = [],
        recentActivity = [],
    } = data || {};

    return (
        <div className="min-h-screen bg-gray-50/40 pb-20 md:pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

                {/* Header */}
                <motion.header {...fadeUp} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200/40">
                            <Gamepad2 className="text-white" size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Finance Quest</h1>
                            <p className="text-gray-500 mt-0.5">Transform discipline into mastery</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="relative">
                            <button
                                onClick={() => setShowXPPopover(p => !p)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl hover:border-indigo-200 transition group shadow-sm"
                            >
                                <Zap size={18} className="text-amber-500" fill="currentColor" />
                                <span className="font-semibold text-gray-800">
                                    {todayXP?.earned || 0} <span className="text-gray-400 font-normal">/ {todayXP?.cap || 50} XP</span>
                                </span>
                            </button>

                            <AnimatePresence>
                                {showXPPopover && (
                                    <XPBreakdownPopover data={todayXP} onClose={() => setShowXPPopover(false)} />
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                            <button
                                onClick={() => setTab('quest')}
                                className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${tab === 'quest' ? 'bg-indigo-50 text-indigo-700 shadow-inner' : 'text-gray-600 hover:text-gray-800'}`}
                            >
                                Quests
                            </button>
                            <button
                                onClick={() => setTab('rulebook')}
                                className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${tab === 'rulebook' ? 'bg-indigo-50 text-indigo-700 shadow-inner' : 'text-gray-600 hover:text-gray-800'}`}
                            >
                                Rulebook
                            </button>
                        </div>
                    </div>
                </motion.header>

                {tab === 'rulebook' ? (
                    <FinanceQuestRulebook />
                ) : (
                    <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-10">

                        {/* Narrative */}
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-gradient-to-r from-indigo-50/80 to-purple-50/60 rounded-2xl p-6 border border-indigo-100/60 text-center"
                        >
                            <p className="text-indigo-700 font-medium">
                                "Consistency compounds. One logged expense today → financial freedom tomorrow."
                            </p>
                        </motion.div>

                        {/* Hero cards */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                            <HeroLevelCard profile={profile} />
                            <PremiumStreakWidget profile={profile} />
                            <div className="flex flex-col gap-6">
                                <motion.button
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowChallengeModal(true)}
                                    className="flex-1 bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-semibold rounded-2xl py-8 shadow-xl shadow-indigo-200/40 hover:shadow-2xl hover:shadow-indigo-300/50 transition-all flex items-center justify-center gap-3 text-lg"
                                >
                                    <Plus size={22} /> Create Challenge
                                </motion.button>

                                {activeChallenges.length > 0 && (
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                            <TrendingUp size={16} className="text-indigo-500" />
                                            Active Challenges
                                        </h3>
                                        <div className="space-y-4">
                                            {activeChallenges.map(c => {
                                                const progress = c.targetAmount > 0 ? Math.min(100, (c.progressAmount / c.targetAmount) * 100) : 0;
                                                const daysLeft = Math.max(0, Math.ceil((new Date(c.endDate) - new Date()) / 86400000));
                                                return (
                                                    <div key={c._id} className="p-4 bg-gray-50/60 rounded-xl">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div>
                                                                <h4 className="font-medium text-gray-900 text-sm">{c.title}</h4>
                                                                <p className="text-xs text-gray-500 capitalize">{c.category} · {daysLeft}d left</p>
                                                            </div>
                                                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">
                                                                +{c.xpReward || 50} XP
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                            <span>₹{(c.progressAmount || 0).toLocaleString('en-IN')}</span>
                                                            <span>₹{(c.targetAmount || 0).toLocaleString('en-IN')}</span>
                                                        </div>
                                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <motion.div
                                                                className={`h-full rounded-full transition-all duration-700 ${progress > 85 && (c.type === 'spendingLimit' || c.type === 'noSpend') ? 'bg-red-500' : 'bg-indigo-500'}`}
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${progress}%` }}
                                                                transition={{ duration: 0.8 }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Financial Goals */}
                        <FinancialGoals
                            goals={goals}
                            onCreate={handleCreateGoal}
                            onDelete={handleDeleteGoal}
                        />

                        {/* Quest Board */}
                        <QuestBoard
                            missions={missions}
                            onAction={handleMissionAction}
                            onGenerate={handleGenerateMissions}
                            onClaim={handleClaimQuest}
                        />

                        {/* Completed Challenges + Activity Feed + Badges + Wellness */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                            <ActivityFeed activity={recentActivity} />
                            <CompletedChallenges challenges={completedChallenges} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                            <BadgeVault badges={profile?.badges || []} allBadges={allBadges} />
                            <WellnessMeter wellness={wellness} />
                        </div>
                    </motion.div>
                )}

                <AnimatePresence>
                    {showChallengeModal && (
                        <ChallengeModal
                            isOpen={showChallengeModal}
                            onClose={() => setShowChallengeModal(false)}
                            onSubmit={handleCreateChallenge}
                        />
                    )}
                </AnimatePresence>

                {/* Achievement Toast */}
                <AnimatePresence>
                    {toast && (
                        <AchievementToast
                            message={toast.message}
                            type={toast.type}
                            onClose={() => setToast(null)}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default GamificationDashboard;