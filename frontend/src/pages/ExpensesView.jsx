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

const formatDateForMobile = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short'
    });
  } catch (e) { return dateString; }
};

const getAuthToken = () => localStorage.getItem('token');

// Subcomponents
const Header = ({ setShowFilters, showFilters, setIsManualTxModalOpen, setIsScanModalOpen }) => (
  <motion.div
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sticky top-0 bg-white p-2 sm:p-3 rounded-xl shadow-sm z-10"
  >
    <div className="flex items-center gap-2 sm:gap-3">
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-1 sm:gap-2 p-1 sm:p-2 bg-white text-gray-700 rounded-lg shadow-sm hover:bg-gray-100 transition-colors border border-gray-200 min-h-[44px] min-w-[44px]"
        aria-label="Go back"
      >
        <ArrowLeft size={16} />
        <span className="text-sm sm:inline hidden">Back</span>
      </button>
      <h2 className="text-base sm:text-lg font-bold text-gray-900">Transaction Insights</h2>
    </div>
    <div className="flex flex-wrap gap-1 sm:gap-2">
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-1 sm:gap-2 p-1 sm:p-2 bg-white text-gray-700 rounded-lg shadow-sm hover:bg-gray-100 transition-colors border border-gray-200 min-h-[44px] min-w-[44px]"
        aria-label={showFilters ? 'Hide filters' : 'Show filters'}
      >
        <Filter size={16} />
        <span className="text-sm sm:inline">{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
      </button>
      <button
        onClick={() => setIsManualTxModalOpen(true)}
        className="flex items-center gap-1 sm:gap-2 p-1 sm:p-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow-sm hover:from-green-600 hover:to-green-700 transition-colors min-h-[44px] min-w-[44px]"
        aria-label="Add manual transaction"
      >
        <PlusCircle size={16} />
        <span className="text-sm sm:inline">Add Manual</span>
      </button>
      <button
        onClick={() => setIsScanModalOpen(true)}
        className="flex items-center gap-1 sm:gap-2 p-1 sm:p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-sm hover:from-blue-600 hover:to-blue-700 transition-colors min-h-[44px] min-w-[44px]"
        aria-label="Scan bill"
      >
        <PlusCircle size={16} />
        <span className="text-sm sm:inline">Scan Bill</span>
      </button>
    </div>
  </motion.div>
);

const OverviewCard = ({ title, value, color, gradient }) => (
  <motion.div
    variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2 } }, hover: { scale: 1.03 } }}
    initial="hidden"
    animate="visible"
    whileHover="hover"
    className={`p-2 sm:p-3 rounded-xl shadow-md ${gradient} border-2 border-gray-50`}
  >
    <p className="text-[11px] sm:text-xs text-gray-600">{title}</p>
    <p className={`text-sm sm:text-base font-semibold ${color} ${title === 'Top Category' ? 'capitalize' : ''}`}>{value}</p>
  </motion.div>
);

