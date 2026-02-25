import crypto from 'crypto';
import mongoose from 'mongoose';
import FamilyGroup from '../models/FamilyGroup.js';
import FamilyInvite from '../models/FamilyInvite.js';
import FamilyBudget from '../models/FamilyBudget.js';
import Transaction from '../models/transaction.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/user.js';
import Notification from '../models/notification.js';
import { logAction } from '../services/auditLogService.js';
import { withTransaction } from '../utils/transactionWrapper.js';
import { addXP, checkStreak } from '../services/xpService.js';
import { checkBadges } from '../services/badgeService.js';
import { checkChallengeProgress } from '../services/challengeService.js';
import { checkMissionProgress } from '../services/missionService.js';

// ─── Group Management ───────────────────────────────────────

export const createGroup = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Group name is required.' });
        }

        // User must not already belong to a family
        if (req.user.currentFamilyId) {
            return res.status(409).json({ message: 'You already belong to a family group.' });
        }

        let group;
        await withTransaction(async (session) => {
            group = await FamilyGroup.create([{
                name: name.trim(),
                createdBy: req.user._id,
                members: [{ user: req.user._id, role: 'ADMIN' }],
            }], { session });
            group = group[0]; // .create with session returns array

            // Set currentFamilyId on the user
            await User.findByIdAndUpdate(req.user._id, {
                currentFamilyId: group._id,
            }, { session });

            await logAction(group._id, req.user._id, 'GROUP_CREATED', `Group "${group.name}" created`, session);
        });

        res.status(201).json(group);
    } catch (error) {
        console.error('createGroup error:', error);
        if (error.code === 11000) {
            return res.status(409).json({ message: 'You already have a family with this name.' });
        }
        res.status(500).json({ message: 'Failed to create group.' });
    }
};

export const getMyGroup = async (req, res) => {
    try {
        if (!req.user.currentFamilyId) {
            return res.json({ group: null });
        }

        const group = await FamilyGroup.findOne({
            _id: req.user.currentFamilyId,
            isActive: true,
            'members.user': req.user._id,
        }).populate('members.user', 'username email').lean();

        if (!group) {
            // Stale currentFamilyId — clean it up
            await User.findByIdAndUpdate(req.user._id, { currentFamilyId: null });
            return res.json({ group: null });
        }

        res.json({ group });
    } catch (error) {
        console.error('getMyGroup error:', error);
        res.status(500).json({ message: 'Failed to fetch group.' });
    }
};

// ─── Invitation Flow ────────────────────────────────────────

export const inviteMember = async (req, res) => {
    try {
        const { email } = req.body;
        const groupId = req.familyGroup._id; // From requireFamily middleware

        if (!email || !email.trim()) {
            return res.status(400).json({ message: 'Email is required.' });
        }

        // Check if the user exists
        const emailUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (!emailUser) {
            return res.status(404).json({ message: 'User not found. They must register first before they can be invited.' });
        }

        // Check if the user is already part of ANY family
        if (emailUser.currentFamilyId) {
            return res.status(409).json({ message: 'This user is already part of a family group.' });
        }

        // Check for pending invite for same email + group
        const pendingInvite = await FamilyInvite.findOne({
            groupId,
            email: email.toLowerCase().trim(),
            used: false,
            expiresAt: { $gt: new Date() },
        });
        if (pendingInvite) {
            return res.status(409).json({ message: 'A pending invite already exists for this user.' });
        }

        // Generate tokenHash for schema compliance, though we primarily use invite._id now
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        const invite = await FamilyInvite.create({
            groupId,
            invitedBy: req.user._id,
            email: email.toLowerCase().trim(),
            tokenHash,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        });

        // Trigger in-app notification for the invited user
        await Notification.create({
            user: emailUser._id,
            type: 'FAMILY_INVITE',
            message: `You have been invited to join the family group "${req.familyGroup.name}" by ${req.user.username}.`,
            invite: invite._id,
        });

        await logAction(groupId, req.user._id, 'MEMBER_INVITED', `Invited ${emailUser.username}`);

        res.json({
            message: 'Invitation sent to user successfully.',
            expiresIn: '24 hours',
        });
    } catch (error) {
        console.error('inviteMember error:', error);
        res.status(500).json({ message: 'Failed to send invitation.' });
    }
};

