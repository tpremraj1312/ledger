import Gamification from '../models/Gamification.js';
import Transaction from '../models/transaction.js';

/**
 * Full badge catalog — 12 badges with rarity tiers.
 * Conditions are async functions receiving userId.
 */
const BADGES = [
    // ─── COMMON ───
    {
        id: 'first_transaction',
        name: 'First Step',
        description: 'Record your first transaction',
        icon: '🚀',
        rarity: 'common',
        condition: async (userId) => (await Transaction.countDocuments({ user: userId })) >= 1
    },
    {
        id: 'frequent_tracker',
        name: 'Frequent Tracker',
        description: 'Record 10 transactions',
        icon: '📝',
        rarity: 'common',
        condition: async (userId) => (await Transaction.countDocuments({ user: userId })) >= 10
    },
    {
        id: 'category_explorer',
        name: 'Category Explorer',
        description: 'Log expenses in 5 different categories',
        icon: '🗺️',
        rarity: 'common',
        condition: async (userId) => {
            const cats = await Transaction.distinct('category', { user: userId, type: 'debit' });
            return cats.length >= 5;
        }
    },

    // ─── RARE ───
    {
        id: 'saver_1000',
        name: 'Saver',
        description: 'Save or Invest ≥ ₹1,000 total',
        icon: '💰',
        rarity: 'rare',
        condition: async (userId) => {
            const agg = await Transaction.aggregate([
                { $match: { user: userId, type: 'credit' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            return agg.length > 0 && agg[0].total >= 1000;
        }
    },
    {
        id: 'week_warrior',
        name: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        icon: '⚔️',
        rarity: 'rare',
        condition: async (userId) => {
            const p = await Gamification.findOne({ user: userId });
            return p && p.longestStreak >= 7;
        }
    },
    {
        id: 'budget_master',
        name: 'Budget Master',
        description: 'Stay under budget in all categories for a month',
        icon: '🎯',
        rarity: 'rare',
        condition: async () => false // checked via wellness
    },
    {
        id: 'big_spender_aware',
        name: 'Big Spender Aware',
        description: 'Log a transaction over ₹5,000',
        icon: '💸',
        rarity: 'rare',
        condition: async (userId) => {
            const tx = await Transaction.findOne({ user: userId, amount: { $gte: 5000 } });
            return !!tx;
        }
    },

    // ─── EPIC ───
    {
        id: 'milestone_5k',
        name: 'Milestone 5K',
        description: 'Earn 5,000 total XP',
        icon: '🏆',
        rarity: 'epic',
        condition: async (userId) => {
            const p = await Gamification.findOne({ user: userId });
            return p && p.xp >= 5000;
        }
    },
    {
        id: 'challenge_champion',
        name: 'Challenge Champion',
        description: 'Complete 3 challenges',
        icon: '🏅',
        rarity: 'epic',
        condition: async (userId) => {
            const Challenge = (await import('../models/Challenge.js')).default;
            const count = await Challenge.countDocuments({ user: userId, status: 'completed' });
            return count >= 3;
        }
    },
    {
        id: 'streak_king',
        name: 'Streak King',
        description: 'Maintain a 30-day streak',
        icon: '🔥',
        rarity: 'epic',
        condition: async (userId) => {
            const p = await Gamification.findOne({ user: userId });
            return p && p.longestStreak >= 30;
        }
    },

    // ─── LEGENDARY ───
    {
        id: 'quest_slayer',
        name: 'Quest Slayer',
        description: 'Complete 10 quests',
        icon: '⚡',
        rarity: 'legendary',
        condition: async (userId) => {
            const Mission = (await import('../models/Mission.js')).default;
            const count = await Mission.countDocuments({ user: userId, status: 'completed' });
            return count >= 10;
        }
    },
    {
        id: 'money_monk',
        name: 'Money Monk',
        description: 'Achieve a Wellness Score of 90+',
        icon: '🧘',
        rarity: 'legendary',
        condition: async (userId) => {
            const WellnessScore = (await import('../models/WellnessScore.js')).default;
            const best = await WellnessScore.findOne({ user: userId, score: { $gte: 90 } });
            return !!best;
        }
    },
];

/**
 * Return the full badge catalog with unlock status for a user.
 * Used by the Badge Vault UI to show locked badges.
 */
export const getAllBadgeDefinitions = () => {
    return BADGES.map(({ condition, ...rest }) => rest);
};

/**
 * Check for newly earned badges — award 50 XP per badge.
 */
export const checkBadges = async (userId, session = null) => {
    try {
        let profile = await Gamification.findOne({ user: userId }).session(session);
        if (!profile) profile = await Gamification.create([{ user: userId }], { session });

        const existingIds = new Set(profile.badges.map(b => b.id));
        const newBadges = [];

        for (const badge of BADGES) {
            if (existingIds.has(badge.id)) continue;
            try {
                const unlocked = await badge.condition(userId, session);
                if (unlocked) {
                    newBadges.push({
                        id: badge.id,
                        name: badge.name,
                        description: badge.description,
                        icon: badge.icon,
                        unlockedAt: new Date(),
                        isNew: true
                    });
                }
            } catch (_) { /* individual badge check may fail */ }
        }

        if (newBadges.length > 0) {
            profile.badges.push(...newBadges);
            profile.xp += newBadges.length * 50;
            profile.xpHistory.push(
                ...newBadges.map(b => ({ amount: 50, reason: `badge_${b.id}`, date: new Date() }))
            );
            await profile.save({ session });
        }

        return newBadges;
    } catch (error) {
        console.error('Error checking badges:', error);
        return [];
    }
};
