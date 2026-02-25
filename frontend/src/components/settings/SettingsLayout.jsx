import React from 'react';
import { motion } from 'framer-motion';
import {
    User, Shield, Users, Banknote, Landmark, TrendingUp,
    Trophy, Brain, Bell, Lock, Settings as SettingsIcon,
    AlertTriangle, ChevronRight, Menu, X
} from 'lucide-react';

const SettingsLayout = ({ activeSection, setActiveSection, children, isMobileMenuOpen, setIsMobileMenuOpen }) => {
    const navItems = [
        { id: 'profile', label: 'Profile', icon: <User size={18} /> },
        { id: 'security', label: 'Account & Security', icon: <Shield size={18} /> },
        { id: 'family', label: 'Family Settings', icon: <Users size={18} /> },
        { id: 'financial', label: 'Financial Preferences', icon: <Banknote size={18} /> },
        { id: 'tax', label: 'Tax Preferences', icon: <Landmark size={18} /> },
        { id: 'investment', label: 'Investment Preferences', icon: <TrendingUp size={18} /> },
        { id: 'gamification', label: 'Gamification Settings', icon: <Trophy size={18} /> },
        { id: 'ai', label: 'AI & Chatbot Settings', icon: <Brain size={18} /> },
        { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
        { id: 'privacy', label: 'Privacy & Data', icon: <Lock size={18} /> },
        { id: 'preferences', label: 'Application Preferences', icon: <SettingsIcon size={18} /> },
        { id: 'danger', label: 'Danger Zone', icon: <AlertTriangle size={18} />, color: 'text-red-500' },
    ];

    return (
        <div className="flex flex-col lg:flex-row min-h-[600px] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:flex flex-col w-72 border-r border-gray-50 bg-gray-50/30 p-4">
                <h2 className="text-xl font-bold text-gray-900 px-4 mb-6">Settings</h2>
                <nav className="space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeSection === item.id
                                    ? 'bg-white text-blue-600 shadow-sm border border-gray-100 ring-1 ring-black/5'
                                    : `text-gray-500 hover:bg-gray-100/50 hover:text-gray-900 ${item.color || ''}`
                                }`}
                        >
                            <span className={activeSection === item.id ? 'text-blue-600' : ''}>
                                {item.icon}
                            </span>
                            {item.label}
                            {activeSection === item.id && (
                                <motion.div
                                    layoutId="activeIndicator"
                                    className="ml-auto"
                                >
                                    <ChevronRight size={14} />
                                </motion.div>
                            )}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Mobile Nav Toggle */}
            <div className="lg:hidden p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <SettingsIcon size={20} className="text-blue-600" />
                    <span className="font-bold text-gray-900">Settings</span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Mobile Menu Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-20"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Nav Menu */}
            <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: isMobileMenuOpen ? 0 : '-100%' }}
                className="lg:hidden fixed top-0 left-0 bottom-0 w-80 bg-white shadow-2xl z-30 p-6 overflow-y-auto"
            >
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-gray-900">Settings</h2>
                    <button onClick={() => setIsMobileMenuOpen(false)}>
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>
                <nav className="space-y-2">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveSection(item.id);
                                setIsMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-base font-bold transition-all ${activeSection === item.id
                                    ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                    : `text-gray-500 hover:bg-gray-50 ${item.color || ''}`
                                }`}
                        >
                            <span className={activeSection === item.id ? 'text-blue-600' : ''}>
                                {item.icon}
                            </span>
                            {item.label}
                            {activeSection === item.id && <ChevronRight size={18} className="ml-auto" />}
                        </button>
                    ))}
                </nav>
            </motion.aside>

            {/* Content Area */}
            <main className="flex-1 p-6 lg:p-10 bg-white">
                <motion.div
                    key={activeSection}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {children}
                </motion.div>
            </main>
        </div>
    );
};

export default SettingsLayout;
