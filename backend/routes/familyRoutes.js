import express from 'express';
import requireFamily from '../middleware/enforceFamilyIsolation.js';
import requireRole from '../middleware/rbacMiddleware.js';
import {
    createGroup,
    getMyGroup,
    inviteMember,
    acceptInvite,
    declineInvite,
    getPendingInvites,
    removeMember,
    updateRole,
    transferOwnership,
    leaveGroup,
    dissolveGroup,
    getAuditLog,
    getFamilyTransactions,
    addFamilyTransaction,
    editFamilyTransaction,
    deleteFamilyTransaction,
} from '../controllers/familyController.js';

const router = express.Router();

// ── Group (no family membership required) ────────
router.post('/create', createGroup);
router.get('/my-group', getMyGroup);

// ── Invite (no group access needed for accepting/declining) ──
router.post('/accept-invite', acceptInvite);
router.post('/decline-invite', declineInvite);

// ── All routes below require active family membership ──

// ── Invitations (ADMIN only) ────────────────────
router.post('/invite', requireFamily, requireRole('ADMIN'), inviteMember);
router.get('/pending-invites', requireFamily, requireRole('ADMIN'), getPendingInvites);

// ── Members ─────────────────────────────────────
router.post('/remove-member', requireFamily, requireRole('ADMIN'), removeMember);
router.put('/update-role', requireFamily, requireRole('ADMIN'), updateRole);
router.post('/transfer-ownership', requireFamily, requireRole('ADMIN'), transferOwnership);
router.post('/leave', requireFamily, leaveGroup);
router.post('/dissolve', requireFamily, requireRole('ADMIN'), dissolveGroup);

// ── Audit ───────────────────────────────────────
router.get('/audit-log', requireFamily, requireRole('ADMIN'), getAuditLog);

// ── Family Transactions ─────────────────────────
router.get('/transactions', requireFamily, getFamilyTransactions);
router.post('/transactions', requireFamily, requireRole('ADMIN', 'MEMBER'), addFamilyTransaction);
router.put('/transactions/:transactionId', requireFamily, requireRole('ADMIN', 'MEMBER'), editFamilyTransaction);
router.delete('/transactions/:transactionId', requireFamily, requireRole('ADMIN'), deleteFamilyTransaction);

export default router;
