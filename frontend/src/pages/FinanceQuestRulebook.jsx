import React from 'react';
import { motion } from 'framer-motion';
import {
    BookOpen, Zap, Flame, Shield, Heart, Trophy, Star,
    ChevronRight, Award, Target, Calendar, TrendingUp
} from 'lucide-react';

const fadeUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }
};

const Section = ({ icon: Icon, title, color = "indigo", children }) => (
    <motion.div
        variants={fadeUp}
        className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden"
    >
        <div className="px-6 md:px-8 pt-7 pb-5 border-b border-gray-100 flex items-center gap-3.5">
            <div className={`p-3 rounded-xl bg-${color}-50/70 text-${color}-600`}>
                <Icon size={20} strokeWidth={2.2} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h2>
        </div>
        <div className="p-6 md:p-8">{children}</div>
    </motion.div>
);

const RuleRow = ({ emoji, label, value, highlight = false }) => (
    <div className="flex items-start gap-4 py-4 border-b border-gray-50 last:border-0 group">
        <div className={`text-2xl mt-0.5 shrink-0 ${highlight ? 'text-amber-500' : 'text-gray-400'}`}>
            {emoji}
        </div>
        <div className="flex-1">
            <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-gray-800">{label}</p>
                {value && (
                    <span className={`text-sm font-semibold ${highlight ? 'text-ledger-primary' : 'text-gray-600'}`}>
                        {value}
                    </span>
                )}
            </div>
        </div>
    </div>
);

const LEVELS = [
    { level: 1, xp: 0, title: 'Rookie Saver' },
    { level: 5, xp: 2000, title: 'Expense Hunter' },
    { level: 10, xp: 4500, title: 'Budget Warrior' },
    { level: 15, xp: 7000, title: 'Money Strategist' },
    { level: 20, xp: 9500, title: 'Smart Investor' },
    { level: 30, xp: 14500, title: 'Wealth Architect' },
    { level: 50, xp: 24500, title: 'Financial Master' },
];

