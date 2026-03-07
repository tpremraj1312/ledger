import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Trophy, Flame, Star, Target, Gift } from 'lucide-react';
import { fadeInVariant } from './FadeInVariant';

const GamificationSection = () => {
    const { scrollYProgress } = useScroll();

    // Parallax effects bound to scroll
    const translateYBadge = useTransform(scrollYProgress, [0.3, 0.7], [30, -30]);
    const translateYStreak = useTransform(scrollYProgress, [0.4, 0.8], [60, -10]);

    return (
        <section className="py-24 relative overflow-hidden bg-slate-50 border-y border-slate-100">
            {/* Background radial glow */}
            <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-orange-300/20 rounded-full blur-[120px] pointer-events-none" />

            <div className="container mx-auto px-4 sm:px-6">
                <div className="flex flex-col lg:flex-row-reverse items-center gap-16">

                    {/* Right Side: Mock UI Wireframes */}
                    <div className="flex-1 w-full relative h-[450px] perspective-1000">

                        {/* Badges Panel Mock */}
                        <motion.div
                            style={{ y: translateYBadge, rotateX: 5, rotateY: -10 }}
                            className="absolute top-0 md:top-10 right-0 lg:right-10 w-[90%] md:w-full max-w-sm bg-white/90 backdrop-blur-xl p-4 md:p-6 border border-slate-200 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] rounded-2xl z-20"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="text-slate-900 font-bold flex items-center gap-2">
                                    <Trophy className="text-amber-500" size={20} /> Achievements
                                </h4>
                                <div className="px-3 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-600 text-xs font-bold">
                                    Level 12
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="flex flex-col items-center p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
                                    <Star className="text-amber-500 mb-2" size={24} fill="currentColor" />
                                    <span className="text-[10px] font-bold text-slate-700 text-center leading-tight">Savings<br />Master</span>
                                </div>
                                <div className="flex flex-col items-center p-3 rounded-xl bg-slate-50 border border-slate-100 grayscale hover:grayscale-0 transition-all cursor-pointer">
                                    <Target className="text-blue-500 mb-2" size={24} />
                                    <span className="text-[10px] font-bold text-slate-500 text-center leading-tight">Budget<br />Sniper</span>
                                </div>
                                <div className="flex flex-col items-center p-3 rounded-xl bg-slate-50 border border-slate-100 grayscale hover:grayscale-0 transition-all cursor-pointer">
                                    <Gift className="text-purple-500 mb-2" size={24} />
                                    <span className="text-[10px] font-bold text-slate-500 text-center leading-tight">Wealth<br />Builder</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Streak View Mock */}
                        <motion.div
                            style={{ y: translateYStreak, rotateX: -5, rotateY: -15 }}
                            className="absolute bottom-0 md:bottom-10 left-0 lg:left-10 w-[90%] md:w-full max-w-xs glass-panel p-3 md:p-5 border border-orange-200 shadow-[0_30px_60px_-15px_rgba(249,115,22,0.15)] z-30 bg-white/95"
                        >
                            <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-inner">
                                <Flame className="mb-2 animate-pulse" size={40} fill="rgba(255,255,255,0.8)" />
                                <h4 className="text-4xl font-black mb-1">14</h4>
                                <p className="text-sm font-bold text-orange-100 tracking-wide uppercase">Day Login Streak!</p>
                            </div>
                            <p className="text-xs text-center text-slate-500 font-medium mt-4">
                                Keep it up! 7 more days to unlock the <span className="text-amber-600 font-bold">Gold Tier</span>.
                            </p>
                        </motion.div>

                    </div>

                    {/* Left Side: Text Context */}
                    <div className="flex-1 space-y-6 lg:pr-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 border border-orange-200 text-orange-700 mb-2">
                            <Flame size={16} />
                            <span className="text-sm font-bold tracking-wide">Finance Quest</span>
                        </div>

                        <motion.h3
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.6 }}
                            className="text-3xl md:text-5xl font-bold text-slate-900 leading-tight tracking-tight"
                        >
                            Build Wealth, <br />
                            <span className="text-gradient from-orange-500 to-amber-500">Play the Game.</span>
                        </motion.h3>

                        <motion.p
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="text-slate-600 text-lg leading-relaxed font-medium"
                        >
                            Turn financial discipline into a rewarding journey. Earn badges for hitting savings goals, maintain login streaks, and compete with family members to optimize budgets.
                        </motion.p>

                        <ul className="space-y-4 mt-8">
                            {[
                                "Achievement Badges & Milestones",
                                "Daily streak multipliers for discipline",
                                "Unlockable premium insights for active users"
                            ].map((item, idx) => (
                                <motion.li
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true, margin: "-50px" }}
                                    transition={{ duration: 0.4, delay: 0.2 + (idx * 0.1) }}
                                    className="flex items-center gap-3 text-sm text-slate-600 font-semibold"
                                >
                                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                                    {item}
                                </motion.li>
                            ))}
                        </ul>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default GamificationSection;
