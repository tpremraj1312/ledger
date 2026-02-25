import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FinalCTASection = () => {
    const navigate = useNavigate();
    const { scrollYProgress } = useScroll();

    // Transition background from slate-50 to pure white as user scrolls to the bottom
    const backgroundColor = useTransform(scrollYProgress, [0.8, 1], ['#f8fafc', '#ffffff']);
    const buttonBg = useTransform(scrollYProgress, [0.8, 1], ['#2563eb', '#0f172a']); // primary blue to slate-900

    return (
        <motion.section
            style={{ backgroundColor }}
            className="py-32 sm:py-48 relative overflow-hidden transition-colors duration-1000 border-t border-slate-100"
        >
            <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="max-w-3xl mx-auto"
                >
                    <h2 className="text-5xl sm:text-6xl md:text-7xl font-black mb-8 tracking-tighter text-slate-900">
                        Your Financial System. <br />
                        Reinvented.
                    </h2>

                    <div className="flex justify-center mt-12">
                        <motion.button
                            onClick={() => navigate('/signup')}
                            style={{ backgroundColor: buttonBg }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="text-white px-10 py-5 rounded-2xl font-bold text-lg flex items-center gap-3 shadow-[0_20px_40px_-15px_rgba(37,99,235,0.4)] transition-shadow"
                        >
                            Start Your Journey
                            <ArrowRight size={24} />
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </motion.section>
    );
};

export default FinalCTASection;
