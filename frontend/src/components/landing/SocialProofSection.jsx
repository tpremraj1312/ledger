import React from 'react';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';

const SocialProofSection = () => {
    return (
        <section className="py-32 relative overflow-hidden bg-fintech-base">

            {/* Animated World Grid Background SVG */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none flex items-center justify-center translate-y-20">
                <svg className="w-full max-w-4xl animate-float-slow text-fintech-primary" viewBox="0 0 800 400" fill="none" stroke="currentColor" strokeWidth="0.8">
                    {/* longitude/latitude grid abstract */}
                    {[...Array(20)].map((_, i) => (
                        <path key={`h-${i}`} d={`M0 ${i * 20} Q 400 ${i * 20 + (i % 2 === 0 ? 50 : -50)} 800 ${i * 20}`} />
                    ))}
                    {[...Array(40)].map((_, i) => (
                        <path key={`v-${i}`} d={`M${i * 20} 0 Q ${i * 20 + (i % 2 === 0 ? 20 : -20)} 200 ${i * 20} 400`} />
                    ))}
                </svg>
            </div>

            <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="max-w-4xl mx-auto"
                >
                    <div className="inline-flex items-center justify-center p-4 bg-white rounded-2xl mb-8 border border-slate-200 shadow-md">
                        <Globe size={32} className="text-fintech-primary" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-8 tracking-tighter">
                        Designed for students, families, <br className="hidden md:block" /> and <span className="text-fintech-primary">future financial leaders.</span>
                    </h2>
                    <p className="text-xl text-slate-600 font-medium max-w-2xl mx-auto">
                        Join the collective redefining personal wealth management. Uncompromised design. Unprecedented control.
                    </p>
                </motion.div>
            </div>
        </section>
    );
};

export default SocialProofSection;
