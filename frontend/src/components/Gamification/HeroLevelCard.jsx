import React from 'react';
import { Trophy, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const HeroLevelCard = ({ profile }) => {
    const { level = 1, xp = 0, title = 'Rookie Saver' } = profile || {};

    const nextLevelXp = level * 500;
    const currentLevelBaseXp = (level - 1) * 500;
    const progress = Math.min(100, ((xp - currentLevelBaseXp) / 500) * 100);

    return (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{title}</h3>
                    <div className="flex items-center gap-2 text-ledger-primary">
                        <Star size={16} fill="currentColor" />
                        <span className="text-sm font-medium">Level {level}</span>
                    </div>
                </div>
                <div className="p-3.5 bg-ledger-primary-light rounded-xl">
                    <Trophy size={24} className="text-ledger-primary" />
                </div>
            </div>

            <div className="mt-auto">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Next Level Progress</span>
                    <span>{xp} / {nextLevelXp} XP</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1.4, ease: 'easeOut' }}
                    />
                </div>
                <p className="text-right text-xs text-gray-500 mt-2">
                    {nextLevelXp - xp} XP needed to reach Level {level + 1}
                </p>
            </div>
        </div>
    );
};

export default HeroLevelCard;