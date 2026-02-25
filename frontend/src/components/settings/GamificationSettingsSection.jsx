import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, Trophy, Users, Eye, EyeOff, Layout, Bell, Target, Star, Info, Loader2 } from 'lucide-react';

const GamificationSettingsSection = ({ user, updateSettings }) => {
    const [settings, setSettings] = useState({
        enabled: user?.settings?.gamification?.enabled ?? true,
        publicLeaderboard: user?.settings?.gamification?.publicLeaderboard ?? false,
        streakReminders: true, // Placeholder
        xpNotifications: true, // Placeholder
    });

    const [saving, setSaving] = useState(false);

    const toggleSetting = async (key) => {
        const newVal = !settings[key];
        const newSettings = { ...settings, [key]: newVal };
        setSettings(newSettings);
        setSaving(true);
        try {
            await updateSettings('gamification', newSettings);
        } catch (error) {
            console.error('Update Gamification settings error:', error);
            setSettings(settings); // Rollback
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                        <Trophy className="text-amber-500" />
                        Finance Quest & XP
                    </h3>
                    <p className="text-gray-500">Configure how you participate in the gamified financial experience.</p>
                </div>
                {saving && (
                    <div className="px-3 py-1 bg-amber-50 rounded-full flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin text-amber-600" />
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Syncing</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                {/* Enable Toggle */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between group hover:border-amber-200 transition-all">
                    <div className="flex items-start gap-4 pr-2">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
                            <Trophy size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 text-sm mb-1">Enable Finance Quest</h4>
                            <p className="text-[11px] text-gray-500 leading-relaxed">Turn on XP, leveling, and badges across the application.</p>
                        </div>
                    </div>
                    <button onClick={() => toggleSetting('enabled')}>
                        {settings.enabled ? (
                            <ToggleRight className="w-10 h-10 text-amber-500 stroke-[1.5]" />
                        ) : (
                            <ToggleLeft className="w-10 h-10 text-gray-300 stroke-[1.5]" />
                        )}
                    </button>
                </div>

                {/* Public Leaderboard */}
                <div className={`p-6 rounded-2xl border transition-all flex items-start justify-between group ${settings.publicLeaderboard ? 'bg-amber-50/30 border-amber-100' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-start gap-4 pr-2">
                        <div className={`p-3 rounded-2xl transition-all ${settings.publicLeaderboard ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-gray-50 text-gray-400'}`}>
                            {settings.publicLeaderboard ? <Eye size={20} /> : <EyeOff size={20} />}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 text-sm mb-1">Public Leaderboard</h4>
                            <p className="text-[11px] text-gray-500 leading-relaxed">Show your XP and level to other users on the global rankings.</p>
                        </div>
                    </div>
                    <button onClick={() => toggleSetting('publicLeaderboard')}>
                        {settings.publicLeaderboard ? (
                            <ToggleRight className="w-10 h-10 text-amber-500 stroke-[1.5]" />
                        ) : (
                            <ToggleLeft className="w-10 h-10 text-gray-300 stroke-[1.5]" />
                        )}
                    </button>
                </div>
            </div>

            <div className="space-y-4 mb-10">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Bell size={14} />
                    Reminders & Notifications
                </h4>

                <div className="space-y-3">
                    {[
                        { id: 'streakReminders', label: 'Streak Reminders', desc: 'Get alerted if you are about to lose your daily financial streak.', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-50' },
                        { id: 'xpNotifications', label: 'XP & Level Up Alerts', desc: 'Real-time notifications when you earn XP or unlock a new level.', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
                    ].map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 ${item.bg} ${item.color} rounded-xl`}>
                                    <item.icon size={18} />
                                </div>
                                <div>
                                    <h5 className="font-bold text-gray-900 text-sm">{item.label}</h5>
                                    <p className="text-[11px] text-gray-500">{item.desc}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSettings({ ...settings, [item.id]: !settings[item.id] })}
                                className="transition-transform active:scale-90"
                            >
                                {settings[item.id] ? (
                                    <ToggleRight className="w-8 h-8 text-amber-500 stroke-[1.5]" />
                                ) : (
                                    <ToggleLeft className="w-8 h-8 text-gray-300 stroke-[1.5]" />
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-5 bg-blue-50/80 rounded-2xl border border-blue-100 flex items-start gap-3">
                <Info size={16} className="text-blue-500 mt-0.5" />
                <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                    Note: Disabling gamification will only hide the UI elements (leaderboards, quests, level indicators).
                    Your financial activities will still earn XP in the background so you never lose progress.
                </p>
            </div>
        </div>
    );
};

export default GamificationSettingsSection;
