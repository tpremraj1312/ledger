import * as xpService from './xpService.js';
import * as badgeService from './badgeService.js';
import * as challengeService from './challengeService.js';
import * as missionService from './missionService.js';

/**
 * 🎯 Gamification Engine
 * Central event processor for all app activities to trigger gamification hooks.
 */

// Event Types
export const GAMIFICATION_EVENTS = {
    TRANSACTION_ADDED: 'TRANSACTION_ADDED',
    TRANSACTION_UPDATED: 'TRANSACTION_UPDATED',
    TRANSACTION_DELETED: 'TRANSACTION_DELETED',
    GOAL_CREATED: 'GOAL_CREATED',
    // add more events as needed
};

/**
 * Process a gamification event.
 * @param {string} userId - The user ID.
 * @param {string} eventType - The event type from GAMIFICATION_EVENTS.
 * @param {object} payload - The event payload (e.g., transaction object).
 * @param {mongoose.ClientSession|null} session - Optional MongoDB session.
 * @returns {object} - A summary of gamification results (XP earned, badges unlocked, missions updated).
 */
export const processEvent = async (userId, eventType, payload, session = null) => {
    // We will accumulate results to send back to the frontend for real-time toasts
    const results = {
        xpGained: 0,
        badgesUnlocked: [],
        missionsUpdated: 0,
        challengesUpdated: 0
    };

    try {
        // 1. Capture XP before applying events
        let profileBefore = null;
        try {
            profileBefore = await xpService.getGamificationProfile(userId);
        } catch (e) {
            console.error('Failed to get profileBefore:', e);
        }
        const xpBefore = profileBefore ? profileBefore.xp : 0;
        const badgesBefore = profileBefore ? profileBefore.badges.length : 0;

        // 2. Process based on event
        switch (eventType) {
            case GAMIFICATION_EVENTS.TRANSACTION_ADDED: {
                const transaction = payload.transaction;
                
                // Only streaks, challenges, and missions run for transaction events.
                // WE REMOVED blindly awarding 2 XP or 10 XP here.
                
                await xpService.checkStreak(userId, session);
                await badgeService.checkBadges(userId, session);
                await challengeService.checkChallengeProgress(userId, transaction, session);
                await missionService.checkMissionProgress(userId, transaction, session);
                
                break;
            }
            case GAMIFICATION_EVENTS.TRANSACTION_UPDATED: {
                const transaction = payload.transaction;
                // Currently challenge/mission logic on update just recalculates based on new amount
                await challengeService.checkChallengeProgress(userId, transaction, session);
                break;
            }
            case GAMIFICATION_EVENTS.TRANSACTION_DELETED: {
                const transaction = payload.transaction;
                await challengeService.checkChallengeProgress(userId, transaction, session);
                // Badge evaluation might need to be run, but for simplicity we skip reversing badges
                break;
            }
            default:
                console.warn(`[GamificationEngine] Unknown event type: ${eventType}`);
                break;
        }

        // 3. Calculate Deltas to return to the UI immediately
        if (session) {
            // Need to fetch outside the transaction session if we want immediate read? 
            // Wait, if we use the same session, we can read uncommitted state.
            let profileAfter = await xpService.getGamificationProfile(userId); // wait we need to pass session if we are in txn
            // the getGamificationProfile doesn't accept session currently, we must fetch directly
            const Gamification = (await import('../models/Gamification.js')).default;
            profileAfter = await Gamification.findOne({ user: userId }).session(session);
            
            if (profileAfter) {
                results.xpGained = Math.max(0, profileAfter.xp - xpBefore);
                
                // Extract newly unlocked badges 
                if (profileAfter.badges.length > badgesBefore) {
                    const newBadgesCount = profileAfter.badges.length - badgesBefore;
                    // Usually appended at the end
                    results.badgesUnlocked = profileAfter.badges.slice(-newBadgesCount).map(b => b.name);
                }
            }
        } else {
             const Gamification = (await import('../models/Gamification.js')).default;
             const profileAfter = await Gamification.findOne({ user: userId });
             if (profileAfter) {
                 results.xpGained = Math.max(0, profileAfter.xp - xpBefore);
                 if (profileAfter.badges.length > badgesBefore) {
                     const newBadgesCount = profileAfter.badges.length - badgesBefore;
                     results.badgesUnlocked = profileAfter.badges.slice(-newBadgesCount).map(b => b.name);
                 }
             }
        }

        return results;

    } catch (error) {
        console.error(`[GamificationEngine] Error processing event ${eventType}:`, error);
        return results;
    }
};
