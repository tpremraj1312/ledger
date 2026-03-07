import React, { useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Brain, Loader2, Shield, Target, TrendingUp, AlertTriangle, Umbrella, Zap } from 'lucide-react';

const API = import.meta.env.VITE_BACKEND_URL;
const getToken = () => localStorage.getItem('token');
const fmt = (v) => `₹${Math.round(v).toLocaleString('en-IN')}`;
const tooltipStyle = { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#1e293b' };

const Gauge = ({ value, label }) => {
    const color = value > 60 ? 'bg-red-500' : value > 40 ? 'bg-amber-500' : 'bg-emerald-500';
    const textColor = value > 60 ? 'text-red-600' : value > 40 ? 'text-amber-600' : 'text-emerald-600';
    return (
        <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
            <div className="h-1.5 bg-slate-100 rounded-full mt-2">
                <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.min(value, 100)}%` }} />
            </div>
        </div>
    );
};

const AIInsightsPanel = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchAnalysis = async () => {
        setLoading(true);
        try { const r = await axios.post(`${API}/api/investments/ai/analyze`, {}, { headers: { Authorization: `Bearer ${getToken()}` } }); setData(r.data); }
        catch { alert('AI Analysis failed. Please try again.'); }
        finally { setLoading(false); }
    };

    if (!data) return (
        <div className="flex flex-col items-center justify-center py-20">
            <Brain size={56} className="text-indigo-200 mb-4" />
            <p className="text-xl font-bold text-slate-700 mb-2">AI Investment Intelligence</p>
            <p className="text-sm text-slate-500 mb-6 max-w-md text-center">Get risk scoring, simple projections, crash impact analysis, and personalized portfolio optimization — all computed deterministically with AI explanations.</p>
            <button onClick={fetchAnalysis} disabled={loading} className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition shadow-sm">
                {loading ? <><Loader2 size={16} className="icc-spinner" /> Analyzing...</> : <><Brain size={16} /> Generate Analysis</>}
            </button>
        </div>
    );

    const { riskScore: rs = {}, health: h = {}, projection: proj = {}, crashImpact: crash = [], narrative: n = {} } = data;
    const allocChart = Object.keys(h.recommendedAllocation || {}).filter(k => k !== 'cash').map(k => ({ name: k.charAt(0).toUpperCase() + k.slice(1), current: (h.currentAllocation || {})[k] || 0, recommended: (h.recommendedAllocation || {})[k] || 0 }));

    return (
        <div className="space-y-5">
            {/* Grade & Summary */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center text-white text-2xl font-black flex-shrink-0">{n.grade || '—'}</div>
                <div className="flex-1 min-w-[200px]">
                    <p className="font-semibold text-slate-800">{n.summary || 'Analysis complete'}</p>
                    <p className="text-sm text-slate-500 mt-1">{n.topPriority || ''}</p>
                </div>
                <button onClick={fetchAnalysis} disabled={loading} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition">
                    {loading ? <Loader2 size={14} className="icc-spinner" /> : <Brain size={14} />} Re-analyze
                </button>
            </div>

            {/* Risk */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2"><Shield size={15} className="text-indigo-500" /> Risk Assessment</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <Gauge value={rs.overall || 0} label="Overall" />
                    <Gauge value={rs.volatility || 0} label="Volatility" />
                    <Gauge value={rs.concentration || 0} label="Concentration" />
                    <Gauge value={rs.drawdown || 0} label="Drawdown" />
                </div>
                {n.riskExplanation && <p className="mt-4 text-sm text-slate-500 bg-slate-50 px-4 py-2.5 rounded-lg">{n.riskExplanation}</p>}
            </div>

            {/* Allocation */}
            {allocChart.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2"><Target size={15} className="text-emerald-500" /> Current vs Recommended Allocation</h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={allocChart} margin={{ left: 0, right: 10 }}>
                                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Bar dataKey="current" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={14} name="Current" />
                                <Bar dataKey="recommended" fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} name="Recommended" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    {n.allocationNote && <p className="mt-3 text-sm text-slate-500">{n.allocationNote}</p>}
                </div>
            )}

            {/* Projection & Crash */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><TrendingUp size={15} className="text-emerald-500" /> Simple Projection ({proj.years || 10}Y)</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="text-xs text-slate-400">Projected Value</p><p className="text-xl font-bold text-emerald-600">{fmt(proj.projected || 0)}</p></div>
                        <div><p className="text-xs text-slate-400">Inflation Adjusted</p><p className="text-xl font-bold text-indigo-600">{fmt(proj.inflationAdjusted || 0)}</p></div>
                        <div><p className="text-xs text-slate-400">Expected Growth</p><p className="text-lg font-semibold text-slate-700">{fmt(proj.growth || 0)}</p></div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><AlertTriangle size={15} className="text-amber-500" /> Crash Impact</h3>
                    <div className="space-y-2">
                        {crash.map((c, i) => (
                            <div key={i} className="flex justify-between items-center bg-slate-50 rounded-lg px-4 py-2.5 text-sm">
                                <span className="text-slate-600">{c.scenario}</span>
                                <span className="font-semibold text-red-500">{fmt(c.impact)} ({c.impactPct}%)</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Financial Health */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2"><Zap size={15} className="text-indigo-500" /> Financial Health</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`rounded-lg p-4 ${h.emergencyStatus === 'ADEQUATE' ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                        <div className="flex items-center gap-1.5 mb-1"><Umbrella size={14} className={h.emergencyStatus === 'ADEQUATE' ? 'text-emerald-500' : 'text-amber-500'} /><span className="text-xs font-semibold">{h.emergencyStatus}</span></div>
                        <p className="text-xs text-slate-600">{h.emergencyMsg}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-xs text-slate-400">Savings Rate</p>
                        <p className={`text-xl font-bold ${h.savingsRate > 20 ? 'text-emerald-600' : 'text-amber-500'}`}>{h.savingsRate || 0}%</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-xs text-slate-400">Current SIP</p><p className="text-xl font-bold text-slate-700">{fmt(h.currentSIP || 0)}</p>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-4">
                        <p className="text-xs text-indigo-400">Recommended SIP</p><p className="text-xl font-bold text-indigo-600">{fmt(h.recommendedSIP || 0)}</p>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-xs text-slate-400">Nominal Return</p><p className="text-lg font-bold text-emerald-600">{h.nominalReturn || 0}%</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-xs text-slate-400">Real Return (after inflation)</p><p className="text-lg font-bold text-indigo-600">{h.realReturn || 0}%</p>
                    </div>
                </div>
            </div>

            {/* Rebalancing */}
            {h.rebalancing?.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Target size={15} className="text-indigo-500" /> Rebalancing Actions</h3>
                    <div className="space-y-2">
                        {h.rebalancing.map((r, i) => (
                            <div key={i} className={`flex justify-between items-center px-4 py-2.5 rounded-lg text-sm ${r.action === 'REDUCE' ? 'bg-red-50' : 'bg-emerald-50'}`}>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${r.action === 'REDUCE' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>{r.action}</span>
                                    <span className="font-medium text-slate-700">{r.asset}</span>
                                </div>
                                <span className="text-slate-500">{r.current}% → {r.target}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tax Hints */}
            {h.taxHints?.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">💰 Tax Efficiency</h3>
                    {h.taxHints.map((t, i) => (<p key={i} className="text-sm text-slate-600 bg-amber-50 px-3 py-2 rounded-lg mb-2">{t}</p>))}
                </div>
            )}
        </div>
    );
};

export default AIInsightsPanel;
