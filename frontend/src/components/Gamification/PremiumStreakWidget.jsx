import React from 'react';
import { Flame, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const PremiumStreakWidget = ({ streak = 0, lastActivity, history = [] }) => {
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
            date: d,
            dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
            dayNum: d.getDate(),
            fullDate: d.toISOString().split('T')[0]
        };
    });

    const checkStatus = (dateStr) => {
        return history.some(h => new Date(h.date).toISOString().split('T')[0] === dateStr);
    };

    const isTodayActive = checkStatus(new Date().toISOString().split('T')[0]);

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-2.5 mb-2">
                        <div className={`p-2 rounded-lg ${isTodayActive ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                            <Flame size={18} fill={isTodayActive ? "currentColor" : "none"} className={isTodayActive ? "animate-pulse" : ""} />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Daily Streak</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl md:text-5xl font-black text-gray-900">{streak}</span>
                        <span className="text-lg text-gray-500 font-medium">days</span>
                    </div>
                </div>

                {isTodayActive && (
                    <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full flex items-center gap-1.5 border border-emerald-100">
                        <Check size={14} strokeWidth={3} /> Active Today
                    </span>
                )}
            </div>

            <div className="flex justify-between items-end mt-auto">
                {days.map((day, i) => {
                    const active = checkStatus(day.fullDate);
                    const isToday = i === 6;

                    return (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className={`
                w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300
                ${active
                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-200/50'
                                    : isToday
                                        ? 'bg-gray-50 border-2 border-dashed border-gray-300 text-gray-500'
                                        : 'bg-gray-50 text-gray-400'
                                }
              `}>
                                {active ? <Check size={16} strokeWidth={3} /> : day.dayNum}
                            </div>
                            <span className={`text-xs font-medium ${isToday ? 'text-orange-600' : 'text-gray-500'}`}>
                                {day.dayName}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PremiumStreakWidget;