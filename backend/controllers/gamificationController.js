import * as xpService from '../services/xpService.js';
import * as badgeService from '../services/badgeService.js';
import * as missionService from '../services/missionService.js';
import * as wellnessService from '../services/wellnessService.js';
import Challenge from '../models/Challenge.js';
import Mission from '../models/Mission.js';

// ─────────── Dashboard (aggregate) ───────────
export const getDashboardData = async (req, res) => {
    try {
        const userId = req.user._id;
        const profile = await xpService.getGamificationProfile(userId);
        const activeChallenges = await Challenge.find({ user: userId, status: 'active' });
        const wellness = await wellnessService.calculateWellnessScore(userId);
        const missions = await Mission.find({
            user: userId,
            status: { $ne: 'rejected' }
        }).sort({ createdAt: -1 }).limit(10);

        const todayXP = await xpService.getTodayXPBreakdown(userId);
        const allBadges = badgeService.getAllBadgeDefinitions();

        res.json({
            profile,
            activeChallenges,
            wellness,
            missions,
            todayXP,
            allBadges,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching gamification data', error: error.message });
    }
};

// ─────────── Profile ───────────
export const getProfile = async (req, res) => {
    try {
        const profile = await xpService.getGamificationProfile(req.user._id);
        res.json(profile);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile' });
    }
};

// ─────────── XP ───────────
export const awardXP = async (req, res) => {
    try {
        const { amount, reason } = req.body;
        const result = await xpService.addXP(req.user._id, amount || 2, reason || 'manual');
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error awarding XP' });
    }
};

export const getXPBreakdown = async (req, res) => {
    try {
        const breakdown = await xpService.getTodayXPBreakdown(req.user._id);
        res.json(breakdown);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching XP breakdown' });
    }
};

// ─────────── Challenges ───────────
export const createChallenge = async (req, res) => {
    try {
        const { title, category, type, targetAmount, startDate, endDate } = req.body;
        if (!title || !category || !type || !targetAmount || !startDate || !endDate) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const challenge = await Challenge.create({
            user: req.user._id,
            title, category, type, targetAmount,
            startDate: new Date(startDate),
            endDate: new Date(endDate)
        });
        res.status(201).json(challenge);
    } catch (error) {
        res.status(500).json({ message: 'Error creating challenge' });
    }
};

export const getActiveChallenges = async (req, res) => {
    try {
        const challenges = await Challenge.find({ user: req.user._id, status: 'active' });
        res.json(challenges);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching challenges' });
    }
};

export const updateChallenge = async (req, res) => {
    try {
        const challenge = await Challenge.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            req.body,
            { new: true }
        );
        res.json(challenge);
    } catch (error) {
        res.status(500).json({ message: 'Error updating challenge' });
    }
};

// ─────────── Missions / Quests ───────────
export const generateMissions = async (req, res) => {
    try {
        const missions = await missionService.generateWeeklyMissions(req.user._id);
        res.json(missions);
    } catch (error) {
        res.status(500).json({ message: 'Error generating missions' });
    }
};

export const updateMissionStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const mission = await Mission.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        res.json(mission);
    } catch (error) {
        res.status(500).json({ message: 'Error updating mission' });
    }
};

export const getActiveQuests = async (req, res) => {
    try {
        const quests = await Mission.find({
            user: req.user._id,
            status: { $in: ['pending', 'accepted'] },
            weekEndDate: { $gte: new Date() }
        }).sort({ createdAt: -1 });
        res.json(quests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quests' });
    }
};

export const updateQuestProgress = async (req, res) => {
    try {
        const { progressAmount } = req.body;
        const mission = await Mission.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { $inc: { progressAmount: progressAmount || 0 } },
            { new: true }
        );
        res.json(mission);
    } catch (error) {
        res.status(500).json({ message: 'Error updating quest progress' });
    }
};

export const completeQuest = async (req, res) => {
    try {
        const result = await missionService.completeMission(req.params.id, req.user._id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message || 'Error completing quest' });
    }
};

// ─────────── Badges ───────────
export const getBadges = async (req, res) => {
    try {
        const profile = await xpService.getGamificationProfile(req.user._id);
        const allBadges = badgeService.getAllBadgeDefinitions();
        res.json({ unlocked: profile.badges, allBadges });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching badges' });
    }
};

export const checkBadgeUnlocks = async (req, res) => {
    try {
        const newBadges = await badgeService.checkBadges(req.user._id);
        res.json({ newBadges });
    } catch (error) {
        res.status(500).json({ message: 'Error checking badges' });
    }
};

// ─────────── Wellness ───────────
export const getWellnessScore = async (req, res) => {
    try {
        const wellness = await wellnessService.calculateWellnessScore(req.user._id);
        res.json(wellness);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching wellness score' });
    }
};

export const getWellnessHistory = async (req, res) => {
    try {
        const history = await wellnessService.getWellnessHistory(req.user._id);
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching wellness history' });
    }
};
