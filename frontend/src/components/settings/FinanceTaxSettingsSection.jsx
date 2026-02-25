import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, Landmark, Calculator, AlertCircle, PieChart, ShieldCheck, TrendingUp, Compass, Info, Loader2 } from 'lucide-react';

const FinanceTaxSettingsSection = ({ user, updateSettings }) => {
    const [financial, setFinancial] = useState({
        defaultCategory: user?.settings?.financial?.defaultCategory || 'General',
        defaultPaymentMethod: user?.settings?.financial?.defaultPaymentMethod || 'UPI',
        autoSetMonthlyBudget: user?.settings?.financial?.autoSetMonthlyBudget ?? false,
        rounding: user?.settings?.financial?.rounding ?? true,
        currencyFormatting: user?.settings?.financial?.currencyFormatting || 'en-IN',
    });

    const [tax, setTax] = useState({
        regime: user?.settings?.tax?.regime || 'New',
        autoTrackDeductions: user?.settings?.tax?.autoTrackDeductions ?? true,
        planningStrategy: user?.settings?.tax?.planningStrategy || 'Conservative',
    });

    const [saving, setSaving] = useState(false);

    const handleFinancialChange = async (key, val) => {
        const newSettings = { ...financial, [key]: val };
        setFinancial(newSettings);
        setSaving(true);
        try {
            await updateSettings('financial', newSettings);
        } catch (error) {
            console.error('Update Financial settings error:', error);
            setFinancial(financial);
        } finally {
            setSaving(false);
        }
    };

    const handleTaxChange = async (key, val) => {
        const newSettings = { ...tax, [key]: val };
        setTax(newSettings);
        setSaving(true);
        try {
            await updateSettings('tax', newSettings);
        } catch (error) {
            console.error('Update Tax settings error:', error);
            setTax(tax);
        } finally {
            setSaving(false);
        }
    };

    const SectionHeader = ({ icon: Icon, title, desc, color }) => (
        <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-xl ${color || 'bg-blue-50 text-blue-600'}`}>
                <Icon size={20} />
            </div>
            <div>
                <h4 className="font-bold text-gray-900">{title}</h4>
                <p className="text-xs text-gray-500">{desc}</p>
            </div>
        </div>
    );

    return (
        <div className="max-w-4xl space-y-12 pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Financial & Tax Preferences</h3>
                    <p className="text-gray-500">Global defaults and strategy for accounting and tax planning.</p>
                </div>
                {saving && (
                    <div className="px-3 py-1 bg-blue-50 rounded-full flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin text-blue-600" />
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Saving</span>
                    </div>
                )}
            </div>

            {/* Financial Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <SectionHeader
                        icon={Calculator}
                        title="General Accounting"
                        desc="Set defaults for your daily transactions."
                    />

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Default Category</label>
                            <select
                                value={financial.defaultCategory}
                                onChange={(e) => handleFinancialChange('defaultCategory', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                            >
                                <option value="General">General</option>
                                <option value="Food">Food & Dining</option>
                                <option value="Shopping">Shopping</option>
                                <option value="Transport">Transport</option>
                                <option value="Bills">Bills & Utilities</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Method</label>
                            <select
                                value={financial.defaultPaymentMethod}
                                onChange={(e) => handleFinancialChange('defaultPaymentMethod', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                            >
                                <option value="UPI">UPI / GPay / PhonePe</option>
                                <option value="Cash">Cash</option>
                                <option value="Credit Card">Credit Card</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-3">
                                <PieChart size={18} className="text-gray-400" />
                                <span className="text-sm font-bold text-gray-700">Auto-set Monthly Budget</span>
                            </div>
                            <button onClick={() => handleFinancialChange('autoSetMonthlyBudget', !financial.autoSetMonthlyBudget)}>
                                {financial.autoSetMonthlyBudget ? <ToggleRight className="text-blue-600 w-8 h-8" /> : <ToggleLeft className="text-gray-300 w-8 h-8" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tax Section */}
                <div className="space-y-6">
                    <SectionHeader
                        icon={Landmark}
                        title="Tax Settings"
                        desc="Influence your Tax Saving Advisor logic."
                        color="bg-teal-50 text-teal-600"
                    />

                    <div className="space-y-4">
                        <div className="p-4 bg-teal-50/50 border border-teal-100 rounded-2xl">
                            <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-3">Active Tax Regime</p>
                            <div className="grid grid-cols-2 gap-2">
                                {['Old', 'New'].map((regime) => (
                                    <button
                                        key={regime}
                                        onClick={() => handleTaxChange('regime', regime)}
                                        className={`py-2.5 rounded-xl font-bold text-sm transition-all ${tax.regime === regime
                                                ? 'bg-teal-600 text-white shadow-md shadow-teal-100'
                                                : 'bg-white text-teal-700 border border-teal-100 hover:bg-teal-50'
                                            }`}
                                    >
                                        {regime} Regime
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Planning Strategy</label>
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                {['Conservative', 'Aggressive'].map((strat) => (
                                    <button
                                        key={strat}
                                        onClick={() => handleTaxChange('planningStrategy', strat)}
                                        className={`flex-1 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all ${tax.planningStrategy === strat ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                    >
                                        {strat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3">
                                <ShieldCheck size={18} className="text-teal-500" />
                                <span className="text-sm font-bold text-gray-700">Auto-track Deductions</span>
                            </div>
                            <button onClick={() => handleTaxChange('autoTrackDeductions', !tax.autoTrackDeductions)}>
                                {tax.autoTrackDeductions ? <ToggleRight className="text-teal-600 w-8 h-8" /> : <ToggleLeft className="text-gray-300 w-8 h-8" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4 shadow-sm">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl flex-shrink-0">
                    <AlertCircle size={20} />
                </div>
                <div>
                    <h5 className="font-bold text-amber-900 text-sm mb-1">Module Impact Warning</h5>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                        Changing your **Tax Regime** or **Financial Year** will immediately update the Tax Saving Advisor's
                        calculations and recommendations. Ensure you select the regime applicable to your actual tax filing.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FinanceTaxSettingsSection;
