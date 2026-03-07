import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ScatterChart, Scatter, ZAxis, Cell } from 'recharts';
import { BookOpen, Calculator, GraduationCap, ArrowRight, BookMarked, BrainCircuit, Lightbulb, PieChart, Coins, Shield, TrendingUp, AlertTriangle, BarChart3, Target } from 'lucide-react';

const fmt = (v) => `₹${Math.round(v).toLocaleString('en-IN')}`;
const tooltipStyle = { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#1e293b', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.08)' };

// ═══════════════════════════════════════════════════════════════
// ENHANCED LEARNING MODULES
// ═══════════════════════════════════════════════════════════════

const LEARNING_MODULES = [
    {
        category: 'Investment Basics',
        items: [
            { icon: <Coins size={18} />, title: 'Asset Classes 101', desc: 'Understand Equity, Debt, Gold, and Real Estate. Learn how they behave in different market cycles.', time: '3 min read' },
            { icon: <BrainCircuit size={18} />, title: 'Risk vs Reward', desc: 'The fundamental trade-off of investing. Discover your personal risk tolerance and capacity.', time: '4 min read' },
            { icon: <BookMarked size={18} />, title: 'The Magic of Compounding', desc: 'Why starting early matters more than how much you start with. See the math behind compound interest.', time: '2 min read' },
        ]
    },
    {
        category: 'Risk & Diversification',
        items: [
            { icon: <Shield size={18} />, title: 'Portfolio Diversification', desc: 'How spreading investments across asset classes reduces risk without sacrificing returns.', time: '4 min read' },
            { icon: <AlertTriangle size={18} />, title: 'Understanding Volatility', desc: 'Why prices fluctuate and how to use volatility to your advantage through systematic investing.', time: '3 min read' },
            { icon: <Target size={18} />, title: 'Rebalancing Strategy', desc: 'When and how to rebalance your portfolio. The discipline that separates good investors from great ones.', time: '5 min read' },
        ]
    },
    {
        category: 'Long-Term Compounding',
        items: [
            { icon: <PieChart size={18} />, title: 'Asset Allocation by Age', desc: 'How to divide your money based on your age, goals, and market valuations.', time: '5 min read' },
            { icon: <ArrowRight size={18} />, title: 'SIPs & Lumpsum Strategy', desc: 'When to use Rupee Cost Averaging (SIP) and when to deploy bulk capital (Lumpsum).', time: '4 min read' },
            { icon: <Lightbulb size={18} />, title: 'Tax Efficient Investing', desc: 'Understanding LTCG, STCG, and tax-saving instruments like ELSS and PPF.', time: '6 min read' },
        ]
    },
    {
        category: 'Financial Health Awareness',
        items: [
            { icon: <BarChart3 size={18} />, title: 'Emergency Fund Essentials', desc: 'Building a 6-month safety net before aggressive investing. The foundation of financial health.', time: '3 min read' },
            { icon: <TrendingUp size={18} />, title: 'Inflation Protection', desc: 'Why keeping money in savings accounts loses value. How equity beats inflation over the long term.', time: '4 min read' },
            { icon: <GraduationCap size={18} />, title: 'Common Investing Mistakes', desc: 'Avoid herd mentality, panic selling, over-diversification, and timing the market.', time: '5 min read' },
        ]
    },
];

const STAGE_ROADMAP = [
    { stage: 'Foundation (18–25 Yrs)', focus: 'Cashflow & Habits', goals: ['Build 6-Month Emergency Fund', 'Clear high-interest debt', 'Start first SIP (Index Fund)'], },
    { stage: 'Accumulation (25–40 Yrs)', focus: 'Wealth Creation', goals: ['Max out tax-advantaged accounts', 'Maintain 60-80% Equity allocation', 'Buy adequate Term & Health Insurance'], },
    { stage: 'Consolidation (40–55 Yrs)', focus: 'Preservation & Growth', goals: ['Shift gradually towards quality Debt', 'Review asset allocation annually', 'Plan for child education/major milestones'], },
    { stage: 'Distribution (55+ Yrs)', focus: 'Income Generation', goals: ['Set up Systematic Withdrawal Plans (SWP)', 'Ensure deep capital protection', 'Estate planning & nominations'], },
];

// Risk vs Return scatter data
const RISK_RETURN_DATA = [
    { name: 'FD', risk: 2, return: 6.5, size: 40 },
    { name: 'Gold', risk: 12, return: 8, size: 50 },
    { name: 'Bond', risk: 5, return: 7, size: 45 },
    { name: 'Index Fund', risk: 16, return: 11, size: 60 },
    { name: 'Equity MF', risk: 20, return: 12, size: 55 },
    { name: 'Stocks', risk: 25, return: 14, size: 65 },
    { name: 'Crypto', risk: 65, return: 20, size: 50 },
];

const SCATTER_COLORS = ['#94a3b8', '#f59e0b', '#64748b', '#6366f1', '#10b981', '#3b82f6', '#06b6d4'];

// ═══════════════════════════════════════════════════════════════
// ADVANCED SIP SIMULATOR
// ═══════════════════════════════════════════════════════════════

const AdvancedSimulator = () => {
    const [monthly, setMonthly] = useState(10000);
    const [years, setYears] = useState(15);
    const [rate, setRate] = useState(12);
    const [stepUp, setStepUp] = useState(5);

    const { totalInvested, fv, inflAdj, chartData } = useMemo(() => {
        let currentInvested = 0, currentValue = 0, currentMonthly = monthly;
        const cd = [];
        for (let y = 1; y <= years; y++) {
            for (let m = 1; m <= 12; m++) {
                currentInvested += currentMonthly;
                currentValue = (currentValue + currentMonthly) * (1 + (rate / 100) / 12);
            }
            cd.push({ year: `Yr ${y}`, invested: Math.round(currentInvested), value: Math.round(currentValue) });
            currentMonthly += currentMonthly * (stepUp / 100);
        }
        return { totalInvested: currentInvested, fv: currentValue, inflAdj: currentValue / Math.pow(1.06, years), chartData: cd };
    }, [monthly, years, rate, stepUp]);

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                <div>
                    <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2"><Calculator size={18} className="text-slate-500" /> Investment Simulator</h3>
                    <p className="text-xs text-slate-500 mt-1">Model your wealth creation journey with annual step-ups.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-5">
                    {[
                        { label: 'Starting Monthly SIP', value: fmt(monthly), min: 1000, max: 200000, step: 1000, state: monthly, setter: setMonthly },
                        { label: 'Period (Years)', value: `${years} yrs`, min: 1, max: 40, step: 1, state: years, setter: setYears },
                        { label: 'Expected Return', value: `${rate}%`, min: 4, max: 20, step: 0.5, state: rate, setter: setRate },
                        { label: 'Annual Step-Up', value: `${stepUp}%`, min: 0, max: 20, step: 1, state: stepUp, setter: setStepUp },
                    ].map(s => (
                        <div key={s.label}>
                            <div className="flex justify-between mb-1">
                                <label className="text-xs font-medium text-slate-600">{s.label}</label>
                                <span className="text-sm font-semibold text-slate-800">{s.value}</span>
                            </div>
                            <input type="range" min={s.min} max={s.max} step={s.step} value={s.state} onChange={e => s.setter(Number(e.target.value))} className="w-full accent-indigo-500" />
                        </div>
                    ))}
                </div>

                <div className="lg:col-span-8 flex flex-col">
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="border border-slate-100 bg-slate-50/50 rounded-lg p-3.5">
                            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Total Invested</p>
                            <p className="text-lg font-semibold text-slate-800">{fmt(totalInvested)}</p>
                        </div>
                        <div className="border border-indigo-100 bg-indigo-50 rounded-lg p-3.5">
                            <p className="text-[10px] font-medium text-indigo-500 uppercase tracking-wider mb-1">Expected Value</p>
                            <p className="text-lg font-semibold text-indigo-700">{fmt(fv)}</p>
                        </div>
                        <div className="border border-slate-100 bg-white rounded-lg p-3.5">
                            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Inflation Adjusted</p>
                            <p className="text-lg font-semibold text-slate-800">{fmt(inflAdj)}</p>
                        </div>
                    </div>
                    <div className="flex-1 min-h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 0, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1e7 ? `${(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `${(v / 1e5).toFixed(0)}L` : `${(v / 1e3).toFixed(0)}K`} width={50} />
                                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
                                <defs><linearGradient id="colorValE" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                                <Area type="monotone" dataKey="invested" stroke="#94a3b8" fill="#f8fafc" strokeWidth={2} name="Invested" />
                                <Area type="monotone" dataKey="value" stroke="#6366f1" fill="url(#colorValE)" strokeWidth={2} name="Value" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// RISK VS RETURN VISUALIZER
// ═══════════════════════════════════════════════════════════════

const RiskReturnVisualizer = () => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-1"><Shield size={18} className="text-indigo-500" /> Risk vs Return Landscape</h3>
        <p className="text-xs text-slate-500 mb-5">Where different asset classes sit on the risk-return spectrum.</p>
        <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" dataKey="risk" name="Risk (Volatility %)" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Risk (Volatility %)', position: 'bottom', fill: '#94a3b8', fontSize: 11, offset: 2 }} />
                    <YAxis type="number" dataKey="return" name="Expected Return %" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Return %', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
                    <ZAxis type="number" dataKey="size" range={[200, 600]} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${v}%`, n]} cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={RISK_RETURN_DATA} name="Assets">
                        {RISK_RETURN_DATA.map((_, i) => <Cell key={i} fill={SCATTER_COLORS[i]} />)}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 justify-center mt-3">
            {RISK_RETURN_DATA.map((d, i) => (
                <span key={d.name} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: SCATTER_COLORS[i] }} />{d.name}
                </span>
            ))}
        </div>
    </div>
);

// ═══════════════════════════════════════════════════════════════
// PORTFOLIO MISTAKE DETECTOR
// ═══════════════════════════════════════════════════════════════

const MistakeDetector = ({ snapshot }) => {
    const alloc = snapshot?.allocation || {};
    const risk = snapshot?.riskMetrics || {};
    const holdings = snapshot?.holdings || [];

    const mistakes = [];
    if (alloc.equity > 85) mistakes.push({ severity: 'high', msg: 'Extremely high equity exposure (>85%). A market crash could severely impact your portfolio. Consider adding stable assets.' });
    else if (alloc.equity > 70) mistakes.push({ severity: 'medium', msg: 'High equity concentration. Consider diversifying into debt or gold for stability.' });
    if (alloc.debt < 5 && holdings.length > 0) mistakes.push({ severity: 'medium', msg: 'Almost no debt allocation. Stable instruments act as a cushion during volatility.' });
    if (alloc.crypto > 20) mistakes.push({ severity: 'high', msg: `Crypto allocation at ${alloc.crypto}%. Extremely volatile — consider keeping under 10%.` });
    if (risk.concentrationRisk === 'High') mistakes.push({ severity: 'high', msg: 'High concentration risk. Your portfolio depends heavily on a few holdings.' });
    const bigLosers = holdings.filter(h => h.unrealizedPLPercent < -15);
    if (bigLosers.length > 0) mistakes.push({ severity: 'medium', msg: `${bigLosers.length} holding(s) are down >15%. Consider reviewing if the thesis still holds.` });
    if (holdings.length === 1) mistakes.push({ severity: 'medium', msg: 'Single-stock portfolio. Diversification reduces risk significantly.' });

    if (!mistakes.length) return (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
            <p className="text-emerald-700 font-semibold">✅ No major mistakes detected!</p>
            <p className="text-sm text-emerald-600 mt-1">Your portfolio structure looks healthy.</p>
        </div>
    );

    return (
        <div className="space-y-2">
            {mistakes.map((m, i) => (
                <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-lg text-sm border ${m.severity === 'high' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>{m.msg}</span>
                </div>
            ))}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// MAIN EXPLORER PANEL
// ═══════════════════════════════════════════════════════════════

const ExplorerPanel = ({ snapshot }) => {
    const [activeTab, setActiveTab] = useState('hub');

    const alloc = snapshot?.allocation || {};
    const risk = snapshot?.riskMetrics || {};

    // Adaptive insights
    const insights = [];
    if (alloc.equity > 80) insights.push({ msg: "Your portfolio is highly aggressive. Ensure you have ample emergency funds in cash/debt to weather market volatility.", module: 'Risk & Diversification' });
    else if (alloc.debt < 10 && snapshot?.holdings?.length > 0) insights.push({ msg: "Consider building a stronger debt foundation to protect against market corrections.", module: 'Risk & Diversification' });
    if (risk.concentrationRisk === 'High') insights.push({ msg: "High concentration detected. Diversification might help smooth out your returns.", module: 'Risk & Diversification' });
    if (!alloc.equity && snapshot?.holdings?.length > 0) insights.push({ msg: "No equity exposure. Your portfolio may not keep up with inflation over the long term.", module: 'Long-Term Compounding' });

    const tabs = [
        { id: 'hub', label: 'Learning Hub', icon: <BookOpen size={15} /> },
        { id: 'roadmap', label: 'Roadmap', icon: <GraduationCap size={15} /> },
        { id: 'tools', label: 'Interactive Tools', icon: <Calculator size={15} /> },
        { id: 'detector', label: 'Mistake Detector', icon: <AlertTriangle size={15} /> },
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50/30 rounded-2xl">
            <div className="px-5 pt-5 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-800">Financial Intelligence Explorer</h2>
                        <p className="text-sm text-slate-500 mt-1">Master the art of investing and wealth creation</p>
                    </div>
                </div>

                <div className="flex gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto icc-tabs-scroll">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                {/* Adaptive Insight Banner */}
                {insights.length > 0 && activeTab === 'hub' && (
                    <div className="bg-slate-800 text-white rounded-xl p-4 mt-4 shadow-sm border border-slate-700 flex items-start gap-3">
                        <Lightbulb size={20} className="text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="text-sm font-medium mb-1">Personalized Insight</h4>
                            <p className="text-sm text-slate-300 leading-relaxed">{insights[0].msg}</p>
                            <p className="text-xs text-indigo-400 mt-2 font-medium">📖 Recommended module: {insights[0].module}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="px-5 pb-6">
                {/* LEARNING HUB */}
                {activeTab === 'hub' && (
                    <div className="space-y-7 icc-fade-in">
                        {LEARNING_MODULES.map((module, idx) => (
                            <div key={idx}>
                                <h3 className="text-sm font-semibold text-slate-800 mb-3 px-1">{module.category}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {module.items.map((item, i) => (
                                        <div key={i} className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col h-full">
                                            <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 mb-3 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">{item.icon}</div>
                                            <h4 className="text-sm font-semibold text-slate-800 mb-1.5">{item.title}</h4>
                                            <p className="text-xs text-slate-500 leading-relaxed flex-grow">{item.desc}</p>
                                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-400">
                                                <span>{item.time}</span>
                                                <span className="flex items-center gap-1 group-hover:text-indigo-600 transition-colors">Read <ArrowRight size={11} /></span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ROADMAP */}
                {activeTab === 'roadmap' && (
                    <div className="icc-fade-in relative">
                        <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-slate-100" />
                        <div className="space-y-5 relative">
                            {STAGE_ROADMAP.map((stage, idx) => (
                                <div key={idx} className="flex gap-5 items-start">
                                    <div className="w-14 h-14 rounded-full bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center text-lg font-bold text-slate-400 z-10 flex-shrink-0">{idx + 1}</div>
                                    <div className="flex-1 bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                                        <h4 className="text-base font-semibold text-slate-800">{stage.stage}</h4>
                                        <p className="text-xs font-medium text-indigo-500 mt-1 mb-3">Focus: {stage.focus}</p>
                                        <ul className="space-y-1.5">
                                            {stage.goals.map((goal, gIdx) => (
                                                <li key={gIdx} className="flex items-start gap-2 text-sm text-slate-600">
                                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-300 flex-shrink-0" />
                                                    <span>{goal}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* INTERACTIVE TOOLS */}
                {activeTab === 'tools' && (
                    <div className="space-y-5 icc-fade-in">
                        <RiskReturnVisualizer />
                        <AdvancedSimulator />
                    </div>
                )}

                {/* MISTAKE DETECTOR */}
                {activeTab === 'detector' && (
                    <div className="icc-fade-in">
                        <div className="mb-4">
                            <h3 className="text-base font-semibold text-slate-800">Portfolio Mistake Detector</h3>
                            <p className="text-xs text-slate-500 mt-1">Automated analysis of your portfolio for common investing mistakes.</p>
                        </div>
                        <MistakeDetector snapshot={snapshot} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExplorerPanel;
