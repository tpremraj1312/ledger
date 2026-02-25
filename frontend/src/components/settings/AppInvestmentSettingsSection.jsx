import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, TrendingUp, Compass, PieChart, Shield, Layout, Palette, Monitor, Smartphone, Info, Loader2 } from 'lucide-react';

const AppInvestmentSettingsSection = ({ user, updateSettings }) => {
    const [app, setApp] = useState({
        theme: user?.settings?.app?.theme || 'Light',
        compactMode: user?.settings?.app?.compactMode ?? false,
        dashboardLayout: user?.settings?.app?.dashboardLayout || 'Default',
    });

    const [investment, setInvestment] = useState({
        riskAppetite: user?.settings?.investment?.riskAppetite || 'Medium',
        horizon: user?.settings?.investment?.horizon || 'Medium Term',
        autoInvestRecommendations: user?.settings?.investment?.autoInvestRecommendations ?? true,
        portfolioRebalancing: user?.settings?.investment?.portfolioRebalancing ?? true,
    });

    const [saving, setSaving] = useState(false);

    const handleAppChange = async (key, val) => {
        const newSettings = { ...app, [key]: val };
        setApp(newSettings);
        setSaving(true);
        try {
            await updateSettings('app', newSettings);
        } catch (error) {
            console.error('Update App settings error:', error);
            setApp(app);
        } finally {
            setSaving(false);
        }
    };

    const handleInvChange = async (key, val) => {
        const newSettings = { ...investment, [key]: val };
        setInvestment(newSettings);
        setSaving(true);
        try {
            await updateSettings('investment', newSettings);
        } catch (error) {
            console.error('Update Investment settings error:', error);
            setInvestment(investment);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl space-y-12 pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">App & Investment Preferences</h3>
                    <p className="text-gray-500">Customize your visual experience and investment strategy.</p>
                </div>
                {saving && (
                    <div className="px-3 py-1 bg-indigo-50 rounded-full flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin text-indigo-600" />
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Syncing</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Investment Preferences */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900">Investment Strategy</h4>
                            <p className="text-xs text-gray-500">Tailor recommendations to your risk profile.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Risk Appetite</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Low', 'Medium', 'High'].map((risk) => (
                                    <button
                                        key={risk}
                                        onClick={() => handleInvChange('riskAppetite', risk)}
                                        className={`py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all border ${investment.riskAppetite === risk
                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100'
                                                : 'bg-white text-gray-500 border-gray-100 hover:border-emerald-100 hover:text-emerald-600'
                                            }`}
                                    >
                                        {risk}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Investment Horizon</label>
                            <select
                                value={investment.horizon}
                                onChange={(e) => handleInvChange('horizon', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                            >
                                <option value="Short Term">Short Term ( &lt; 1 Year)</option>
                                <option value="Medium Term">Medium Term (1 - 3 Years)</option>
                                <option value="Long Term">Long Term (3 - 5 Years)</option>
                                <option value="Wealth Building">Wealth Building (5+ Years)</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3">
                                <Compass size={18} className="text-emerald-500" />
                                <span className="text-sm font-bold text-gray-700">Auto-Recommendations</span>
                            </div>
                            <button onClick={() => handleInvChange('autoInvestRecommendations', !investment.autoInvestRecommendations)}>
                                {investment.autoInvestRecommendations ? <ToggleRight className="text-emerald-600 w-8 h-8" /> : <ToggleLeft className="text-gray-300 w-8 h-8" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* App Preferences */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Monitor size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900">Application UI</h4>
                            <p className="text-xs text-gray-500">Customize how the app looks and feels.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">Color Mode</p>
                            <div className="grid grid-cols-2 gap-2">
                                {['Light', 'Dark'].map((theme) => (
                                    <button
                                        key={theme}
                                        onClick={() => handleAppChange('theme', theme)}
                                        className={`py-2 rounded-xl font-bold text-sm transition-all border ${app.theme === theme
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                                                : 'bg-white text-indigo-700 border-indigo-100 hover:bg-indigo-50'
                                            }`}
                                    >
                                        {theme}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3">
                                <Layout size={18} className="text-indigo-400" />
                                <span className="text-sm font-bold text-gray-700">Compact Mode</span>
                            </div>
                            <button onClick={() => handleAppChange('compactMode', !app.compactMode)}>
                                {app.compactMode ? <ToggleRight className="text-indigo-600 w-8 h-8" /> : <ToggleLeft className="text-gray-300 w-8 h-8" />}
                            </button>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dashboard Layout</label>
                            <select
                                value={app.dashboardLayout}
                                onChange={(e) => handleAppChange('dashboardLayout', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                            >
                                <option value="Default">Standard Overview</option>
                                <option value="Analytical">Analytical (Graph Focused)</option>
                                <option value="Transactional">Transactional (List Focused)</option>
                                <option value="Minimal">Minimalist</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-3">
                <Monitor size={16} className="text-indigo-500 mt-0.5" />
                <p className="text-[11px] text-indigo-700 leading-relaxed font-bold">
                    Theme settings are synced with your account. Accessing Ledger on any device will preserve your visual preferences.
                </p>
            </div>
        </div>
    );
};

export default AppInvestmentSettingsSection;
