import React, { useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Calculator, Loader2, Target, PiggyBank, TrendingUp, ArrowRight, CheckCircle2 } from 'lucide-react';

const API = import.meta.env.VITE_BACKEND_URL;
const getToken = () => localStorage.getItem('token');
const fmt = (v) => `₹${Math.round(v).toLocaleString('en-IN')}`;
const tooltipStyle = { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#1e293b' };
const ALLOC_COLORS = { Equity: '#6366f1', Debt: '#10b981', Gold: '#f59e0b', Crypto: '#06b6d4', Cash: '#94a3b8' };

const InvestmentPlanner = () => {
    const [inputs, setInputs] = useState({ income: '', expenses: '', age: '', riskPreference: 'moderate', investmentAmount: '' });
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const r = await axios.post(`${API}/api/investments/ai/planner`, inputs, { headers: { Authorization: `Bearer ${getToken()}` } });
            setPlan(r.data);
        } catch (err) { alert(err.response?.data?.message || 'Planner failed'); }
        finally { setLoading(false); }
    };

    const inputCls = "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200";
    const allocData = plan ? Object.entries(plan.allocation).map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v })) : [];

    return (
        <div className="space-y-6">
            {/* Input Form */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2"><Calculator size={20} className="text-indigo-500" /> Smart Investment Planner</h3>
                <p className="text-sm text-slate-500 mb-5">Enter your financial details to get a personalized, practical investment plan. No heavy simulations — just common-sense math.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Monthly Income (₹)</label><input className={inputCls} type="number" required placeholder="50000" value={inputs.income} onChange={e => setInputs({ ...inputs, income: e.target.value })} /></div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Monthly Expenses (₹)</label><input className={inputCls} type="number" required placeholder="30000" value={inputs.expenses} onChange={e => setInputs({ ...inputs, expenses: e.target.value })} /></div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Age</label><input className={inputCls} type="number" placeholder="30" value={inputs.age} onChange={e => setInputs({ ...inputs, age: e.target.value })} /></div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Risk Preference</label>
                            <select className={inputCls} value={inputs.riskPreference} onChange={e => setInputs({ ...inputs, riskPreference: e.target.value })}>
                                <option value="conservative">Conservative</option><option value="moderate">Moderate</option><option value="aggressive">Aggressive</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-500 text-white text-sm font-semibold rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition shadow-sm">
                        {loading ? <><Loader2 size={16} className="icc-spinner" /> Calculating...</> : <><Target size={16} /> Generate Plan</>}
                    </button>
                </form>
            </div>

            {plan && (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Monthly Surplus</p>
                            <p className={`text-2xl font-bold ${plan.monthlySurplus > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(plan.monthlySurplus)}</p>
                            <p className="text-xs text-slate-400 mt-0.5">Savings rate: {plan.savingsRate}%</p>
                        </div>
                        <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5">
                            <p className="text-xs text-indigo-500 uppercase tracking-wide mb-1">Recommended SIP</p>
                            <p className="text-2xl font-bold text-indigo-600">{fmt(plan.recommendedSIP)}</p>
                            <p className="text-xs text-indigo-400 mt-0.5">/month</p>
                        </div>
                        <div className={`rounded-xl p-5 ${plan.emergencyPriority ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Emergency Fund Target</p>
                            <p className="text-2xl font-bold text-slate-800">{fmt(plan.emergencyTarget)}</p>
                            <p className={`text-xs mt-0.5 ${plan.emergencyPriority ? 'text-amber-600 font-semibold' : 'text-emerald-500'}`}>{plan.emergencyPriority ? '⚠️ Priority: Build this first' : '✅ On track'}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Risk Level</p>
                            <p className="text-2xl font-bold text-slate-800 capitalize">{plan.riskLevel}</p>
                            <p className="text-xs text-slate-400 mt-0.5">Age: {plan.age}</p>
                        </div>
                    </div>

                    {/* Allocation Chart */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2"><PiggyBank size={15} className="text-emerald-500" /> Suggested Asset Allocation</h3>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={allocData} margin={{ left: 0, right: 10 }}>
                                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                                    <Tooltip contentStyle={tooltipStyle} formatter={v => `${v}%`} />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={36}>
                                        {allocData.map((d, i) => <Cell key={i} fill={ALLOC_COLORS[d.name] || '#6366f1'} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap gap-3 justify-center mt-3">
                            {allocData.map(d => (
                                <div key={d.name} className="flex items-center gap-1.5 text-xs"><div className="w-2.5 h-2.5 rounded" style={{ background: ALLOC_COLORS[d.name] || '#6366f1' }} /> <span className="text-slate-500">{d.name}</span> <span className="font-semibold text-slate-700">{d.value}%</span></div>
                            ))}
                        </div>
                    </div>

                    {/* Projections */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2"><TrendingUp size={15} className="text-indigo-500" /> Growth Projections (SIP: {fmt(plan.recommendedSIP)}/mo)</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {plan.projections.map(p => (
                                <div key={p.years} className="bg-slate-50 rounded-lg p-4 text-center">
                                    <p className="text-xs text-slate-400 mb-1">{p.years} Years</p>
                                    <p className="text-xl font-bold text-indigo-600">{fmt(p.corpus)}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Real: {fmt(p.inflationAdjusted)}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Steps */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2"><ArrowRight size={15} className="text-indigo-500" /> Action Steps</h3>
                        <div className="space-y-3">
                            {plan.steps.map((s, i) => (
                                <div key={i} className="flex items-start gap-3 text-sm text-slate-700 bg-slate-50/50 px-4 py-3 rounded-lg">
                                    <CheckCircle2 size={16} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                                    <span>{s}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default InvestmentPlanner;
