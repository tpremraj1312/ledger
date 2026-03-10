import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, Trophy, Target, Flame, Award } from 'lucide-react';

const REASON_CONFIG = {
    tx_: { icon: Zap, label: 'Transaction Logged', color: 'text-blue-600 bg-blue-50' },
    family_tx_: { icon: Zap, label: 'Family Transaction', color: 'text-purple-600 bg-purple-50' },
    challenge_completed_: { icon: Trophy, label: 'Challenge Completed', color: 'text-amber-600 bg-amber-50' },
    quest_completed_: { icon: Target, label: 'Quest Completed', color: 'text-emerald-600 bg-emerald-50' },
    quest_claimed_: { icon: Award, label: 'Quest Claimed', color: 'text-emerald-600 bg-emerald-50' },
    goal_completed_: { icon: Target, label: 'Goal Achieved', color: 'text-indigo-600 bg-indigo-50' },
    badge_: { icon: Award, label: 'Badge Unlocked', color: 'text-amber-600 bg-amber-50' },
    streak_bonus_: { icon: Flame, label: 'Streak Bonus', color: 'text-orange-600 bg-orange-50' },
};

const getReasonConfig = (reason) => {
    for (const [prefix, config] of Object.entries(REASON_CONFIG)) {
        if (reason?.startsWith(prefix)) return config;
    }
    return { icon: Zap, label: reason?.replace(/_/g, ' ') || 'Activity', color: 'text-gray-600 bg-gray-50' };
};

const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const ActivityFeed = ({ activity = [] }) => {
    if (!activity || activity.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gray-100 rounded-xl">
                        <Activity className="text-gray-500" size={20} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Activity Feed</h3>
                        <p className="text-sm text-gray-500">Your recent XP activity</p>
                    </div>
                </div>
                <div className="text-center py-10">
                    <Activity size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">No activity yet</p>
                    <p className="text-sm text-gray-400">Start logging transactions to earn XP</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-amber-50 rounded-xl">
                    <Activity className="text-amber-600" size={20} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-900">Activity Feed</h3>
                    <p className="text-sm text-gray-500">Recent XP earnings</p>
                </div>
            </div>

            <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                {activity.map((entry, i) => {
                    const config = getReasonConfig(entry.reason);
                    const Icon = config.icon;

                    return (
                        <motion.div
                            key={`${entry.reason}-${entry.date}-${i}`}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition group"
                        >
                            <div className={`p-2 rounded-lg ${config.color} shrink-0`}>
                                <Icon size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 capitalize truncate">{config.label}</p>
                                <p className="text-xs text-gray-500">{formatTime(entry.date)}</p>
                            </div>
                            <span className="text-sm font-bold text-indigo-600 shrink-0">+{entry.amount} XP</span>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default ActivityFeed;
