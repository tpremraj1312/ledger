import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { Filter, Loader2, AlertTriangle, RefreshCw, TrendingUp, PieChart as PieChartIcon, Lightbulb, Calendar, ArrowRight } from 'lucide-react';

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

const getAuthToken = () => localStorage.getItem('token');

// Colors for pie chart
const COLORS = ['#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#8B5CF6', '#EF4444'];

// Custom Tooltip for charts
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 border border-gray-100 rounded-lg shadow-lg backdrop-blur-sm bg-opacity-95 dark:bg-gray-800 dark:border-gray-700">
        <p className="font-medium text-gray-900 dark:text-gray-100">{data.category || data.weekStart}</p>
        {data.percentage && <p className="text-sm text-gray-600 dark:text-gray-300">Percentage: {data.percentage}%</p>}
        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Amount: {formatCurrency(data.amount)}</p>
      </div>
    );
  }
  return null;
};

// Animation Variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  hover: { 
    y: -5, 
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', 
    transition: { duration: 0.2 } 
  },
};

// Card Component
const AnalysisCard = ({ title, icon, children, className = "" }) => (
  <motion.div
    variants={cardVariants}
    initial="hidden"
    animate="visible"
    whileHover="hover"
    className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden ${className}`}
  >
    <div className="p-6 sm:p-8">
      <div className="flex items-center mb-4">
        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mr-3">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
      </div>
      {children}
    </div>
  </motion.div>
);

// Empty State Component
const EmptyState = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
    <div className="w-20 h-20 mb-4 text-indigo-400 opacity-50">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12V8H6a2 2 0 01-2-2c0-1.1.9-2 2-2h12V2L23 7l-3 5zm-1 7H5a2 2 0 00-2 2c0 1.1.9 2 2 2h14v2l3-5-3-5v2z" />
      </svg>
    </div>
    <p className="text-center text-gray-600 dark:text-gray-300">{message}</p>
  </div>
);

const AIAnalysisPage = () => {
  // Set default filters to last 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: formatDateForInput(thirtyDaysAgo),
    endDate: formatDateForInput(today),
    category: 'All',
  });
  const [categories, setCategories] = useState(['All']);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch AI Analysis and Categories
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const token = getAuthToken();
    if (!token) {
      setError('Authentication token not found. Please log in.');
      setIsLoading(false);
      return;
    }

    try {
      // Fetch AI analysis
      const analysisResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/ai-analysis`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          category: filters.category === 'All' ? undefined : filters.category,
        },
      });
      setAnalysis(analysisResponse.data.analysis);

      // Fetch categories
      const transactionsResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const budgetsResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/budgets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const transactionCategories = transactionsResponse.data.transactions.map(tx => tx.category);
      const budgetCategories = budgetsResponse.data.map(b => b.category);
      const uniqueCategories = ['All', ...new Set([...transactionCategories, ...budgetCategories])];
      setCategories(uniqueCategories);
    } catch (err) {
      const message = err.code === 'ERR_NETWORK'
        ? 'Unable to connect to the server. Please check if the backend is running on http://localhost:5000.'
        : err.response?.data?.message || 'Failed to load AI analysis. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Filter Changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col justify-center items-center py-20 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 min-h-screen"
      >
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 rounded-full border-t-4 border-indigo-500 animate-spin"></div>
          <div className="absolute inset-3 rounded-full bg-white dark:bg-gray-800"></div>
          <Loader2 size={32} className="absolute inset-0 m-auto text-indigo-600 dark:text-indigo-400" />
        </div>
        <p className="mt-6 text-lg text-gray-700 dark:text-gray-300 font-medium">Processing your financial insights...</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This may take a moment</p>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4"
      >
        <div className="bg-white dark:bg-gray-800 border-l-4 border-red-500 rounded-xl shadow-xl p-6 max-w-md w-full">
          <div className="flex items-center mb-4">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mr-3">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Unable to Load Analysis</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <button
            onClick={fetchData}
            className="w-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center font-medium"
          >
            <RefreshCw size={18} className="mr-2" /> Try Again
          </button>
        </div>
      </motion.div>
    );
  }

  // Check for default analysis
  const isDefaultAnalysis = analysis?.budgetVsExpenses.includes('No expenses or budgets found');

  const dateRangeText = () => {
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);
    const options = { month: 'short', day: 'numeric' };
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen pb-12">
      {/* Floating Particles for visual effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-indigo-600 opacity-5 dark:opacity-10"
            style={{
              width: `${Math.random() * 10 + 5}rem`,
              height: `${Math.random() * 10 + 5}rem`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `float ${Math.random() * 10 + 20}s linear infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-wrap justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white flex items-center">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                  Financial Intelligence
                </span>
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                AI-powered insights for your financial journey
                {filters.category !== 'All' && ` • ${filters.category}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                <Calendar size={16} className="text-indigo-500 dark:text-indigo-400" />
                <span className="text-sm text-gray-600 dark:text-gray-300">{dateRangeText()}</span>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all flex items-center"
              >
                <Filter size={16} className="mr-2 text-indigo-500 dark:text-indigo-400" />
                {showFilters ? 'Hide Filters' : 'Filters'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="mb-8 overflow-hidden"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-100 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={filters.startDate}
                      onChange={handleFilterChange}
                      className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 transition-shadow"
                    />
                  </div>
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={filters.endDate}
                      onChange={handleFilterChange}
                      className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 transition-shadow"
                    />
                  </div>
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <div className="relative">
                      <select
                        id="category"
                        name="category"
                        value={filters.category}
                        onChange={handleFilterChange}
                        className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 appearance-none pr-10 transition-shadow"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button 
                    onClick={fetchData}
                    className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors flex items-center"
                  >
                    Apply Filters <ArrowRight size={16} className="ml-2" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analysis Sections */}
        {isDefaultAnalysis ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700"
          >
            <div className="p-8">
              <EmptyState message="No financial data found. Add transactions and budgets to view AI insights." />
              <p className="text-gray-500 dark:text-gray-400 text-center mt-6">{analysis?.budgetVsExpenses}</p>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Budget vs. Expenses */}
            <AnalysisCard title="Budget vs. Expenses" icon={<PieChartIcon size={20} />}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl">
                  <div className="prose dark:prose-invert prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-headings:text-gray-900 dark:prose-headings:text-gray-100">
                    <p className="leading-relaxed">{analysis?.budgetVsExpenses}</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Category Breakdown</h4>
                  {analysis?.visualizationData?.expenseBreakdown?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={analysis.visualizationData.expenseBreakdown}
                          dataKey="percentage"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          innerRadius={60}
                          paddingAngle={2}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                          labelLine={false}
                        >
                          {analysis.visualizationData.expenseBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState message="No expense data available for visualization" />
                  )}
                </div>
              </div>
            </AnalysisCard>

            {/* Spending Patterns */}
            <AnalysisCard title="Spending Patterns" icon={<TrendingUp size={20} />}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl">
                  <div className="prose dark:prose-invert prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-headings:text-gray-900 dark:prose-headings:text-gray-100">
                    <p className="leading-relaxed">{analysis?.spendingPatterns}</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Weekly Trends</h4>
                  {analysis?.visualizationData?.weeklySpending?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={analysis.visualizationData.weeklySpending}>
                        <defs>
                          <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis 
                          dataKey="weekStart" 
                          tick={{ fontSize: 12, fill: '#6B7280' }}
                          axisLine={{ stroke: '#E5E7EB' }}
                          tickLine={false}
                        />
                        <YAxis 
                          fontSize={12} 
                          tickFormatter={(value) => `₹${value / 1000}k`}
                          axisLine={false}
                          tickLine={false} 
                          tick={{ fill: '#6B7280' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line 
                          type="monotone" 
                          dataKey="amount" 
                          stroke="#6366F1" 
                          strokeWidth={3} 
                          dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                          activeDot={{ r: 6, stroke: "#6366F1", strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState message="No weekly spending data available" />
                  )}
                </div>
              </div>
            </AnalysisCard>

            {/* Recommendations */}
            <AnalysisCard 
              title="Smart Recommendations" 
              icon={<Lightbulb size={20} />}
              className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-800/80"
            >
              <div className="bg-white/80 dark:bg-gray-900/50 p-6 rounded-xl backdrop-blur-sm border border-indigo-100 dark:border-indigo-900/30">
                <div className="prose dark:prose-invert max-w-none prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-headings:text-gray-900 dark:prose-headings:text-gray-100">
                  <p className="leading-relaxed">{analysis?.recommendations}</p>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {['Reduce non-essential spending', 'Set up automatic savings', 'Review subscriptions'].map((tip, index) => (
                  <div key={index} className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg border border-indigo-100 dark:border-indigo-700/30">
                    <div className="flex items-center">
                      <div className="p-1.5 bg-indigo-100 dark:bg-indigo-700/30 rounded-full text-indigo-600 dark:text-indigo-400 mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </AnalysisCard>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalysisPage;