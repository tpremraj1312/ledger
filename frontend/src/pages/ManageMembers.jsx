import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Shield, Edit3, Trash2, LogOut, Crown, UserPlus, Loader2,
    Mail, ShieldAlert, CheckCircle, X, Eye, ShieldCheck, UserX
} from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { useAuth } from '../context/authContext';
import { removeMember, updateMemberRole, leaveGroup, dissolveGroup } from '../services/familyService';
import InviteMemberModal from '../components/InviteMemberModal';

const ROLE_CONFIG = {
    ADMIN: {
        label: 'Admin',
        color: '#8B5CF6',
        bg: '#F3E8FF',
        icon: Crown,
        desc: 'Full control over group, members, and financial records.'
    },
    MEMBER: {
        label: 'Member',
        color: '#3B82F6',
        bg: '#DBEAFE',
        icon: ShieldCheck,
        desc: 'Can add, edit, and delete transactions. Cannot manage members.'
    },
    VIEWER: {
        label: 'Viewer',
        color: '#6B7280',
        bg: '#F3F4F6',
        icon: Eye,
        desc: 'Read-only access to dashboard and transactions.'
    },
};

const ManageMembers = () => {
    const { group, members, isAdmin, currentUserMember, refreshGroup, hasGroup } = useFamily();
    const { refreshUser } = useAuth();
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [actionMember, setActionMember] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);

    const handleRoleChange = async (userId, newRole) => {
        setLoading(true);
        try {
            await updateMemberRole(userId, newRole);
            await refreshGroup();
            setConfirmAction(null);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update role');
        } finally { setLoading(false); }
    };

    const handleRemove = async (userId) => {
        setLoading(true);
        try {
            await removeMember(userId);
            await refreshGroup();
            setConfirmAction(null);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to remove member');
        } finally { setLoading(false); }
    };

    const handleLeave = async () => {
        if (!window.confirm('Are you sure you want to leave this family group?')) return;
        setLoading(true);
        try {
            await leaveGroup();
            await refreshUser();
            window.location.reload();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to leave group');
        } finally { setLoading(false); }
    };

    const handleDissolve = async () => {
        if (!window.confirm('WARNING: This will permanently delete the group and ALL associated data (transactions, budgets, logs). This cannot be undone. Continue?')) return;
        setLoading(true);
        try {
            await dissolveGroup();
            await refreshUser();
            window.location.reload();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to dissolve group');
        } finally { setLoading(false); }
    };

    const sortedMembers = [...members].sort((a, b) => {
        if (a.role === 'ADMIN') return -1;
        if (b.role === 'ADMIN') return 1;
        return 0;
    });

    if (!hasGroup || !group) return null;

    const currentUserId = currentUserMember?.user?._id || currentUserMember?.user;

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-violet-50 rounded-xl text-violet-600">
                        <Users size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Manage Members</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{group.name} · {members.length} member{members.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => setInviteModalOpen(true)}
                        className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-3 rounded-xl text-sm font-medium transition-all"
                    >
                        <UserPlus size={18} />
                        Invite Member
                    </button>
                )}
            </div>

            {/* Member Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                    {sortedMembers.map((m, idx) => {
                        const config = ROLE_CONFIG[m.role] || ROLE_CONFIG.VIEWER;
                        const RoleIcon = config.icon;
                        const memberId = m.user?._id || m.user;
                        const isSelf = memberId?.toString() === currentUserId?.toString();

                        return (
                            <motion.div
                                key={memberId || idx}
                                layout
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center text-lg font-bold shrink-0">
                                        {(m.user?.username || 'U').charAt(0).toUpperCase()}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h3 className="text-sm font-semibold text-gray-900 truncate">{m.user?.username || 'Unknown'}</h3>
                                            {isSelf && <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-medium">You</span>}
                                        </div>
                                        <p className="text-xs text-gray-400 truncate mb-2">{m.user?.email}</p>

                                        {/* Role Badge */}
                                        <div
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
                                            style={{ backgroundColor: config.bg, color: config.color }}
                                        >
                                            <RoleIcon size={12} />
                                            {config.label}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                {isAdmin && !isSelf && (
                                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
                                        <button
                                            onClick={() => { setActionMember(m); setConfirmAction('role'); }}
                                            className="flex-1 py-2 bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <Shield size={14} /> Change Role
                                        </button>
                                        <button
                                            onClick={() => { setActionMember(m); setConfirmAction('remove'); }}
                                            className="py-2 px-3 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                                        >
                                            <UserX size={14} />
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Danger Zone */}
            <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                    <ShieldAlert size={20} className="text-red-500" />
                    <h2 className="text-sm font-semibold text-gray-900">Danger Zone</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleLeave}
                        disabled={loading}
                        className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 hover:border-red-200 hover:text-red-600 rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <LogOut size={16} /> Leave Group
                    </button>
                    {isAdmin && (
                        <button
                            onClick={handleDissolve}
                            disabled={loading}
                            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            <Trash2 size={16} /> Dissolve Group
                        </button>
                    )}
                </div>
            </div>

            {/* Invite Modal */}
            <InviteMemberModal isOpen={inviteModalOpen} onClose={() => setInviteModalOpen(false)} />

            {/* Role Change Modal */}
            <AnimatePresence>
                {confirmAction === 'role' && actionMember && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
                        onClick={() => setConfirmAction(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <Edit3 size={18} className="text-indigo-500" />
                                    Change Role
                                </h3>
                                <button onClick={() => setConfirmAction(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                                    <X size={18} />
                                </button>
                            </div>
                            <p className="text-sm text-gray-500 mb-5">
                                Changing role for <span className="font-semibold text-gray-900">{actionMember.user?.username}</span>
                            </p>

                            <div className="space-y-2">
                                {Object.entries(ROLE_CONFIG).map(([role, cfg]) => {
                                    const memberId = actionMember.user?._id || actionMember.user;
                                    return (
                                        <button
                                            key={role}
                                            onClick={() => handleRoleChange(memberId, role)}
                                            disabled={loading}
                                            className={`w-full p-4 rounded-xl border transition-all text-left flex items-center gap-4
                                                ${actionMember.role === role
                                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                    : 'bg-white border-gray-100 hover:border-indigo-100 hover:bg-gray-50 text-gray-800'}`}
                                        >
                                            <div className={`p-2 rounded-lg ${actionMember.role === role ? 'bg-indigo-100' : 'bg-gray-50'}`}>
                                                <cfg.icon size={18} style={{ color: cfg.color }} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{cfg.label}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">{cfg.desc}</p>
                                            </div>
                                            {actionMember.role === role && <CheckCircle size={18} className="text-indigo-500" />}
                                            {loading && actionMember.role !== role && <Loader2 size={16} className="animate-spin text-gray-300" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Remove Confirmation */}
            <AnimatePresence>
                {confirmAction === 'remove' && actionMember && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
                        onClick={() => setConfirmAction(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <UserX size={28} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Member?</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Remove <span className="font-semibold text-gray-900">{actionMember.user?.username}</span> from the group. This action takes effect immediately.
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setConfirmAction(null)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all">Cancel</button>
                                <button
                                    onClick={() => handleRemove(actionMember.user?._id || actionMember.user)}
                                    disabled={loading}
                                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading && <Loader2 size={14} className="animate-spin" />}
                                    Remove
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ManageMembers;
