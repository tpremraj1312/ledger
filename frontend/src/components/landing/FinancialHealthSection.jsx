import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ShieldCheck, Activity, Target, AlertTriangle } from 'lucide-react';
import { fadeInVariant } from './FadeInVariant';

const FinancialHealthSection = () => {
    return (
        <section className="py-24 relative overflow-hidden bg-[#F8FAFC]">
            <div className="container mx-auto px-4 sm:px-6 relative z-10">

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* Left: Component Replica */}
                    <div className="flex justify-center perspective-1000">
                        <motion.div
                            initial={{ opacity: 0, rotateY: 20, scale: 0.95 }}
                            whileInView={{ opacity: 1, rotateY: 0, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="w-full max-w-md bg-white rounded-[14px] border border-[#E2E8F0] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] p-6 mouse-glow-wrapper"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-[14px] font-bold text-[#0F172A] flex items-center gap-2">
                                    <ShieldCheck size={18} className="text-[#2563EB]" /> Health Score
                                </h3>
                                <span className="text-[11px] font-bold text-[#16A34A] bg-[#E8F7EE] px-2 py-1 rounded-md">Excellent</span>
                            </div>

                            <div className="flex flex-col items-center justify-center mb-8">
                                <div className="relative w-32 h-32 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="40" className="text-[#F1F5F9]" strokeWidth="8" stroke="currentColor" fill="none" />
                                        <motion.circle
                                            initial={{ strokeDasharray: "0 250" }}
                                            whileInView={{ strokeDasharray: "206 250" }} // ~82% of circumference (251)
                                            transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                                            cx="50" cy="50" r="40"
                                            className="text-[#2563EB]"
                                            strokeWidth="8"
                                            stroke="currentColor"
                                            fill="none"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute flex flex-col items-center">
                                        <span className="text-3xl font-black text-[#0F172A] tracking-tighter">82</span>
                                        <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest">/ 100</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {[
                                    { label: "Savings Rate", value: "34%", status: "Optimal", color: "text-[#16A34A]", bg: "bg-[#16A34A]" },
                                    { label: "Debt-to-Income", value: "12%", status: "Low Risk", color: "text-[#16A34A]", bg: "bg-[#16A34A]" },
                                    { label: "Emergency Fund", value: "2.4 Mo", status: "Needs Work", color: "text-[#EAB308]", bg: "bg-[#EAB308]" }
                                ].map((metric, i) => (
                                    <div key={i} className="flex flex-col gap-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[13px] font-medium text-[#475569]">{metric.label}</span>
                                            <div className="text-right">
                                                <span className="text-[14px] font-bold text-[#0F172A]">{metric.value}</span>
                                                <span className={`text-[10px] font-bold ml-2 ${metric.color}`}>{metric.status}</span>
                                            </div>
                                        </div>
                                        <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                                            <div className={`h-full ${metric.bg} rounded-full`} style={{ width: metric.value === "2.4 Mo" ? "40%" : metric.value }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right: Copy */}
                    <div className="lg:pl-10">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-100px" }}
                            variants={fadeInVariant}
                        >
                            <h2 className="text-3xl md:text-5xl font-black text-[#0F172A] mb-6 tracking-tight">
                                Diagnose Your <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#4F8CFF]">Financial Health.</span>
                            </h2>
                            <p className="text-[#475569] text-lg font-medium leading-relaxed mb-8">
                                Get an instant, algorithmic breakdown of your financial stability. Our health engine analyzes liquidity, debt ratios, and investment velocity to give you a single, actionable score.
                            </p>

                            <ul className="space-y-4">
                                <li className="flex items-center gap-3 text-[14px] font-semibold text-[#0F172A] bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-sm">
                                    <Target size={18} className="text-[#2563EB]" /> Benchmark against ideal ratios
                                </li>
                                <li className="flex items-center gap-3 text-[14px] font-semibold text-[#0F172A] bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-sm">
                                    <AlertTriangle size={18} className="text-[#EAB308]" /> Early warning debt alerts
                                </li>
                                <li className="flex items-center gap-3 text-[14px] font-semibold text-[#0F172A] bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-sm">
                                    <Activity size={18} className="text-[#16A34A]" /> Real-time progress tracking
                                </li>
                            </ul>
                        </motion.div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default FinancialHealthSection;