export const acceptInvite = async (req, res) => {
    try {
        const { inviteId } = req.body;

        if (!inviteId) {
            return res.status(400).json({ message: 'Invite ID is required.' });
        }

        // User must not already belong to a family
        if (req.user.currentFamilyId) {
            return res.status(409).json({ message: 'You already belong to a family group. Leave your current family first.' });
        }

        const invite = await FamilyInvite.findOne({
            _id: inviteId,
            used: false,
            expiresAt: { $gt: new Date() },
        });

        if (!invite) {
            return res.status(404).json({ message: 'Invalid or expired invite.' });
        }

        // Ensure the invite matches the logged-in user's email
        if (invite.email !== req.user.email) {
            return res.status(403).json({ message: 'This invite is not for you.' });
        }

        const group = await FamilyGroup.findById(invite.groupId);
        if (!group || !group.isActive) {
            return res.status(410).json({ message: 'This group no longer exists.' });
        }

        // Already a member check
        const alreadyMember = group.members.some(
            (m) => m.user.toString() === req.user._id.toString()
        );
        if (alreadyMember) {
            return res.status(409).json({ message: 'You are already a member of this group.' });
        }

        await withTransaction(async (session) => {
            // Re-check inside transaction
            const freshInvite = await FamilyInvite.findOne({
                _id: inviteId,
                used: false,
                expiresAt: { $gt: new Date() },
            }).session(session);

            if (!freshInvite) {
                throw new Error('This invitation has already been used or expired.');
            }

            const freshGroup = await FamilyGroup.findById(freshInvite.groupId).session(session);
            if (!freshGroup || !freshGroup.isActive) {
                throw new Error('This family group no longer exists.');
            }

            const alreadyMember = freshGroup.members.some(
                (m) => m.user.toString() === req.user._id.toString()
            );
            if (alreadyMember) {
                throw new Error('You are already a member of this group.');
            }

            freshGroup.members.push({ user: req.user._id, role: 'VIEWER' });
            await freshGroup.save({ session });

            freshInvite.used = true;
            await freshInvite.save({ session });

            // Set currentFamilyId on the joining user
            await User.findByIdAndUpdate(req.user._id, {
                currentFamilyId: freshGroup._id,
            }, { session });

            // Award engagement XP for joining a family
            await addXP(req.user._id, 10, 'JOIN_FAMILY', session);

            // Notify the user who invited them
            await Notification.create([{
                user: freshInvite.invitedBy,
                type: 'INFO',
                message: `${req.user.username} accepted your invitation to join "${freshGroup.name}".`,
            }], { session });

            // Mark the invite notification as read for the joining user
            await Notification.updateMany(
                { user: req.user._id, invite: inviteId },
                { $set: { read: true } },
                { session }
            );

            await logAction(freshGroup._id, req.user._id, 'MEMBER_JOINED', `User joined group`, session);
        });

        res.json({ message: 'Successfully joined the family group!' });
    } catch (error) {
        console.error('acceptInvite error:', error);
        const msg = error.message?.includes('already') ? error.message : 'Failed to accept invitation.';
        res.status(500).json({ message: msg });
    }
};

export const declineInvite = async (req, res) => {
    try {
        const { inviteId } = req.body;

        if (!inviteId) {
            return res.status(400).json({ message: 'Invite ID is required.' });
        }

        const invite = await FamilyInvite.findOne({
            _id: inviteId,
            used: false,
            expiresAt: { $gt: new Date() },
        });

        if (!invite) {
            return res.status(404).json({ message: 'Invalid or expired invite.' });
        }

        // Ensure the invite matches the logged-in user's email
        if (invite.email !== req.user.email) {
            return res.status(403).json({ message: 'This invite is not for you.' });
        }

        await withTransaction(async (session) => {
            const freshInvite = await FamilyInvite.findOne({
                _id: inviteId,
                used: false,
            }).session(session);

            if (!freshInvite) {
                throw new Error('This invitation has already been processed.');
            }

            freshInvite.used = true; // Mark used so it doesn't appear pending
            await freshInvite.save({ session });

            // Notify the user who invited them
            const group = await FamilyGroup.findById(freshInvite.groupId).session(session);
            await Notification.create([{
                user: freshInvite.invitedBy,
                type: 'INFO',
                message: `${req.user.username} declined your invitation to join "${group?.name || 'the family'}".`,
            }], { session });

            // Mark the invite notification as read for the declining user
            await Notification.updateMany(
                { user: req.user._id, invite: inviteId },
                { $set: { read: true } },
                { session }
            );
        });

        res.json({ message: 'Invitation declined.' });
    } catch (error) {
        console.error('declineInvite error:', error);
        res.status(500).json({ message: 'Failed to decline invitation.' });
    }
};

