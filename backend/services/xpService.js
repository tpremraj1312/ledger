import Gamification from '../models/Gamification.js';

const MAX_DAILY_XP = 50;

const TITLES = [
    { minLevel: 50, title: 'Financial Master' },
    { minLevel: 30, title: 'Wealth Architect' },
    { minLevel: 20, title: 'Smart Investor' },
    { minLevel: 15, title: 'Money Strategist' },
    { minLevel: 10, title: 'Budget Warrior' },
    { minLevel: 5, title: 'Expense Hunter' },
    { minLevel: 1, title: 'Rookie Saver' },
];

const getTitle = (level) => {
    for (const t of TITLES) {
        if (level >= t.minLevel) return t.title;
    }
    return 'Rookie Saver';
};

// ---------- helpers ----------
const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

const xpEarnedToday = (profile) => {
    const todayStart = startOfToday();
    return profile.xpHistory
        .filter(h => new Date(h.date) >= todayStart)
        .reduce((sum, h) => sum + h.amount, 0);
};

// ---------- public API ----------

/**
 * Award XP with daily-cap enforcement and atomic updates.
 * Returns { profile, awarded, capped }
 */
export const addXP = async (userId, xpAmount, reason, session = null) => {
    try {
        // --- 1. IDEMPOTENCY CHECK ---
        // Check if this reason has already been awarded to prevent duplication
        const existingProfile = await Gamification.findOne({
            user: userId,
            "xpHistory.reason": reason
        }).session(session);

        if (existingProfile) {
            return { profile: existingProfile, awarded: 0, capped: false };
        }

        // --- 2. FETCH CURRENT STATUS ---
        let profile = await Gamification.findOne({ user: userId }).session(session);
        if (!profile) {
            profile = await Gamification.create([{ user: userId }], { session }).then(docs => docs[0]);
        }

        // --- 3. DAILY CAP CHECK ---
        const earnedToday = xpEarnedToday(profile);
        let actualAward = xpAmount;
        let cappedValue = false;

        if (earnedToday >= MAX_DAILY_XP) {
            return { profile, awarded: 0, capped: true };
        }
        if (earnedToday + xpAmount > MAX_DAILY_XP) {
            actualAward = MAX_DAILY_XP - earnedToday;
            cappedValue = true;
        }

        // --- 4. ATOMIC UPDATE ---
        const updatedProfile = await Gamification.findOneAndUpdate(
            { user: userId },
            {
                $inc: { xp: actualAward },
                $push: { xpHistory: { amount: actualAward, reason, date: new Date() } },
                $set: { lastActivityDate: new Date() }
            },
            { new: true, session }
        );

        // --- 5. LEVEL-UP LOGIC (Non-atomic but derived from atomic state) ---
        const newLevel = Math.floor(updatedProfile.xp / 500) + 1;
        if (newLevel > updatedProfile.level) {
            updatedProfile.level = newLevel;
            updatedProfile.title = getTitle(newLevel);
            await updatedProfile.save({ session });
        }

        return { profile: updatedProfile, awarded: actualAward, capped: cappedValue };
    } catch (error) {
        console.error('Error adding XP:', error);
        return { profile: null, awarded: 0, capped: false };
    }
};

/**
 * Streak management — call once per meaningful action per day.
 * Awards streak-bonus XP at every 7-day milestone.
 */
export const checkStreak = async (userId, session = null) => {
    try {
        let profile = await Gamification.findOne({ user: userId }).session(session);
        if (!profile) profile = new Gamification({ user: userId });

        const today = startOfToday();
        const lastDate = profile.lastStreakDate ? new Date(profile.lastStreakDate) : null;
        if (lastDate) lastDate.setHours(0, 0, 0, 0);

        if (!lastDate) {
            profile.currentStreak = 1;
            profile.longestStreak = 1;
            profile.lastStreakDate = new Date();
            profile.streakHistory.push({ date: new Date(), status: 'active' });
        } else {
            const diffDays = Math.round((today - lastDate) / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                return; // already counted today
            } else if (diffDays === 1) {
                profile.currentStreak += 1;
                if (profile.currentStreak > profile.longestStreak) {
                    profile.longestStreak = profile.currentStreak;
                }
                profile.lastStreakDate = new Date();
                profile.streakHistory.push({ date: new Date(), status: 'active' });

                // Streak milestone bonus — every 7 days
                if (profile.currentStreak % 7 === 0) {
                    profile.xp += 5;
                    profile.xpHistory.push({ amount: 5, reason: `streak_bonus_${profile.currentStreak}`, date: new Date() });
                    console.log(`🔥 Streak bonus! ${profile.currentStreak} days`);
                }
            } else {
                // Streak broken
                profile.currentStreak = 1;
                profile.lastStreakDate = new Date();
                profile.streakHistory.push({ date: new Date(), status: 'active' });
            }
        }

        // Keep last 365 entries
        if (profile.streakHistory.length > 365) {
            profile.streakHistory = profile.streakHistory.slice(-365);
        }

        await profile.save({ session });
    } catch (error) {
        console.error('Error checking streak:', error);
    }
};

export const getGamificationProfile = async (userId) => {
    let profile = await Gamification.findOne({ user: userId });
    if (!profile) {
        profile = await Gamification.create({ user: userId });
    }
    return profile;
};

/**
 * Return today's XP breakdown for the popover.
 */
export const getTodayXPBreakdown = async (userId) => {
    const profile = await Gamification.findOne({ user: userId });
    if (!profile) return { earned: 0, cap: MAX_DAILY_XP, entries: [] };

    const todayStart = startOfToday();
    const entries = profile.xpHistory.filter(h => new Date(h.date) >= todayStart);
    const earned = entries.reduce((s, e) => s + e.amount, 0);

    return { earned, cap: MAX_DAILY_XP, remaining: MAX_DAILY_XP - earned, entries };
};
