import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Crown, UserMinus, MessageSquare, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios';

const FamilySettingsSection = ({ user, refreshUser }) => {
    const [family, setFamily] = useState(null);
    const [loading, setLoading] = useState(true);
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        const fetchFamily = async () => {
            if (!user?.currentFamilyId) {
                setLoading(false);
                return;
            }
            try {
                const res = await api.get('/api/family');
                setFamily(res.data);
            } catch (err) {
                console.error('Fetch family error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchFamily();
    }, [user?.currentFamilyId]);

    const handleLeaveGroup = async () => {
        if (!window.confirm('Are you sure you want to leave this family group? This will remove your access to shared budgets.')) return;
        setLeaving(true);
        try {
            await api.post('/api/family/leave');
            await refreshUser();
            setFamily(null);
        } catch (err) {
            console.error('Leave group error:', err);
        } finally {
            setLeaving(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <Loader2 size={40} className="animate-spin text-blue-600" />
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Fetching Family Data</p>
        </div>
    );

    if (!user?.currentFamilyId) return (
        <div className="max-w-3xl">
            <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Family & Group Management</h3>
                <p className="text-gray-500">Collaborate with others to manage shared finances.</p>
            </div>

            <div className="p-10 bg-blue-50/50 rounded-3xl border border-blue-100 flex flex-col items-center text-center space-y-6">
                <div className="p-4 bg-blue-100 text-blue-600 rounded-full shadow-inner ring-8 ring-blue-50">
                    <Users size={40} />
                </div>
                <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Not in a Family Group</h4>
                    <p className="text-sm text-gray-500 max-w-sm">Join a family to share budgets, track household expenses, and participate in family quests.</p>
                </div>
                <button className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 active:scale-95 flex items-center gap-2">
                    <UserPlus size={18} />
                    Create or Join Family
                </button>
            </div>
        </div>
    );

    const isOwner = family?.owner === user._id || family?.owner?._id === user._id;

    return (
        <div className="max-w-4xl">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{family?.name} Settings</h3>
                    <p className="text-gray-500">Manage members and roles within your family group.</p>
                </div>
                <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <CheckCircle2 size={12} />
                    Active Group
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Member List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Users size={18} className="text-gray-400" />
                        <h4 className="font-bold text-gray-700 text-sm">Family Members ({family?.members?.length || 0})</h4>
                    </div>

                    <div className="space-y-2">
                        {family?.members?.map((member) => (
                            <div key={member._id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm group hover:border-blue-200 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-black text-gray-500 text-sm uppercase">
                                        {(member.profile?.fullName || member.username || '?').charAt(0)}
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-gray-900 text-sm">{member.profile?.fullName || member.username}</h5>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{member.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {family.owner === member._id || family.owner?._id === member._id ? (
                                        <div className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                                            <Crown size={10} />
                                            Owner
                                        </div>
                                    ) : (
                                        <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-black uppercase tracking-widest">Member</div>
                                    )}
                                    {isOwner && member._id !== user._id && (
                                        <button className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                            <UserMinus size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 hover:text-blue-500 hover:border-blue-100 hover:bg-blue-50/10 transition-all flex items-center justify-center gap-2 font-bold text-sm">
                        <UserPlus size={18} />
                        Invite Member
                    </button>
                </div>

                {/* Sidebar Actions */}
                <div className="space-y-6">
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                        <h4 className="font-black text-gray-900 text-[10px] uppercase tracking-widest mb-6">Group Stats</h4>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500 font-medium">Shared Budgets</span>
                                <span className="text-sm font-black text-gray-900">04</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500 font-medium">Family XP</span>
                                <span className="text-sm font-black text-blue-600">2,450</span>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                <span className="text-xs text-gray-500 font-medium">Monthly Savings</span>
                                <span className="text-sm font-black text-emerald-600">₹12,400</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                            <MessageSquare size={16} />
                            Broadcast Message
                        </button>

                        <button
                            onClick={handleLeaveGroup}
                            disabled={leaving}
                            className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2 border border-red-100 disabled:opacity-50"
                        >
                            {leaving ? <Loader2 size={16} className="animate-spin" /> : <UserMinus size={16} />}
                            Leave Family
                        </button>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <AlertCircle size={16} className="text-amber-500 mt-0.5" />
                        <p className="text-[10px] text-amber-700 leading-relaxed font-bold">
                            Only the owner can delete or rename the family group. Members can only leave voluntarily.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FamilySettingsSection;
