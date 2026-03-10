import Challenge from '../models/Challenge.js';
import { addXP } from './xpService.js';

export const checkChallengeProgress = async (userId, transaction, session = null) => {
    try {
        const now = new Date();

        // Find active challenges for this user
        const challenges = await Challenge.find({
            user: userId,
            status: 'active',
        }).session(session);

        for (const challenge of challenges) {
            let updated = false;

            // --- Check if challenge has expired ---
            if (new Date(challenge.endDate) < now) {
                if (challenge.type === 'spendingLimit' || challenge.type === 'noSpend') {
                    // User stayed under limit — SUCCESS
                    if (challenge.progressAmount <= challenge.targetAmount) {
                        challenge.status = 'completed';
                        await addXP(userId, challenge.xpReward, `challenge_completed_${challenge._id}`, session);
                    } else {
                        challenge.status = 'failed';
                    }
                } else {
                    // For saving/income targets: if target not met by deadline, fail
                    if (challenge.progressAmount < challenge.targetAmount) {
                        challenge.status = 'failed';
                    }
                }
                await challenge.save({ session });
                continue;
            }

            // 1. Spending Limit / No Spend Check
            if (challenge.type === 'spendingLimit' || challenge.type === 'noSpend') {
                if (transaction.type === 'debit' &&
                    (challenge.category === 'All' || challenge.category === 'Total' ||
                        challenge.category.toLowerCase() === transaction.category.toLowerCase())) {

                    challenge.progressAmount += transaction.amount;
                    updated = true;

                    // Check Failure — exceeded limit
                    if (challenge.progressAmount > challenge.targetAmount) {
                        challenge.status = 'failed';
                    }
                }
            }
            // 2. Saving Target Check
            else if (challenge.type === 'savingTarget') {
                if (transaction.type === 'credit' ||
                    (transaction.type === 'debit' && (transaction.category === 'Savings' || transaction.category === 'Investment'))) {

                    challenge.progressAmount += transaction.amount;
                    updated = true;

                    // Check Completion
                    if (challenge.progressAmount >= challenge.targetAmount) {
                        challenge.status = 'completed';
                        await addXP(userId, challenge.xpReward, `challenge_completed_${challenge._id}`, session);
                    }
                }
            }
            // 3. Income Target Check
            else if (challenge.type === 'incomeTarget') {
                if (transaction.type === 'credit') {
                    challenge.progressAmount += transaction.amount;
                    updated = true;

                    if (challenge.progressAmount >= challenge.targetAmount) {
                        challenge.status = 'completed';
                        await addXP(userId, challenge.xpReward, `challenge_completed_${challenge._id}`, session);
                    }
                }
            }

            if (updated) await challenge.save({ session });
        }
    } catch (error) {
        console.error('Error checking challenges:', error);
    }
};
