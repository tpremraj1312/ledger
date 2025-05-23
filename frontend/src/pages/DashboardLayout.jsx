import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Wallet, Bell, LogOut, Home, Gauge, Banknote, TrendingUp, Settings, Scan, BarChart2, PlusCircle, Brain,
  FileText, Loader2, X as IconX
} from 'lucide-react';
import { useAuth } from '../context/authContext';
import HomeView from './HomeView';
import BudgetView from './BudgetView';
import ExpensesView from './ExpensesView';
import InvestmentsView from './InvestmentsView';
import SettingsView from './SettingsView';
import CompareBudgetExpensePage from './CompareBudgetExpensePage';
import AIAnalysis from './AIAnalysis';
// Placeholder Components for Compare and AI Analysis
// const CompareView = () => (
//   <div className="text-gray-600 p-4">
//     <h3 className="text-lg font-semibold text-gray-800 mb-4">Compare Budgets & Expenses</h3>
//     <p>Placeholder for Compare Budget vs Expenses view.</p>
//   </div>
// );

// const AIAnalysisView = () => (
//   <div className="text-gray-600 p-4">
//     <h3 className="text-lg font-semibold text-gray-800 mb-4">AI Analysis</h3>
//     <p>Placeholder for AI Analysis view.</p>
//   </div>
// );

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
  const [activeTab, setActiveTab] = useState('home');
  const [isManualTxModalOpen, setIsManualTxModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isScanDetailsModalOpen, setIsScanDetailsModalOpen] = useState(false);
  const [manualTxData, setManualTxData] = useState({
    type: 'debit',
    amount: '',
    category: '',
    date: formatDateForInput(new Date()),
    description: '',
  });
  const [modalError, setModalError] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [scanFile, setScanFile] = useState(null);
  const [scanError, setScanError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanDetails, setScanDetails] = useState(null);

  const handleLogout = () => {
    logout();
    // Assuming logout clears token; no navigation needed since routing is removed
  };

  // Manual Transaction Handlers
  const handleManualFormChange = (e) => {
    const { name, value } = e.target;
    setManualTxData(prev => ({ ...prev, [name]: value }));
    setModalError('');
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setIsSubmittingManual(true);

    const { type, amount, category, date } = manualTxData;
    if (!type || !amount || !category || !date || parseFloat(amount) <= 0) {
      setModalError('Please fill all required fields with a valid positive amount.');
      setIsSubmittingManual(false);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setModalError('Authentication error. Please log in again.');
      setIsSubmittingManual(false);
      return;
    }

    const payload = {
      type,
      amount: parseFloat(amount),
      category,
      date,
      description: manualTxData.description,
      source: 'manual',
    };

    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/transactions`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsManualTxModalOpen(false);
      setManualTxData({
        type: 'debit',
        amount: '',
        category: '',
        date: formatDateForInput(new Date()),
        description: '',
      });
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to record transaction.';
      setModalError(errorMessage);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // Scan Transaction Handlers
  const handleScanFileChange = (e) => {
    const file = e.target.files[0];
    setScanFile(file);
    setScanError('');
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    setScanError('');
    setIsScanning(true);

    if (!scanFile) {
      setScanError('Please select an image or PDF to scan.');
      setIsScanning(false);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setScanError('Authentication error. Please log in again.');
      setIsScanning(false);
      return;
    }

    const formData = new FormData();
    formData.append('bill', scanFile);

    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/billscan`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setScanDetails(response.data.transaction || { amount: 0, category: 'Unknown', date: new Date(), description: 'Scanned Bill' });
      setIsScanDetailsModalOpen(true);
      setIsScanModalOpen(false);
      setScanFile(null);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to process bill scan.';
      setScanError(errorMessage);
    } finally {
      setIsScanning(false);
    }
  };

  const navItems = [
    { id: 'home', icon: <Home size={20} />, label: 'Home' },
    { id: 'budget', icon: <Gauge size={20} />, label: 'Budget' },
    { id: 'expenses', icon: <Banknote size={20} />, label: 'Expenses' },
    { id: 'investments', icon: <TrendingUp size={20} />, label: 'Investments' },
    { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
    { id: 'scan', icon: <Scan size={20} />, label: 'Scan Bill', action: () => setIsScanModalOpen(true) },
    { id: 'compare', icon: <BarChart2 size={20} />, label: 'Compare' },
    { id: 'add-transaction', icon: <PlusCircle size={20} />, label: 'Add Transaction', action: () => setIsManualTxModalOpen(true) },
    { id: 'ai-analysis', icon: <Brain size={20} />, label: 'AI Analysis' },
  ];

  const mobileNavItems = [
    { id: 'home', icon: <Home size={20} />, label: 'Home' },
    { id: 'budget', icon: <Gauge size={20} />, label: 'Budget' },
    { id: 'expenses', icon: <Banknote size={20} />, label: 'Expenses' },
    { id: 'investments', icon: <TrendingUp size={20} />, label: 'Investments' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-200">
      {/* Header */}
      <header className="bg-white/95 shadow-sm fixed top-0 left-0 right-0 z-50 backdrop-blur-md">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100/80 rounded-full">
              <Wallet className="text-blue-600 w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Ledger</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors duration-200">
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

      <div className="flex min-h-screen">
        {/* Fixed Full-Screen Sidebar (Desktop) */}
        <aside className="hidden lg:block fixed top-0 left-0 w-64 h-screen bg-white/95 backdrop-blur-md border-r border-gray-200/50 z-40">
          <div className="p-5">
            <div className="flex items-center gap-3 mb-8 mt-16">
              <Wallet className="w-7 h-7 text-blue-600" />
              <span className="text-lg font-semibold text-gray-900">Finance Hub</span>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => item.action ? item.action() : setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === item.id
                      ? 'bg-blue-100/80 text-blue-600 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100/80 hover:text-blue-600'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
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
                {activeTab === 'home' && <HomeView setIsManualTxModalOpen={setIsManualTxModalOpen} setIsScanModalOpen={setIsScanModalOpen} 
                setActiveTab={setActiveTab}/>}
                {activeTab === 'budget' && <BudgetView />}
                {activeTab === 'expenses' && <ExpensesView />}
                {activeTab === 'investments' && <InvestmentsView />}
                {activeTab === 'settings' && <SettingsView />}
                {activeTab === 'compare' && <CompareBudgetExpensePage />}
                {activeTab === 'ai-analysis' && <AIAnalysis />}
                {activeTab === 'scan' && <div className="text-gray-600">Scan Bill View (Placeholder)</div>}
                {activeTab === 'add-transaction' && <div className="text-gray-600">Add Transaction View (Placeholder)</div>}
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 shadow-md border-t border-gray-200/50 z-50 backdrop-blur-md">
        <ul className="grid grid-cols-4">
          {mobileNavItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex flex-col items-center py-3 text-xs font-medium transition-colors duration-200 ${
                  activeTab === item.id
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

      {/* Manual Transaction Modal */}
      <AnimatePresence>
        {isManualTxModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white/95 rounded-xl p-6 w-full max-w-md shadow-xl backdrop-blur-sm border border-gray-100/50"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Add Manual Transaction</h3>
                <button
                  onClick={() => setIsManualTxModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <IconX size={20} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4">Record a past transaction (e.g., cash payment).</p>
              {modalError && <p className="text-red-500 text-xs mb-3 bg-red-50/80 p-2 rounded">{modalError}</p>}
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">Type *:</span>
                  <label className="flex items-center text-sm">
                    <input
                      type="radio"
                      name="type"
                      value="debit"
                      checked={manualTxData.type === 'debit'}
                      onChange={handleManualFormChange}
                      required
                      className="mr-1"
                    /> Debit
                  </label>
                  <label className="flex items-center text-sm">
                    <input
                      type="radio"
                      name="type"
                      value="credit"
                      checked={manualTxData.type === 'credit'}
                      onChange={handleManualFormChange}
                      className="mr-1"
                    /> Credit
                  </label>
                </div>
                <div>
                  <label htmlFor="amountModal" className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <input
                    id="amountModal"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={manualTxData.amount}
                    onChange={handleManualFormChange}
                    required
                    placeholder="Enter amount"
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="categoryModal" className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <input
                    id="categoryModal"
                    name="category"
                    type="text"
                    value={manualTxData.category}
                    onChange={handleManualFormChange}
                    required
                    placeholder="e.g., Groceries, Salary"
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="dateModal" className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    id="dateModal"
                    name="date"
                    type="date"
                    value={manualTxData.date}
                    onChange={handleManualFormChange}
                    required
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="descriptionModal" className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    id="descriptionModal"
                    name="description"
                    rows="2"
                    value={manualTxData.description}
                    onChange={handleManualFormChange}
                    placeholder="Add a note about the transaction"
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingManual}
                  className={`w-full ${isSubmittingManual ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white py-2 rounded-lg transition-colors flex items-center justify-center text-sm font-medium`}
                >
                  {isSubmittingManual ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                  {isSubmittingManual ? 'Recording...' : 'Record Transaction'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scan Bill Modal */}
      <AnimatePresence>
        {isScanModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white/95 rounded-xl p-6 w-full max-w-md shadow-xl backdrop-blur-sm border border-gray-100/50"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Scan Bill</h3>
                <button
                  onClick={() => setIsScanModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <IconX size={20} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4">Upload an image or PDF of a bill to extract transaction details.</p>
              {scanError && <p className="text-red-500 text-xs mb-3 bg-red-50/80 p-2 rounded">{scanError}</p>}
              <form onSubmit={handleScanSubmit} className="space-y-4">
                <div>
                  <label htmlFor="billImage" className="block text-sm font-medium text-gray-700 mb-1">Upload Bill *</label>
                  <input
                    id="billImage"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleScanFileChange}
                    required
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isScanning}
                  className={`w-full ${isScanning ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white py-2 rounded-lg transition-colors flex items-center justify-center text-sm font-medium`}
                >
                  {isScanning ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                  {isScanning ? 'Scanning...' : 'Scan Bill'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scan Details Modal */}
      <AnimatePresence>
        {isScanDetailsModalOpen && scanDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white/95 rounded-xl p-6 w-full max-w-md shadow-xl backdrop-blur-sm border border-gray-100/50"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Bill Scan Details</h3>
                <button
                  onClick={() => setIsScanDetailsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <IconX size={20} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4">Details extracted from the scanned bill.</p>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Amount:</span>
                  <span className="ml-2 text-gray-800">{formatCurrency(scanDetails.amount)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Category:</span>
                  <span className="ml-2 text-gray-800 capitalize">{scanDetails.category}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Date:</span>
                  <span className="ml-2 text-gray-800">{formatDateForDisplay(scanDetails.date)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Description:</span>
                  <span className="ml-2 text-gray-800">{scanDetails.description || '-'}</span>
                </div>
              </div>
              <button
                onClick={() => setIsScanDetailsModalOpen(false)}
                className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition-colors text-sm font-medium"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardLayout;