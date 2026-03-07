import React from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Download, ArrowUpDown, Trash2 } from 'lucide-react';

const TransactionIntelligenceSection = () => {
    const transactions = [
        { name: "Netflix Subscription", date: "24 Feb", method: "Auto", amount: "-₹1,000.00" },
        { name: "Uber Rides", date: "23 Feb", method: "Manual", amount: "-₹1,500.00" },
        { name: "Electricity Bill", date: "23 Feb", method: "Auto", amount: "-₹1,551.00" },
        { name: "Amazon Web Services", date: "23 Feb", method: "Scan", amount: "-₹999.00" },
        { name: "Restaurant Dining", date: "23 Feb", method: "Manual", amount: "-₹777.00" },
        { name: "Groceries (BigBasket)", date: "22 Feb", method: "Scan", amount: "-₹2,340.00" },
    ];

    return (
        <section className="py-24 relative overflow-hidden bg-[#F8FAFC] border-y border-slate-100">
            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
                        <p className="text-[#2563EB] text-sm font-bold tracking-widest uppercase mb-3">Expense Ledger</p>
                        <h2 className="text-3xl md:text-5xl font-black text-[#0F172A] mb-6 tracking-tight">
                            Recent <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#4F8CFF]">Activity.</span>
                        </h2>
                        <p className="text-[#475569] text-lg font-medium leading-relaxed">
                            Every rupee accounted for. A clean, structured ledger that mirrors your real transaction feed — complete with instant search, category tags, and delete controls.
                        </p>
                    </motion.div>
                </div>

                <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
                    className="w-full max-w-4xl mx-auto bg-white rounded-[14px] border border-[#E2E8F0] shadow-[0px_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">

                    {/* Header */}
                    <div className="p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h3 className="text-lg font-bold text-[#0F172A]">Recent Activity</h3>
                        <div className="flex gap-2">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                                <input type="text" placeholder="Search transactions..." disabled
                                    className="pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] bg-[#F8FAFC] w-52 shadow-sm" />
                            </div>
                            <button className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[13px] font-medium text-[#475569] shadow-sm hover:bg-[#F8FAFC] transition-colors">
                                <Filter size={14} /> Filter
                            </button>
                        </div>
                    </div>

                    {/* Transaction Rows — Matching the actual app style */}
                    <div className="divide-y divide-[#E2E8F0]">
                        {transactions.map((tx, i) => (
                            <motion.div key={i}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: i * 0.06 }}
                                className="flex items-center justify-between px-6 py-5 hover:bg-[#F8FAFC] transition-colors group cursor-default">
                                <div className="flex-1">
                                    <p className="text-[14px] font-semibold text-[#0F172A]">{tx.name}</p>
                                </div>
                                <div className="flex-1 text-center">
                                    <p className="text-[13px] text-[#475569]">{tx.date}</p>
                                    <p className="text-[11px] text-[#2563EB] font-medium">({tx.method})</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="text-[14px] font-bold text-[#EF4444]">{tx.amount}</p>
                                    <Trash2 size={14} className="text-[#94A3B8] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-[#EF4444]" />
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center px-6">
                        <span className="text-[12px] text-[#94A3B8] font-medium">Showing 6 of 1,402 entries</span>
                        <div className="flex gap-1">
                            <button className="px-2.5 py-1 text-[12px] font-medium text-[#94A3B8]">Prev</button>
                            <button className="px-2.5 py-1 text-[12px] font-bold text-[#0F172A] bg-white border border-[#E2E8F0] rounded shadow-sm">1</button>
                            <button className="px-2.5 py-1 text-[12px] font-medium text-[#475569]">2</button>
                            <button className="px-2.5 py-1 text-[12px] font-medium text-[#475569]">3</button>
                            <button className="px-2.5 py-1 text-[12px] font-medium text-[#475569]">Next</button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default TransactionIntelligenceSection;
