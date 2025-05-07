// src/pages/DashboardLayout.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Bell, LogOut, Home, Gauge, Banknote, TrendingUp, Settings } from 'lucide-react';
import { useAuth } from '../context/authContext';
import HomeView from './HomeView';
import BudgetView from './BudgetView';
import ExpensesView from './ExpensesView';
import InvestmentsView from './InvestmentsView';
import SettingsView from './SettingsView';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { id: 'home', icon: <Home size={20} />, label: 'Home' },
    { id: 'budget', icon: <Gauge size={20} />, label: 'Budget' },
    { id: 'expenses', icon: <Banknote size={20} />, label: 'Expenses' },
    { id: 'investments', icon: <TrendingUp size={20} />, label: 'Investments' },
    { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Wallet className="text-blue-600 w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Finance Dashboard</h1>
          </div>
          <div className="flex items-center gap-6">
            <button className="p-2 text-gray-600 hover:text-blue-600 transition-colors relative group">
              <Bell size={24} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full group-hover:animate-ping"></span>
            </button>
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors font-medium"
            >
              <LogOut size={20} />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-6 py-8 w-full relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="bg-white/70 backdrop-blur-md rounded-xl shadow-md p-6"
          >
            {activeTab === 'home' && <HomeView />}
            {activeTab === 'budget' && <BudgetView />}
            {activeTab === 'expenses' && <ExpensesView />}
            {activeTab === 'investments' && <InvestmentsView />}
            {activeTab === 'settings' && <SettingsView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md shadow-lg border-t border-gray-200 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <ul className="flex justify-around py-2">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center p-3 rounded-xl transition-all duration-200 w-20 ${
                    activeTab === item.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  <span className="text-xs mt-1 font-medium">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </div>
  );
};

export default DashboardLayout;
