import Challenge from '../models/Challenge.js';
import { addXP } from './xpService.js';

export const checkChallengeProgress = async (userId, transaction, session = null) => {
    try {
        // Find active challenges for this user that partially match the transaction
        const challenges = await Challenge.find({
            user: userId,
            status: 'active',
            endDate: { $gte: new Date() }
        }).session(session);

        for (const challenge of challenges) {
            let updated = false;

            // 1. Spending Limit / No Spend Check
            if (challenge.type === 'spendingLimit' || challenge.type === 'noSpend') {
                if (transaction.type === 'debit' &&
                    (challenge.category === 'All' || challenge.category === transaction.category)) {

                    challenge.progressAmount += transaction.amount;
                    updated = true;

                    // Check Failure
                    if (challenge.progressAmount > challenge.targetAmount) {
                        challenge.status = 'failed';
                        // No XP for failure
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
                        await addXP(userId, challenge.xpReward, 'challenge_completed', session);
                    }
                }
            }

            if (updated) await challenge.save({ session });
        }
    } catch (error) {
        console.error('Error checking challenges:', error);
    }
};
