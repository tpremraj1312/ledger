import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingDown, TrendingUp, LayoutDashboard, IndianRupee } from 'lucide-react';

const AnalyticsSection = () => {
    return (
        <section className="py-24 relative overflow-hidden bg-white border-y border-slate-100">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-blue-100/30 rounded-full blur-[120px] pointer-events-none" />

            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
                        <p className="text-[#2563EB] text-sm font-bold tracking-widest uppercase mb-3">Financial Analytics</p>
                        <h2 className="text-3xl md:text-5xl font-black text-[#0F172A] mb-6 tracking-tight">
                            Budget vs Expense <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#4F8CFF]">Deep Dive.</span>
                        </h2>
                        <p className="text-[#475569] text-lg leading-relaxed font-medium">
                            Cross-reference your actual expenses against active budgets. Visualize category spending trends with interactive, high-fidelity analytics.
                        </p>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl mx-auto">
                    {/* Big Chart Card */}
                    <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1 }}
                        className="lg:col-span-8 bg-white border border-[#E2E8F0] p-6 md:p-8 rounded-[14px] shadow-[0px_1px_2px_rgba(0,0,0,0.04)] relative overflow-hidden group hover:shadow-md transition-shadow">
                        <h4 className="text-[#0F172A] font-bold text-lg mb-8 flex items-center justify-between">
                            Monthly Comparison
                            <span className="text-xs font-medium px-3 py-1 bg-[#E8F0FF] text-[#2563EB] rounded-full border border-[#2563EB]/10">This Year</span>
                        </h4>

                        <div className="h-[250px] w-full flex items-end gap-2 sm:gap-4 lg:gap-5 border-b border-[#E2E8F0] pb-2 relative z-10">
                            {[
                                { exp: 45, bud: 55 }, { exp: 60, bud: 65 }, { exp: 35, bud: 50 },
                                { exp: 80, bud: 75 }, { exp: 50, bud: 60 }, { exp: 70, bud: 90 }
                            ].map((val, idx) => (
                                <div key={idx} className="flex-1 flex gap-1 sm:gap-1.5 h-full items-end group/bar relative z-10">
                                    <motion.div initial={{ height: 0 }} whileInView={{ height: `${val.exp}%` }}
                                        transition={{ duration: 0.8, delay: 0.2 + (idx * 0.1) }}
                                        className="w-1/2 bg-[#2563EB] rounded-t-md hover:bg-[#1d4ed8] transition-colors" />
                                    <motion.div initial={{ height: 0 }} whileInView={{ height: `${val.bud}%` }}
                                        transition={{ duration: 0.8, delay: 0.3 + (idx * 0.1) }}
                                        className="w-1/2 bg-[#E8F0FF] border border-[#2563EB]/20 rounded-t-md" />
                                </div>
                            ))}
                        </div>
                        <div className="w-full flex justify-between mt-4 text-[#94A3B8] text-xs font-semibold px-1">
                            <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
                        </div>
                        <div className="flex gap-4 mt-4">
                            <div className="flex items-center gap-2 text-xs font-medium text-[#475569]">
                                <div className="w-3 h-3 rounded-sm bg-[#2563EB]" /> Expenses
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium text-[#475569]">
                                <div className="w-3 h-3 rounded-sm bg-[#E8F0FF] border border-[#2563EB]/20" /> Budget
                            </div>
                        </div>
                    </motion.div>

                    {/* Small Status Cards */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.2 }}
                            className="flex-1 bg-white rounded-[14px] p-6 md:p-8 flex flex-col justify-center border border-[#E2E8F0] shadow-[0px_1px_2px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow group">
                            <div className="bg-[#E8F0FF] p-3 rounded-xl w-max mb-4">
                                <TrendingDown size={22} className="text-[#16A34A]" />
                            </div>
                            <p className="text-[#94A3B8] font-bold text-[11px] tracking-widest mb-1 uppercase">Expense Drop</p>
                            <h3 className="text-4xl font-black text-[#0F172A]">-12.4%</h3>
                            <p className="text-sm text-[#475569] mt-2 font-medium">vs previous month</p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.3 }}
                            className="bg-white border border-[#E2E8F0] p-6 rounded-[14px] flex items-center gap-4 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
                            <div className="h-14 w-14 rounded-full border-4 border-[#2563EB] flex items-center justify-center shrink-0">
                                <span className="text-xs font-black text-[#0F172A]">82%</span>
                            </div>
                            <div>
                                <h4 className="text-[#0F172A] font-bold text-sm">Budget Health</h4>
                                <p className="text-xs text-[#475569] mt-1 font-medium">Well within limits this week.</p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AnalyticsSection;
