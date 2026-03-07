import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  FileText, Loader2, X as IconX, AlertTriangle, Trophy, Home, Gauge, Banknote, TrendingUp, Wallet, Settings, PieChart, BarChart3, Scan, Plus, BarChart2, PlusCircle, Brain, Bell, LogOut, Users, DollarSign, Menu, Shield, Bot
} from 'lucide-react';
import { useAuth } from '../context/authContext';
import HomeView from './HomeView';
import BudgetView from './BudgetView';
import ExpensesView from './ExpensesView';
import InvestmentsView from './InvestmentsView';
import SettingsView from './SettingsView';
import CompareBudgetExpensePage from './CompareBudgetExpensePage';
import AIAnalysis from './AIAnalysis';
import Notification from './Notification';
import GamificationDashboard from './GamificationDashboard';
import FamilyDashboard from './FamilyDashboard';
import ManageMembers from './ManageMembers';
import FamilyExpenses from './FamilyExpenses';
import FamilyBudgetView from './FamilyBudgetView';
import TaxAdvisorView from './TaxAdvisorView';
import AgentChatView from './AgentChatView';
import { useFamily } from '../context/FamilyContext';
import { useFinancial } from '../context/FinancialContext';
import { addFamilyTransaction } from '../services/familyService';

// Notification Popup Component
const NotificationPopup = ({ message, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    className="fixed bottom-4 right-4 bg-red-50/90 text-red-600 rounded-xl p-4 shadow-lg border border-red-100 max-w-sm z-50 backdrop-blur-md"
  >
    <div className="flex items-center gap-2">
      <AlertTriangle className="w-5 h-5" />
      <p className="text-sm">{message}</p>
    </div>
    <button
      onClick={onClose}
      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
    >
      <IconX size={16} />
    </button>
  </motion.div>
);

// Helper Functions
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₹0.00';
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDateForInput = (date) => {
  if (!date) date = new Date();
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

const formatDateForDisplay = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch (e) { return dateString; }
};

const getAuthToken = () => localStorage.getItem('token');

const DashboardLayout = () => {
  const { logout } = useAuth();
  const { group, hasGroup, refreshFamilyFinancialData } = useFamily();
  const { refreshData: refreshPersonalData } = useFinancial();
  const [activeTab, setActiveTab] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    // Assuming logout clears token; no navigation needed since routing is removed
  };


  const navItems = [
    { id: 'home', icon: <Home size={20} />, label: 'Home' },
    { id: 'budget', icon: <Gauge size={20} />, label: 'Budget' },
    { id: 'expenses', icon: <Banknote size={20} />, label: 'Expenses' },
    { id: 'investments', icon: <TrendingUp size={20} />, label: 'Investments' },
    { id: 'gamification', icon: <Trophy size={20} />, label: 'Gamification' },
    { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
    { id: 'compare', icon: <BarChart2 size={20} />, label: 'Compare' },
    { id: 'ai-analysis', icon: <Brain size={20} />, label: 'AI Analysis' },
    { id: 'tax-advisor', icon: <Shield size={20} />, label: 'Tax Advisor' },
    { id: 'ai-agent', icon: <Bot size={20} />, label: 'AI Agent' },
  ];

  const mobileNavItems = [
    { id: 'home', icon: <Home size={20} />, label: 'Home' },
    { id: 'family-dashboard', icon: <Users size={20} />, label: 'Family' },
    { id: 'budget', icon: <Gauge size={20} />, label: 'Budget' },
    { id: 'expenses', icon: <Banknote size={20} />, label: 'Expenses' },
    { id: 'investments', icon: <TrendingUp size={20} />, label: 'Invest' },
  ];

  const handleMobileMenuItemClick = (item) => {
    setIsMobileMenuOpen(false);
    if (item.action) {
      item.action();
    } else {
      setActiveTab(item.id);
    }
  };

  const handleFamilySubItemClick = (subId) => {
    setIsMobileMenuOpen(false);
    setActiveTab(hasGroup ? subId : 'family-dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-200">
      {/* Header */}
      <header className="bg-white/95 shadow-sm fixed top-0 left-0 right-0 z-50 backdrop-blur-md">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Menu */}
            <button
              className="lg:hidden p-2 text-gray-600 hover:text-blue-600"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="p-2 bg-blue-100/80 rounded-full">
              <Wallet className="text-blue-600 w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Ledger</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors duration-200" onClick={() => { setActiveTab('notification') }}>
              <Bell size={20} />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border border-white animate-pulse"></span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors duration-200 text-sm font-medium"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-screen overflow-x-hidden">
        {/* Fixed Full-Screen Sidebar (Desktop) */}
        <aside className="hidden lg:block fixed top-0 left-0 w-64 h-screen bg-white/95 backdrop-blur-md border-r border-gray-200/50 z-40 overflow-hidden">
          <div className="h-full flex flex-col px-4 py-6">
            <div className="flex items-center gap-3 mb-6 mt-12 flex-shrink-0 px-2 font-bold text-gray-900">
              <div className="p-1.5 bg-blue-600 rounded-lg text-white">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-xl tracking-tight">Finance Hub</span>
            </div>
            <nav className="flex-1 overflow-y-auto space-y-0.5 pr-2 custom-scrollbar">
              <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }
              `}} />
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => item.action ? item.action() : setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === item.id
                    ? 'bg-blue-50 text-blue-600 font-bold shadow-sm ring-1 ring-blue-100'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
              {/* Family Section — Always visible and prominent */}
              <div className="pt-4 mt-4 border-t border-gray-100">
                <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Family Governance
                </p>
                {/* Family Dashboard (Entry Point) */}
                <button
                  onClick={() => setActiveTab('family-dashboard')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'family-dashboard'
                    ? 'bg-violet-50 text-violet-700 font-bold shadow-sm ring-1 ring-violet-100'
                    : 'text-gray-500 hover:bg-violet-50/50 hover:text-gray-900'
                    }`}
                >
                  <Users size={20} />
                  <span>Dashboard</span>
                </button>
                {/* Sub-pages — Visible but redirect to dashboard if no group exists */}
                <button
                  onClick={() => setActiveTab(hasGroup ? 'family-members' : 'family-dashboard')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 mt-0.5 ${activeTab === 'family-members'
                    ? 'bg-violet-50 text-violet-700 font-bold shadow-sm ring-1 ring-violet-100'
                    : 'text-gray-500 hover:bg-violet-50/50 hover:text-gray-900'
                    } ${!hasGroup ? 'opacity-40' : ''}`}
                >
                  <Users size={16} className="ml-0.5" />
                  <span>Members</span>
                </button>
                <button
                  onClick={() => setActiveTab(hasGroup ? 'family-expenses' : 'family-dashboard')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 mt-0.5 ${activeTab === 'family-expenses'
                    ? 'bg-violet-50 text-violet-700 font-bold shadow-sm ring-1 ring-violet-100'
                    : 'text-gray-500 hover:bg-violet-50/50 hover:text-gray-900'
                    } ${!hasGroup ? 'opacity-40' : ''}`}
                >
                  <DollarSign size={18} className="ml-0.5" />
                  <span>Shared Expenses</span>
                </button>
                <button
                  onClick={() => setActiveTab(hasGroup ? 'family-budget' : 'family-dashboard')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 mt-0.5 ${activeTab === 'family-budget'
                    ? 'bg-violet-50 text-violet-700 font-bold shadow-sm ring-1 ring-violet-100'
                    : 'text-gray-500 hover:bg-violet-50/50 hover:text-gray-900'
                    } ${!hasGroup ? 'opacity-40' : ''}`}
                >
                  <Gauge size={18} className="ml-0.5" />
                  <span>Shared Budget</span>
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-grow w-full min-h-[calc(100vh-4rem)] lg:min-h-screen pt-16 pb-16 lg:pb-6 px-2 sm:px-6 lg:pl-[272px] lg:pr-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="bg-white/80 rounded-xl shadow-sm border border-gray-100/50 backdrop-blur-md h-full flex flex-col w-full"
            >
              <div className="flex-grow p-4 sm:p-4 lg:p-8 overflow-auto">
                {activeTab === 'home' && <HomeView setActiveTab={setActiveTab} />}
                {activeTab === 'budget' && <BudgetView />}
                {activeTab === 'expenses' && <ExpensesView />}
                {activeTab === 'investments' && <InvestmentsView />}
                {activeTab === 'settings' && <SettingsView />}
                {activeTab === 'compare' && <CompareBudgetExpensePage />}
                {activeTab === 'ai-analysis' && <AIAnalysis />}
                {activeTab === 'notification' && <Notification />}
                {activeTab === 'gamification' && <GamificationDashboard />}
                {activeTab === 'family-dashboard' && <FamilyDashboard setActiveTab={setActiveTab} />}
                {activeTab === 'family-members' && <ManageMembers />}
                {activeTab === 'family-expenses' && <FamilyExpenses />}
                {activeTab === 'family-budget' && <FamilyBudgetView />}
                {activeTab === 'tax-advisor' && <TaxAdvisorView setActiveTab={setActiveTab} />}
                {activeTab === 'ai-agent' && <AgentChatView />}

              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 shadow-md border-t border-gray-200/50 z-50 backdrop-blur-md">
        <ul className="grid grid-cols-5">
          {mobileNavItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex flex-col items-center py-2 text-xs font-medium transition-colors duration-200 ${activeTab === item.id
                  ? 'bg-blue-100/80 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100/80'
                  }`}
              >
                {item.icon}
                <span className="mt-1">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0 }}
              className="fixed left-0 top-0 h-full w-80 bg-white/95 backdrop-blur-md border-r border-gray-200/50 z-50 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold">Menu</h2>
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <IconX size={24} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-4 space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMobileMenuItemClick(item)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === item.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
                <div className="pt-4 border-t border-gray-200 px-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Family</p>
                  <button
                    onClick={() => handleMobileMenuItemClick({ id: 'family-dashboard' })}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'family-dashboard'
                      ? 'bg-violet-100 text-violet-700'
                      : 'text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    <Users size={20} />
                    <span>Dashboard</span>
                  </button>
                  <button
                    onClick={() => handleFamilySubItemClick('family-members')}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all mt-1 ${activeTab === 'family-members'
                      ? 'bg-violet-100 text-violet-700'
                      : 'text-gray-600 hover:bg-gray-100'
                      } ${!hasGroup ? 'opacity-50' : ''}`}
                  >
                    <Users size={18} />
                    <span>Members {!hasGroup && <span className="text-xs text-amber-600 ml-auto">(Join First)</span>}</span>
                  </button>
                  <button
                    onClick={() => handleFamilySubItemClick('family-expenses')}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all mt-1 ${activeTab === 'family-expenses'
                      ? 'bg-violet-100 text-violet-700'
                      : 'text-gray-600 hover:bg-gray-100'
                      } ${!hasGroup ? 'opacity-50' : ''}`}
                  >
                    <DollarSign size={20} />
                    <span>Shared Expenses {!hasGroup && <span className="text-xs text-amber-600 ml-auto">(Join First)</span>}</span>
                  </button>
                  <button
                    onClick={() => handleFamilySubItemClick('family-budget')}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all mt-1 ${activeTab === 'family-budget'
                      ? 'bg-violet-100 text-violet-700'
                      : 'text-gray-600 hover:bg-gray-100'
                      } ${!hasGroup ? 'opacity-50' : ''}`}
                  >
                    <Gauge size={20} />
                    <span>Shared Budget {!hasGroup && <span className="text-xs text-amber-600 ml-auto">(Join First)</span>}</span>
                  </button>
                </div>
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
};

export default DashboardLayout;