export const getPendingInvites = async (req, res) => {
    try {
        const groupId = req.familyGroup._id; // From requireFamily middleware

        const invites = await FamilyInvite.find({
            groupId,
            used: false,
            expiresAt: { $gt: new Date() },
        }).select('email expiresAt createdAt').lean();

        res.json(invites);
    } catch (error) {
        console.error('getPendingInvites error:', error);
        res.status(500).json({ message: 'Failed to fetch invites.' });
    }
};

// ─── Member Management ──────────────────────────────────────

export const removeMember = async (req, res) => {
    try {
        const { memberId } = req.body;
        const group = req.familyGroup;

        if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
            return res.status(400).json({ message: 'Valid member ID is required.' });
        }

        if (memberId === req.user._id.toString()) {
            return res.status(400).json({ message: 'Use the leave endpoint to remove yourself.' });
        }

        await withTransaction(async (session) => {
            const freshGroup = await FamilyGroup.findById(group._id).session(session);
            const memberIndex = freshGroup.members.findIndex(
                (m) => m.user.toString() === memberId
            );
            if (memberIndex === -1) {
                throw new Error('Member not found in group.');
            }

            freshGroup.members.splice(memberIndex, 1);
            await freshGroup.save({ session });

            // Clear removed member's currentFamilyId
            await User.findByIdAndUpdate(memberId, { currentFamilyId: null }, { session });

            await logAction(freshGroup._id, req.user._id, 'MEMBER_REMOVED', `Removed user ${memberId}`, session);
        });

        res.json({ message: 'Member removed.' });
    } catch (error) {
        console.error('removeMember error:', error);
        res.status(500).json({ message: error.message || 'Failed to remove member.' });
    }
};

export const updateRole = async (req, res) => {
    try {
        const { memberId, role } = req.body;
        const group = req.familyGroup;

        if (!['ADMIN', 'MEMBER', 'VIEWER'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role. Must be ADMIN, MEMBER, or VIEWER.' });
        }

        if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
            return res.status(400).json({ message: 'Valid member ID is required.' });
        }

        if (memberId === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot change your own role.' });
        }

        const member = group.members.find(
            (m) => m.user.toString() === memberId
        );
        if (!member) {
            return res.status(404).json({ message: 'Member not found.' });
        }

        // Prevent removing last ADMIN
        if (member.role === 'ADMIN' && role !== 'ADMIN') {
            const adminCount = group.members.filter((m) => m.role === 'ADMIN').length;
            if (adminCount <= 1) {
                return res.status(400).json({ message: 'Cannot demote the last admin. Promote another member first.' });
            }
        }

        member.role = role;
        await group.save();

        await logAction(group._id, req.user._id, 'ROLE_CHANGED', `Changed ${memberId} to ${role}`);

        res.json({ message: 'Role updated.' });
    } catch (error) {
        console.error('updateRole error:', error);
        res.status(500).json({ message: 'Failed to update role.' });
    }
};

export const transferOwnership = async (req, res) => {
    try {
        const { memberId } = req.body;
        const group = req.familyGroup;

        if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
            return res.status(400).json({ message: 'Valid member ID is required.' });
        }

        if (memberId === req.user._id.toString()) {
            return res.status(400).json({ message: 'You are already the owner.' });
        }

        const targetMember = group.members.find(
            (m) => m.user.toString() === memberId
        );
        if (!targetMember) {
            return res.status(404).json({ message: 'Member not found.' });
        }

        // Promote target to ADMIN, demote self to MEMBER
        targetMember.role = 'ADMIN';
        const selfMember = group.members.find(
            (m) => m.user.toString() === req.user._id.toString()
        );
        selfMember.role = 'MEMBER';
        group.createdBy = new mongoose.Types.ObjectId(memberId);

        await group.save();

        await logAction(group._id, req.user._id, 'OWNERSHIP_TRANSFERRED', `Transferred ownership to ${memberId}`);

        res.json({ message: 'Ownership transferred successfully.' });
    } catch (error) {
        console.error('transferOwnership error:', error);
        res.status(500).json({ message: 'Failed to transfer ownership.' });
    }
};

