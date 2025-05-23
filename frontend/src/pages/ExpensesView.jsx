import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  FunnelChart, Funnel, Treemap
} from 'recharts';
import {
  PlusCircle, X as IconX, Filter, BarChart2, PieChart as PieIcon,
  AreaChart as AreaIcon, ScatterChart as ScatterIcon, Activity as RadarIcon,
  Filter as FunnelIcon, LayoutGrid as TreemapIcon, Loader2, AlertTriangle,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ArrowLeft
} from 'lucide-react';

// Helper Functions (unchanged)
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

// Subcomponents
const Header = ({ setShowFilters, showFilters, setIsManualTxModalOpen, setIsScanModalOpen }) => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
    <div className="flex items-center gap-3">
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-sm hover:bg-gray-100 transition-colors duration-200 border border-gray-200"
        aria-label="Go back"
      >
        <ArrowLeft size={16} />
        Back
      </button>
      <h2 className="text-2xl font-semibold text-gray-800">Transaction Insights</h2>
    </div>
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-sm hover:bg-gray-100 transition-colors duration-200 border border-gray-200"
        aria-label={showFilters ? 'Hide filters' : 'Show filters'}
      >
        <Filter size={16} />
        {showFilters ? 'Hide Filters' : 'Show Filters'}
      </button>
      <button
        onClick={() => setIsManualTxModalOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow-sm hover:from-green-600 hover:to-green-700 transition-colors duration-200"
        aria-label="Add manual transaction"
      >
        <PlusCircle size={16} />
        Add Manual
      </button>
      <button
        onClick={() => setIsScanModalOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-sm hover:from-blue-600 hover:to-blue-700 transition-colors duration-200"
        aria-label="Scan bill"
      >
        <PlusCircle size={16} />
        Scan Bill
      </button>
    </div>
  </div>
);

const OverviewCard = ({ title, value, color, gradient }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className={`p-4 rounded-xl shadow-sm bg-gradient-to-br ${gradient} backdrop-blur-sm bg-opacity-80 border border-white/20`}
  >
    <p className="text-sm text-gray-600">{title}</p>
    <p className={`text-lg font-semibold ${color}`}>{value}</p>
  </motion.div>
);

const FilterPanel = ({ filters, handleFilterChange, categories, pagination, handleLimitChange }) => (
  <motion.div
    initial={{ height: 0, opacity: 0 }}
    animate={{ height: 'auto', opacity: 1 }}
    exit={{ height: 0, opacity: 0 }}
    transition={{ duration: 0.3 }}
    className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100 backdrop-blur-sm"
  >
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div>
        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
        <input
          type="date"
          id="startDate"
          name="startDate"
          value={filters.startDate}
          onChange={handleFilterChange}
          className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
          aria-label="Start date filter"
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
          className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
          aria-label="End date filter"
        />
      </div>
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select
          id="category"
          name="category"
          value={filters.category}
          onChange={handleFilterChange}
          className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
          aria-label="Category filter"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
        <select
          id="type"
          name="type"
          value={filters.type}
          onChange={handleFilterChange}
          className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
          aria-label="Transaction type filter"
        >
          <option value="all">All</option>
          <option value="debit">Debit</option>
          <option value="credit">Credit</option>
        </select>
      </div>
      <div>
        <label htmlFor="limit" className="block text-sm font-medium text-gray-700 mb-1">Per Page</label>
        <select
          id="limit"
          name="limit"
          value={pagination.limit}
          onChange={handleLimitChange}
          className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
          aria-label="Transactions per page"
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
        </select>
      </div>
    </div>
  </motion.div>
);

const ChartSelector = ({ chartType, setChartType }) => (
  <div className="flex items-center gap-2 mb-6">
    <label className="text-sm font-medium text-gray-700">Chart Type:</label>
    <select
      value={chartType}
      onChange={(e) => setChartType(e.target.value)}
      className="p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm transition-colors duration-200"
      aria-label="Select chart type"
    >
      <option value="bar"><BarChart2 size={16} className="mr-2 inline" /> Bar Chart</option>
      <option value="pie"><PieIcon size={16} className="mr-2 inline" /> Pie Chart</option>
      <option value="treemap"><TreemapIcon size={16} className="mr-2 inline" /> Treemap</option>
      <option value="area"><AreaIcon size={16} className="mr-2 inline" /> Area Chart</option>
      <option value="scatter"><ScatterIcon size={16} className="mr-2 inline" /> Scatter Chart</option>
      <option value="radar"><RadarIcon size={16} className="mr-2 inline" /> Radar Chart</option>
      <option value="funnel"><FunnelIcon size={16} className="mr-2 inline" /> Funnel Chart</option>
    </select>
  </div>
);

const TransactionCard = ({ tx, toggleTransaction, expandedTransactions }) => {
  const categoriesSum = tx.source === 'billscan' && tx.categories
    ? tx.categories.reduce((sum, cat) => sum + (cat.categoryTotal || 0), 0)
    : tx.amount;
  const amountMismatch = tx.source === 'billscan' && Math.abs(categoriesSum - tx.amount) > 0.01;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 border-b last:border-b-0 bg-white rounded-lg hover:bg-gray-50 transition-colors duration-200"
    >
      <div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer"
        onClick={() => tx.source === 'billscan' && toggleTransaction(tx._id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && tx.source === 'billscan' && toggleTransaction(tx._id)}
        aria-expanded={expandedTransactions[tx._id]}
        aria-label={`Transaction: ${tx.category}`}
      >
        <div className="flex-1 mb-2 sm:mb-0 sm:mr-3">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-800 capitalize">{tx.category}</p>
            {tx.source === 'billscan' && (
              <span className="text-gray-500">
                {expandedTransactions[tx._id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 truncate">{tx.description || '-'}</p>
          <p className="text-xs text-gray-400">{formatDateForDisplay(tx.date)}</p>
          {tx.source === 'manual' && <span className="text-xs text-blue-500 italic">(Manual)</span>}
          {tx.source === 'billscan' && <span className="text-xs text-purple-500 italic">(Scanned)</span>}
          {amountMismatch && (
            <p className="text-xs text-red-500 italic">
              (Warning: Category totals {formatCurrency(categoriesSum)} do not match transaction amount {formatCurrency(tx.amount)})
            </p>
          )}
        </div>
        <div className={`font-semibold text-right ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
          {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
        </div>
      </div>
      {tx.source === 'billscan' && expandedTransactions[tx._id] && tx.categories && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="ml-4 mt-2 text-sm text-gray-600"
        >
          <p className="font-semibold">Categories:</p>
          <ul className="list-disc pl-5 space-y-1">
            {tx.categories.map((cat, index) => (
              <li key={index}>
                {cat.category}: {formatCurrency(cat.categoryTotal)}{' '}
                {cat.isNonEssential && <span className="text-xs text-orange-500">(Non-Essential)</span>}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
};

const Pagination = ({ pagination, handlePageChange, isLoading }) => (
  <div className="flex justify-between items-center mt-6 text-sm text-gray-600">
    <span>
      Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalTransactions} items)
    </span>
    <div className="flex gap-2">
      <button
        onClick={() => handlePageChange(pagination.currentPage - 1)}
        disabled={pagination.currentPage <= 1 || isLoading}
        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        onClick={() => handlePageChange(pagination.currentPage + 1)}
        disabled={pagination.currentPage >= pagination.totalPages || isLoading}
        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  </div>
);

const Modal = ({ isOpen, onClose, title, description, error, children }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl backdrop-blur-sm border border-white/20"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
              aria-label="Close modal"
            >
              <IconX size={20} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-4">{description}</p>
          {error && <p className="text-red-500 text-sm mb-3 bg-red-50 p-2 rounded">{error}</p>}
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Main Component
const ExpensesView = () => {
  // State definitions (unchanged)
  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: 'All',
    type: 'all',
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
  const [expandedTransactions, setExpandedTransactions] = useState({});

  // Fetch transactions (unchanged)
  const fetchTransactions = useCallback(async (retryCount = 3, delay = 1000) => {
    setIsLoading(true);
    setError(null);
    const token = getAuthToken();
    if (!token) {
      setError('Authentication token not found. Please log in.');
      setIsLoading(false);
      return;
    }

    const params = {
      ...(filters.startDate && { startDate: filters.startDate }),
      ...(filters.endDate && { endDate: filters.endDate }),
      ...(filters.category !== 'All' && { category: filters.category }),
      ...(filters.type !== 'all' && { type: filters.type }),
    };

    try {
      const paginatedParams = {
        ...params,
        page: pagination.currentPage,
        limit: pagination.limit,
      };
      const paginatedResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
        params: paginatedParams,
      });
      setTransactions(paginatedResponse.data.transactions || []);
      setPagination(prev => ({
        ...prev,
        totalPages: paginatedResponse.data.pagination.totalPages,
        totalTransactions: paginatedResponse.data.pagination.totalTransactions,
        currentPage: paginatedResponse.data.pagination.currentPage,
      }));

      const allResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { ...params, limit: 10000 },
      });
      setAllTransactions(allResponse.data.transactions || []);

      setIsLoading(false);
    } catch (err) {
      if (retryCount > 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchTransactions(retryCount - 1, delay * 2);
      }
      const message = err.code === 'ERR_NETWORK'
        ? 'Unable to connect to the server. Please check if the backend is running on http://localhost:5000.'
        : err.response?.data?.message || 'Failed to load transactions.';
      setError(message);
      setTransactions([]);
      setAllTransactions([]);
      setIsLoading(false);
    }
  }, [filters, pagination.currentPage, pagination.limit]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Handlers (unchanged)
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

  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value, 10);
    setPagination(prev => ({
      ...prev,
      limit: newLimit,
      currentPage: 1,
    }));
  };

  const toggleTransaction = (txId) => {
    setExpandedTransactions(prev => ({
      ...prev,
      [txId]: !prev[txId],
    }));
  };

  // Chart and overview data (unchanged)
  const { areaChartData, pieChartData, categories, overview } = useMemo(() => {
    const debitTransactions = allTransactions.filter(tx => tx.type === 'debit');
    const allCategories = new Set(['All']);
    allTransactions.forEach(tx => {
      if (tx.source === 'billscan' && tx.categories) {
        tx.categories.forEach(cat => allCategories.add(cat.category));
      } else {
        allCategories.add(tx.category);
      }
    });

    const expenseByDateAndCategory = debitTransactions.reduce((acc, tx) => {
      const dateStr = formatDateForDisplay(tx.date);
      if (tx.source === 'billscan' && tx.categories) {
        tx.categories.forEach(cat => {
          if (!acc[dateStr]) acc[dateStr] = {};
          acc[dateStr][cat.category] = (acc[dateStr][cat.category] || 0) + (cat.categoryTotal || 0);
        });
      } else {
        if (!acc[dateStr]) acc[dateStr] = {};
        acc[dateStr][tx.category] = (acc[dateStr][tx.category] || 0) + (tx.amount || 0);
      }
      return acc;
    }, {});

    const areaData = Object.entries(expenseByDateAndCategory)
      .map(([date, categories]) => ({
        date,
        ...categories,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const expenseByCategory = debitTransactions.reduce((acc, tx) => {
      if (tx.source === 'billscan' && tx.categories) {
        tx.categories.forEach(cat => {
          acc[cat.category] = (acc[cat.category] || 0) + (cat.categoryTotal || 0);
        });
      } else {
        acc[tx.category] = (acc[tx.category] || 0) + (tx.amount || 0);
      }
      return acc;
    }, {});
    const pieData = Object.entries(expenseByCategory)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);

    const totalExpenses = debitTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const totalIncome = allTransactions
      .filter(tx => tx.type === 'credit')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const nonEssentialExpenses = debitTransactions.reduce((sum, tx) => {
      if (tx.source === 'billscan' && tx.categories) {
        return sum + tx.categories.reduce((catSum, cat) => cat.isNonEssential ? catSum + (cat.categoryTotal || 0) : catSum, 0);
      }
      return tx.category === 'Junk Food (Non-Essential)' || tx.category === 'Entertainment' || tx.category === 'Dining Out'
        ? sum + (tx.amount || 0)
        : sum;
    }, 0);
    const avgExpense = debitTransactions.length > 0 ? totalExpenses / debitTransactions.length : 0;
    const topCategory = pieData.length > 0
      ? pieData.reduce((max, curr) => curr.value > max.value ? curr : max).name
      : 'N/A';

    return {
      areaChartData: areaData,
      pieChartData: pieData,
      categories: Array.from(allCategories),
      overview: {
        totalExpenses,
        totalIncome,
        nonEssentialExpenses,
        avgExpense,
        topCategory,
        transactionCount: debitTransactions.length,
        incomeCount: allTransactions.filter(tx => tx.type === 'credit').length,
      },
    };
  }, [allTransactions]);

  // Chart rendering (unchanged)
  const ChartComponent = ({ data, title, dataKey, isAreaChart = false }) => {
    const customTooltip = ({ active, payload }) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-white p-2 border border-gray-200 rounded-lg shadow-sm backdrop-blur-sm">
            <p className="font-semibold text-gray-800">{data.name || data.date}</p>
            {isAreaChart ? (
              payload.map(p => (
                <p key={p.name} className="text-sm text-gray-600">{`${p.name}: ${formatCurrency(p.value)}`}</p>
              ))
            ) : (
              <p className="text-sm text-gray-600">{`${title}: ${formatCurrency(data[dataKey])}`}</p>
            )}
          </div>
        );
      }
      return null;
    };

    const categoryColors = {};
    categories.forEach((cat, index) => {
      categoryColors[cat] = COLORS[index % COLORS.length];
    });

    switch (chartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                dataKey={dataKey}
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={categoryColors[entry.name] || COLORS[index % COLORS.length]} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" fontSize={12} stroke="#6b7280" />
              <YAxis fontSize={12} tickFormatter={(value) => `₹${value/1000}k`} stroke="#6b7280" />
              <Tooltip content={customTooltip} />
              <Legend />
              {categories.filter(cat => cat !== 'All').map(cat => (
                <Area
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  name={cat}
                  fill={categoryColors[cat]}
                  fillOpacity={0.3}
                  stroke={categoryColors[cat]}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" type="category" stroke="#6b7280" />
              <YAxis dataKey={dataKey} type="number" name={title} tickFormatter={(value) => `₹${value/1000}k`} stroke="#6b7280" />
              <Tooltip content={customTooltip} />
              <Legend />
              <Scatter name={title} data={data} fill={categoryColors[data[0]?.name] || '#DC2626'} />
            </ScatterChart>
          </ResponsiveContainer>
        );
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={data}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="name" stroke="#6b7280" />
              <PolarRadiusAxis tickFormatter={(value) => `₹${value/1000}k`} stroke="#6b7280" />
              <Tooltip content={customTooltip} />
              <Legend />
              <Radar name={title} dataKey={dataKey} stroke={categoryColors[data[0]?.name] || '#DC2626'} fill={categoryColors[data[0]?.name] || '#DC2626'} fillOpacity={0.6} />
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
                nameKey="name"
                isAnimationActive
                label={{ position: 'right', fill: '#333', fontSize: 12, formatter: (entry) => `${entry.name}: ${formatCurrency(entry.value)}` }}
              >
                {data.map((entry, index) => (
                  <Cell key={`cellcolor-${index}`} fill={categoryColors[entry.name] || COLORS[index % COLORS.length]} />
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
              nameKey="name"
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
                    fill={categoryColors[name] || COLORS[index % COLORS.length]}
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
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis tickFormatter={(value) => `₹${value/1000}k`} stroke="#6b7280" />
              <Tooltip content={customTooltip} />
              <Legend />
              <Bar dataKey={dataKey} name={title} fill={categoryColors[data[0]?.name] || '#3B82F6'} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  // Manual Transaction Handlers (unchanged)
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
      fetchTransactions();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to record transaction.';
      setModalError(errorMessage);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // Scan Transaction Handlers (unchanged)
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
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/billscan`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setIsScanModalOpen(false);
      setScanFile(null);
      fetchTransactions();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to process bill scan.';
      setScanError(errorMessage);
    } finally {
      setIsScanning(false);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6', '#F97316', '#22D3EE', '#F43F5E', '#4B5563'];

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen font-sans">
      <Header
        setShowFilters={setShowFilters}
        showFilters={showFilters}
        setIsManualTxModalOpen={setIsManualTxModalOpen}
        setIsScanModalOpen={setIsScanModalOpen}
      />

      {/* Overview Section */}
      {!isLoading && !error && allTransactions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Transaction Overview</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <OverviewCard
              title="Total Expenses"
              value={formatCurrency(overview.totalExpenses)}
              color="text-blue-600"
              gradient="from-blue-50 to-blue-100"
            />
            <OverviewCard
              title="Total Income"
              value={formatCurrency(overview.totalIncome)}
              color="text-green-600"
              gradient="from-green-50 to-green-100"
            />
            <OverviewCard
              title="Non-Essential Expenses"
              value={formatCurrency(overview.nonEssentialExpenses)}
              color="text-red-600"
              gradient="from-red-50 to-red-100"
            />
            <OverviewCard
              title="Average Expense"
              value={formatCurrency(overview.avgExpense)}
              color="text-green-600"
              gradient="from-green-50 to-green-100"
            />
            <OverviewCard
              title="Top Category"
              value={overview.topCategory}
              color="text-purple-600"
              gradient="from-purple-50 to-purple-100"
            />
            <OverviewCard
              title="Total Transactions"
              value={overview.transactionCount + overview.incomeCount}
              color="text-orange-600"
              gradient="from-orange-50 to-orange-100"
            />
          </div>
        </motion.div>
      )}

      {/* Filters Section */}
      <AnimatePresence>
        {showFilters && (
          <FilterPanel
            filters={filters}
            handleFilterChange={handleFilterChange}
            categories={categories}
            pagination={pagination}
            handleLimitChange={handleLimitChange}
          />
        )}
      </AnimatePresence>

      {/* Chart Type Selector */}
      {!isLoading && !error && allTransactions.length > 0 && (
        <ChartSelector chartType={chartType} setChartType={setChartType} />
      )}

      {/* Loading and Error States */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex justify-center items-center py-10"
        >
          <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
          <p className="ml-3 text-gray-600">Loading transactions...</p>
        </motion.div>
      )}
      {error && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center flex items-center justify-center gap-2"
        >
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Charts */}
      {!isLoading && !error && allTransactions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"
        >
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Expenses Over Time</h3>
            <ChartComponent data={areaChartData} title="Expenses" dataKey="amount" isAreaChart={true} />
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Expenses by Category</h3>
            <ChartComponent data={pieChartData} title="Expenses" dataKey="value" />
          </div>
        </motion.div>
      )}

      {/* Transaction List */}
      {!isLoading && !error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 backdrop-blur-sm"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Transaction History</h3>
          {transactions.length > 0 ? (
            <>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {transactions.map(tx => (
                  <TransactionCard
                    key={tx._id}
                    tx={tx}
                    toggleTransaction={toggleTransaction}
                    expandedTransactions={expandedTransactions}
                  />
                ))}
              </div>
              <Pagination
                pagination={pagination}
                handlePageChange={handlePageChange}
                isLoading={isLoading}
              />
            </>
          ) : (
            <p className="text-gray-500 text-center py-10">No transactions found matching your filters.</p>
          )}
        </motion.div>
      )}

      {/* Manual Transaction Modal */}
      <Modal
        isOpen={isManualTxModalOpen}
        onClose={() => setIsManualTxModalOpen(false)}
        title="Add Manual Transaction"
        description="Record a transaction (e.g., expense or income)."
        error={modalError}
      >
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Type *:</span>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="type"
                value="debit"
                checked={manualTxData.type === 'debit'}
                onChange={handleManualFormChange}
                required
                className="h-4 w-4 text-blue-500 focus:ring-blue-500"
              />
              Debit
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="type"
                value="credit"
                checked={manualTxData.type === 'credit'}
                onChange={handleManualFormChange}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500"
              />
              Credit
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
              className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
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
              className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
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
              className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
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
              className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmittingManual}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-colors duration-200 ${
              isSubmittingManual ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isSubmittingManual && <Loader2 className="animate-spin h-5 w-5" />}
            {isSubmittingManual ? 'Recording...' : 'Record Transaction'}
          </button>
        </form>
      </Modal>

      {/* Scan Bill Modal */}
      <Modal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        title="Scan Bill"
        description="Upload an image or PDF of a bill to extract transaction details."
        error={scanError}
      >
        <form onSubmit={handleScanSubmit} className="space-y-4">
          <div>
            <label htmlFor="billImage" className="block text-sm font-medium text-gray-700 mb-1">Upload Bill *</label>
            <input
              id="billImage"
              type="file"
              accept="image/*,application/pdf"
              onChange={handleScanFileChange}
              required
              className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
            />
          </div>
          <button
            type="submit"
            disabled={isScanning}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-colors duration-200 ${
              isScanning ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isScanning && <Loader2 className="animate-spin h-5 w-5" />}
            {isScanning ? 'Scanning...' : 'Scan Bill'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default ExpensesView;