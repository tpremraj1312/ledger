import cron from 'node-cron';
import User from '../models/user.js';
import Mission from '../models/Mission.js';
import { generateWeeklyMissions } from './missionService.js';
import { getGamificationProfile } from './xpService.js';

export const initCronJobs = () => {
    // 1. Daily Streak Reset & Engagement Check (Every day at 00:05)
    cron.schedule('5 0 * * *', async () => {
        console.log('[CRON] Checking daily streak resets...');
        try {
            const users = await User.find({});
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (const user of users) {
                const profile = await getGamificationProfile(user._id);
                if (profile.lastActivityDate) {
                    const lastActive = new Date(profile.lastActivityDate);
                    lastActive.setHours(0, 0, 0, 0);

                    const diffDays = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));
                    if (diffDays > 1) {
                        // Streak broken
                        user.gamification = user.gamification || {};
                        user.gamification.streak = 0;
                        await user.save();
                        console.log(`[CRON] Reset streak for user ${user._id}`);
                    }
                }
            }
        } catch (error) {
            console.error('[CRON] Error in daily streak reset:', error);
        }
    });

    // 2. Weekly Mission Refresh (Every Monday at 00:00)
    cron.schedule('0 0 * * 1', async () => {
        console.log('[CRON] Refreshing weekly missions...');
        try {
            const users = await User.find({});
            for (const user of users) {
                // Reject/Expire old missions
                await Mission.updateMany(
                    { user: user._id, status: { $in: ['pending', 'accepted'] }, weekEndDate: { $lt: new Date() } },
                    { $set: { status: 'rejected' } }
                );
                // Generate new ones
                await generateWeeklyMissions(user._id);
                console.log(`[CRON] Refreshed missions for user ${user._id}`);
            }
        } catch (error) {
            console.error('[CRON] Error in weekly mission refresh:', error);
        }
    });

    console.log('[CRON] All gamification jobs scheduled.');
};
