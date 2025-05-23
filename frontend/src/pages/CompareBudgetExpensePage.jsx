import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';
import { Filter, Loader2, AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

// Helper Functions
const formatCurrency = (amount) => {
  const value = Number(amount) || 0;
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDateForInput = (date) => {
  const d = new Date(date || new Date());
  return d.toISOString().split('T')[0];
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
      const comparisonResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/budget-comparison`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          category: filters.category === 'All' ? undefined : filters.category,
        },
      });

      const { debitComparison, creditComparison } = comparisonResponse.data;
      console.log('API Response:', JSON.stringify({ debitComparison, creditComparison }, null, 2));

      if (!debitComparison?.comparison && !creditComparison?.comparison) {
        setError('No data returned. Ensure budgets or transactions exist for the selected period.');
        setComparisons({ debitComparison: null, creditComparison: null });
        setIsLoading(false);
        return;
      }

      setComparisons({
        debitComparison: debitComparison || { comparison: [], totals: {} },
        creditComparison: creditComparison || { comparison: [], totals: {} },
      });

      const [transactionsResponse, budgetsResponse] = await Promise.all([
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/transactions`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { type: 'all', limit: 1000 },
        }),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/budgets`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const transactionCategories = new Set();
      (transactionsResponse.data.transactions || []).forEach(tx => {
        if (tx.source === 'billscan' && Array.isArray(tx.categories)) {
          tx.categories.forEach(cat => {
            if (cat?.category && typeof cat.category === 'string') {
              transactionCategories.add(cat.category.trim());
            }
          });
        }
        if (tx?.category && typeof tx.category === 'string') {
          transactionCategories.add(tx.category.trim());
        }
      });

      const budgetCategories = (budgetsResponse.data || [])
        .map(b => b?.category)
        .filter(cat => cat && typeof cat === 'string')
        .map(cat => cat.trim());

      const uniqueCategories = ['All', ...new Set([...transactionCategories, ...budgetCategories])].sort();
      setCategories(uniqueCategories);
      console.log('Categories:', uniqueCategories);

      setIsLoading(false);
    } catch (err) {
      const message = err.code === 'ERR_NETWORK'
        ? 'Unable to connect to the server. Check if the backend is running.'
        : err.response?.data?.message || 'Failed to load data. Please try again.';
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
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white p-3 border rounded shadow">
        <p className="font-semibold text-gray-800">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.fill || entry.stroke }}>
            {`${entry.name}: ${formatCurrency(entry.value)}`}
          </p>
        ))}
      </div>
    );
  };

  // Prepare chart data with strict validation
  const debitChartData = (comparisons.debitComparison?.comparison || [])
    .filter(item => item?.category && typeof item.category === 'string' && item.category.trim() !== '')
    .map(item => ({
      category: item.category.trim(),
      BudgetedExpense: Math.max(Number(item.budgetedExpense) || 0, 0),
      ActualExpense: Math.max(Number(item.actualExpense) || 0, 0),
    }))
    .filter(item => item.BudgetedExpense >= 0 || item.ActualExpense >= 0);

  const creditChartData = (comparisons.creditComparison?.comparison || [])
    .filter(item => item?.category && typeof item.category === 'string' && item.category.trim() !== '')
    .map(item => ({
      category: item.category.trim(),
      IncomeGoal: Math.max(Number(item.incomeGoal) || 0, 0),
      ActualIncome: Math.max(Number(item.actualIncome) || 0, 0),
    }))
    .filter(item => item.IncomeGoal >= 0 || item.ActualIncome >= 0);

  console.log('Debit Chart Data:', JSON.stringify(debitChartData, null, 2));
  console.log('Credit Chart Data:', JSON.stringify(creditChartData, null, 2));

  // Prepare Pie/Donut chart data
  const debitPieData = debitChartData
    .flatMap(item => [
      { name: `${item.category} Budgeted`, value: item.BudgetedExpense, type: 'BudgetedExpense' },
      { name: `${item.category} Actual`, value: item.ActualExpense, type: 'ActualExpense' },
    ])
    .filter(item => item.value >= 0);

  const creditPieData = creditChartData
    .flatMap(item => [
      { name: `${item.category} Goal`, value: item.IncomeGoal, type: 'IncomeGoal' },
      { name: `${item.category} Actual`, value: item.ActualIncome, type: 'ActualIncome' },
    ])
    .filter(item => item.value >= 0);

  console.log('Debit Pie Data:', JSON.stringify(debitPieData, null, 2));
  console.log('Credit Pie Data:', JSON.stringify(creditPieData, null, 2));

  // Render chart
  const renderChart = (data, isDebit, chartType) => {
    if (!Array.isArray(data) || data.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-lg p-6 text-center text-gray-500">
          No data available. Add budgets or transactions for the selected period and category.
          <p className="mt-2 text-sm">Check console logs for debugging.</p>
        </div>
      );
    }

    const chartProps = {
      width: '100%',
      height: 400,
      margin: { top: 20, right: 30, left: 20, bottom: 80 },
    };

    const axisProps = {
      xAxis: {
        dataKey: 'category',
        fontSize: 12,
        angle: -45,
        textAnchor: 'end',
        height: 80,
        interval: 0,
      },
      yAxis: {
        tickFormatter: (value) => `₹${(value / 1000).toFixed(1)}k`,
        fontSize: 12,
        domain: [0, 'auto'],
      },
    };

    const legendProps = { wrapperStyle: { fontSize: 14, paddingTop: 10 } };

    try {
      switch (chartType) {
        case 'Bar':
          return (
            <ResponsiveContainer {...chartProps}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis {...axisProps.xAxis} />
                <YAxis {...axisProps.yAxis} />
                <Tooltip content={<CustomTooltip />} />
                <Legend {...legendProps} />
                {isDebit ? (
                  <>
                    <Bar dataKey="BudgetedExpense" fill="#3B82F6" name="Budgeted Expense" barSize={20} />
                    <Bar dataKey="ActualExpense" fill="#DC2626" name="Actual Expense" barSize={20} />
                  </>
                ) : (
                  <>
                    <Bar dataKey="IncomeGoal" fill="#3B82F6" name="Income Goal" barSize={20} />
                    <Bar dataKey="ActualIncome" fill="#10B981" name="Actual Income" barSize={20} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          );
        case 'StackedBar':
          return (
            <ResponsiveContainer {...chartProps}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis {...axisProps.xAxis} />
                <YAxis {...axisProps.yAxis} />
                <Tooltip content={<CustomTooltip />} />
                <Legend {...legendProps} />
                {isDebit ? (
                  <>
                    <Bar dataKey="BudgetedExpense" stackId="a" fill="#3B82F6" name="Budgeted Expense" barSize={40} />
                    <Bar dataKey="ActualExpense" stackId="a" fill="#DC2626" name="Actual Expense" barSize={40} />
                  </>
                ) : (
                  <>
                    <Bar dataKey="IncomeGoal" stackId="a" fill="#3B82F6" name="Income Goal" barSize={40} />
                    <Bar dataKey="ActualIncome" stackId="a" fill="#10B981" name="Actual Income" barSize={40} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          );
        case 'Line':
          return (
            <ResponsiveContainer {...chartProps}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis {...axisProps.xAxis} />
                <YAxis {...axisProps.yAxis} />
                <Tooltip content={<CustomTooltip />} />
                <Legend {...legendProps} />
                {isDebit ? (
                  <>
                    <Line type="monotone" dataKey="BudgetedExpense" stroke="#3B82F6" name="Budgeted Expense" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ActualExpense" stroke="#DC2626" name="Actual Expense" strokeWidth={2} dot={false} />
                  </>
                ) : (
                  <>
                    <Line type="monotone" dataKey="IncomeGoal" stroke="#3B82F6" name="Income Goal" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ActualIncome" stroke="#10B981" name="Actual Income" strokeWidth={2} dot={false} />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          );
        case 'Area':
          return (
            <ResponsiveContainer {...chartProps}>
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis {...axisProps.xAxis} />
                <YAxis {...axisProps.yAxis} />
                <Tooltip content={<CustomTooltip />} />
                <Legend {...legendProps} />
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
            <ResponsiveContainer {...chartProps}>
              <PieChart>
                <Pie
                  data={isDebit ? debitPieData : creditPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                >
                  {(isDebit ? debitPieData : creditPieData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend {...legendProps} />
              </PieChart>
            </ResponsiveContainer>
          );
        case 'Donut':
          return (
            <ResponsiveContainer {...chartProps}>
              <PieChart>
                <Pie
                  data={isDebit ? debitPieData : creditPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                >
                  {(isDebit ? debitPieData : creditPieData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend {...legendProps} />
              </PieChart>
            </ResponsiveContainer>
          );
        default:
          return (
            <div className="bg-white rounded-xl shadow-lg p-6 text-center text-gray-500">
              Invalid chart type selected.
            </div>
          );
      }
    } catch (err) {
      console.error('Chart Rendering Error:', err);
      return (
        <div className="bg-white rounded-xl shadow-lg p-6 text-center text-red-500">
          Error rendering chart. Check console for details.
        </div>
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
            value={chartType}
            onChange={handleChartTypeChange}
            className="w-40 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Bar">Bar</option>
            <option value="StackedBar">Stacked Bar</option>
            <option value="Line">Line</option>
            <option value="Area">Area</option>
            <option value="Pie">Pie</option>
            <option value="Donut">Donut</option>
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
                <p className="text-xl font-bold text-blue-600">
                  {comparisons.debitComparison.totals?.totalBudgetedExpenseFormatted || formatCurrency(0)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Actual Expense</p>
                <p className="text-xl font-bold text-red-600">
                  {comparisons.debitComparison.totals?.totalActualExpenseFormatted || formatCurrency(0)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Difference</p>
                <p className="text-xl font-bold text-orange-600">
                  {comparisons.debitComparison.totals?.totalDifferenceFormatted || formatCurrency(0)}
                </p>
                <p className="text-xs text-gray-600">{comparisons.debitComparison.totals?.totalStatus || 'N/A'}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Budgeted Expense vs Actual Expense by Category</h3>
            {renderChart(debitChartData, true, chartType)}
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
                <p className="text-xl font-bold text-blue-600">
                  {comparisons.creditComparison.totals?.totalIncomeGoalFormatted || formatCurrency(0)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Actual Income</p>
                <p className="text-xl font-bold text-green-600">
                  {comparisons.creditComparison.totals?.totalActualIncomeFormatted || formatCurrency(0)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Difference</p>
                <p className="text-xl font-bold text-orange-600">
                  {comparisons.creditComparison.totals?.totalDifferenceFormatted || formatCurrency(0)}
                </p>
                <p className="text-xs text-gray-600">{comparisons.creditComparison.totals?.totalStatus || 'N/A'}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Income Goal vs Actual Income by Category</h3>
            {renderChart(creditChartData, false, chartType)}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CompareBudgetExpensePage;