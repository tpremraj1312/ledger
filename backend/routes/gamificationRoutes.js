import express from 'express';
import {
    getDashboardData,
    getProfile,
    awardXP,
    getXPBreakdown,
    createChallenge,
    getActiveChallenges,
    updateChallenge,
    generateMissions,
    updateMissionStatus,
    getActiveQuests,
    updateQuestProgress,
    completeQuest,
    getBadges,
    checkBadgeUnlocks,
    getWellnessScore,
    getWellnessHistory,
} from '../controllers/gamificationController.js';

const router = express.Router();

// Auth is applied globally in server.js — no need to duplicate here.

// Aggregate dashboard
router.get('/dashboard', getDashboardData);

// Profile
router.get('/profile', getProfile);

// XP
router.post('/award-xp', awardXP);
router.get('/xp/today', getXPBreakdown);

// Quests / Missions
router.get('/quests/active', getActiveQuests);
router.post('/quests/generate', generateMissions);
router.patch('/quests/:id/update-progress', updateQuestProgress);
router.post('/quests/:id/complete', completeQuest);

// Legacy mission routes (backward compat)
router.post('/missions/generate', generateMissions);
router.patch('/missions/:id', updateMissionStatus);

// Challenges
router.get('/challenges/active', getActiveChallenges);
router.post('/challenges', createChallenge);
router.patch('/challenges/:id', updateChallenge);

// Badges
router.get('/badges', getBadges);
router.post('/badges/check-unlocks', checkBadgeUnlocks);

// Wellness
router.get('/wellness/score', getWellnessScore);
router.get('/wellness/history', getWellnessHistory);

export default router;