const FinanceQuestRulebook = () => {
    return (
        <div className="space-y-10 md:space-y-12 pb-12">
            {/* Introduction */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center max-w-3xl mx-auto"
            >
                <div className="inline-flex items-center gap-2 px-5 py-2 bg-ledger-primary-light rounded-full text-ledger-primary font-semibold text-xs uppercase tracking-wider mb-5">
                    <BookOpen size={14} /> Official Guide
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-4">
                    Finance Quest Rulebook
                </h1>
                <p className="text-gray-600 md:text-lg leading-relaxed">
                    The complete reference for how points, levels, streaks, badges, wellness, and challenges work in your financial journey.
                </p>
            </motion.div>

            <Section icon={Zap} title="Experience Points (XP)" color="amber">
                <div className="space-y-1">
                    <RuleRow emoji="💳" label="Log any transaction" value="+2 XP" highlight />
                    <RuleRow emoji="🔥" label="Daily login + transaction" value="+3–5 XP (streak bonus)" />
                    <RuleRow emoji="🏅" label="Unlock new badge" value="+50 XP" highlight />
                    <RuleRow emoji="⚔️" label="Complete daily/weekly quest" value="+15 to +40 XP" />
                    <RuleRow emoji="🎯" label="Complete self-set challenge" value="+50 XP" highlight />
                    <RuleRow emoji="🛡️" label="Daily XP cap" value="50 XP (anti-grind protection)" />
                </div>

                <div className="mt-8 p-5 bg-amber-50/60 rounded-xl border border-amber-100">
                    <p className="text-sm text-amber-800 font-medium leading-relaxed">
                        <strong>Pro Tip:</strong> Small, consistent actions compound fastest. Logging one expense every day gives far more XP over time than trying to binge-log once a week.
                    </p>
                </div>
            </Section>

            <Section icon={Trophy} title="Levels & Rank Titles" color="purple">
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm min-w-[480px]">
                        <thead>
                            <tr className="bg-gray-50/70">
                                <th className="text-left py-4 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wider">Level</th>
                                <th className="text-left py-4 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wider">Total XP Required</th>
                                <th className="text-left py-4 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wider">Rank Title</th>
                            </tr>
                        </thead>
                        <tbody>
                            {LEVELS.map((l, i) => (
                                <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/40 transition">
                                    <td className="py-4 px-6 font-bold text-gray-900">{l.level}</td>
                                    <td className="py-4 px-6 text-gray-700">{l.xp.toLocaleString()} XP</td>
                                    <td className="py-4 px-6">
                                        <span className="inline-flex px-3.5 py-1 bg-ledger-primary-light text-ledger-primary rounded-full text-xs font-semibold">
                                            {l.title}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <p className="mt-5 text-sm text-gray-500">
                    Level formula: <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">floor(total XP / 500) + 1</code>
                    <br className="md:hidden" /> — each level requires 500 additional XP.
                </p>
            </Section>

            <Section icon={Flame} title="Daily Streak System" color="orange">
                <div className="space-y-1">
                    <RuleRow emoji="📅" label="Maintain streak" value="Log ≥1 transaction per day" />
                    <RuleRow emoji="🔗" label="Streak reset" value="Miss a day → resets to 1" />
                    <RuleRow emoji="🎁" label="Milestone bonus" value="+5 XP every 7 days" highlight />
                    <RuleRow emoji="🏆" label="Lifetime record" value="Tracked forever — aim high" />
                    <RuleRow emoji="📊" label="Visibility" value="Streak calendar shows last 30 days" />
                </div>
            </Section>

            <Section icon={Shield} title="Badge Vault & Rarity" color="blue">
                <p className="text-gray-600 mb-6 leading-relaxed">
                    Badges are permanent achievements. Each badge grants +50 XP the first time you earn it.
                </p>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[
                        { rarity: 'Common', color: 'gray', desc: 'First steps & basic consistency' },
                        { rarity: 'Uncommon', color: 'blue', desc: '7-day streaks, category mastery' },
                        { rarity: 'Rare', color: 'indigo', desc: '30-day streaks, challenge series' },
                        { rarity: 'Epic', color: 'purple', desc: 'High XP, diversified habits' },
                        { rarity: 'Legendary', color: 'amber', desc: 'Master-level discipline & wellness' },
                    ].map((r, i) => (
                        <div
                            key={i}
                            className={`p-5 rounded-xl bg-${r.color}-50/40 border border-${r.color}-100/60 text-center`}
                        >
                            <div className={`text-xs font-black uppercase tracking-wider text-${r.color}-700 mb-2`}>
                                {r.rarity}
                            </div>
                            <p className="text-sm text-gray-700 font-medium">{r.desc}</p>
                        </div>
                    ))}
                </div>
            </Section>

            <Section icon={Heart} title="Financial Wellness Score" color="emerald">
                <p className="text-gray-600 mb-6">
                    Scored 0–100 every month. Updated after the 1st of each month.
                </p>

                <div className="space-y-4">
                    {[
                        { name: 'Savings Rate', weight: '25%', desc: 'Percentage of income saved' },
                        { name: 'Budget Adherence', weight: '25%', desc: 'How closely you follow budgets' },
                        { name: 'Overspending Control', weight: '20%', desc: 'Avoiding large impulse spends' },
                        { name: 'Category Balance', weight: '15%', desc: 'Diversified spending pattern' },
                        { name: 'Logging Consistency', weight: '15%', desc: 'Regular daily entries' },
                    ].map((m, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-gray-50/60 rounded-xl">
                            <div>
                                <p className="font-medium text-gray-900">{m.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
                            </div>
                            <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                                {m.weight}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    {[
                        { range: '0–39', label: 'Needs Attention', color: 'red' },
                        { range: '40–59', label: 'Developing', color: 'amber' },
                        { range: '60–79', label: 'Solid', color: 'blue' },
                        { range: '80–100', label: 'Excellent', color: 'emerald' },
                    ].map((r, i) => (
                        <div key={i} className={`p-4 rounded-xl bg-${r.color}-50/50 border border-${r.color}-100/60`}>
                            <div className={`text-sm font-bold text-${r.color}-700`}>{r.label}</div>
                            <div className="text-xs text-gray-500 mt-1">{r.range}</div>
                        </div>
                    ))}
                </div>
            </Section>

            <Section icon={Target} title="Quests & Challenges" color="indigo">
                <div className="space-y-1">
                    <RuleRow emoji="🤖" label="Quest generation" value="AI-personalized weekly" />
                    <RuleRow emoji="📆" label="Daily quests" value="Expire at midnight" />
                    <RuleRow emoji="📅" label="Weekly quests" value="7-day duration" />
                    <RuleRow emoji="✅" label="Accept / Reject" value="Choose what fits your life" />
                    <RuleRow emoji="⚡" label="Quest XP" value="Easy 15 • Medium 25 • Hard 40" />
                    <RuleRow emoji="🎯" label="Self-set Challenges" value="+50 XP on success" highlight />
                    <RuleRow emoji="💀" label="Challenge failure" value="No penalty — just no reward" />
                </div>
            </Section>

            <div className="text-center pt-10 pb-6 text-gray-400 text-sm font-medium">
                — End of Finance Quest Rulebook —
            </div>
        </div>
    );
};

export default FinanceQuestRulebook;