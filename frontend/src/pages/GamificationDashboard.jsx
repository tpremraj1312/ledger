import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
    Gamepad2, BookOpen, Plus, X, Zap, TrendingUp, Loader2,
    Flame, Shield, Heart, Trophy, Star, ChevronRight
} from 'lucide-react';

import HeroLevelCard from '../components/Gamification/HeroLevelCard';
import PremiumStreakWidget from '../components/Gamification/PremiumStreakWidget';
import WellnessMeter from '../components/Gamification/WellnessMeter';
import QuestBoard from '../components/Gamification/QuestBoard';
import BadgeVault from '../components/Gamification/BadgeVault';
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
                                {['Food', 'Transport', 'Shopping', 'Entertainment', 'Savings', 'Total'].map(c => (
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

const GamificationDashboard = () => {
    const [tab, setTab] = useState('quest');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showChallengeModal, setShowChallengeModal] = useState(false);
    const [showXPPopover, setShowXPPopover] = useState(false);

    const token = localStorage.getItem('token');
    const headers = { headers: { Authorization: `Bearer ${token}` } };

    const fetchDashboard = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API}/api/gamification/dashboard`, headers);
            setData(res.data);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    const handleMissionAction = async (id, status) => {
        try {
            await axios.patch(`${API}/api/gamification/missions/${id}`, { status }, headers);
            fetchDashboard();
        } catch (err) {
            console.error(err);
        }
    };

    const handleGenerateMissions = async () => {
        try {
            await axios.post(`${API}/api/gamification/missions/generate`, {}, headers);
            fetchDashboard();
        } catch (err) {
            console.error(err);
        }
    };

    const handleClaimQuest = async (id) => {
        try {
            await axios.post(`${API}/api/gamification/quests/${id}/complete`, {}, headers);
            fetchDashboard();
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateChallenge = async (payload) => {
        try {
            await axios.post(`${API}/api/gamification/challenges`, payload, headers);
            fetchDashboard();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={40} className="text-indigo-500 animate-spin" />
                    <p className="text-gray-500 font-medium">Loading your quest progress...</p>
                </div>
            </div>
        );
    }

    const { profile, missions = [], activeChallenges = [], wellness, todayXP, allBadges = [] } = data || {};

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
                                “Consistency compounds. One logged expense today → financial freedom tomorrow.”
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
                                            {activeChallenges.map(c => (
                                                <div key={c._id} className="p-4 bg-gray-50/60 rounded-xl">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-medium text-gray-900">{c.title}</h4>
                                                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">
                                                            +{c.xpReward || 50} XP
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                                                            style={{ width: `${Math.min(100, (c.progressAmount / c.targetAmount) * 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <QuestBoard
                            missions={missions}
                            onAction={handleMissionAction}
                            onGenerate={handleGenerateMissions}
                            onClaim={handleClaimQuest}
                        />

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
            </div>
        </div>
    );
};

export default GamificationDashboard;