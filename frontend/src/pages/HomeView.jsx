import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  FunnelChart, Funnel, Treemap
} from 'recharts';
import {
  FileText, Loader2, AlertTriangle, PlusCircle, Filter, BarChart2, PieChart as PieIcon,
  AreaChart as AreaIcon, ScatterChart as ScatterIcon, Activity as RadarIcon,
  Filter as FunnelIcon, LayoutGrid as TreemapIcon, ChevronLeft, ChevronRight, Brain
} from 'lucide-react';

// Helper Functions
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₹0.00';
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDateForDisplay = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch (e) { return dateString; }
};

const formatDateForMobile = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short'
    });
  } catch (e) { return dateString; }
};

const getAuthToken = () => localStorage.getItem('token');

const HomeView = React.memo(({ setIsManualTxModalOpen, setIsScanModalOpen, setActiveTab = () => console.warn('setActiveTab not provided. Ensure DashboardLayout.jsx passes setActiveTab to HomeView.') }) => {
  const [summaryData, setSummaryData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: 'All',
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalTransactions: 0,
    limit: 10,
  });
  const [chartType, setChartType] = useState('area');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch Data
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
      const [summaryResponse, transactionsResponse, budgetsResponse] = await Promise.all([
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/dashboard/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/transactions`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            page: pagination.currentPage,
            limit: pagination.limit,
            ...(filters.startDate && { startDate: filters.startDate }),
            ...(filters.endDate && { endDate: filters.endDate }),
            ...(filters.category !== 'All' && { category: filters.category }),
            type: 'debit',
          },
        }),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/budgets`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setSummaryData(summaryResponse.data);
      setTransactions(transactionsResponse.data.transactions || []);
      setPagination(prev => ({
        ...prev,
        totalPages: transactionsResponse.data.pagination.totalPages || 1,
        totalTransactions: transactionsResponse.data.pagination.totalTransactions || 0,
        currentPage: transactionsResponse.data.pagination.currentPage || 1,
      }));
      setBudgets(budgetsResponse.data || []);
    } catch (err) {
      const message = err.code === 'ERR_NETWORK'
        ? 'Unable to connect to the server. Please check if the backend is running on http://localhost:5000.'
        : err.response?.data?.message || 'Failed to load dashboard data.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination.currentPage, pagination.limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Filters and Pagination
  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  }, [pagination.totalPages]);

  // Calculate Chart and Overview Data
  const {
    expenseOverTimeData,
    expenseCategoryData,
    budgetOverTimeData,
    budgetCategoryData,
    blendedChartData,
    categories,
    overview,
  } = useMemo(() => {
    const currentCategories = ['All', ...new Set([...transactions.map(tx => tx.category), ...budgets.map(b => b.category)])];

    // Expenses Over Time (by date)
    const expenseByDate = transactions.reduce((acc, tx) => {
      const date = formatDateForDisplay(tx.date);
      acc[date] = (acc[date] || 0) + tx.amount;
      return acc;
    }, {});
    const expenseOverTime = Object.entries(expenseByDate)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Expense Categories
    const expenseByCategory = transactions.reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {});
    const expenseCategory = Object.entries(expenseByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Budgets Over Time (by date)
    const expenseBudgets = budgets.filter(b => b.type === 'expense');
    const budgetByDate = expenseBudgets.reduce((acc, b) => {
      const date = formatDateForDisplay(b.createdAt);
      acc[date] = (acc[date] || 0) + b.amount;
      return acc;
    }, {});
    const budgetOverTime = Object.entries(budgetByDate)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Budget Categories
    const budgetByCategory = expenseBudgets.reduce((acc, b) => {
      acc[b.category] = (acc[b.category] || 0) + b.amount;
      return acc;
    }, {});
    const budgetCategory = Object.entries(budgetByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Blended Expenses and Budget
    const allDates = [...new Set([
      ...transactions.map(tx => formatDateForDisplay(tx.date)),
      ...expenseBudgets.map(b => formatDateForDisplay(b.createdAt))
    ])].sort((a, b) => new Date(a) - new Date(b));
    const blendedData = allDates.map(date => ({
      date,
      expense: expenseByDate[date] || 0,
      budget: budgetByDate[date] || 0,
    }));

    const totalExpenses = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const avgExpense = transactions.length > 0 ? totalExpenses / transactions.length : 0;
    const totalBudget = expenseBudgets.reduce((sum, b) => sum + b.amount, 0);
    const topCategory = expenseCategory.length > 0
      ? expenseCategory.reduce((max, curr) => curr.value > max.value ? curr : max).name
      : 'N/A';

    return {
      expenseOverTimeData: expenseOverTime,
      expenseCategoryData: expenseCategory,
      budgetOverTimeData: budgetOverTime,
      budgetCategoryData: budgetCategory,
      blendedChartData: blendedData,
      categories: currentCategories,
      overview: {
        totalExpenses,
        avgExpense,
        totalBudget,
        topCategory,
        transactionCount: transactions.length,
        budgetCount: expenseBudgets.length,
      },
    };
  }, [transactions, budgets]);

  // Chart Component
  const ChartComponent = React.memo(({ data, title, dataKey, nameKey = 'name', isBlended = false }) => {
    const customTooltip = ({ active, payload }) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-white/95 p-1.5 sm:p-2 border border-gray-100 rounded-md shadow-md backdrop-blur-sm">
            <p className="font-semibold text-gray-800 text-[9px] sm:text-xs">{payload[0].payload[nameKey] || payload[0].payload.date}</p>
            {payload.map((entry, index) => (
              <p key={index} className="text-gray-600 text-[9px] sm:text-xs">{`${entry.name}: ${formatCurrency(entry.value)}`}</p>
            ))}
          </div>
        );
      }
      return null;
    };

    const maxValue = isBlended
      ? Math.max(...data.map(d => Math.max(d.expense, d.budget)), 1000)
      : Math.max(...data.map(d => d[dataKey]), 1000);

    // Optimize X-axis labels for mobile
    const isMobile = window.innerWidth < 640;
    const tickFormatter = (value, index) => {
      if (isMobile && nameKey === 'date' && index % 6 !== 0) return '';
      return isMobile && nameKey === 'date' ? formatDateForMobile(value) : value;
    };

    switch (chartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={isMobile ? 280 : 340}>
            <PieChart>
              <Pie
                data={data}
                dataKey={dataKey}
                nameKey={nameKey}
                cx="50%"
                cy="50%"
                outerRadius={isMobile ? 70 : 110}
                label={isMobile ? false : ({ name, value }) => `${name}: ${formatCurrency(value)}`}
                labelLine={isMobile ? false : true}
                isAnimationActive
                animationDuration={500}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={customTooltip} />
              <Legend wrapperStyle={{ fontSize: isMobile ? 7 : 11 }} />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={isMobile ? 280 : 340}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey={nameKey}
                fontSize={isMobile ? 9 : 11}
                stroke="#374151"
                angle={isMobile ? -60 : -45}
                textAnchor="end"
                height={isMobile ? 70 : 50}
                tickFormatter={tickFormatter}
              />
              <YAxis
                fontSize={isMobile ? 9 : 11}
                stroke="#374151"
                tickFormatter={(value) => `₹${value / 1000}k`}
                domain={[0, maxValue * 1.1]}
              />
              <Tooltip content={customTooltip} />
              <Legend wrapperStyle={{ fontSize: isMobile ? 7 : 11 }} />
              {isBlended ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="Expenses"
                    fill="#EF4444"
                    fillOpacity={0.5}
                    stroke="#EF4444"
                    strokeWidth={2}
                    stackId="1"
                    isAnimationActive
                    animationDuration={500}
                  />
                  <Area
                    type="monotone"
                    dataKey="budget"
                    name="Budget"
                    fill="#059669"
                    fillOpacity={0.5}
                    stroke="#059669"
                    strokeWidth={2}
                    stackId="1"
                    isAnimationActive
                    animationDuration={500}
                  />
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey={dataKey}
                  name={title}
                  fill={COLORS[0]}
                  fillOpacity={0.5}
                  stroke={COLORS[0]}
                  strokeWidth='2'
                  isAnimationActive
                  animationDuration={500}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={isMobile ? 280 : 340}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey={nameKey}
                type="category"
                fontSize={isMobile ? 9 : 11}
                stroke="#374151"
                angle={isMobile ? -60 : -45}
                textAnchor="end"
                height={isMobile ? 70 : 50}
                tickFormatter={tickFormatter}
              />
              <YAxis
                fontSize={isMobile ? 9 : 11}
                stroke="#374151"
                tickFormatter={(value) => `₹${value / 1000}k`}
                domain={[0, maxValue * 1.1]}
              />
              <Tooltip content={customTooltip} />
              <Legend wrapperStyle={{ fontSize: isMobile ? 7 : 11 }} />
              <Scatter name={title} data={data} fill={COLORS[0]} isAnimationActive animationDuration={500} />
            </ScatterChart>
          </ResponsiveContainer>
        );
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={isMobile ? 280 : 340}>
            <RadarChart data={data}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey={nameKey} stroke="#374151" fontSize={isMobile ? 9 : 11} />
              <PolarRadiusAxis
                stroke="#374151"
                fontSize={isMobile ? 9 : 11}
                tickFormatter={(value) => `₹${value / 1000}k`}
                domain={[0, maxValue * 1.1]}
              />
              <Tooltip content={customTooltip} />
              <Legend wrapperStyle={{ fontSize: isMobile ? 7 : 11 }} />
              <Radar name={title} dataKey={dataKey} stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.6} isAnimationActive animationDuration={500} />
            </RadarChart>
          </ResponsiveContainer>
        );
      case 'funnel':
        return (
          <ResponsiveContainer width="100%" height={isMobile ? 280 : 340}>
            <FunnelChart>
              <Tooltip content={customTooltip} />
              <Funnel
                data={data}
                dataKey={dataKey}
                nameKey={nameKey}
                isAnimationActive
                animationDuration={500}
                label={{
                  position: 'right',
                  fill: '#333',
                  fontSize: isMobile ? 9 : 11,
                  formatter: (entry) => `${entry[nameKey]}: ${formatCurrency(entry[dataKey])}`,
                }}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        );
      case 'treemap':
        return (
          <ResponsiveContainer width="100%" height={isMobile ? 280 : 340}>
            <Treemap
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              stroke="#fff"
              aspectRatio={4 / 3}
              isAnimationActive
              animationDuration={500}
              content={({ depth, x, y, width, height, index, name, value }) => (
                <g>
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={COLORS[index % COLORS.length]}
                    stroke="#fff"
                  />
                  {width > (isMobile ? 50 : 70) && height > (isMobile ? 14 : 18) && (
                    <text x={x + 3} y={y + (isMobile ? 11 : 14)} fill="#fff" fontSize={isMobile ? 9 : 11}>
                      {name} ({formatCurrency(value)})
                    </text>
                  )}
                </g>
              )}
            >
              <Tooltip content={customTooltip} />
            </Treemap>
          </ResponsiveContainer>
        );
      default:
        return (
          <ResponsiveContainer width="100%" height={isMobile ? 280 : 340}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey={nameKey}
                fontSize={isMobile ? 9 : 11}
                stroke="#374151"
                angle={isMobile ? -60 : -45}
                textAnchor="end"
                height={isMobile ? 70 : 50}
                tickFormatter={tickFormatter}
              />
              <YAxis
                fontSize={isMobile ? 9 : 11}
                stroke="#374151"
                tickFormatter={(value) => `₹${value / 1000}k`}
                domain={[0, maxValue * 1.1]}
              />
              <Tooltip content={customTooltip} />
              <Legend wrapperStyle={{ fontSize: isMobile ? 7 : 11 }} />
              {isBlended ? (
                <>
                  <Bar dataKey="expense" name="Expenses" fill="#EF4444" isAnimationActive animationDuration={500} />
                  <Bar dataKey="budget" name="Budget" fill="#059669" isAnimationActive animationDuration={500} />
                </>
              ) : (
                <Bar dataKey={dataKey} name={title} fill={COLORS[0]} isAnimationActive animationDuration={500} />
              )}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  });

  // Animation Variants
  const cardVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
    hover: { scale: 1.03, transition: { duration: 0.15 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -4 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.04, duration: 0.15, ease: 'easeOut' },
    }),
  };

  const drawerVariants = {
    hidden: { x: '100%', opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } },
    exit: { x: '100%', opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
  };

  const COLORS = ['#2563EB', '#059669', '#D97706', '#7C3AED', '#DB2777', '#6D28D9', '#EA580C'];

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-12 sm:py-16 min-h-[calc(100vh-4rem)] bg-gray-50"
      >
        <Loader2 className="animate-spin h-6 w-6 text-blue-600" />
        <p className="mt-2 text-xs font-medium text-gray-600">Loading your financial insights...</p>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-gray-50 p-4"
      >
        <div className="bg-white p-4 rounded-xl shadow-md max-w-sm w-full border border-red-50">
          <div className="flex items-center">
            <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
            <div>
              <strong className="font-semibold text-gray-800 text-sm">Error</strong>
              <p className="mt-1 text-xs text-gray-600">{error}</p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 p-2 sm:p-4 lg:p-5 space-y-3 sm:space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center sticky top-0 bg-white p-2 sm:p-3 rounded-xl shadow-sm z-10"
      >
        <h2 className="text-base sm:text-lg font-bold text-gray-900">Financial Dashboard</h2>
        <button
          onClick={() => setShowFilters(true)}
          className="p-1.5 min-h-[44px] min-w-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm font-medium"
        >
          <Filter size={17} className="mr-4 sm:mr-1.5 ml-4 sm:ml-1.5" /> <span className="sm:inline mr-4 sm:mr-1.5 ml-4 sm:ml-1.5">Filter</span>
        </button>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3"
      >
        {[
          { id: 'scan', icon: <FileText size={18} />, label: 'Scan Bill', color: 'bg-gradient-to-br from-blue-600 to-blue-800', action: () => setIsScanModalOpen(true), order: 'order-1' },
          { id: 'manual', icon: <PlusCircle size={18} />, label: 'Add Transaction', color: 'bg-gradient-to-br from-green-600 to-green-800', action: () => setIsManualTxModalOpen(true), order: 'order-2' },
          { id: 'compare', icon: <BarChart2 size={18} />, label: 'Compare Budget vs Expenses', color: 'bg-gradient-to-br from-purple-600 to-purple-800', action: () => setActiveTab('compare'), order: 'order-3' },
          { id: 'ai-analysis', icon: <Brain size={18} />, label: 'AI Analysis', color: 'bg-gradient-to-br from-orange-600 to-orange-800', action: () => setActiveTab('ai-analysis'), order: 'order-4' },
        ].map((action) => (
          <motion.button
            key={action.id}
            variants={cardVariants}
            whileHover="hover"
            whileTap={{ scale: 0.95 }}
            className={`${action.color} ${action.order} text-white p-3 sm:p-4 rounded-xl shadow-md border border-gray-100 relative overflow-hidden group hover:shadow-lg transition-all duration-150 min-h-[110px]`}
            onClick={action.action}
          >
            <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition-opacity"></div>
            <div className="relative flex flex-col items-center space-y-2">
              {action.icon}
              <span className="text-[11px] sm:text-xs font-semibold text-center leading-tight line-clamp-2">{action.label}</span>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Filters Drawer (Mobile) / Card (Desktop) */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-y-0 right-0 w-[90%] sm:w-72 bg-white p-3 sm:p-4 rounded-l-xl shadow-lg z-50 sm:static sm:bg-white/95 sm:rounded-xl sm:shadow-md"
          >
            <div className="flex justify-between items-center mb-2 sm:mb-3">
              <h3 className="text-base font-semibold text-gray-800">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-600 hover:text-gray-800 p-1 min-h-[44px] min-w-[44px]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2 sm:space-y-3">
              <div>
                <label htmlFor="startDate" className="block text-[11px] sm:text-xs font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="mt-1 w-full p-1.5 sm:p-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11px] sm:text-xs"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-[11px] sm:text-xs font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="mt-1 w-full p-1.5 sm:p-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11px] sm:text-xs"
                />
              </div>
              <div>
                <label htmlFor="category" className="block text-[11px] sm:text-xs font-medium text-gray-700">Category</label>
                <select
                  id="category"
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                  className="mt-1 w-full p-1.5 sm:p-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11px] sm:text-xs"
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
      {showFilters && <div className="fixed inset-0 bg-black/60 z-40 sm:hidden" onClick={() => setShowFilters(false)}></div>}

      {/* Overview Cards */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3"
      >
        {[
          { label: 'Total Expenses', value: formatCurrency(overview.totalExpenses), color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Budget', value: formatCurrency(overview.totalBudget), color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Top Category', value: overview.topCategory, color: 'text-purple-600', bg: 'bg-purple-50', capitalize: true },
          { label: 'Transactions', value: overview.transactionCount, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((item, index) => (
          <motion.div
            key={item.label}
            variants={cardVariants}
            whileHover="hover"
            className={`p-2 sm:p-3 rounded-xl shadow-md ${item.bg} border-2 border-gray-50`}
            custom={index}
          >
            <p className="text-[11px] sm:text-xs text-gray-600">{item.label}</p>
            <p className={`text-sm sm:text-base font-semibold ${item.color} ${item.capitalize ? 'capitalize' : ''}`}>{item.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Expenses Insights */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="bg-white rounded-xl shadow-md p-2 sm:p-4 border-2 border-gray-50"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 sm:mb-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-0">Expenses Insights</h3>
          <div className="flex space-x-1 overflow-x-auto pb-1">
            {[
              { value: 'area', icon: <AreaIcon size={11} /> },
              { value: 'bar', icon: <BarChart2 size={11} /> },
              { value: 'pie', icon: <PieIcon size={11} /> },
              { value: 'treemap', icon: <TreemapIcon size={11} /> },
              { value: 'scatter', icon: <ScatterIcon size={11} /> },
              { value: 'radar', icon: <RadarIcon size={11} /> },
              { value: 'funnel', icon: <FunnelIcon size={11} /> },
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => setChartType(type.value)}
                className={`p-1 sm:p-1.5 rounded-lg text-[11px] flex items-center min-h-[44px] min-w-[44px] ${chartType === type.value ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {type.icon}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 overflow-x-auto">
          <div className="min-w-[500px] sm:min-w-0">
            <h4 className="text-[11px] sm:text-xs font-medium text-gray-700 mb-2">Expenses Over Time</h4>
            {expenseOverTimeData.length > 0 ? (
              <ChartComponent
                data={expenseOverTimeData}
                title="Expenses Over Time"
                dataKey="amount"
                nameKey="date"
              />
            ) : (
              <p className="text-gray-500 text-center py-3 sm:py-4 text-[11px] sm:text-xs">No expense data available.</p>
            )}
          </div>
          <div className="min-w-[500px] sm:min-w-0">
            <h4 className="text-[11px] sm:text-xs font-medium text-gray-700 mb-2">Expense Categories</h4>
            {expenseCategoryData.length > 0 ? (
              <ChartComponent
                data={expenseCategoryData}
                title="Expense Categories"
                dataKey="value"
                nameKey="name"
              />
            ) : (
              <p className="text-gray-500 text-center py-3 sm:py-4 text-[11px] sm:text-xs">No expense data available.</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Budget Insights */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="bg-white rounded-xl shadow-md p-2 sm:p-4 border-2 border-gray-50"
      >
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Budget Insights</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 overflow-x-auto">
          <div className="min-w-[500px] sm:min-w-0">
            <h4 className="text-[11px] sm:text-xs font-medium text-gray-700 mb-2">Budgets Over Time</h4>
            {budgetOverTimeData.length > 0 ? (
              <ChartComponent
                data={budgetOverTimeData}
                title="Budgets Over Time"
                dataKey="amount"
                nameKey="date"
              />
            ) : (
              <p className="text-gray-500 text-center py-3 sm:py-4 text-[11px] sm:text-xs">No budget data available.</p>
            )}
          </div>
          <div className="min-w-[500px] sm:min-w-0">
            <h4 className="text-[11px] sm:text-xs font-medium text-gray-700 mb-2">Budget Categories</h4>
            {budgetCategoryData.length > 0 ? (
              <ChartComponent
                data={budgetCategoryData}
                title="Budget Categories"
                dataKey="value"
                nameKey="name"
              />
            ) : (
              <p className="text-gray-500 text-center py-3 sm:py-4 text-[11px] sm:text-xs">No budget data available.</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Comparison Insights */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="bg-white rounded-xl shadow-md p-2 sm:p-4 border-2 border-gray-50"
      >
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Comparison Insights</h3>
        <div className="overflow-x-auto">
          <h4 className="text-[11px] sm:text-xs font-medium text-gray-700 mb-2">Expenses vs Budget</h4>
          {blendedChartData.length > 0 ? (
            <ChartComponent
              data={blendedChartData}
              title="Expenses vs Budget"
              dataKey="expense"
              nameKey="date"
              isBlended={true}
            />
          ) : (
            <p className="text-gray-500 text-center py-3 sm:py-4 text-[11px] sm:text-xs">No data available for expenses or budget.</p>
          )}
        </div>
      </motion.div>

      {/* Expense History */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="bg-white rounded-xl shadow-md p-2 sm:p-4 border-2 border-gray-50"
      >
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Expense History</h3>
        {transactions.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <div className="min-w-[500px] max-h-72 overflow-y-auto">
                <div className="grid grid-cols-4 gap-1 sm:gap-2 p-1 sm:p-2 bg-gray-50 rounded-lg sticky top-0 z-10">
                  <p className="text-[11px] sm:text-xs font-semibold text-gray-700">Category</p>
                  <p className="text-[11px] sm:text-xs font-semibold text-gray-700">Description</p>
                  <p className="text-[11px] sm:text-xs font-semibold text-gray-700">Date</p>
                  <p className="text-[11px] sm:text-xs font-semibold text-gray-700 text-right">Amount</p>
                </div>
                {transactions.map((tx, index) => (
                  <motion.div
                    key={tx._id}
                    custom={index}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-4 gap-1 sm:gap-2 p-1 sm:p-2 border-b border-gray-200 hover:bg-gray-100 rounded-lg"
                  >
                    <p className="text-[11px] sm:text-xs text-gray-800 capitalize">{tx.category}</p>
                    <p className="text-[11px] sm:text-xs text-gray-600 truncate">{tx.description || '-'}</p>
                    <p className="text-[11px] sm:text-xs text-gray-600">{formatDateForMobile(tx.date)}</p>
                    <p className="text-[11px] sm:text-xs text-red-600 font-semibold text-right">-{formatCurrency(tx.amount)}</p>
                    {tx.source === 'manual' && <span className="text-[10px] text-blue-500 col-span-4">(Manual)</span>}
                    {tx.source === 'billscan' && <span className="text-[10px] text-purple-500 col-span-4">(Scanned)</span>}
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center mt-2 sm:mt-3 text-[11px] sm:text-xs">
              <span className="text-gray-600 text-[10px]">
                Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalTransactions} items)
              </span>
              <div className="flex space-x-1">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage <= 1 || isLoading}
                  className="p-1 sm:p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px]"
                >
                  <ChevronLeft size={12} />
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage >= pagination.totalPages || isLoading}
                  className="p-1 sm:p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px]"
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-center py-3 sm:py-4 text-[11px] sm:text-xs">No expenses found.</p>
        )}
      </motion.div>
    </div>
  );
});

export default HomeView;