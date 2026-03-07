import React from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFinancial } from '../context/FinancialContext';

const periods = [
    { label: 'Today', value: 'Today' },
    { label: 'This Week', value: 'Week' },
    { label: 'This Month', value: 'Monthly' },
    { label: 'Custom Range', value: 'Custom' }
];

const PeriodHeader = () => {
    const { filters, updateFilters } = useFinancial();
    const [isOpen, setIsOpen] = React.useState(false);

    const activePeriod = periods.find(p => p.value === filters.period) || periods[2];

    return (
        <div className="relative z-50">
            <motion.button
                whileHover={{ y: -1 }}
                
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
                <Calendar size={18} className="text-indigo-500" />
                <span className="font-bold text-sm tracking-tight">{activePeriod.label}</span>
                <ChevronDown size={16} className={`transition-transform duration-300 text-gray-400 ${isOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden"
                        >
                            <div className="p-2 space-y-1">
                                {periods.map((period) => (
                                    <button
                                        key={period.value}
                                        onClick={() => {
                                            updateFilters({ period: period.value });
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${filters.period === period.value
                                            ? 'bg-ledger-primary-light text-ledger-primary'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }`}
                                    >
                                        <span className="font-bold text-sm">{period.label}</span>
                                        {filters.period === period.value && <Check size={16} />}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PeriodHeader;
