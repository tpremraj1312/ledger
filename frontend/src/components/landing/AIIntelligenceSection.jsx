import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, User, Sparkles } from 'lucide-react';
import { fadeInVariant } from './FadeInVariant';

const AIIntelligenceSection = () => {
    const [typedText, setTypedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const fullText = "You've exceeded your dining budget by 22% this month. I recommend shifting your upcoming 'Subscription' expenses to the 15th.";

    useEffect(() => {
        if (isTyping) {
            if (typedText.length < fullText.length) {
                const timeout = setTimeout(() => {
                    setTypedText(fullText.slice(0, typedText.length + 1));
                }, 30);
                return () => clearTimeout(timeout);
            } else {
                setIsTyping(false);
            }
        }
    }, [typedText, isTyping, fullText]);

    return (
        <section id="intelligence" className="py-24 relative overflow-hidden bg-white border-y border-slate-100">
            <div className="container mx-auto px-4 sm:px-6">

                <div className="absolute top-10 right-10 w-96 h-96 bg-blue-100/50 rounded-full blur-[100px] pointer-events-none" />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* Left Text */}
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeInVariant}
                        custom={0}
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-fintech-primary mb-6">
                            <Sparkles size={16} />
                            <span className="text-sm font-bold tracking-wide">Conversational Finance</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
                            An AI Assistant That Actually <span className="text-gradient">Understands You</span>
                        </h2>
                        <p className="text-slate-600 text-lg leading-relaxed font-medium mb-8">
                            Why sift through charts when you can just ask? Powered by Gemini, your intelligence layer analyzes patterns, parses receipts, and answers complex queries instantly.
                        </p>
                        <ul className="space-y-4">
                            <li className="text-slate-800 font-semibold flex items-center gap-2">
                                <span className="bg-blue-100 text-fintech-primary px-2 rounded-md font-bold text-xs">QUERY</span>
                                "Where am I overspending?"
                            </li>
                            <li className="text-slate-800 font-semibold flex items-center gap-2">
                                <span className="bg-blue-100 text-fintech-primary px-2 rounded-md font-bold text-xs">COMMAND</span>
                                "Scan this receipt and add it."
                            </li>
                            <li className="text-slate-800 font-semibold flex items-center gap-2">
                                <span className="bg-blue-100 text-fintech-primary px-2 rounded-md font-bold text-xs">ANALYZE</span>
                                "How is my mutual fund performing?"
                            </li>
                        </ul>
                    </motion.div>

                    {/* Right Mock UI */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        onViewportEnter={() => {
                            // Small delay before typing starts
                            setTimeout(() => setIsTyping(true), 1000);
                        }}
                        transition={{ duration: 0.8 }}
                        className="bg-white p-6 border border-slate-200 shadow-[0_20px_40px_-15px_rgba(37,99,235,0.15)] rounded-2xl relative z-10"
                    >
                        {/* User message */}
                        <div className="flex gap-4 mb-6">
                            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center shrink-0">
                                <User size={16} className="text-slate-600" />
                            </div>
                            <div className="bg-slate-50 rounded-2xl rounded-tl-none p-4 w-full border border-slate-100">
                                <p className="text-sm text-slate-700 font-medium">Where am I overspending this month?</p>
                            </div>
                        </div>

                        {/* AI message */}
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fintech-primary to-blue-400 flex items-center justify-center shrink-0 shadow-[0_4px_10px_rgba(37,99,235,0.3)]">
                                <Bot size={16} className="text-white" />
                            </div>
                            <div className="bg-blue-50/50 rounded-2xl rounded-tl-none p-4 w-full border border-blue-100">
                                <p className="text-sm text-slate-800 leading-relaxed min-h-[60px] font-medium">
                                    {typedText}
                                    {isTyping && <span className="inline-block w-1.5 h-4 ml-1 bg-fintech-primary animate-pulse align-middle rounded-sm" />}
                                </p>
                                {typedText === fullText && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 }}
                                        className="mt-4 p-3 bg-white rounded-lg flex items-center justify-between border border-blue-100 shadow-sm hover:border-blue-300 cursor-pointer transition-colors"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-500 font-bold">Action Suggested</span>
                                            <span className="text-sm font-bold text-fintech-primary">Shift $120 allocation</span>
                                        </div>
                                        <button className="text-xs font-bold bg-blue-100 hover:bg-blue-200 text-fintech-primary px-3 py-1.5 rounded transition-colors">Apply</button>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                    </motion.div>

                </div>
            </div>
        </section>
    );
};

export default AIIntelligenceSection;
