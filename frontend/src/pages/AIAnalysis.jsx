import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { Filter, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

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
const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

// Custom Tooltip for charts
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border rounded shadow">
        <p className="font-semibold">{data.category || data.weekStart}</p>
        {data.percentage && <p>Percentage: {data.percentage}%</p>}
        <p>Amount: {formatCurrency(data.amount)}</p>
      </div>
    );
  }
  return null;
};

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

  // Animation Variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
    hover: { scale: 1.05, boxShadow: '0 10px 20px rgba(0,0,0,0.1)', transition: { duration: 0.2 } },
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center items-center py-20 bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen"
      >
        <Loader2 className="animate-spin h-12 w-12 text-blue-500" />
        <p className="ml-4 text-lg text-gray-700 font-medium">Loading AI analysis...</p>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-red-50 border-l-4 border-red-500 text-red-700 p-6 rounded-lg max-w-3xl mx-auto mt-8 shadow-md"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 mr-3" />
            <div>
              <strong className="font-bold text-lg">Error!</strong>
              <p className="mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 flex items-center"
          >
            <RefreshCw size={16} className="mr-2" /> Retry
          </button>
        </div>
      </motion.div>
    );
  }

  // Check for default analysis
  const isDefaultAnalysis = analysis?.budgetVsExpenses.includes('No expenses or budgets found');

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-center"
      >
        <h2 className="text-3xl font-bold text-gray-800">AI Financial Analysis</h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg shadow hover:bg-gray-300 flex items-center"
        >
          <Filter size={18} className="mr-2" /> {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </motion.div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white rounded-xl shadow-lg p-6 mb-4 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  id="category"
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis Sections */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {isDefaultAnalysis ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 p-6 rounded-lg">
            <p className="font-semibold">No Data Available</p>
            <p>{analysis?.budgetVsExpenses}</p>
            <p className="mt-2">Please add transactions and budgets to view AI insights.</p>
          </div>
        ) : (
          <>
            {/* Budget vs. Expenses */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Budget vs. Expenses</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-600 leading-relaxed">{analysis?.budgetVsExpenses}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Expense Breakdown by Category</h4>
                  {analysis?.visualizationData?.expenseBreakdown?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={analysis.visualizationData.expenseBreakdown}
                          dataKey="percentage"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} (${(percent).toFixed(1)}%)`}
                        >
                          {analysis.visualizationData.expenseBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500 text-center">No expense breakdown available.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Spending Patterns */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Spending Patterns</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-600 leading-relaxed">{analysis?.spendingPatterns}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Weekly Spending Trends</h4>
                  {analysis?.visualizationData?.weeklySpending?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={analysis.visualizationData.weeklySpending}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="weekStart" fontSize={12} />
                        <YAxis fontSize={12} tickFormatter={(value) => `₹${value / 1000}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="amount" stroke="#3B82F6" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500 text-center">No weekly spending data available.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Recommendations</h3>
              <p className="text-gray-600 leading-relaxed">{analysis?.recommendations}</p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  hover: { scale: 1.05, boxShadow: '0 10px 20px rgba(0,0,0,0.1)', transition: { duration: 0.2 } },
};

export default AIAnalysisPage;