export const leaveGroup = async (req, res) => {
    try {
        const group = req.familyGroup;

        const isAdmin = req.familyRole === 'ADMIN';
        const adminCount = group.members.filter((m) => m.role === 'ADMIN').length;

        // Sole admin cannot leave unless group is dissolved or another admin exists
        if (isAdmin && adminCount <= 1 && group.members.length > 1) {
            return res.status(400).json({
                message: 'You are the only admin. Please transfer ownership or dissolve the group.',
            });
        }

        await withTransaction(async (session) => {
            const freshGroup = await FamilyGroup.findById(group._id).session(session);
            freshGroup.members = freshGroup.members.filter(
                (m) => m.user.toString() !== req.user._id.toString()
            );

            // If no members left, dissolve
            if (freshGroup.members.length === 0) {
                freshGroup.isActive = false;
            }

            await freshGroup.save({ session });

            // Clear leaving user's currentFamilyId
            await User.findByIdAndUpdate(req.user._id, { currentFamilyId: null }, { session });

            await logAction(freshGroup._id, req.user._id, 'MEMBER_LEFT', 'Left the group', session);
        });

        res.json({ message: 'You have left the group.' });
    } catch (error) {
        console.error('leaveGroup error:', error);
        res.status(500).json({ message: 'Failed to leave group.' });
    }
};

export const dissolveGroup = async (req, res) => {
    try {
        const group = req.familyGroup;

        await withTransaction(async (session) => {
            // 1. Delete all family transactions
            await Transaction.deleteMany({
                familyGroupId: group._id,
                mode: 'FAMILY',
            }).session(session);

            // 2. Delete all family budgets
            await FamilyBudget.deleteMany({
                groupId: group._id,
            }).session(session);

            // 3. Delete all audit logs
            await AuditLog.deleteMany({
                groupId: group._id,
            }).session(session);

            // 4. Delete all family invites
            await FamilyInvite.deleteMany({
                groupId: group._id,
            }).session(session);

            // 5. Clear currentFamilyId for all members
            const memberUserIds = group.members.map((m) => m.user);
            await User.updateMany(
                { _id: { $in: memberUserIds } },
                { currentFamilyId: null },
                { session }
            );

            // 6. Delete the family group document (hard delete)
            await FamilyGroup.findByIdAndDelete(group._id).session(session);
        });

        res.json({ message: 'Family group has been permanently dissolved and all data deleted.' });
    } catch (error) {
        console.error('dissolveGroup error:', error);
        res.status(500).json({ message: 'Failed to dissolve group.' });
    }
};

// ─── Audit Log ──────────────────────────────────────────────