const FilterPanel = ({ filters, handleFilterChange, categories, pagination, handleLimitChange }) => (
  <motion.div
    variants={{ hidden: { height: 0, opacity: 0 }, visible: { height: 'auto', opacity: 1 }, exit: { height: 0, opacity: 0 } }}
    initial="hidden"
    animate="visible"
    exit="exit"
    transition={{ duration: 0.25 }}
    className="bg-white rounded-xl shadow-md p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-100"
  >
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      <div>
        <label htmlFor="startDate" className="block text-[11px] sm:text-xs font-medium text-gray-700 mb-1">Start Date</label>
        <input
          type="date"
          id="startDate"
          name="startDate"
          value={filters.startDate}
          onChange={handleFilterChange}
          className="w-full p-1.5 sm:p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11px] sm:text-xs"
          aria-label="Start date filter"
        />
      </div>
      <div>
        <label htmlFor="endDate" className="block text-[11px] sm:text-xs font-medium text-gray-700 mb-1">End Date</label>
        <input
          type="date"
          id="endDate"
          name="endDate"
          value={filters.endDate}
          onChange={handleFilterChange}
          className="w-full p-1.5 sm:p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11px] sm:text-xs"
          aria-label="End date filter"
        />
      </div>
      <div>
        <label htmlFor="category" className="block text-[11px] sm:text-xs font-medium text-gray-700 mb-1">Category</label>
        <select
          id="category"
          name="category"
          value={filters.category}
          onChange={handleFilterChange}
          className="w-full p-1.5 sm:p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11px] sm:text-xs"
          aria-label="Category filter"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="type" className="block text-[11px] sm:text-xs font-medium text-gray-700 mb-1">Type</label>
        <select
          id="type"
          name="type"
          value={filters.type}
          onChange={handleFilterChange}
          className="w-full p-1.5 sm:p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11px] sm:text-xs"
          aria-label="Transaction type filter"
        >
          <option value="all">All</option>
          <option value="debit">Debit</option>
          <option value="credit">Credit</option>
        </select>
      </div>
      <div>
        <label htmlFor="limit" className="block text-[11px] sm:text-xs font-medium text-gray-700 mb-1">Per Page</label>
        <select
          id="limit"
          name="limit"
          value={pagination.limit}
          onChange={handleLimitChange}
          className="w-full p-1.5 sm:p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11px] sm:text-xs"
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
  <div className="flex flex-wrap gap-1 mb-4 sm:mb-6">
    {[
      { value: 'area', icon: <AreaIcon size={12} /> },
      { value: 'bar', icon: <BarChart2 size={12} /> },
      { value: 'pie', icon: <PieIcon size={12} /> },
      { value: 'treemap', icon: <TreemapIcon size={12} /> },
      { value: 'scatter', icon: <ScatterIcon size={12} /> },
      { value: 'radar', icon: <RadarIcon size={12} /> },
      { value: 'funnel', icon: <FunnelIcon size={12} /> },
    ].map((type) => (
      <button
        key={type.value}
        onClick={() => setChartType(type.value)}
        className={`p-1 rounded-lg text-xs flex items-center min-h-[36px] min-w-[36px] ${chartType === type.value ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
      >
        {type.icon}
      </button>
    ))}
  </div>
);

const TransactionCard = ({ tx, toggleTransaction, expandedTransactions }) => {
  const categoriesSum = tx.source === 'billscan' && tx.categories
    ? tx.categories.reduce((sum, cat) => sum + (cat.categoryTotal || 0), 0)
    : tx.amount;
  const amountMismatch = tx.source === 'billscan' && Math.abs(categoriesSum - tx.amount) > 0.01;
  const isMobile = window.innerWidth < 640;

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, x: -4 }, visible: (i) => ({ opacity: 1, x: 0, transition: { delay: i * 0.04, duration: 0.15 } }) }}
      initial="hidden"
      animate="visible"
      className="p-2 sm:p-3 bg-gray-50 rounded-lg shadow-sm border border-gray-200"
      role="button"
      tabIndex={0}
      onClick={() => tx.source === 'billscan' && toggleTransaction(tx._id)}
      onKeyDown={(e) => e.key === 'Enter' && tx.source === 'billscan' && toggleTransaction(tx._id)}
      aria-expanded={expandedTransactions[tx._id]}
      aria-label={`Transaction: ${tx.category}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs sm:text-sm font-semibold text-gray-800 capitalize">{tx.category}</p>
            {tx.source === 'billscan' && (
              <span className="text-gray-500">
                {expandedTransactions[tx._id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </span>
            )}
          </div>
          <p className="text-[10px] sm:text-xs text-gray-600 truncate">{tx.description || '-'}</p>
          <p className="text-[10px] sm:text-xs text-gray-500">{formatDateForMobile(tx.date)}</p>
          {tx.source === 'manual' && <span className="text-[9px] sm:text-[10px] text-blue-500">(Manual)</span>}
          {tx.source === 'billscan' && <span className="text-[9px] sm:text-[10px] text-purple-500">(Scanned)</span>}
          {amountMismatch && (
            <p className="text-[9px] sm:text-[10px] text-red-500">
              (Category totals {formatCurrency(categoriesSum)} ≠ {formatCurrency(tx.amount)})
            </p>
          )}
        </div>
        <p className={`text-xs sm:text-sm font-semibold text-right ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
          {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
        </p>
      </div>
      {tx.source === 'billscan' && expandedTransactions[tx._id] && tx.categories && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-2 text-[10px] sm:text-xs text-gray-600"
        >
          <p className="font-semibold">Categories:</p>
          <ul className="list-disc pl-4 space-y-1">
            {tx.categories.map((cat, index) => (
              <li key={index}>
                {cat.category}: {formatCurrency(cat.categoryTotal)}{' '}
                {cat.isNonEssential && <span className="text-[9px] sm:text-[10px] text-orange-500">(Non-Essential)</span>}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
};

const Pagination = ({ pagination, handlePageChange, isLoading }) => (
  <div className="flex justify-between items-center mt-3 text-xs">
    <span className="text-gray-600 text-[10px]">
      Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalTransactions} items)
    </span>
    <div className="flex gap-1">
      <button
        onClick={() => handlePageChange(pagination.currentPage - 1)}
        disabled={pagination.currentPage <= 1 || isLoading}
        className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px] min-w-[36px]"
        aria-label="Previous page"
      >
        <ChevronLeft size={12} />
      </button>
      <button
        onClick={() => handlePageChange(pagination.currentPage + 1)}
        disabled={pagination.currentPage >= pagination.totalPages || isLoading}
        className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px] min-w-[36px]"
        aria-label="Next page"
      >
        <ChevronRight size={12} />
      </button>
    </div>
  </div>
);

// Main Component
const ExpensesView = () => {
  // State definitions
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

  // Fetch transactions
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

  // Handlers
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

  // Chart and overview data
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

  // Chart rendering
  const ChartComponent = ({ data, title, dataKey, isAreaChart = false }) => {
    const customTooltip = ({ active, payload }) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-white/95 p-2 border border-gray-100 rounded-md shadow-md backdrop-blur-sm">
            <p className="font-semibold text-gray-800 text-xs">{data.name || data.date}</p>
            {isAreaChart ? (
              payload.map(p => (
                <p key={p.name} className="text-gray-600 text-xs">{`${p.name}: ${formatCurrency(p.value)}`}</p>
              ))
            ) : (
              <p className="text-gray-600 text-xs">{`${title}: ${formatCurrency(data[dataKey])}`}</p>
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

    const isMobile = window.innerWidth < 640;
    const tickFormatter = (value, index) => {
      if (isMobile && isAreaChart && index % 3 !== 0) return '';
      return isMobile && isAreaChart ? formatDateForMobile(value) : value;
    };

    switch (chartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
            <PieChart>
              <Pie
                data={data}
                dataKey={dataKey}
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={isMobile ? 60 : 100}
                label={isMobile ? false : ({ name, value }) => `${name}: ${formatCurrency(value)}`}
                labelLine={isMobile ? false : true}
                isAnimationActive
                animationDuration={400}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={categoryColors[entry.name] || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={customTooltip} />
              <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                fontSize={isMobile ? 10 : 12}
                stroke="#374151"
                angle={isMobile ? -45 : -30}
                textAnchor="end"
                height={isMobile ? 50 : 40}
                tickFormatter={tickFormatter}
              />
              <YAxis
                fontSize={isMobile ? 10 : 12}
                stroke="#374151"
                tickFormatter={(value) => `₹${value/1000}k`}
                width={isMobile ? 40 : 50}
              />
              <Tooltip content={customTooltip} />
              <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
              {categories.filter(cat => cat !== 'All').map(cat => (
                <Area
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  name={cat}
                  fill={categoryColors[cat]}
                  fillOpacity={0.4}
                  stroke={categoryColors[cat]}
                  strokeWidth={2}
                  isAnimationActive
                  animationDuration={400}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
            <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                type="category"
                fontSize={isMobile ? 10 : 12}
                stroke="#374151"
                angle={isMobile ? -45 : -30}
                textAnchor="end"
                height={isMobile ? 50 : 40}
                tickFormatter={tickFormatter}
              />
              <YAxis
                dataKey={dataKey}
                type="number"
                name={title}
                fontSize={isMobile ? 10 : 12}
                stroke="#374151"
                tickFormatter={(value) => `₹${value/1000}k`}
                width={isMobile ? 40 : 50}
              />
              <Tooltip content={customTooltip} />
              <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
              <Scatter name={title} data={data} fill={categoryColors[data[0]?.name] || '#DC2626'} isAnimationActive animationDuration={400} />
            </ScatterChart>
          </ResponsiveContainer>
        );
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
            <RadarChart data={data}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="name" stroke="#374151" fontSize={isMobile ? 10 : 12} />
              <PolarRadiusAxis
                tickFormatter={(value) => `₹${value/1000}k`}
                stroke="#374151"
                fontSize={isMobile ? 10 : 12}
              />
              <Tooltip content={customTooltip} />
              <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
              <Radar
                name={title}
                dataKey={dataKey}
                stroke={categoryColors[data[0]?.name] || '#DC2626'}
                fill={categoryColors[data[0]?.name] || '#DC2626'}
                fillOpacity={0.6}
                isAnimationActive
                animationDuration={400}
              />
            </RadarChart>
          </ResponsiveContainer>
        );
      case 'funnel':
        return (
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
            <FunnelChart>
              <Tooltip content={customTooltip} />
              <Funnel
                data={data}
                dataKey={dataKey}
                nameKey="name"
                isAnimationActive
                animationDuration={400}
                label={{ position: 'right', fill: '#333', fontSize: isMobile ? 10 : 12, formatter: (entry) => `${entry.name}: ${formatCurrency(entry.value)}` }}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={categoryColors[entry.name] || COLORS[index % COLORS.length]} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        );
      case 'treemap':
        return (
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
            <Treemap
              data={data}
              dataKey={dataKey}
              nameKey="name"
              stroke="#fff"
              aspectRatio={4 / 3}
              isAnimationActive
              animationDuration={400}
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
                  {width > (isMobile ? 40 : 60) && height > (isMobile ? 12 : 16) && (
                    <text x={x + 3} y={y + (isMobile ? 10 : 12)} fill="#fff" fontSize={isMobile ? 8 : 10}>
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
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                fontSize={isMobile ? 10 : 12}
                stroke="#374151"
                angle={isMobile ? -45 : -30}
                textAnchor="end"
                height={isMobile ? 50 : 40}
                tickFormatter={tickFormatter}
              />
              <YAxis
                fontSize={isMobile ? 10 : 12}
                stroke="#374151"
                tickFormatter={(value) => `₹${value/1000}k`}
                width={isMobile ? 40 : 50}
              />
              <Tooltip content={customTooltip} />
              <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
              <Bar
                dataKey={dataKey}
                name={title}
                fill={categoryColors[data[0]?.name] || '#3B82F6'}
                isAnimationActive
                animationDuration={400}
              />
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
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 p-2 sm:p-4 lg:p-6 font-sans">
      <Header
        setShowFilters={setShowFilters}
        showFilters={showFilters}
        setIsManualTxModalOpen={setIsManualTxModalOpen}
        setIsScanModalOpen={setIsScanModalOpen}
      />

      {/* Overview Section */}
      {!isLoading && !error && allTransactions.length > 0 && (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
          initial="hidden"
          animate="visible"
          className="mb-4 sm:mb-6"
        >
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Transaction Overview</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            <OverviewCard
              title="Total Expenses"
              value={formatCurrency(overview.totalExpenses)}
              color="text-blue-600"
              gradient="bg-blue-50"
            />
            <OverviewCard
              title="Total Income"
              value={formatCurrency(overview.totalIncome)}
              color="text-green-600"
              gradient="bg-green-50"
            />
            <OverviewCard
              title="Non-Essential Expenses"
              value={formatCurrency(overview.nonEssentialExpenses)}
              color="text-red-600"
              gradient="bg-red-50"
            />
            <OverviewCard
              title="Average Expense"
              value={formatCurrency(overview.avgExpense)}
              color="text-green-600"
              gradient="bg-green-50"
            />
            <OverviewCard
              title="Top Category"
              value={overview.topCategory}
              color="text-purple-600"
              gradient="bg-purple-50"
            />
            <OverviewCard
              title="Total Transactions"
              value={overview.transactionCount + overview.incomeCount}
              color="text-orange-600"
              gradient="bg-orange-50"
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
        <motion.div
          variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-xl shadow-md p-2 sm:p-4 mb-4 sm:mb-6 border border-gray-100"
        >
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Chart Type</h3>
          <ChartSelector chartType={chartType} setChartType={setChartType} />
        </motion.div>
      )}

      {/* Loading and Error States */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-12"
        >
          <Loader2 className="animate-spin h-6 w-6 text-blue-600" />
          <p className="mt-2 text-xs font-medium text-gray-600">Loading transactions...</p>
        </motion.div>
      )}
      {error && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center flex items-center justify-center gap-2"
        >
          <AlertTriangle className="w-5 h-5" />
          <span className="text-xs sm:text-sm">{error}</span>
        </motion.div>
      )}

      {/* Charts */}
      {!isLoading && !error && allTransactions.length > 0 && (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
          initial="hidden"
          animate="visible"
          className="space-y-4 sm:space-y-6 mb-4 sm:mb-6"
        >
          <div className="bg-white rounded-xl shadow-md p-2 sm:p-4 border border-gray-100">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Expenses Over Time</h3>
            <ChartComponent data={areaChartData} title="Expenses" dataKey="amount" isAreaChart={true} />
          </div>
          <div className="bg-white rounded-xl shadow-md p-2 sm:p-4 border border-gray-100">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Expenses by Category</h3>
            <ChartComponent data={pieChartData} title="Expenses" dataKey="value" />
          </div>
        </motion.div>
      )}

      {/* Transaction List */}
      {!isLoading && !error && (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-xl shadow-md p-2 sm:p-4 border border-gray-100"
        >
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Transaction History</h3>
          {transactions.length > 0 ? (
            <>
              <div className="space-y-2">
                {transactions.map((tx, index) => (
                  <TransactionCard
                    key={tx._id}
                    tx={tx}
                    toggleTransaction={toggleTransaction}
                    expandedTransactions={expandedTransactions}
                    custom={index}
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
            <p className="text-gray-500 text-center py-3 text-xs">No transactions found matching your filters.</p>
          )}
        </motion.div>
      )}

      {/* Manual Transaction Modal */}
      <AnimatePresence>
        {isManualTxModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 h-screen w-screen flex items-center justify-center z-50 p-4 bg-black/60 overflow-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white/90 rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] shadow-xl backdrop-blur-sm border border-gray-100/50 overflow-auto"
            >
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">Add Manual Transaction</h3>
                <button
                  onClick={() => setIsManualTxModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <IconX size={20} />
                </button>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 mb-3 sm:mb-4">Record a past transaction (e.g., cash payment).</p>
              {modalError && <p className="text-red-500 text-[11px] sm:text-xs mb-3 bg-red-50/80 p-2 rounded">{modalError}</p>}
              <form onSubmit={handleManualSubmit} className="space-y-3 sm:space-y-4">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <span className="text-[11px] sm:text-sm font-medium text-gray-700">Type *:</span>
                  <label className="flex items-center text-[11px] sm:text-sm">
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
                  <label className="flex items-center text-[11px] sm:text-sm">
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
                  <label htmlFor="amountModal" className="block text-[11px] sm:text-sm font-medium text-gray-700 mb-1">Amount *</label>
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
                    className="w-full p-1.5 sm:p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11px] sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="categoryModal" className="block text-[11px] sm:text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <input
                    id="categoryModal"
                    name="category"
                    type="text"
                    value={manualTxData.category}
                    onChange={handleManualFormChange}
                    required
                    placeholder="e.g., Groceries, Salary"
                    className="w-full p-1.5 sm:p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11px] sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="dateModal" className="block text-[11px] sm:text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    id="dateModal"
                    name="date"
                    type="date"
                    value={manualTxData.date}
                    onChange={handleManualFormChange}
                    required
                    className="w-full p-1.5 sm:p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11px] sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="descriptionModal" className="block text-[11px] sm:text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    id="descriptionModal"
                    name="description"
                    rows="2"
                    value={manualTxData.description}
                    onChange={handleManualFormChange}
                    placeholder="Add a note about the transaction"
                    className="w-full p-1.5 sm:p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11px] sm:text-sm"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingManual}
                  className={`w-full ${isSubmittingManual ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white py-2 rounded-lg transition-colors flex items-center justify-center text-[11px] sm:text-sm font-medium`}
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
            className="fixed inset-0 h-screen w-screen flex items-center justify-center z-50 p-4 bg-black/60 overflow-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white/90 rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] shadow-xl backdrop-blur-sm border border-gray-100/50 overflow-auto"
            >
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">Scan Bill</h3>
                <button
                  onClick={() => setIsScanModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <IconX size={20} />
                </button>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 mb-3 sm:mb-4">Upload an image or PDF of a bill to extract transaction details.</p>
              {scanError && <p className="text-red-500 text-[11px] sm:text-xs mb-3 bg-red-50/80 p-2 rounded">{scanError}</p>}
              <form onSubmit={handleScanSubmit} className="space-y-3 sm:space-y-4">
                <div>
                  <label htmlFor="billImage" className="block text-[11px] sm:text-sm font-medium text-gray-700 mb-1">Upload Bill *</label>
                  <input
                    id="billImage"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleScanFileChange}
                    required
                    className="w-full p-1.5 sm:p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11px] sm:text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isScanning}
                  className={`w-full ${isScanning ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white py-2 rounded-lg transition-colors flex items-center justify-center text-[11px] sm:text-sm font-medium`}
                >
                  {isScanning ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
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

export default ExpensesView;