import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { ArrowRight, ChevronRight, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fadeInVariant } from './FadeInVariant';

// Lazy load the heavy 3D scene
const Hero3DScene = React.lazy(() => import('./Hero3DScene'));

const HeroSection = () => {
    const navigate = useNavigate();

    return (
        <section className="relative min-h-[90vh] flex items-center justify-center pt-32 overflow-hidden bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9]">
            {/* 3D Canvas Background layer */}
            <div className="absolute inset-0 z-0 opacity-80 pointer-events-none">
                <Suspense fallback={<div className="w-full h-full bg-fintech-base" />}>
                    <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
                        <Hero3DScene />
                    </Canvas>
                </Suspense>
            </div>

            {/* Content Layer */}
            <div className="container mx-auto px-4 sm:px-6 relative z-10 mt-10">
                <div className="max-w-4xl mx-auto text-center space-y-8">

                    <motion.div
                        custom={0}
                        initial="hidden"
                        animate="visible"
                        variants={fadeInVariant}
                        className="flex justify-center"
                    >
                        <div className="inline-flex items-center gap-2 glass-panel px-4 py-2 rounded-full border border-fintech-primary/20 text-fintech-primary mb-4 bg-white/60 shadow-sm">
                            <Shield size={16} className="text-fintech-primary" />
                            <span className="text-sm font-semibold tracking-wide text-slate-700">Enterprise-grade Financial OS</span>
                        </div>
                    </motion.div>

                    <motion.h1
                        custom={1}
                        initial="hidden"
                        animate="visible"
                        variants={fadeInVariant}
                        className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-tight tracking-tight text-slate-900 mb-6 drop-shadow-sm"
                    >
                        Reimagine How You <br className="hidden md:block" />
                        <span className="text-gradient">Manage Money</span>
                    </motion.h1>

                    <motion.p
                        custom={2}
                        initial="hidden"
                        animate="visible"
                        variants={fadeInVariant}
                        className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium"
                    >
                        AI-powered personal and family financial intelligence. <br />
                        <span className="text-slate-500 font-normal">Track. Govern. Invest. Grow.</span>
                    </motion.p>

                    <motion.div
                        custom={3}
                        initial="hidden"
                        animate="visible"
                        variants={fadeInVariant}
                        className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mt-10"
                    >
                        <button
                            onClick={() => navigate('/signup')}
                            className="group bg-fintech-primary text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                        >
                            Get Started
                            <ArrowRight size={20} className="transform group-hover:translate-x-1 transition-transform" />
                        </button>
                        <a
                            href="#ecosystem"
                            className="glass-panel text-slate-800 bg-white/70 px-8 py-4 rounded-xl font-semibold hover:bg-white transition-all duration-300 flex items-center justify-center gap-2 group border border-slate-200"
                        >
                            Explore Platform
                            <ChevronRight size={20} className="text-slate-400 transform group-hover:translate-x-1 transition-transform group-hover:text-slate-800" />
                        </a>
                    </motion.div>

                </div>
            </div>

            {/* Decorative ambient gradients */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-300 rounded-full blur-[120px] opacity-20 z-[-1] pointer-events-none" />
        </section>
    );
};

export default HeroSection;