export const getAuditLog = async (req, res) => {
    try {
        const groupId = req.familyGroup._id; // From requireFamily middleware
        const { page = 1, limit = 30 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const logs = await AuditLog.find({ groupId })
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('userId', 'username email')
            .lean();

        const total = await AuditLog.countDocuments({ groupId });

        res.json({ logs, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
    } catch (error) {
        console.error('getAuditLog error:', error);
        res.status(500).json({ message: 'Failed to fetch audit log.' });
    }
};

// ─── Family Transactions ────────────────────────────────────

export const getFamilyTransactions = async (req, res) => {
    try {
        const { startDate, endDate, category, memberId } = req.query;
        const groupId = req.familyGroup._id; // From requireFamily middleware

        const query = {
            familyGroupId: groupId,
            mode: 'FAMILY',
            isDeleted: false,
        };

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setUTCHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }

        if (category) query.category = category;
        if (memberId && mongoose.Types.ObjectId.isValid(memberId)) {
            query.spentBy = new mongoose.Types.ObjectId(memberId);
        }

        const transactions = await Transaction.find(query)
            .sort({ date: -1 })
            .populate('spentBy', 'username email')
            .lean();

        res.json(transactions);
    } catch (error) {
        console.error('getFamilyTransactions error:', error);
        res.status(500).json({ message: 'Failed to fetch family transactions.' });
    }
};

export const addFamilyTransaction = async (req, res) => {
    try {
        const { type, amount, category, date, description } = req.body;
        const groupId = req.familyGroup._id; // From requireFamily middleware

        if (!type || !amount || !category || !date) {
            return res.status(400).json({ message: 'type, amount, category, and date are required.' });
        }

        if (!['debit', 'credit'].includes(type)) {
            return res.status(400).json({ message: 'Type must be debit or credit.' });
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ message: 'Amount must be a positive number.' });
        }

        const txData = {
            user: req.user._id,
            type,
            amount: parsedAmount,
            category: category.trim(),
            date: new Date(date),
            description: description || '',
            source: 'manual',
            status: 'completed',
            familyGroupId: groupId,
            spentBy: req.user._id,
            mode: 'FAMILY',
        };

        let newTx;
        await withTransaction(async (session) => {
            newTx = new Transaction(txData);
            await newTx.save({ session });

            // Gamification sync
            await addXP(req.user._id, 10, 'family_transaction', session);
            await checkStreak(req.user._id, session);
            await checkBadges(req.user._id, session);
            await checkChallengeProgress(req.user._id, newTx, session);
            await checkMissionProgress(req.user._id, newTx, session);

            await logAction(groupId, req.user._id, 'TRANSACTION_ADDED',
                `Added ${type} ₹${parsedAmount} in ${category}`, session);
        });

        res.status(201).json(newTx);
    } catch (error) {
        console.error('addFamilyTransaction error:', error);
        res.status(500).json({ message: 'Failed to add family transaction.' });
    }
};

export const editFamilyTransaction = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const groupId = req.familyGroup._id;
        const { type, amount, category, date, description } = req.body;

        if (!transactionId || !mongoose.Types.ObjectId.isValid(transactionId)) {
            return res.status(400).json({ message: 'Valid transaction ID is required.' });
        }

        const tx = await Transaction.findOne({
            _id: transactionId,
            familyGroupId: groupId,
            mode: 'FAMILY',
            isDeleted: false,
        });

        if (!tx) {
            return res.status(404).json({ message: 'Transaction not found.' });
        }

        // Members can only edit their own transactions
        if (req.familyRole === 'MEMBER' && tx.spentBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Members can only edit their own transactions.' });
        }

        if (type && ['debit', 'credit'].includes(type)) tx.type = type;
        if (amount) {
            const parsedAmount = parseFloat(amount);
            if (!isNaN(parsedAmount) && parsedAmount > 0) tx.amount = parsedAmount;
        }
        if (category) tx.category = category.trim();
        if (date) tx.date = new Date(date);
        if (description !== undefined) tx.description = description;

        await tx.save();

        await logAction(groupId, req.user._id, 'TRANSACTION_EDITED',
            `Edited transaction ${transactionId}`);

        res.json(tx);
    } catch (error) {
        console.error('editFamilyTransaction error:', error);
        res.status(500).json({ message: 'Failed to edit transaction.' });
    }
};

export const deleteFamilyTransaction = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const groupId = req.familyGroup._id;

        if (!transactionId || !mongoose.Types.ObjectId.isValid(transactionId)) {
            return res.status(400).json({ message: 'Valid transaction ID is required.' });
        }

        const tx = await Transaction.findOne({
            _id: transactionId,
            familyGroupId: groupId,
            mode: 'FAMILY',
            isDeleted: false,
        });

        if (!tx) {
            return res.status(404).json({ message: 'Transaction not found.' });
        }

        tx.isDeleted = true;
        await tx.save();

        await logAction(groupId, req.user._id, 'TRANSACTION_DELETED',
            `Deleted transaction ₹${tx.amount} in ${tx.category}`);

        res.json({ message: 'Transaction deleted.' });
    } catch (error) {
        console.error('deleteFamilyTransaction error:', error);
        res.status(500).json({ message: 'Failed to delete transaction.' });
    }
};
