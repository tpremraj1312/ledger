import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X, Sparkles } from 'lucide-react';

const RARITY_STYLES = {
    common: {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        label: 'bg-gray-100 text-gray-700'
    },
    rare: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        label: 'bg-blue-100 text-blue-700'
    },
    epic: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        label: 'bg-purple-100 text-purple-700'
    },
    legendary: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        label: 'bg-amber-100 text-amber-700'
    }
};

const BadgeVault = ({ badges = [], allBadges = [] }) => {
    const [selected, setSelected] = useState(null);

    const catalog = allBadges.map(def => {
        const found = badges.find(b => b.id === def.id);
        return {
            ...def,
            unlocked: !!found,
            unlockedAt: found?.unlockedAt,
            isNew: found?.isNew
        };
    });

    return (
        <>
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
                        <Sparkles size={20} className="text-amber-500" />
                        Badge Vault
                    </h3>
                    <span className="text-sm text-gray-500">
                        {badges.length} / {catalog.length} unlocked
                    </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 md:gap-4">
                    {catalog.map((badge) => (
                        <motion.button
                            key={badge.id}
                            whileHover={{ scale: 1.06, y: -2 }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => setSelected(badge)}
                            className={`
                aspect-square rounded-xl flex items-center justify-center relative
                border-2 transition-all duration-300
                ${badge.unlocked
                                    ? `${RARITY_STYLES[badge.rarity]?.bg || 'bg-gray-50'} ${RARITY_STYLES[badge.rarity]?.border || 'border-gray-200'} shadow-sm hover:shadow-md`
                                    : 'bg-gray-50 border-dashed border-gray-200'
                                }
              `}
                        >
                            <span className="text-3xl md:text-4xl drop-shadow-sm">
                                {badge.unlocked ? badge.icon : '🔒'}
                            </span>

                            {badge.unlocked && badge.isNew && (
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                            )}

                            {badge.unlocked && (
                                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-1.5 rounded-full bg-gradient-to-r ${badge.rarity === 'legendary' ? 'from-amber-400 to-amber-500' : badge.rarity === 'epic' ? 'from-purple-400 to-purple-600' : badge.rarity === 'rare' ? 'from-blue-400 to-blue-500' : 'from-gray-300 to-gray-400'}`} />
                            )}
                        </motion.button>
                    ))}
                </div>
            </div>

            <AnimatePresence>
                {selected && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={() => setSelected(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
                        >
                            <button
                                onClick={() => setSelected(null)}
                                className="absolute top-5 right-5 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"
                            >
                                <X size={20} className="text-gray-600" />
                            </button>

                            <div className="text-center">
                                <div className={`
                  w-28 h-28 mx-auto mb-6 rounded-2xl flex items-center justify-center text-6xl shadow-inner
                  ${selected.unlocked ? 'bg-gradient-to-br from-amber-50 to-yellow-50' : 'bg-gray-100'}
                `}>
                                    {selected.icon}
                                </div>

                                <h3 className="text-2xl font-bold text-gray-900 mb-2">{selected.name}</h3>

                                <span className={`
                  inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4
                  ${RARITY_STYLES[selected.rarity]?.label || 'bg-gray-100 text-gray-600'}
                `}>
                                    {selected.rarity || 'Common'}
                                </span>

                                <p className="text-gray-600 mb-6">{selected.description}</p>

                                {selected.unlocked ? (
                                    <div className="text-sm text-gray-500">
                                        Unlocked on {new Date(selected.unlockedAt).toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-sm text-amber-700 bg-amber-50 px-5 py-3 rounded-xl inline-block">
                                        🔒 Keep going to unlock this badge
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default BadgeVault;