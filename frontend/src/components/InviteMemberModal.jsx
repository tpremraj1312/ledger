import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Copy, Check, Clock, Send, Link2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { inviteMember, getPendingInvites } from '../services/familyService';

const InviteMemberModal = ({ isOpen, onClose }) => {
    const { hasGroup } = useFamily();
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [pendingInvites, setPendingInvites] = useState([]);

    useEffect(() => {
        if (isOpen && hasGroup) {
            getPendingInvites().then(setPendingInvites).catch(() => { });
        }
        if (!isOpen) {
            setEmail(''); setError(''); setSuccess('');
        }
    }, [isOpen, hasGroup]);

    const handleInvite = async () => {
        if (!email.trim()) { setError('Please enter an email address.'); return; }
        setSending(true); setError(''); setSuccess('');
        try {
            await inviteMember(email.trim());
            setSuccess(`Invitation sent to ${email}!`);
            setEmail('');
            const invites = await getPendingInvites();
            setPendingInvites(invites);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send invitation.');
        } finally { setSending(false); }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
                    onClick={onClose}>
                    <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                        onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <Mail size={18} className="text-violet-600" /> Invite Member
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">Send an invite link via email</p>
                            </div>
                            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex items-center gap-2">
                                    <AlertCircle size={16} className="text-red-500 shrink-0" />
                                    <p className="text-xs text-red-600">{error}</p>
                                </div>
                            )}

                            {success && (
                                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                    <p className="text-xs text-emerald-600">{success}</p>
                                </div>
                            )}

                            <div className="flex gap-2 mb-6">
                                <input
                                    type="email" value={email}
                                    onChange={e => { setEmail(e.target.value); setError(''); }}
                                    placeholder="Enter user's registered email..."
                                    className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
                                />
                                <button onClick={handleInvite} disabled={sending || !email}
                                    className="px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-all disabled:opacity-50 flex items-center gap-2">
                                    {sending ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send size={14} />}
                                    Invite
                                </button>
                            </div>

                            {/* Pending Invites */}
                            {pendingInvites.length > 0 && (
                                <div className="pt-4 border-t border-gray-100">
                                    <p className="text-xs font-medium text-gray-500 mb-3 flex items-center gap-1.5">
                                        <Clock size={12} /> Pending Invitations ({pendingInvites.length})
                                    </p>
                                    <div className="space-y-2 max-h-28 overflow-y-auto">
                                        {pendingInvites.map((inv, i) => (
                                            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
                                                <span className="text-gray-700 font-medium">{inv.email}</span>
                                                <span className="text-amber-500 text-[10px] font-medium">
                                                    Expires {new Date(inv.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default InviteMemberModal;
