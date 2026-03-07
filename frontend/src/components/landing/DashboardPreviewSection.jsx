import React, { useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Wallet, LayoutDashboard, PieChart, ArrowUpRight, ArrowDownRight, Activity, Brain, Bell, Settings, CreditCard, PiggyBank, Home, Receipt, TrendingUp, Gamepad2, BarChart3, Bot, Calculator, FileText, Users, DollarSign, ScanLine } from 'lucide-react';

const GlowCard = ({ children, className = "" }) => (
    <div className={`relative group bg-white rounded-[14px] border border-[#E2E8F0] shadow-[0px_1px_2px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300 hover:shadow-md hover:border-[#2563EB]/20 ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <div className="relative z-10 w-full h-full p-5">{children}</div>
    </div>
);

const DashboardPreviewSection = () => {
    const { scrollYProgress } = useScroll();
    const scale = useTransform(scrollYProgress, [0.05, 0.2], [0.92, 1]);
    const yOffset = useTransform(scrollYProgress, [0.05, 0.2], [60, 0]);
    const opacity = useTransform(scrollYProgress, [0.05, 0.15], [0.5, 1]);

    const actionCards = [
        { label: "Scan Bill", icon: ScanLine, bg: "bg-gradient-to-br from-[#2563EB] to-[#1d4ed8]", text: "text-white" },
        { label: "Gamification", icon: Gamepad2, bg: "bg-gradient-to-br from-[#f59e0b] to-[#d97706]", text: "text-white" },
        { label: "Compare Budget", icon: BarChart3, bg: "bg-gradient-to-br from-[#10b981] to-[#059669]", text: "text-white" },
        { label: "AI Analysis", icon: Brain, bg: "bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed]", text: "text-white" },
        { label: "Optimize Taxes", icon: Calculator, bg: "bg-gradient-to-br from-[#f97316] to-[#ea580c]", text: "text-white" },
    ];

    const navItems = [
        { text: "Home", icon: Home, active: true },
        { text: "Budget", icon: PiggyBank },
        { text: "Expenses", icon: Receipt },
        { text: "Investments", icon: TrendingUp },
        { text: "Gamification", icon: Gamepad2 },
        { text: "Settings", icon: Settings },
        { text: "Compare", icon: BarChart3 },
        { text: "AI Analysis", icon: Brain },
        { text: "Tax Advisor", icon: Calculator },
        { text: "AI Agent", icon: Bot },
    ];

    return (
        <section className="py-20 relative overflow-hidden bg-gradient-to-b from-[#f8fafc] to-white border-b border-slate-100">
            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-14">
                    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
                        <p className="text-[#2563EB] text-sm font-bold tracking-widest uppercase mb-3">Product Preview</p>
                        <h2 className="text-3xl md:text-5xl font-black text-[#0F172A] mb-5 tracking-tight">
                            Your Financial <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#4F8CFF]">Command Center.</span>
                        </h2>
                        <p className="text-[#475569] text-lg font-medium leading-relaxed">
                            A structured, enterprise-grade dashboard built for serious financial control — not a toy prototype.
                        </p>
                    </motion.div>
                </div>

                {/* macOS Window */}
                <motion.div style={{ scale, y: yOffset, opacity }} className="w-full max-w-6xl mx-auto bg-white rounded-2xl shadow-[0_30px_80px_-20px_rgba(15,23,42,0.12)] border border-[#E2E8F0] overflow-hidden">
                    {/* Titlebar */}
                    <div className="w-full h-10 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center px-4 gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
                            <div className="w-3 h-3 rounded-full bg-[#EAB308]" />
                            <div className="w-3 h-3 rounded-full bg-[#16A34A]" />
                        </div>
                        <div className="mx-auto">
                            <div className="bg-white border border-[#E2E8F0] rounded-md px-12 py-1 text-[10px] text-[#94A3B8] font-medium shadow-sm">
                                app.ledgerfinance.info
                            </div>
                        </div>
                    </div>

                    {/* 3-Column Layout */}
                    <div className="w-full flex h-[680px] overflow-hidden bg-[#F8FAFC]">
                        {/* LEFT SIDEBAR */}
                        <div className="hidden lg:flex flex-col w-[220px] bg-white border-r border-[#E2E8F0] shrink-0">
                            <div className="flex items-center gap-2 p-4 pb-2 font-bold text-[#0F172A]">
                                <div className="p-1.5 bg-[#2563EB] rounded-lg text-white"><Wallet size={16} /></div>
                                <span className="tracking-tight text-sm">Finance Hub</span>
                            </div>
                            <nav className="p-3 space-y-0.5 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                                {navItems.map((item, idx) => (
                                    <div key={idx} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${item.active ? 'bg-[#E8F0FF] text-[#2563EB] font-semibold' : 'text-[#475569] hover:bg-[#F1F5F9]'}`}>
                                        <item.icon size={15} />
                                        {item.text}
                                    </div>
                                ))}
                                <div className="pt-4 pb-1 px-3">
                                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Family Governance</p>
                                </div>
                                {[{ text: "Dashboard", icon: LayoutDashboard }, { text: "Members", icon: Users }, { text: "Shared Expenses", icon: DollarSign }].map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-[#475569] hover:bg-[#F1F5F9] cursor-pointer">
                                        <item.icon size={15} />
                                        {item.text}
                                    </div>
                                ))}
                            </nav>
                        </div>

                        {/* CENTER */}
                        <div className="flex-1 p-6 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                            {/* Action Cards Row */}
                            <div className="grid grid-cols-5 gap-3 mb-6">
                                {actionCards.map((card, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.4 }}
                                        className={`${card.bg} ${card.text} rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-md hover:shadow-lg transition-shadow cursor-pointer`}>
                                        <card.icon size={22} />
                                        <span className="text-[11px] font-bold text-center leading-tight">{card.label}</span>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Metrics */}
                            <div className="grid grid-cols-4 gap-3 mb-6">
                                {[
                                    { label: "Total Expenses", value: "₹5,827.00", color: "text-[#2563EB]" },
                                    { label: "Total Budget", value: "₹25,000.00", color: "text-[#2563EB]" },
                                    { label: "Top Category", value: "Groceries", color: "text-[#0F172A]" },
                                    { label: "Transactions", value: "24", color: "text-[#0F172A]" },
                                ].map((m, i) => (
                                    <GlowCard key={i}>
                                        <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">{m.label}</p>
                                        <p className={`text-xl font-bold ${m.color} leading-none`}>{m.value}</p>
                                    </GlowCard>
                                ))}
                            </div>

                            {/* Family Snapshot Banner */}
                            <div className="bg-gradient-to-r from-[#0F172A] to-[#1e293b] rounded-2xl p-5 mb-6 flex items-center justify-between text-white">
                                <div>
                                    <h4 className="font-bold text-sm flex items-center gap-2">
                                        <Users size={16} className="text-emerald-400" /> Household Snapshot
                                    </h4>
                                    <p className="text-xs text-slate-300 mt-1">Your collective financial footprint this month.</p>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="text-center">
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Group Spending</p>
                                        <p className="text-lg font-bold">₹12,400</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Active Budget</p>
                                        <p className="text-lg font-bold">₹25,000</p>
                                    </div>
                                    <button className="text-[11px] font-bold bg-white text-[#0F172A] px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors">
                                        GO TO HUB
                                    </button>
                                </div>
                            </div>

                            {/* Charts */}
                            <div className="flex gap-3">
                                <GlowCard className="flex-[2]">
                                    <h4 className="text-[14px] font-semibold text-[#0F172A] mb-4">Spending Trend</h4>
                                    <div className="w-full h-[120px] flex items-end gap-1.5 border-b border-dashed border-[#E2E8F0] pb-2">
                                        {[35, 55, 45, 70, 50, 85, 65].map((v, i) => (
                                            <motion.div key={i} initial={{ height: 0 }} whileInView={{ height: `${v}%` }} transition={{ duration: 0.6, delay: i * 0.08 }}
                                                className="flex-1 bg-gradient-to-t from-[#10b981] to-[#34d399] rounded-t-sm" />
                                        ))}
                                    </div>
                                </GlowCard>
                                <GlowCard className="flex-[1]">
                                    <h4 className="text-[14px] font-semibold text-[#0F172A] mb-4">Category Allocation</h4>
                                    <div className="w-[90px] h-[90px] rounded-full mx-auto border-[14px] border-[#10b981] border-r-[#E2E8F0] border-b-[#34d399]" />
                                </GlowCard>
                            </div>
                        </div>

                        {/* RIGHT AI PANEL */}
                        <div className="hidden xl:flex flex-col w-[340px] bg-white border-l border-[#E2E8F0] shrink-0">
                            <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Brain size={16} className="text-[#2563EB]" /><h3 className="text-[14px] font-bold text-[#0F172A]">AI Co-Pilot</h3>
                                </div>
                                <div className="flex gap-2 text-[#94A3B8]"><Bell size={14} /><Settings size={14} /></div>
                            </div>
                            <div className="flex-1 p-4 bg-[#F8FAFC]/50 space-y-3 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                                <div className="bg-[#E8F0FF] text-[#2563EB] text-[13px] font-medium p-3 rounded-2xl rounded-tr-sm ml-8">
                                    Show me a breakdown of my grocery spending this month.
                                </div>
                                <div className="bg-white border border-[#E2E8F0] text-[#475569] text-[13px] p-3 rounded-2xl rounded-tl-sm mr-8 shadow-sm">
                                    <strong className="text-[#0F172A] block mb-1">Groceries: ₹4,200 this month</strong>
                                    That's 18% higher than last month. Top vendor: BigBasket (₹2,100). Consider setting a ₹3,500 cap.
                                    <button className="mt-2 text-[11px] font-bold bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-1 rounded w-full hover:bg-[#E8F0FF] transition-colors text-[#0F172A]">Set Budget Cap</button>
                                </div>
                                <div className="bg-[#E8F0FF] text-[#2563EB] text-[13px] font-medium p-3 rounded-2xl rounded-tr-sm ml-8">
                                    Any tax saving tips?
                                </div>
                                <div className="bg-white border border-[#E2E8F0] text-[#475569] text-[13px] p-3 rounded-2xl rounded-tl-sm mr-8 shadow-sm">
                                    <strong className="text-[#0F172A] block mb-1">3 opportunities found:</strong>
                                    You can claim ₹1.5L under 80C via ELSS funds. Your NPS contribution of ₹50K qualifies for 80CCD(1B).
                                    <button className="mt-2 text-[11px] font-bold bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-1 rounded w-full hover:bg-[#E8F0FF] transition-colors text-[#0F172A]">Optimize Taxes →</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default DashboardPreviewSection;
