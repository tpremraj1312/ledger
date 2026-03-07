import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, PieChart, Brain, Expand, Coins, RefreshCw } from 'lucide-react';
import { fadeInVariant } from './FadeInVariant';

const features = [
    {
        icon: <RefreshCw size={24} className="text-blue-500 group-hover:text-blue-600 transition-colors" />,
        title: "Unified Expense Engine",
        description: "Seamlessly sync personal and family expenses in real-time.",
        colSpan: "col-span-1 md:col-span-2 lg:col-span-1"
    },
    {
        icon: <Expand size={24} className="text-purple-500 group-hover:text-purple-600 transition-colors" />,
        title: "AI Bill Scanner",
        description: "Instantly digitize and categorize receipts using Gemini AI integration.",
        colSpan: "col-span-1"
    },
    {
        icon: <Coins size={24} className="text-green-500 group-hover:text-green-600 transition-colors" />,
        title: "Finance Quest",
        description: "Gamify your savings journey with streaks, badges, and rewards.",
        colSpan: "col-span-1 md:col-span-2 lg:col-span-1"
    },
    {
        icon: <Brain size={24} className="text-fintech-primary group-hover:text-blue-700 transition-colors" />,
        title: "Tax Optimization",
        description: "Automated engine highlighting tax-saving investment opportunities.",
        colSpan: "col-span-1"
    },
    {
        icon: <PieChart size={24} className="text-orange-500 group-hover:text-orange-600 transition-colors" />,
        title: "Command Center",
        description: "Centralized dashboard for personal bandwidth and family governance.",
        colSpan: "col-span-1"
    },
    {
        icon: <Smartphone size={24} className="text-pink-500 group-hover:text-pink-600 transition-colors" />,
        title: "Real-time Explore",
        description: "Track global markets and mutual fund NAVs from one interface.",
        colSpan: "col-span-1 md:col-span-2 lg:col-span-1"
    }
];

const EcosystemSection = () => {
    return (
        <section id="ecosystem" className="py-24 relative z-10">
            <div className="container mx-auto px-4 sm:px-6">

                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeInVariant}
                        custom={0}
                    >
                        <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                            A Unified Product <span className="text-gradient">Ecosystem</span>
                        </h2>
                        <p className="text-slate-600 text-lg leading-relaxed font-medium">
                            Built on a microservices architecture, Ledger seamlessly unifies personal tracking, family budgeting, and intelligent investing.
                        </p>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 grid-auto-rows-min">
                    {features.map((feature, idx) => (
                        <motion.div
                            key={idx}
                            custom={idx % 3}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-50px" }}
                            variants={fadeInVariant}
                            whileHover={{
                                y: -10,
                                rotateX: 5,
                                rotateY: 5,
                                scale: 1.02,
                                transition: { duration: 0.3 }
                            }}
                            style={{
                                transformStyle: "preserve-3d",
                                perspective: 1000
                            }}
                            className={`glass-panel p-8 group flex flex-col justify-between ${feature.colSpan} cursor-pointer border border-slate-200 hover:border-fintech-primary/30 hover:shadow-[0_20px_40px_rgba(37,99,235,0.1)] relative overflow-hidden bg-white/60 min-h-[220px]`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center border border-slate-100 mb-6 group-hover:scale-110 transition-transform duration-500 z-10">
                                {feature.icon}
                            </div>

                            <div className="mt-auto z-10">
                                <h3 className="text-xl font-bold text-slate-800 mb-2 tracking-wide group-hover:text-fintech-primary transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

            </div>
        </section>
    );
};

export default EcosystemSection;
