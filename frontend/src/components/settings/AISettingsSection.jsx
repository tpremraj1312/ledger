import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, Sparkles, Database, Brain, Trash2, ShieldCheck, Zap, Info, Loader2 } from 'lucide-react';

const AISettingsSection = ({ user, updateSettings }) => {
    const [settings, setSettings] = useState({
        enabled: user?.settings?.ai?.enabled ?? true,
        memoryPersonalization: user?.settings?.ai?.memoryPersonalization ?? true,
        dataUsageConsent: user?.settings?.ai?.dataUsageConsent ?? true,
        analysisDepth: user?.settings?.ai?.analysisDepth || 'Advanced',
    });

    const [saving, setSaving] = useState(false);

    const toggleSetting = async (key) => {
        const newVal = !settings[key];
        const newSettings = { ...settings, [key]: newVal };
        setSettings(newSettings);
        setSaving(true);
        try {
            await updateSettings('ai', newSettings);
        } catch (error) {
            console.error('Update AI settings error:', error);
            setSettings(settings); // Rollback
        } finally {
            setSaving(false);
        }
    };

    const handleDepthChange = async (depth) => {
        const newSettings = { ...settings, analysisDepth: depth };
        setSettings(newSettings);
        setSaving(true);
        try {
            await updateSettings('ai', newSettings);
        } catch (error) {
            console.error('Update AI depth error:', error);
            setSettings(settings); // Rollback
        } finally {
            setSaving(false);
        }
    };

    const SettingRow = ({ icon: Icon, title, desc, active, onClick, color }) => (
        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start gap-4 pr-4">
                <div className={`p-2.5 rounded-xl ${color || 'bg-blue-50 text-blue-600'} group-hover:scale-110 transition-transform`}>
                    <Icon size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-gray-900 text-sm">{title}</h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed max-w-sm">{desc}</p>
                </div>
            </div>
            <button onClick={onClick} className="flex-shrink-0 transition-transform active:scale-90">
                {active ? (
                    <ToggleRight className="w-12 h-12 text-blue-600 stroke-[1.5]" />
                ) : (
                    <ToggleLeft className="w-12 h-12 text-gray-300 stroke-[1.5]" />
                )}
            </button>
        </div>
    );

    return (
        <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                        <Sparkles className="text-violet-500" />
                        AI & Chatbot Intelligence
                    </h3>
                    <p className="text-gray-500">Configure how Gemini AI interacts with your financial data.</p>
                </div>
                {saving && (
                    <div className="px-3 py-1 bg-blue-50 rounded-full flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin text-blue-600" />
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Syncing</span>
                    </div>
                )}
            </div>

            <div className="space-y-4 mb-10">
                <SettingRow
                    icon={Brain}
                    title="Enable AI Intelligence"
                    desc="Allow the chatbot and AI analysis module to process your financial data and provide recommendations."
                    active={settings.enabled}
                    onClick={() => toggleSetting('enabled')}
                    color="bg-violet-50 text-violet-600"
                />

                <SettingRow
                    icon={Database}
                    title="Memory Personalization"
                    desc="Allow the AI to remember your past interactions for better context and personalized financial advice."
                    active={settings.memoryPersonalization}
                    onClick={() => toggleSetting('memoryPersonalization')}
                    color="bg-indigo-50 text-indigo-600"
                />

                <SettingRow
                    icon={ShieldCheck}
                    title="Data Usage Consent"
                    desc="Give permission to use anonymized financial trends to improve the AI's prediction accuracy."
                    active={settings.dataUsageConsent}
                    onClick={() => toggleSetting('dataUsageConsent')}
                    color="bg-teal-50 text-teal-600"
                />
            </div>

            <div className="mb-10">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Zap size={14} />
                    Analysis Depth
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        { id: 'Basic', label: 'Basic Narrative', desc: 'Fast, concise summaries with general financial advice.', icon: Info },
                        { id: 'Advanced', label: 'Advanced Intelligence', desc: 'Deep cross-module analysis including tax & investments.', icon: Zap },
                    ].map((type) => (
                        <button
                            key={type.id}
                            onClick={() => handleDepthChange(type.id)}
                            className={`p-5 rounded-2xl border text-left transition-all ${settings.analysisDepth === type.id
                                    ? 'bg-violet-50 border-violet-200 ring-4 ring-violet-500/5'
                                    : 'bg-white border-gray-100 hover:border-violet-100'
                                }`}
                        >
                            <div className={`p-2 rounded-xl w-fit mb-4 ${settings.analysisDepth === type.id ? 'bg-violet-500 text-white' : 'bg-gray-50 text-gray-400'}`}>
                                <type.icon size={18} />
                            </div>
                            <p className={`font-bold text-sm mb-1 ${settings.analysisDepth === type.id ? 'text-violet-900' : 'text-gray-900'}`}>{type.label}</p>
                            <p className="text-[11px] text-gray-500 leading-relaxed">{type.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-6 bg-red-50 rounded-2xl border border-red-100">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                        <Trash2 size={20} />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-red-900 text-sm">Clear AI History</h4>
                        <p className="text-[11px] text-red-700 leading-relaxed mb-4">
                            Restoring AI memory will permanently delete all personalized context the chatbot has learned about you.
                        </p>
                        <div className="flex gap-3">
                            <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-red-700 transition-colors shadow-sm">
                                Clear Memory
                            </button>
                            <button className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-red-50 transition-colors">
                                Clear Chat Logs
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AISettingsSection;
