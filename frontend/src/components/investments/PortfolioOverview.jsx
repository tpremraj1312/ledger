import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { RefreshCw, Shield, Target, Zap, Loader2 } from 'lucide-react';

const fmt = (v) => `₹${Math.round(v).toLocaleString('en-IN')}`;
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316'];

const KPI = ({ label, value, sub, positive }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
        <p className={`text-2xl font-bold ${positive === true ? 'text-emerald-600' : positive === false ? 'text-red-500' : 'text-slate-800'}`}>{value}</p>
        {sub && <p className={`text-sm mt-0.5 ${positive === true ? 'text-emerald-500' : positive === false ? 'text-red-400' : 'text-slate-400'}`}>{sub}</p>}
    </div>
);

const tooltipStyle = { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#1e293b' };

const PortfolioOverview = ({ snapshot, loading, onRefresh }) => {
    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="icc-spinner text-indigo-500" />
            <p className="mt-3 text-slate-500">Loading portfolio...</p>
        </div>
    );

    if (!snapshot?.summary) return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Target size={48} className="opacity-20 mb-3" />
            <p className="text-lg font-semibold text-slate-600">No investments yet</p>
            <p className="text-sm">Add your first investment to see your dashboard!</p>
        </div>
    );

    const s = snapshot.summary;
    const alloc = snapshot.allocation || {};
    const risk = snapshot.riskMetrics || {};
    const sectors = snapshot.sectorExposure || [];
    const plSign = s.totalUnrealizedPL >= 0;

    const allocData = Object.entries(alloc).filter(([, v]) => v > 0).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

    return (
        <div className="space-y-5">
            {/* Refresh bar */}
            <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Last refreshed: {snapshot.lastPriceRefreshAt ? new Date(snapshot.lastPriceRefreshAt).toLocaleTimeString() : 'N/A'}</span>
                <button onClick={onRefresh} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"><RefreshCw size={13} /> Refresh</button>
            </div>

            {/* KPI Row 1 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPI label="Total Invested" value={fmt(s.totalInvested)} />
                <KPI label="Current Value" value={fmt(s.totalCurrentValue)} positive={plSign} />
                <KPI label="Unrealized P&L" value={`${plSign ? '+' : ''}${fmt(s.totalUnrealizedPL)}`} sub={`${plSign ? '+' : ''}${s.totalUnrealizedPLPercent}%`} positive={plSign} />
                <KPI label="XIRR" value={`${s.xirr >= 0 ? '+' : ''}${s.xirr}%`} sub="Annualized" positive={s.xirr >= 0} />
            </div>

            {/* KPI Row 2 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPI label="Realized P&L" value={`${s.totalRealizedPL >= 0 ? '+' : ''}${fmt(s.totalRealizedPL)}`} positive={s.totalRealizedPL >= 0} />
                <KPI label="Day Change" value={`${s.dayChange >= 0 ? '+' : ''}${fmt(s.dayChange)}`} sub={`${s.dayChangePercent >= 0 ? '+' : ''}${s.dayChangePercent}%`} positive={s.dayChange >= 0} />
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Health</p>
                    <div className="flex items-center gap-2 mt-1">
                        <Shield size={18} className={snapshot.health === 'Aggressive' ? 'text-amber-500' : snapshot.health === 'Moderate' ? 'text-indigo-500' : 'text-emerald-500'} />
                        <span className="text-lg font-bold text-slate-800">{snapshot.health || 'N/A'}</span>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Diversification</p>
                    <p className={`text-2xl font-bold ${risk.diversificationScore > 60 ? 'text-emerald-600' : 'text-amber-500'}`}>{risk.diversificationScore || 0}<span className="text-sm text-slate-400">/100</span></p>
                    <div className="h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500" style={{ width: `${risk.diversificationScore || 0}%` }} />
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Asset Allocation</h3>
                    {allocData.length > 0 ? (
                        <>
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={allocData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="value">
                                            {allocData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={v => `${v}%`} contentStyle={tooltipStyle} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap gap-3 justify-center mt-2">
                                {allocData.map((d, i) => (
                                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                                        <div className="w-2.5 h-2.5 rounded" style={{ background: COLORS[i % COLORS.length] }} />
                                        <span className="text-slate-500">{d.name}</span>
                                        <span className="font-semibold text-slate-700">{d.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : <p className="text-slate-400 text-center py-10">No allocation data</p>}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Sector Exposure</h3>
                    {sectors.length > 0 ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={sectors.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 20 }}>
                                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="sector" width={70} tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip formatter={v => `${v}%`} contentStyle={tooltipStyle} />
                                    <Bar dataKey="percentage" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={16} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <p className="text-slate-400 text-center py-10">Add stocks to see sectors</p>}
                </div>
            </div>

            {/* Risk Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Concentration', value: risk.concentrationRisk || 'N/A', color: risk.concentrationRisk === 'High' ? 'text-red-500' : risk.concentrationRisk === 'Moderate' ? 'text-amber-500' : 'text-emerald-500' },
                    { label: 'Volatility', value: risk.volatilityScore || 0, color: 'text-slate-800' },
                    { label: 'Expected CAGR', value: `${risk.expectedCAGR || 0}%`, color: 'text-emerald-600' },
                    { label: 'Max Drawdown', value: `${risk.maxDrawdownRisk || 0}%`, color: 'text-amber-500' },
                ].map(m => (
                    <div key={m.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm text-center">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{m.label}</p>
                        <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                    </div>
                ))}
            </div>

            {/* Alerts */}
            {snapshot.alerts?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2"><Zap size={15} /> Smart Alerts</h3>
                    <div className="space-y-2">
                        {snapshot.alerts.map((a, i) => (<div key={i} className="text-sm text-amber-700 bg-amber-100/50 px-3 py-2 rounded-lg">⚠️ {a}</div>))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortfolioOverview;
