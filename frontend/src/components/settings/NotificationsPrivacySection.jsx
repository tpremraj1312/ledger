import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, Bell, Lock, Shield, Eye, Database, Info, Loader2, Mail, MessageSquare } from 'lucide-react';

const NotificationsPrivacySection = ({ user, updateSettings }) => {
    const [notifications, setNotifications] = useState({
        expenses: user?.settings?.notifications?.expenses ?? true,
        budgets: user?.settings?.notifications?.budgets ?? true,
        family: user?.settings?.notifications?.family ?? true,
        investments: user?.settings?.notifications?.investments ?? true,
        tax: user?.settings?.notifications?.tax ?? true,
        gamification: user?.settings?.notifications?.gamification ?? true,
        ai: user?.settings?.notifications?.ai ?? true,
    });

    const [privacy, setPrivacy] = useState({
        dataUsageConsent: user?.settings?.ai?.dataUsageConsent ?? true,
        publicLeaderboard: user?.settings?.gamification?.publicLeaderboard ?? false,
    });

    const [saving, setSaving] = useState(false);

    const handleNotifyToggle = async (key) => {
        const newVal = !notifications[key];
        const newSettings = { ...notifications, [key]: newVal };
        setNotifications(newSettings);
        setSaving(true);
        try {
            await updateSettings('notifications', newSettings);
        } catch (error) {
            console.error('Update Notifications error:', error);
            setNotifications(notifications);
        } finally {
            setSaving(false);
        }
    };

    const handlePrivacyToggle = async (cat, key) => {
        const newVal = !privacy[key];
        const newSettings = { ...privacy, [key]: newVal };
        setPrivacy(newSettings);
        setSaving(true);
        try {
            // Map to correct category on backend
            await updateSettings(cat, { [key]: newVal });
        } catch (error) {
            console.error('Update Privacy error:', error);
            setPrivacy(privacy);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl space-y-12 pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">Notifications & Privacy</h3>
                    <p className="text-gray-500">Control your alerts and data visibility settings.</p>
                </div>
                {saving && (
                    <div className="px-3 py-1 bg-blue-50 rounded-full flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin text-blue-600" />
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Syncing</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Notifications */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <Bell size={20} />
                        </div>
                        <h4 className="font-bold text-gray-900">Email & Push Notifications</h4>
                    </div>

                    <div className="space-y-3">
                        {[
                            { id: 'expenses', label: 'Expense Alerts', icon: Mail },
                            { id: 'budgets', label: 'Budget Limits', icon: Info },
                            { id: 'family', label: 'Family Activity', icon: MessageSquare },
                            { id: 'investments', label: 'Investment Updates', icon: Shield },
                            { id: 'tax', label: 'Tax Reminders', icon: Database },
                        ].map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <item.icon size={18} className="text-gray-400" />
                                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                                </div>
                                <button onClick={() => handleNotifyToggle(item.id)}>
                                    {notifications[item.id] ? <ToggleRight className="text-blue-600 w-8 h-8" /> : <ToggleLeft className="text-gray-300 w-8 h-8" />}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Privacy */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Lock size={20} />
                        </div>
                        <h4 className="font-bold text-gray-900">Privacy & Data Control</h4>
                    </div>

                    <div className="space-y-4">
                        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Eye size={18} className="text-indigo-500" />
                                    <span className="text-sm font-bold text-gray-900">Public Profile</span>
                                </div>
                                <button onClick={() => handlePrivacyToggle('gamification', 'publicLeaderboard')}>
                                    {privacy.publicLeaderboard ? <ToggleRight className="text-indigo-600 w-8 h-8" /> : <ToggleLeft className="text-gray-300 w-8 h-8" />}
                                </button>
                            </div>
                            <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                                When enabled, your XP level and leaderboard status will be visible to other Ledger users.
                            </p>
                        </div>

                        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Database size={18} className="text-indigo-500" />
                                    <span className="text-sm font-bold text-gray-900">Data Usage Consent</span>
                                </div>
                                <button onClick={() => handlePrivacyToggle('ai', 'dataUsageConsent')}>
                                    {privacy.dataUsageConsent ? <ToggleRight className="text-indigo-600 w-8 h-8" /> : <ToggleLeft className="text-gray-300 w-8 h-8" />}
                                </button>
                            </div>
                            <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                                Allow Ledger to use anonymized financial data to improve AI accuracy and general insights.
                            </p>
                        </div>

                        <div className="p-4 border border-indigo-100 rounded-xl bg-indigo-50/30 flex items-start gap-3">
                            <Info size={16} className="text-indigo-500 mt-0.5" />
                            <p className="text-[11px] text-indigo-700 leading-relaxed font-bold">
                                Privacy is our priority. Your actual transaction details and personal identity are never shared with third parties.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationsPrivacySection;
