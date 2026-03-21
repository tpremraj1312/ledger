import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Trophy, Target, X, Star } from 'lucide-react';
import { useGamificationStore } from '../../store/useGamificationStore';
import { useTaxStore } from '../../store/useTaxStore';

const ToastMessage = ({ toast, onClose }) => {
    // Auto clear
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(toast.id);
        }, 4000);
        return () => clearTimeout(timer);
    }, [toast.id, onClose]);

    const getColors = () => {
        switch (toast.type) {
            case 'xp':
                return 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-indigo-400 shadow-indigo-500/20';
            case 'badge':
                return 'bg-gradient-to-r from-amber-400 to-orange-500 text-white border-amber-400 shadow-amber-500/20';
            case 'level_up':
                return 'bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-white border-yellow-400 shadow-yellow-500/30';
            case 'tax_drop':
                return 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400 shadow-emerald-500/30';
            case 'tax_score':
                return 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400 shadow-cyan-500/30';
            default:
                return 'bg-white text-gray-900 border-gray-200';
        }
    };

    const getIcon = () => {
        switch (toast.type) {
            case 'xp': return <Zap size={20} fill="currentColor" />;
            case 'badge': return <Trophy size={20} />;
            case 'level_up': return <Star size={20} fill="currentColor" />;
            case 'tax_drop': return <TrendingUp size={20} />;
            case 'tax_score': return <Zap size={20} fill="currentColor" />;
            default: return <Target size={20} />;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            layout
            className={`px-5 py-4 rounded-2xl shadow-xl border flex items-center gap-4 min-w-[300px] pointer-events-auto ${getColors()}`}
        >
            <div className="p-2 bg-white/20 rounded-xl shrink-0">
                {getIcon()}
            </div>
            <div className="flex-1">
                <p className="text-[15px] font-bold tracking-wide">{toast.message}</p>
            </div>
            <button onClick={() => onClose(toast.id)} className="p-1 hover:bg-white/20 rounded-lg transition shrink-0">
                <X size={16} />
            </button>
        </motion.div>
    );
};

const GamificationToaster = () => {
    const { toasts: gameToasts, removeToast: removeGameToast } = useGamificationStore();
    const { toasts: taxToasts, removeToast: removeTaxToast } = useTaxStore();

    const allToasts = [...gameToasts, ...taxToasts];

    if (allToasts.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {allToasts.map(toast => (
                    <ToastMessage
                        key={toast.id}
                        toast={toast}
                        onClose={(id) => {
                            if (toast.type.startsWith('tax_')) {
                                removeTaxToast(id);
                            } else {
                                removeGameToast(id);
                            }
                        }}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};

export default GamificationToaster;
