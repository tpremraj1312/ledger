import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Calendar } from 'lucide-react';

const StreakCard = ({ streak, lastActivity }) => {
    // Generate mini calendar days (last 7 days)
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d;
    });

    // Check if activity happened on these days (mock logic for now, ideally backend sends activity log)
    // For now, highlight today if streak > 0
    const isActiveToday = streak > 0 && new Date(lastActivity).toDateString() === new Date().toDateString();

    return (
        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

            <div className="flex justify-between items-start z-10 relative">
                <div>
                    <h3 className="text-orange-100 font-medium text-sm flex items-center gap-2">
                        <Flame size={16} className={isActiveToday ? "animate-pulse" : ""} /> Daily Streak
                    </h3>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-4xl font-bold">{streak}</span>
                        <span className="text-sm opacity-80">Days</span>
                    </div>
                </div>
                <div className="bg-white/20 p-2 rounded-lg">
                    <Calendar size={24} />
                </div>
            </div>

            {/* Mini Calendar visual */}
            <div className="flex justify-between mt-6 pt-4 border-t border-white/20">
                {days.map((day, i) => {
                    const isToday = i === 6;
                    // Simple logic: if active today, highlight today. 
                    // Ideally we need `activityLog` array from backend to accurately color previous days.
                    // We will mark just today for visual if streak > 0
                    const active = isToday && isActiveToday;
                    return (
                        <div key={i} className="flex flex-col items-center gap-1">
                            <span className="text-[10px] opacity-60">{day.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all
                                ${active ? 'bg-white text-orange-600 shadow-lg scale-110' : 'bg-white/10 text-white/60'}
                            `}>
                                {day.getDate()}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StreakCard;
