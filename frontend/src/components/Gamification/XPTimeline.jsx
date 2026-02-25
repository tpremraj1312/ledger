import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const XPTimeline = ({ history }) => {
    // History is [{ date, amount, reason }]
    // Aggregate by date for chart
    const data = history?.reduce((acc, curr) => {
        const dateStr = new Date(curr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const existing = acc.find(i => i.date === dateStr);
        if (existing) {
            existing.xp += curr.amount;
        } else {
            acc.push({ date: dateStr, xp: curr.amount });
        }
        return acc;
    }, []) || [];

    // Sort by date (simple string comparison works for small ranges, ideally parse dates)
    // We assume history comes sorted or we take last 7 entries
    const chartData = data.slice(-7);

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
            <h3 className="font-bold text-gray-800 mb-4 text-sm">XP Growth</h3>
            <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="date" hide />
                        <Tooltip />
                        <Area type="monotone" dataKey="xp" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorXp)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default XPTimeline;
