import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scroll, CheckCircle, XCircle, Clock, Zap, Gift, Swords } from 'lucide-react';

const DIFFICULTY_STYLE = {
    easy: { label: 'Easy', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    medium: { label: 'Medium', color: 'text-amber-600 bg-amber-50 border-amber-100' },
    hard: { label: 'Hard', color: 'text-red-600 bg-red-50 border-red-100' },
};

const QuestCard = ({ mission, onAction, onClaim }) => {
    const diff = DIFFICULTY_STYLE[mission.difficulty] || DIFFICULTY_STYLE.medium;
    const isCompleted = mission.status === 'completed';
    const progress = mission.targetAmount
        ? Math.min(100, (mission.progressAmount / mission.targetAmount) * 100)
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            whileHover={{ y: -2, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
            className={`p-6 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all duration-300 ${isCompleted ? 'bg-emerald-50/40 border-emerald-200' : 'border-gray-100'}`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ledger-primary bg-ledger-primary-light px-3 py-1 rounded-full">
                        {mission.type === 'daily' ? 'Daily' : 'Weekly'}
                    </span>
                    <span className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border ${diff.color}`}>
                        {diff.label}
                    </span>
                </div>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                    <Zap size={14} fill="currentColor" /> {mission.xpReward} XP
                </span>
            </div>

            <h4 className="text-lg font-bold text-gray-900 mb-2">{mission.title}</h4>
            <p className="text-sm text-gray-600 mb-5 line-clamp-2">{mission.description}</p>

            {mission.targetAmount > 0 && (
                <div className="mb-5">
                    <div className="flex justify-between text-xs font-medium text-gray-500 mb-1.5">
                        <span>Progress</span>
                        <span>₹{(mission.progressAmount || 0).toLocaleString()} / ₹{mission.targetAmount.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                            className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-ledger-primary-light0'}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.7, ease: 'easeOut' }}
                        />
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-3 mt-2">
                {mission.status === 'pending' && (
                    <>
                        <button
                            onClick={() => onAction(mission._id, 'accepted')}
                            className="px-5 py-2 bg-ledger-primary text-white text-sm font-medium rounded-xl hover:bg-ledger-primary-hover transition"
                        >
                            Accept
                        </button>
                        <button
                            onClick={() => onAction(mission._id, 'rejected')}
                            className="px-5 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-200 transition"
                        >
                            Skip
                        </button>
                    </>
                )}

                {mission.status === 'accepted' && !isCompleted && (
                    <span className="px-5 py-2 bg-ledger-primary-light text-ledger-primary text-sm font-medium rounded-xl border border-blue-100">
                        In Progress
                    </span>
                )}

                {isCompleted && onClaim && (
                    <button
                        onClick={() => onClaim(mission._id)}
                        className="px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition"
                    >
                        Claim Reward
                    </button>
                )}
            </div>
        </motion.div>
    );
};

const QuestBoard = ({ missions, onAction, onGenerate, onClaim }) => {
    return (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-ledger-primary-light rounded-xl">
                        <Scroll className="text-ledger-primary" size={20} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Quest Board</h3>
                        <p className="text-sm text-gray-500">Daily & Weekly Missions</p>
                    </div>
                </div>

                <button
                    onClick={onGenerate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-ledger-primary text-gray text-sm font-medium rounded-xl hover:bg-ledger-primary-hover transition shadow-sm"
                >
                    <Swords size={16} /> Generate New Quests
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnimatePresence mode="wait">
                    {missions.length > 0 ? (
                        missions.map((mission) => (
                            <QuestCard
                                key={mission._id}
                                mission={mission}
                                onAction={onAction}
                                onClaim={onClaim}
                            />
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="col-span-full flex flex-col items-center justify-center py-16 text-gray-500 border-2 border-dashed border-gray-200 rounded-2xl"
                        >
                            <Scroll size={48} className="mb-4 opacity-40" />
                            <p className="text-lg font-medium mb-2">No active quests yet</p>
                            <button
                                onClick={onGenerate}
                                className="mt-4 text-ledger-primary hover:text-indigo-800 font-medium flex items-center gap-1.5"
                            >
                                <Swords size={16} /> Generate Quests Now
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default QuestBoard;