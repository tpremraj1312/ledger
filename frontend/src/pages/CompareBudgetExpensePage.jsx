import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';
import { Filter, Loader2, AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

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

// Chart colors
const COLORS = ['#3B82F6', '#DC2626', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

const CompareBudgetExpensePage = () => {
  const [comparisons, setComparisons] = useState({ debitComparison: null, creditComparison: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: formatDateForInput(new Date(new Date().setMonth(new Date().getMonth() - 1))),
    endDate: formatDateForInput(new Date()),
    category: 'All',
  });
  const [categories, setCategories] = useState(['All']);
  const [showFilters, setShowFilters] = useState(false);
  const [chartType, setChartType] = useState('Bar');

  // Fetch Comparison and Categories
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
      // Fetch comparison data
      const comparisonResponse = await axios.get('http://localhost:5000/api/budget-comparison', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          category: filters.category === 'All' ? undefined : filters.category,
        },
      });

      // Log full response for debugging
      console.log('Budget Comparison API Response:', JSON.stringify(comparisonResponse.data, null, 2));

      // Validate response structure
      if (!comparisonResponse.data.debitComparison && !comparisonResponse.data.creditComparison) {
        setError('No comparison data returned. Try adjusting the date range or category.');
        setComparisons({ debitComparison: null, creditComparison: null });
        setIsLoading(false);
        return;
      }

      setComparisons({
        debitComparison: comparisonResponse.data.debitComparison,
        creditComparison: comparisonResponse.data.creditComparison,
      });

      // Fetch categories
      const [transactionsResponse, budgetsResponse] = await Promise.all([
        axios.get('http://localhost:5000/api/transactions', {
          headers: { Authorization: `Bearer ${token}` },
          params: { type: 'all', limit: 1000 },
        }),
        axios.get('http://localhost:5000/api/budgets', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const transactionCategories = new Set();
      transactionsResponse.data.transactions.forEach(tx => {
        if (tx.source === 'billscan' && Array.isArray(tx.categories)) {
          tx.categories.forEach(cat => {
            if (cat.category) transactionCategories.add(cat.category);
          });
        }
        if (tx.category) transactionCategories.add(tx.category);
      });

      const budgetCategories = budgetsResponse.data.map(b => b.category).filter(Boolean);
      const uniqueCategories = ['All', ...new Set([...transactionCategories, ...budgetCategories])].sort();
      setCategories(uniqueCategories);
      console.log('Available Categories:', uniqueCategories);

      setIsLoading(false);
    } catch (err) {
      const message = err.code === 'ERR_NETWORK'
        ? 'Unable to connect to the server. Please check if the backend is running.'
        : err.response?.data?.message || 'Failed to load comparison data.';
      setError(message);
      setIsLoading(false);
      console.error('Fetch Error:', err);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Handle chart type change
  const handleChartTypeChange = (e) => {
    setChartType(e.target.value);
  };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow">
          <p className="font-semibold text-gray-800">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.fill || entry.stroke }}>
              {`${entry.name}: ${formatCurrency(entry.value || 0)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Prepare chart data with validation
  const debitChartData = (comparisons.debitComparison?.comparison || [])
    .map(item => ({
      category: item.category || 'Unknown',
      BudgetedExpense: Number(item.budgetedExpense) || 0,
      ActualExpense: Number(item.actualExpense) || 0,
    }))
    .filter(item => item.BudgetedExpense > 0 || item.ActualExpense > 0);

  const creditChartData = (comparisons.creditComparison?.comparison || [])
    .map(item => ({
      category: item.category || 'Unknown',
      IncomeGoal: Number(item.incomeGoal) || 0,
      ActualIncome: Number(item.actualIncome) || 0,
    }))
    .filter(item => item.IncomeGoal > 0 || item.ActualIncome > 0);

  // Log chart data for debugging
  console.log('Debit Chart Data:', debitChartData);
  console.log('Credit Chart Data:', creditChartData);

  // Prepare Pie/Donut chart data
  const debitPieData = debitChartData
    .flatMap(item => [
      { name: `${item.category} Budgeted`, value: item.BudgetedExpense, type: 'BudgetedExpense' },
      { name: `${item.category} Actual`, value: item.ActualExpense, type: 'ActualExpense' },
    ])
    .filter(item => item.value > 0);

  const creditPieData = creditChartData
    .flatMap(item => [
      { name: `${item.category} Goal`, value: item.IncomeGoal, type: 'IncomeGoal' },
      { name: `${item.category} Actual`, value: item.ActualIncome, type: 'ActualIncome' },
    ])
    .filter(item => item.value > 0);

  // Render chart
  const renderChart = (data, isDebit) => {
    if (!data || data.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-lg p-6 text-center text-gray-500">
          No data available for this chart. Try adjusting the filters or adding transactions/budgets.
        </div>
      );
    }

    switch (chartType) {
      case 'Line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" fontSize={12} />
              <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(1)}k`} fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 14 }} />
              {isDebit ? (
                <>
                  <Line type="monotone" dataKey="BudgetedExpense" stroke="#3B82F6" name="Budgeted Expense" strokeWidth={2} />
                  <Line type="monotone" dataKey="ActualExpense" stroke="#DC2626" name="Actual Expense" strokeWidth={2} />
                </>
              ) : (
                <>
                  <Line type="monotone" dataKey="IncomeGoal" stroke="#3B82F6" name="Income Goal" strokeWidth={2} />
                  <Line type="monotone" dataKey="ActualIncome" stroke="#10B981" name="Actual Income" strokeWidth={2} />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        );
      case 'Area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" fontSize={12} />
              <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(1)}k`} fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 14 }} />
              {isDebit ? (
                <>
                  <Area type="monotone" dataKey="BudgetedExpense" fill="#3B82F6" stroke="#3B82F6" name="Budgeted Expense" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="ActualExpense" fill="#DC2626" stroke="#DC2626" name="Actual Expense" fillOpacity={0.3} />
                </>
              ) : (
                <>
                  <Area type="monotone" dataKey="IncomeGoal" fill="#3B82F6" stroke="#3B82F6" name="Income Goal" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="ActualIncome" fill="#10B981" stroke="#10B981" name="Actual Income" fillOpacity={0.3} />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'Pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <Pie
                data={isDebit ? debitPieData : creditPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                labelLine
              >
                {(isDebit ? debitPieData : creditPieData).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 14 }} />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'Donut':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <Pie
                data={isDebit ? debitPieData : creditPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                labelLine
              >
                {(isDebit ? debitPieData : creditPieData).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 14 }} />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'StackedBar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" fontSize={12} />
              <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(1)}k`} fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 14 }} />
              {isDebit ? (
                <>
                  <Bar dataKey="BudgetedExpense" stackId="a" fill="#3B82F6" name="Budgeted Expense" />
                  <Bar dataKey="ActualExpense" stackId="a" fill="#DC2626" name="Actual Expense" />
                </>
              ) : (
                <>
                  <Bar dataKey="IncomeGoal" stackId="a" fill="#3B82F6" name="Income Goal" />
                  <Bar dataKey="ActualIncome" stackId="a" fill="#10B981" name="Actual Income" />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'Bar':
      default:
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" fontSize={12} />
              <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(1)}k`} fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 14 }} />
              {isDebit ? (
                <>
                  <Bar dataKey="BudgetedExpense" fill="#3B82F6" name="Budgeted Expense" />
                  <Bar dataKey="ActualExpense" fill="#DC2626" name="Actual Expense" />
                </>
              ) : (
                <>
                  <Bar dataKey="IncomeGoal" fill="#3B82F6" name="Income Goal" />
                  <Bar dataKey="ActualIncome" fill="#10B981" name="Actual Income" />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => window.history.back()}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg shadow hover:bg-gray-300 flex items-center"
          >
            <ArrowLeft size={18} className="mr-2" /> Back
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Budget vs Transactions</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg shadow hover:bg-gray-300 flex items-center"
          >
            <Filter size={18} className="mr-2" /> {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          <button
            onClick={fetchData}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600 flex items-center"
            disabled={isLoading}
          >
            <RefreshCw size={18} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters Section */}
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
            <div className="mt-4 text-sm text-gray-600">
              Showing data from {filters.startDate} to {filters.endDate} for category: {filters.category}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chart Type Dropdown */}
      <div className="flex justify-end">
        <div>
          <label htmlFor="chartType" className="block text-sm font-medium text-gray-700 mb-1">Chart Type</label>
          <select
            id="chartType"
            name="chartType"
            value={chartType}
            onChange={handleChartTypeChange}
            className="w-40 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Bar">Bar</option>
            <option value="Line">Line</option>
            <option value="Area">Area</option>
            <option value="Pie">Pie</option>
            <option value="Donut">Donut</option>
            <option value="StackedBar">Stacked Bar</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center items-center py-10"
        >
          <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
          <p className="ml-3 text-gray-600">Loading comparison...</p>
        </motion.div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-center"
        >
          <strong className="font-bold mr-2"><AlertTriangle className="inline w-5 h-5 mr-1" /> Error!</strong>
          <span>{error}</span>
        </motion.div>
      )}

      {/* Debit Comparison Section */}
      {!isLoading && !error && comparisons.debitComparison && (
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Budgeted Expense vs Actual Expenses</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Budgeted Expense</p>
                <p className="text-xl font-bold text-blue-600">{comparisons.debitComparison.totals.totalBudgetedExpenseFormatted || formatCurrency(0)}</p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Actual Expense</p>
                <p className="text-xl font-bold text-red-600">{comparisons.debitComparison.totals.totalActualExpenseFormatted || formatCurrency(0)}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Difference</p>
                <p className="text-xl font-bold text-orange-600">{comparisons.debitComparison.totals.totalDifferenceFormatted || formatCurrency(0)}</p>
                <p className="text-xs text-gray-600">{comparisons.debitComparison.totals.totalStatus || 'N/A'}</p>
              </div>
            </div>
          </motion.div>

          {/* Debit Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Budgeted Expense vs Actual Expense by Category</h3>
            {renderChart(debitChartData, true)}
          </motion.div>
        </div>
      )}

      {/* Credit Comparison Section */}
      {!isLoading && !error && comparisons.creditComparison && (
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Income Goal vs Actual Income</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Income Goal</p>
                <p className="text-xl font-bold text-blue-600">{comparisons.creditComparison.totals.totalIncomeGoalFormatted || formatCurrency(0)}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Actual Income</p>
                <p className="text-xl font-bold text-green-600">{comparisons.creditComparison.totals.totalActualIncomeFormatted || formatCurrency(0)}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Difference</p>
                <p className="text-xl font-bold text-orange-600">{comparisons.creditComparison.totals.totalDifferenceFormatted || formatCurrency(0)}</p>
                <p className="text-xs text-gray-600">{comparisons.creditComparison.totals.totalStatus || 'N/A'}</p>
              </div>
            </div>
          </motion.div>

          {/* Credit Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Income Goal vs Actual Income by Category</h3>
            {renderChart(creditChartData, false)}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CompareBudgetExpensePage;