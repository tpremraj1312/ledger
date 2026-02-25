import React, { useState } from 'react';
import { AlertTriangle, Trash2, ShieldAlert, Lock, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios';

const DangerZoneSection = ({ logout }) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleDelete = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/api/settings/delete-account', { password });
            logout(); // Log out after successful deletion
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete account. Check password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl">
            <div className="mb-8">
                <h3 className="text-2xl font-bold text-red-600 mb-2 flex items-center gap-2">
                    <AlertTriangle size={24} />
                    Danger Zone
                </h3>
                <p className="text-gray-500">Critical account actions. These changes are permanent and cannot be undone.</p>
            </div>

            <div className="space-y-6">
                {/* Reset All Data */}
                <div className="p-6 bg-white rounded-2xl border border-red-100 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-red-50 text-red-500 rounded-2xl">
                            <ShieldAlert size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900">Reset Financial Data</h4>
                            <p className="text-xs text-gray-500 max-w-sm">Wipes all transactions, investments, and budgets. Your account stays active.</p>
                        </div>
                    </div>
                    <button className="whitespace-nowrap px-5 py-2.5 bg-gray-50 text-red-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-50 transition-colors border border-gray-100 flex items-center gap-2 group">
                        Reset Data
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Delete Account */}
                <div className={`p-6 bg-white rounded-2xl border ${showDeleteConfirm ? 'border-red-500 ring-4 ring-red-500/5' : 'border-red-100'} shadow-sm transition-all overflow-hidden`}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-200">
                                <Trash2 size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Delete Account Permanently</h4>
                                <p className="text-xs text-gray-500 max-w-sm">Once you delete your account, there is no going back. Please be certain.</p>
                            </div>
                        </div>
                        {!showDeleteConfirm && (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="whitespace-nowrap px-6 py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-700 transition-all shadow-md active:scale-95"
                            >
                                Delete Account
                            </button>
                        )}
                    </div>

                    {showDeleteConfirm && (
                        <div className="pt-6 border-t border-red-50 animate-in fade-in slide-in-from-top-4 duration-300">
                            <p className="text-sm font-bold text-red-900 mb-4 bg-red-50 p-4 rounded-xl flex items-center gap-3">
                                <Lock size={18} />
                                To proceed, please enter your password for verification.
                            </p>

                            <form onSubmit={handleDelete} className="space-y-4 max-w-sm">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full px-4 py-3 rounded-xl border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                    required
                                />

                                {error && <p className="text-xs font-bold text-red-600">{error}</p>}

                                <div className="flex items-center gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                        {loading ? 'Deleting...' : 'Confirm Deletion'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowDeleteConfirm(false);
                                            setError('');
                                            setPassword('');
                                        }}
                                        className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <AlertTriangle size={16} className="text-gray-400" />
                    <p className="text-[10px] text-gray-500 font-medium">
                        Account deletion logic currently performs a soft delete for security reasons. Your data will be anonymized within 30 days.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DangerZoneSection;
