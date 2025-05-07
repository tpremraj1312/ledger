import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  FunnelChart, Funnel, Treemap
} from 'recharts';
import {
  FileText, Loader2, AlertTriangle, PlusCircle, X as IconX,
  Filter, BarChart2, PieChart as PieIcon, AreaChart as AreaIcon,
  ScatterChart as ScatterIcon, Activity as RadarIcon, Filter as FunnelIcon,
  LayoutGrid as TreemapIcon, ChevronLeft, ChevronRight, Brain, Scale
} from 'lucide-react';

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

const HomeView = () => {
  const navigate = useNavigate();
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
  const [isManualTxModalOpen, setIsManualTxModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
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
      // Fetch dashboard summary
      const summaryResponse = await axios.get('http://localhost:5000/api/dashboard/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSummaryData(summaryResponse.data);

      // Fetch transactions
      const params = {
        page: pagination.currentPage,
        limit: pagination.limit,
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.category !== 'All' && { category: filters.category }),
        type: 'debit',
      };
      const transactionsResponse = await axios.get('http://localhost:5000/api/transactions', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setTransactions(transactionsResponse.data.transactions || []);

      setPagination(prev => ({
        ...prev,
        totalPages: transactionsResponse.data.pagination.totalPages || 1,
        totalTransactions: transactionsResponse.data.pagination.totalTransactions || 0,
        currentPage: transactionsResponse.data.pagination.currentPage || 1,
      }));

      // Fetch budgets
      const budgetsResponse = await axios.get('http://localhost:5000/api/budgets', {
        headers: { Authorization: `Bearer ${token}` },
      });
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
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  // Calculate Chart and Overview Data
  const { areaChartData, pieChartData, budgetChartData, categories, overview } = useMemo(() => {
    const currentCategories = ['All', ...new Set([...transactions.map(tx => tx.category), ...budgets.map(b => b.category)])];

    // Expense Chart Data
    const expenseByDate = transactions.reduce((acc, tx) => {
      const dateStr = formatDateForDisplay(tx.date);
      acc[dateStr] = (acc[dateStr] || 0) + tx.amount;
      return acc;
    }, {});
    const areaData = Object.entries(expenseByDate)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const expenseByCategory = transactions.reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {});
    const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));

    // Budget Chart Data
    const expenseBudgets = budgets.filter(b => b.type === 'expense');
    const budgetData = expenseBudgets.map(b => ({
      category: b.category,
      amount: b.amount,
    }));

    // Overview Metrics
    const totalExpenses = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const avgExpense = transactions.length > 0 ? totalExpenses / transactions.length : 0;
    const totalBudget = expenseBudgets.reduce((sum, b) => sum + b.amount, 0);
    const topCategory = pieData.length > 0
      ? pieData.reduce((max, curr) => curr.value > max.value ? curr : max).name
      : 'N/A';

    return {
      areaChartData: areaData,
      pieChartData: pieData,
      budgetChartData: budgetData,
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
  const ChartComponent = ({ data, title, color, dataKey, nameKey = 'name' }) => {
    const customTooltip = ({ active, payload }) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-white p-2 border rounded shadow">
            <p className="font-semibold">{payload[0].payload[nameKey] || payload[0].payload.date}</p>
            <p>{`${title}: ${formatCurrency(payload[0].value)}`}</p>
          </div>
        );
      }
      return null;
    };

    switch (chartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                dataKey={dataKey}
                nameKey={nameKey}
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={customTooltip} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={nameKey} fontSize={10} />
              <YAxis fontSize={10} tickFormatter={(value) => `₹${value / 1000}k`} />
              <Tooltip content={customTooltip} />
              <Legend />
              <Area
                type="monotone"
                dataKey={dataKey}
                name={title}
                fill={color}
                fillOpacity={0.3}
                stroke={color}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={nameKey} type="category" />
              <YAxis dataKey={dataKey} type="number" name={title} />
              <Tooltip content={customTooltip} />
              <Legend />
              <Scatter name={title} data={data} fill={color} />
            </ScatterChart>
          </ResponsiveContainer>
        );
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey={nameKey} />
              <PolarRadiusAxis />
              <Tooltip content={customTooltip} />
              <Legend />
              <Radar name={title} dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        );
      case 'funnel':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart>
              <Tooltip content={customTooltip} />
              <Funnel
                data={data}
                dataKey={dataKey}
                nameKey={nameKey}
                isAnimationActive
                label={{
                  position: 'right',
                  fill: '#333',
                  fontSize: 12,
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
          <ResponsiveContainer width="100%" height={300}>
            <Treemap
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              stroke="#fff"
              aspectRatio={4 / 3}
              isAnimationActive
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
                  {width > 80 && height > 20 && (
                    <text x={x + 4} y={y + 16} fill="#fff" fontSize={12}>
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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={nameKey} />
              <YAxis />
              <Tooltip content={customTooltip} />
              <Legend />
              <Bar dataKey={dataKey} name={title} fill={color} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
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
      await axios.post('http://localhost:5000/api/transactions', payload, {
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
      fetchData();
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
      await axios.post('http://localhost:5000/api/billscan', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setIsScanModalOpen(false);
      setScanFile(null);
      fetchData();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to process bill scan.';
      setScanError(errorMessage);
    } finally {
      setIsScanning(false);
    }
  };

  // Quick Actions
  const quickActions = [
    {
      id: 'scan',
      icon: <FileText size={28} />,
      label: 'Scan Bill',
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      action: () => setIsScanModalOpen(true),
    },
    {
      id: 'manual',
      icon: <PlusCircle size={28} />,
      label: 'Add Transaction',
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      action: () => setIsManualTxModalOpen(true),
    },
    {
      id: 'compare-budget-expense',
      icon: <Scale size={28} />,
      label: 'Compare Budget & Expense',
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      action: () => navigate('/dashboard/compare-budget-expense'), // Redirect to AI Analysis page for comparison
    },
    {
      id: 'ai-analysis',
      icon: <Brain size={28} />,
      label: 'AI Analysis',
      color: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      action: () => navigate('/dashboard/ai-analysis'), // Redirect to new route
    },
  ];

  // Animation Variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
    hover: { scale: 1.05, boxShadow: '0 10px 20px rgba(0,0,0,0.1)', transition: { duration: 0.2 } },
    tap: { scale: 0.95 },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' },
    }),
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6', '#F97316'];

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center items-center py-20 bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen"
      >
        <Loader2 className="animate-spin h-12 w-12 text-blue-500" />
        <p className="ml-4 text-lg text-gray-700 font-medium">Loading your dashboard...</p>
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
        <div className="flex items-center">
          <AlertTriangle className="w-6 h-6 mr-3" />
          <div>
            <strong className="font-bold text-lg">Error!</strong>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-center"
      >
        <h2 className="text-3xl font-bold text-gray-800">Financial Dashboard</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg shadow hover:bg-gray-300 flex items-center"
          >
            <Filter size={18} className="mr-2" /> {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-6"
      >
        {quickActions.map((action) => (
          <motion.button
            key={action.id}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            whileTap="tap"
            className={`${action.color} rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center relative overflow-hidden group`}
            onClick={action.action}
          >
            <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition-opacity duration-300"></div>
            <div className="relative z-10 flex flex-col items-center">
              {action.icon}
              <span className="mt-3 text-lg font-semibold tracking-tight">{action.label}</span>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Overview Section */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Financial Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Expenses</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(overview.totalExpenses)}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Budget</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(overview.totalBudget)}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Top Expense Category</p>
            <p className="text-xl font-bold text-purple-600 capitalize">{overview.topCategory}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Transactions</p>
            <p className="text-xl font-bold text-orange-600">{overview.transactionCount}</p>
          </div>
        </div>
      </motion.div>

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
                  value={filters.startDate}
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

      {/* Chart Type Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center space-x-2"
      >
        <label className="text-sm font-medium text-gray-700">Chart Type:</label>
        <select
          value={chartType}
          onChange={(e) => setChartType(e.target.value)}
          className="border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="bar"><BarChart2 size={16} className="mr-2 inline" /> Bar Chart</option>
          <option value="pie"><PieIcon size={16} className="mr-2 inline" /> Pie Chart</option>
          <option value="treemap"><TreemapIcon size={16} className="mr-2 inline" /> Treemap</option>
          <option value="area"><AreaIcon size={16} className="mr-2 inline" /> Area Chart</option>
          <option value="scatter"><ScatterIcon size={16} className="mr-2 inline" /> Scatter Chart</option>
          <option value="radar"><RadarIcon size={16} className="mr-2 inline" /> Radar Chart</option>
          <option value="funnel"><FunnelIcon size={16} className="mr-2 inline" /> Funnel Chart</option>
        </select>
      </motion.div>

      {/* Financial Charts */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Expenses Over Time</h3>
          {areaChartData.length > 0 ? (
            <ChartComponent
              data={areaChartData}
              title="Expenses"
              color="#DC2626"
              dataKey="amount"
              nameKey="date"
            />
          ) : (
            <p className="text-gray-500 text-center py-8">No expense data available.</p>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Expense Categories</h3>
          {pieChartData.length > 0 ? (
            <ChartComponent
              data={pieChartData}
              title="Expenses"
              color="#3B82F6"
              dataKey="value"
            />
          ) : (
            <p className="text-gray-500 text-center py-8">No expense data available.</p>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Budget Allocation</h3>
          {budgetChartData.length > 0 ? (
            <ChartComponent
              data={budgetChartData}
              title="Budget"
              color="#10B981"
              dataKey="amount"
              nameKey="category"
            />
          ) : (
            <p className="text-gray-500 text-center py-8">No budget data available.</p>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Transactions</h3>
          {summaryData?.recentTransactions && summaryData.recentTransactions.length > 0 ? (
            <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
              {summaryData.recentTransactions.map((tx, index) => (
                <motion.div
                  key={tx._id}
                  custom={index}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex justify-between items-center p-4 hover:bg-gray-50 rounded-xl border-b last:border-b-0"
                >
                  <div className="flex-1 mr-4 overflow-hidden">
                    <p className="font-semibold text-gray-800 capitalize truncate">{tx.category}</p>
                    <p className="text-sm text-gray-600 truncate">{tx.description || '-'}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDateForDisplay(tx.date)}</p>
                    {tx.source === 'manual' && <span className="text-xs text-blue-500 italic">(Manual)</span>}
                    {tx.source === 'billscan' && <span className="text-xs text-purple-500 italic">(Scanned)</span>}
                  </div>
                  <div className={`font-semibold text-right whitespace-nowrap ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No recent transactions found. Try scanning a bill or adding a manual transaction.</p>
          )}
        </div>
      </motion.div>

      {/* Transaction List */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Expense History</h3>
        {transactions.length > 0 ? (
          <>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {transactions.map((tx, index) => (
                <motion.div
                  key={tx._id}
                  custom={index}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border-b last:border-b-0 hover:bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 mb-2 sm:mb-0 sm:mr-3">
                    <p className="font-medium text-gray-800 capitalize">{tx.category}</p>
                    <p className="text-sm text-gray-600 truncate">{tx.description || '-'}</p>
                    <p className="text-xs text-gray-400">{formatDateForDisplay(tx.date)}</p>
                    {tx.source === 'manual' && <span className="text-xs text-blue-500 italic">(Manual)</span>}
                    {tx.source === 'billscan' && <span className="text-xs text-purple-500 italic">(Scanned)</span>}
                  </div>
                  <div className="font-semibold text-red-600 text-right w-full sm:w-auto">
                    -{formatCurrency(tx.amount)}
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-6 text-sm">
              <span className="text-gray-600">
                Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalTransactions} items)
              </span>
              <div className="space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage <= 1 || isLoading}
                  className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage >= pagination.totalPages || isLoading}
                  className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-center py-10">No expenses found matching your filters.</p>
        )}
      </motion.div>

      {/* Manual Transaction Modal */}
      <AnimatePresence>
        {isManualTxModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Add Manual Transaction</h3>
                <button
                  onClick={() => setIsManualTxModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <IconX size={24} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4">Record a past transaction (e.g., cash payment).</p>
              {modalError && <p className="text-red-500 text-sm mb-3 bg-red-50 p-2 rounded">{modalError}</p>}
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">Type *:</span>
                  <label className="flex items-center">
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
                  <label className="flex items-center">
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
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingManual}
                  className={`w-full ${isSubmittingManual ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white py-2 rounded-lg transition-colors flex items-center justify-center`}
                >
                  {isSubmittingManual ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
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
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Scan Bill</h3>
                <button
                  onClick={() => setIsScanModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <IconX size={24} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4">Upload an image or PDF of a bill to extract transaction details.</p>
              {scanError && <p className="text-red-500 text-sm mb-3 bg-red-50 p-2 rounded">{scanError}</p>}
              <form onSubmit={handleScanSubmit} className="space-y-4">
                <div>
                  <label htmlFor="billImage" className="block text-sm font-medium text-gray-700 mb-1">Upload Bill *</label>
                  <input
                    id="billImage"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleScanFileChange}
                    required
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isScanning}
                  className={`w-full ${isScanning ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white py-2 rounded-lg transition-colors flex items-center justify-center`}
                >
                  {isScanning ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
                  {isScanning ? 'Scanning...' : 'Scan Bill'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomeView;