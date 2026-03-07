import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FileText, Camera, CheckCircle2, ScanLine } from 'lucide-react';
import { fadeInVariant } from './FadeInVariant';

const BillScanSection = () => {
    const { scrollYProgress } = useScroll();

    // Parallax logic
    const imgY = useTransform(scrollYProgress, [0.1, 0.5], [40, -40]);
    const rectY = useTransform(scrollYProgress, [0.1, 0.5], [80, 0]);

    return (
        <section className="py-24 relative overflow-hidden bg-white">
            <div className="container mx-auto px-4 sm:px-6">

                <div className="absolute top-20 left-10 w-[400px] h-[400px] bg-emerald-100/40 rounded-full blur-[100px] pointer-events-none" />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* Left Mock UI */}
                    <div className="relative w-full h-[500px] flex justify-center items-center perspective-1000">
                        {/* Background Phone Frame */}
                        <motion.div
                            style={{ y: imgY, rotateX: 10, rotateY: 15 }}
                            className="w-[280px] h-[480px] bg-slate-900 rounded-[40px] border-[8px] border-slate-800 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden z-20 flex flex-col"
                        >
                            {/* App Header */}
                            <div className="bg-slate-800 pt-6 pb-4 px-4 flex justify-between items-center z-10">
                                <span className="text-white font-bold text-sm tracking-wide">Scanner</span>
                                <Camera size={18} className="text-emerald-400" />
                            </div>

                            {/* Camera Viewport Mock */}
                            <div className="flex-1 relative bg-slate-100 flex items-center justify-center p-4">
                                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-400/50 shadow-[0_0_20px_rgba(52,211,153,0.8)] z-10 animate-[bounce_3s_infinite]" />
                                <div className="w-full h-full border-2 border-dashed border-emerald-500/50 rounded-lg bg-white shadow-sm flex flex-col p-4 relative overflow-hidden">
                                    {/* Receipt Lines */}
                                    <div className="w-1/2 h-4 bg-slate-200 rounded mb-4" />
                                    <div className="w-full h-2 bg-slate-100 rounded mb-2" />
                                    <div className="w-full h-2 bg-slate-100 rounded mb-2" />
                                    <div className="w-3/4 h-2 bg-slate-100 rounded mb-6" />

                                    <div className="flex justify-between mb-2">
                                        <div className="w-1/3 h-2 bg-slate-200 rounded" />
                                        <div className="w-1/4 h-2 bg-slate-200 rounded" />
                                    </div>
                                    <div className="flex justify-between mt-auto pt-4 border-t border-slate-100">
                                        <div className="w-1/3 h-4 bg-slate-800 rounded" />
                                        <div className="w-1/4 h-4 bg-emerald-500 rounded" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Extraction Result Floating Tooltip */}
                        <motion.div
                            style={{ y: rectY }}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="absolute bottom-20 -right-4 lg:-right-12 bg-white/95 backdrop-blur-xl p-4 rounded-2xl shadow-[0_20px_40px_-10px_rgba(16,185,129,0.2)] border border-emerald-100 z-30 w-[240px]"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="bg-emerald-100 p-2 rounded-full">
                                    <CheckCircle2 size={20} className="text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500">Auto-Extracted</p>
                                    <p className="text-sm font-black text-slate-900">Whole Foods Market</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <span className="text-xs font-semibold text-slate-500">Groceries</span>
                                <span className="text-sm font-bold text-slate-900">₹142.50</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Text */}
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeInVariant}
                        custom={0}
                        className="lg:pl-10"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 mb-6">
                            <ScanLine size={16} />
                            <span className="text-sm font-bold tracking-wide">Vision AI Scanner</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
                            Say Goodbye to <span className="text-gradient from-emerald-500 to-teal-500">Manual Entry.</span>
                        </h2>
                        <p className="text-slate-600 text-lg leading-relaxed font-medium mb-8">
                            Just snap a picture of your receipt or upload a bank statement. Our powerful Gemini Vision engine instantly extracts vendors, dates, amounts, and categorizes them automatically.
                        </p>
                        <ul className="space-y-4">
                            <li className="text-slate-800 font-semibold flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div className="w-8 h-8 rounded-full bg-white shadow-sm flex justify-center items-center shrink-0">
                                    <FileText size={16} className="text-emerald-500" />
                                </div>
                                <span className="text-sm">Parses complex multi-page PDF bank statements</span>
                            </li>
                            <li className="text-slate-800 font-semibold flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div className="w-8 h-8 rounded-full bg-white shadow-sm flex justify-center items-center shrink-0">
                                    <Camera size={16} className="text-emerald-500" />
                                </div>
                                <span className="text-sm">Scans crumpled restaurant and coffee receipts</span>
                            </li>
                        </ul>
                    </motion.div>

                </div>
            </div>
        </section>
    );
};

export default BillScanSection;
