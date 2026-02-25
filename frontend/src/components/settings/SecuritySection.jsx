import React, { useState } from 'react';
import { Lock, Smartphone, RefreshCw, LogOut, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import api from '../../api/axios';

const SecuritySection = () => {
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError('New passwords do not match');
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.post('/api/auth/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            setSuccess('Password updated successfully');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl">
            <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Account & Security</h3>
                <p className="text-gray-500">Manage your password, authentication methods, and active sessions.</p>
            </div>

            <div className="space-y-10">
                {/* Change Password */}
                <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                            <Lock size={20} />
                        </div>
                        <h4 className="font-bold text-gray-900">Change Password</h4>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Current Password</label>
                                <input
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                                />
                            </div>
                        </div>

                        {error && <div className="flex items-center gap-2 text-red-500 text-xs font-bold mt-2"><AlertCircle size={14} />{error}</div>}
                        {success && <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold mt-2"><CheckCircle2 size={14} />{success}</div>}

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-black transition-all shadow-md active:scale-[0.98] flex items-center gap-2"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                            Update Password
                        </button>
                    </form>
                </div>

                {/* Two-Factor Auth */}
                <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
                            <Smartphone size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900">Two-Factor Authentication</h4>
                            <p className="text-xs text-gray-500">Secure your account with an extra layer of protection.</p>
                        </div>
                    </div>
                    <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gray-200 transition-all">
                        Enable
                    </button>
                </div>

                {/* Active Sessions */}
                <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                                <RefreshCw size={20} />
                            </div>
                            <h4 className="font-bold text-gray-900">Active Sessions</h4>
                        </div>
                        <button className="text-[10px] font-bold text-red-600 uppercase tracking-widest hover:underline">Log out all devices</button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-gray-600">
                                    <Smartphone size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Chrome on Windows</p>
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Current Session</p>
                                </div>
                            </div>
                            <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecuritySection;
