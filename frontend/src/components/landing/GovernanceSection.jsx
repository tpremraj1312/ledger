import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Users, ShieldCheck, UserPlus, Bell } from 'lucide-react';

const GovernanceSection = () => {
    const { scrollYProgress } = useScroll();

    // Parallax effects bound to scroll
    const translateYAdmin = useTransform(scrollYProgress, [0.2, 0.6], [50, -50]);
    const translateYMember = useTransform(scrollYProgress, [0.2, 0.6], [100, -20]);

    return (
        <section className="py-32 relative overflow-hidden">
            {/* Background radial glow */}
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-purple-300/40 rounded-full blur-[100px] pointer-events-none" />

            <div className="container mx-auto px-4 sm:px-6">
                <div className="flex flex-col lg:flex-row items-center gap-16">

                    {/* Left Side: Mock UI Wireframes */}
                    <div className="flex-1 w-full relative h-[500px] perspective-1000">

                        {/* Admin Panel Mock */}
                        <motion.div
                            style={{ y: translateYAdmin, rotateX: 10, rotateY: 15 }}
                            className="absolute top-10 left-0 lg:left-10 w-full max-w-md bg-white/90 backdrop-blur-xl p-6 border border-slate-200 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] rounded-2xl z-20"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="text-slate-900 font-bold flex items-center gap-2">
                                    <ShieldCheck className="text-fintech-primary" size={20} /> Group Settings
                                </h4>
                                <div className="px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-fintech-primary text-xs font-semibold">
                                    Admin Active
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 shadow-sm" />
                                        <div>
                                            <p className="text-sm text-slate-800 font-bold">Invite sent to Sarah</p>
                                            <p className="text-xs text-slate-500 font-medium">Read-only Role</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded font-medium">Pending</span>
                                </div>

                                <button className="w-full py-3 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 hover:text-fintech-primary transition-all">
                                    <UserPlus size={16} /> Add Member
                                </button>
                            </div>
                        </motion.div>

                        {/* Member View Mock */}
                        <motion.div
                            style={{ y: translateYMember, rotateX: -5, rotateY: 20 }}
                            className="absolute bottom-10 right-0 lg:right-10 w-full max-w-sm glass-panel p-4 border border-purple-200 shadow-[0_30px_60px_-15px_rgba(124,58,237,0.1)] z-30 bg-white/90"
                        >
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-white border border-purple-100">
                                <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                                    <Bell className="text-purple-600" size={20} />
                                </div>
                                <div>
                                    <h4 className="text-slate-900 text-sm font-bold mb-1">New Invitation</h4>
                                    <p className="text-xs text-slate-600 mb-3 leading-relaxed font-medium">
                                        Michael invited you to join "Family Treasury" with Co-Admin privileges.
                                    </p>
                                    <div className="flex gap-2">
                                        <button className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 shadow-md text-white text-xs font-semibold rounded transition-colors">Accept</button>
                                        <button className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded transition-colors">Decline</button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                    </div>

                    {/* Right Side: Text Context */}
                    <div className="flex-1 space-y-6 lg:pl-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 border border-purple-200 text-purple-700 mb-2">
                            <Users size={16} />
                            <span className="text-sm font-bold tracking-wide">Family Governance</span>
                        </div>

                        <motion.h3
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.6 }}
                            className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight tracking-tight"
                        >
                            Strict Multi-Tenant <br />
                            <span className="text-slate-500 font-light">Collaboration</span>
                        </motion.h3>

                        <motion.p
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="text-slate-600 text-lg leading-relaxed font-medium"
                        >
                            Built for households and small collectives. Assign distinct roles seamlessly—invite a spender with read-only limits, or a partner with full financial parity.
                        </motion.p>

                        <ul className="space-y-4 mt-8">
                            {[
                                "Strict Data Isolation per user",
                                "Granular Role-Based Access Control (RBAC)",
                                "Instant cross-account sync without data leakage"
                            ].map((item, idx) => (
                                <motion.li
                                    key={idx}
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true, margin: "-50px" }}
                                    transition={{ duration: 0.4, delay: 0.2 + (idx * 0.1) }}
                                    className="flex items-center gap-3 text-sm text-slate-600 font-semibold"
                                >
                                    <div className="h-2 w-2 rounded-full bg-purple-500" />
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

export default GovernanceSection;
