import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, PieChart, Activity } from 'lucide-react';

const InvestmentSection = () => {
    return (
        <section className="py-24 relative z-10">
            <div className="container mx-auto px-4 sm:px-6">

                <div className="flex flex-col-reverse lg:flex-row items-center gap-16">

                    {/* Left Cards */}
                    <div className="flex-1 relative w-full h-[400px]">

                        {/* Background blur */}
                        <div className="absolute inset-0 bg-blue-300/30 blur-[100px] rounded-full pointer-events-none" />

                        {/* Moving Stock Card 1 */}
                        <motion.div
                            animate={{ y: [-10, 10, -10] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-10 left-0 lg:left-10 w-64 glass-panel p-4 border border-blue-100 z-20 bg-white/90 shadow-[0_20px_40px_-15px_rgba(37,99,235,0.15)]"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <div className="w-10 h-10 rounded bg-blue-50 border border-blue-100 flex items-center justify-center">
                                    <Activity className="text-blue-600" size={20} />
                                </div>
                                <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-sm font-bold flex items-center gap-1">
                                    +12.4% <TrendingUp size={14} strokeWidth={3} />
                                </span>
                            </div>
                            <h4 className="text-slate-800 font-bold mb-1">Tech Index ETF</h4>
                            <p className="text-2xl font-black text-slate-900">₹4,290.50</p>
                        </motion.div>

                        {/* Moving Stock Card 2 */}
                        <motion.div
                            animate={{ y: [10, -10, 10] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            className="absolute bottom-10 right-0 lg:right-10 w-72 glass-panel p-5 border border-slate-200 z-30 bg-white/95 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)]"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="text-slate-800 font-bold">SIP Configuration</h4>
                                <div className="p-2 bg-slate-50 rounded-lg">
                                    <PieChart className="text-slate-500" size={20} />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500 font-medium">Monthly Target</span>
                                    <span className="text-sm text-slate-800 font-bold">₹5,000.00</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        whileInView={{ width: '60%' }}
                                        transition={{ duration: 1.5, delay: 0.5 }}
                                        className="h-full bg-fintech-primary"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Text */}
                    <div className="flex-1">
                        <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
                            Investment <span className="text-gradient">Command Center</span>
                        </h2>
                        <p className="text-slate-600 text-lg leading-relaxed font-medium mb-8">
                            Take the guesswork out of wealth creation. Effortlessly toggle between SIP and Lump Sum strategies. Let AI optimize your tax footprint while balancing your risk portfolio.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <div className="px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-sm text-sm text-slate-700 font-semibold">
                                Real-time mutual fund tracking
                            </div>
                            <div className="px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-sm text-sm text-slate-700 font-semibold">
                                Tax-loss harvesting alerts
                            </div>
                            <div className="px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-sm text-sm text-slate-700 font-semibold">
                                Goal-based wealth routing
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default InvestmentSection;
