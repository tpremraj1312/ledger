import api from '../api/axios';

// ─── Group Management ───────────────────────────────────────
export const createFamilyGroup = async (name) => {
    const res = await api.post('/api/family/create', { name });
    return res.data;
};

export const getMyGroup = async () => {
    const res = await api.get('/api/family/my-group');
    return res.data;
};

export const dissolveGroup = async () => {
    const res = await api.post('/api/family/dissolve');
    return res.data;
};

// ─── Invitations ────────────────────────────────────────────
export const inviteMember = async (email) => {
    const res = await api.post('/api/family/invite', { email });
    return res.data;
};

export const acceptInvite = async (inviteId) => {
    const res = await api.post('/api/family/accept-invite', { inviteId });
    return res.data;
};

export const declineInvite = async (inviteId) => {
    const res = await api.post('/api/family/decline-invite', { inviteId });
    return res.data;
};

export const getPendingInvites = async () => {
    const res = await api.get('/api/family/pending-invites');
    return res.data;
};

// ─── Members ────────────────────────────────────────────────
export const removeMember = async (memberId) => {
    const res = await api.post('/api/family/remove-member', { memberId });
    return res.data;
};

export const updateMemberRole = async (memberId, role) => {
    const res = await api.put('/api/family/update-role', { memberId, role });
    return res.data;
};

export const transferOwnership = async (memberId) => {
    const res = await api.post('/api/family/transfer-ownership', { memberId });
    return res.data;
};

export const leaveGroup = async () => {
    const res = await api.post('/api/family/leave');
    return res.data;
};

// ─── Audit Log ──────────────────────────────────────────────
export const getAuditLog = async (page = 1) => {
    const res = await api.get('/api/family/audit-log', { params: { page } });
    return res.data;
};

// ─── Family Transactions ────────────────────────────────────
export const getFamilyTransactions = async (filters = {}) => {
    const res = await api.get('/api/family/transactions', { params: filters });
    return res.data;
};

export const addFamilyTransaction = async (data) => {
    const res = await api.post('/api/family/transactions', data);
    return res.data;
};

export const editFamilyTransaction = async (transactionId, data) => {
    const res = await api.put(`/api/family/transactions/${transactionId}`, data);
    return res.data;
};

export const deleteFamilyTransaction = async (transactionId) => {
    const res = await api.delete(`/api/family/transactions/${transactionId}`);
    return res.data;
};

// ─── Family Budget ──────────────────────────────────────────
export const getFamilyBudget = async (month, year) => {
    const res = await api.get('/api/family-budget', { params: { month, year } });
    return res.data;
};

export const upsertFamilyBudget = async (data) => {
    const res = await api.put('/api/family-budget', data);
    return res.data;
};

export const copyPreviousFamilyBudget = async (month, year) => {
    const res = await api.post('/api/family-budget/copy-previous', { month, year });
    return res.data;
};

export const getFamilyBudgetUsage = async (month, year) => {
    const res = await api.get('/api/family-budget/usage', { params: { month, year } });
    return res.data;
};

// ─── Family Financial Context ───────────────────────────────
export const getFamilyFinancialContext = async (filters = {}) => {
    const res = await api.get('/api/financial/family-context', { params: filters });
    return res.data;
};
