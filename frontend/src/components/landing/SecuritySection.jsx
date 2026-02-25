import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Lock, Database, Server } from 'lucide-react';
import { fadeInVariant } from './FadeInVariant';

const securityFeatures = [
    { icon: <Lock size={24} />, title: 'End-to-End Encryption', desc: 'Secure transit and at-rest storage protocols built on AES-256.' },
    { icon: <ShieldAlert size={24} />, title: 'Strict RBAC', desc: 'Granular permissions ensure members only see what you allow.' },
    { icon: <Database size={24} />, title: 'Multi-Tenant Architecture', desc: 'Zero cross-account data leakage. Absolute privacy per family.' },
    { icon: <Server size={24} />, title: 'MongoDB ACID Transactions', desc: 'Enterprise-grade durability meaning your ledger never drops a calculation.' }
];

const SecuritySection = () => {
    return (
        <section id="security" className="py-24 relative overflow-hidden bg-slate-50 border-y border-slate-200">
            <div className="container mx-auto px-4 sm:px-6 relative z-10">

                <div className="text-center max-w-2xl mx-auto mb-16">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInVariant}
                        custom={0}
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">Enterprise-Grade Performance</h2>
                        <p className="text-slate-600 font-medium text-lg">
                            When it comes to family governance and personal finance, speed and absolute security are not optional.
                        </p>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {securityFeatures.map((feat, idx) => (
                        <motion.div
                            key={idx}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={fadeInVariant}
                            custom={idx}
                            className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-default"
                        >
                            <div className="text-fintech-primary bg-blue-50 p-3 rounded-xl inline-block mb-4">{feat.icon}</div>
                            <h4 className="text-slate-800 font-bold mb-2">{feat.title}</h4>
                            <p className="text-sm text-slate-600 leading-relaxed font-medium">{feat.desc}</p>
                        </motion.div>
                    ))}
                </div>

            </div>
        </section>
    );
};

export default SecuritySection;
