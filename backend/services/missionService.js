import Mission from '../models/Mission.js';
import Transaction from '../models/transaction.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { addXP } from './xpService.js';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateWeeklyMissions = async (userId) => {
    try {
        const lastMonthTransactions = await Transaction.find({
            user: userId,
            date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }).limit(20);

        if (lastMonthTransactions.length === 0) return [];

        const txSummary = lastMonthTransactions.map(t => `${t.type} ${t.amount} on ${t.category}`).join('\n');

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        const prompt = `
        Analyze these recent financial transactions:
        ${txSummary}

        Generate 3 personalized, realistic financial missions for this user.
        Include a mix: 1 daily mission, 2 weekly missions.
        Examples: "Reduce Food spending by 10%", "Save ₹500 this week", "No shopping for 3 days".
        
        Return ONLY valid JSON array:
        [
            {
                "title": "Mission Title",
                "description": "Why and how",
                "category": "Food/Transport/Savings/etc",
                "type": "daily or weekly",
                "difficulty": "easy or medium or hard",
                "targetAmount": 1000,
                "xpReward": 20
            }
        ]
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const missionsData = JSON.parse(jsonText);

        const newMissions = [];
        const now = new Date();
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + 7);

        for (const m of missionsData) {
            const endDate = m.type === 'daily'
                ? new Date(new Date().setHours(23, 59, 59, 999))
                : endOfWeek;

            const mission = await Mission.create({
                user: userId,
                weekStartDate: now,
                weekEndDate: endDate,
                title: m.title,
                description: m.description,
                category: m.category,
                type: m.type || 'weekly',
                difficulty: m.difficulty || 'medium',
                targetAmount: m.targetAmount || 0,
                xpReward: m.xpReward || (m.difficulty === 'hard' ? 40 : m.difficulty === 'easy' ? 15 : 25),
                targetRule: m,
                status: 'pending'
            });
            newMissions.push(mission);
        }

        return newMissions;
    } catch (error) {
        console.error('Error generating missions:', error);
        return [];
    }
};

export const checkMissionProgress = async (userId, transaction, session = null) => {
    try {
        const missions = await Mission.find({
            user: userId,
            status: 'accepted',
            weekEndDate: { $gte: new Date() }
        }).session(session);

        for (const mission of missions) {
            // Only update if category matches and it's a debit
            if (mission.category && transaction.category === mission.category && transaction.type === 'debit') {

                // --- ATOMIC PROGRESS UPDATE ---
                const updatedMission = await Mission.findOneAndUpdate(
                    {
                        _id: mission._id,
                        status: 'accepted' // Ensure it's still active
                    },
                    {
                        $inc: { progressAmount: transaction.amount }
                    },
                    { new: true, session }
                );

                if (!updatedMission) continue;

                // --- AUTO-COMPLETE LOGIC ---
                if (updatedMission.targetAmount > 0 && updatedMission.progressAmount >= updatedMission.targetAmount) {
                    await Mission.updateOne(
                        { _id: updatedMission._id },
                        { $set: { status: 'completed' } },
                        { session }
                    );

                    // Award XP with a unique reason to prevent double-award
                    await addXP(userId, updatedMission.xpReward, `quest_completed_${updatedMission._id}`, session);
                }
            }
        }
    } catch (error) {
        console.error('Error checking missions:', error);
    }
};

/**
 * Manually complete/claim a quest.
 */
export const completeMission = async (missionId, userId) => {
    const mission = await Mission.findOne({ _id: missionId, user: userId });
    if (!mission) throw new Error('Mission not found');
    if (mission.status === 'completed') throw new Error('Already completed');

    mission.status = 'completed';
    await mission.save();

    const xpResult = await addXP(userId, mission.xpReward, `quest_claimed_${mission._id}`);
    return { mission, xpResult };
};
