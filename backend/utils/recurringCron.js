import RecurringExpense from '../models/RecurringExpense.js';
import Transaction from '../models/transaction.js';
import FamilyGroup from '../models/FamilyGroup.js';
import { withTransaction } from './transactionWrapper.js';
import { addXP, checkStreak } from '../services/xpService.js';
import { checkBadges } from '../services/badgeService.js';
import { checkChallengeProgress } from '../services/challengeService.js';
import { checkMissionProgress } from '../services/missionService.js';
import { logAction } from '../services/auditLogService.js';

export const processRecurringExpenses = async () => {
    console.log('--- Processing Recurring Expenses ---');
    const today = new Date();

    try {
        const recurringItems = await RecurringExpense.find({
            status: 'active',
            nextOccurrence: { $lte: today }
        });

        console.log(`Found ${recurringItems.length} recurring items to process.`);

        for (const item of recurringItems) {
            await withTransaction(async (session) => {
                // If this is a family recurring expense, verify membership
                if (item.familyGroupId) {
                    const group = await FamilyGroup.findOne({
                        _id: item.familyGroupId,
                        isActive: true,
                        'members.userId': item.user,
                    });
                    if (!group) {
                        console.log(`Skipping family recurring ${item._id} — user no longer in group.`);
                        item.status = 'paused';
                        await item.save({ session });
                        return;
                    }
                }

                // Create Transaction
                const txData = {
                    user: item.user,
                    type: 'debit',
                    amount: item.amount,
                    category: item.category,
                    description: `Recurring: ${item.description || item.category}`,
                    date: item.nextOccurrence,
                    source: 'manual',
                    status: 'completed',
                    isNonEssential: !item.isEssential,
                };

                // Family fields
                if (item.familyGroupId) {
                    txData.familyGroupId = item.familyGroupId;
                    txData.spentBy = item.user;
                    txData.mode = 'FAMILY';
                }

                const newTx = new Transaction(txData);
                await newTx.save({ session });

                // Gamification Sync
                await addXP(item.user, 5, 'recurring_processed', session);
                await checkStreak(item.user, session);
                await checkBadges(item.user, session);
                await checkChallengeProgress(item.user, newTx, session);
                await checkMissionProgress(item.user, newTx, session);

                // Audit log for family recurring
                if (item.familyGroupId) {
                    await logAction(
                        item.familyGroupId, item.user,
                        'RECURRING_PROCESSED',
                        `Auto-generated ₹${item.amount} in ${item.category}`,
                        session
                    );
                }

                // Update Recurring Expense
                item.lastGeneratedTransaction = newTx._id;

                // Calculate next occurrence
                const next = new Date(item.nextOccurrence);
                switch (item.frequency) {
                    case 'daily': next.setDate(next.getDate() + 1); break;
                    case 'weekly': next.setDate(next.getDate() + 7); break;
                    case 'monthly': next.setMonth(next.getMonth() + 1); break;
                    case 'quarterly': next.setMonth(next.getMonth() + 3); break;
                    case 'yearly': next.setFullYear(next.getFullYear() + 1); break;
                }
                item.nextOccurrence = next;

                await item.save({ session });
                console.log(`Generated transaction and synced gamification for item ${item._id}`);
            });
        }
    } catch (error) {
        console.error('Error processing recurring expenses:', error);
    }
};
