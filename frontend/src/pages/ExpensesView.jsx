import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useFinancial } from '../context/FinancialContext';
import PeriodHeader from '../components/PeriodHeader';
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
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ArrowLeft, Trash2,
  TrendingUp, TrendingDown, Clock, CheckCircle2, Eye, Plus, Pause, Play, Activity
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
const OverviewCard = ({ title, value, color, icon: Icon }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -2 }}
    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4"
  >
    <div className={`p-3 rounded-lg bg-${color}-50 text-${color}-600`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
      <p className="text-xl font-bold text-gray-900">{formatCurrency(value)}</p>
    </div>
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

const TransactionCard = ({ tx, toggleTransaction, expandedTransactions, handleDelete }) => {
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
          {tx.source === 'billscan' && <span className="text-[9px] sm:text-[10px] text-ledger-primary">(Scanned)</span>}
          {amountMismatch && (
            <p className="text-[9px] sm:text-[10px] text-red-500">
              (Category totals {formatCurrency(categoriesSum)} ≠ {formatCurrency(tx.amount)})
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className={`text-xs sm:text-sm font-semibold text-right ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
            {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('Are you sure you want to delete this transaction?')) handleDelete(tx._id);
            }}
            className="text-gray-400 hover:text-red-500 p-1"
            aria-label="Delete transaction"
          >
            <Trash2 size={14} />
          </button>
        </div>
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
const NotificationPopup = ({ message, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    className="fixed bottom-4 right-4 bg-red-50/80 text-red-600 rounded-lg p-4 shadow-lg border border-red-100 max-w-sm z-50"
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
  const { data, loading: isLoading, error, filters: globalFilters, updateFilters, refreshData, totals } = useFinancial();

  // State definitions (Keep only view-specific state)
  const [chartType, setChartType] = useState('bar');
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
  const [scanType, setScanType] = useState('bill');
  const [unknownTransactions, setUnknownTransactions] = useState([]);
  const [isUnknownModalOpen, setIsUnknownModalOpen] = useState(false);
  const [expandedTransactions, setExpandedTransactions] = useState({});
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [recurringList, setRecurringList] = useState([]);
  const [isAddingRecurring, setIsAddingRecurring] = useState(false);
  const [newRecurringData, setNewRecurringData] = useState({
    amount: '',
    category: '',
    frequency: 'monthly',
    description: '',
    isEssential: true
  });

  // Derived data
  const transactions = data?.transactions || [];
  const allTransactions = data?.transactions || [];
  const budgets = data?.budgets || [];

  // Local Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: 10,
  });

  // Handlers
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    updateFilters({ [name]: value });
  };

  const handlePageChange = (newPage) => {
    const totalPagesCount = Math.ceil(transactions.length / pagination.limit);
    if (newPage >= 1 && newPage <= totalPagesCount) {
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
          <div className="bg-white/95 p-2 border border-gray-100 rounded-md shadow-md ">
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
                tickFormatter={(value) => `₹${value / 1000}k`}
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
                tickFormatter={(value) => `₹${value / 1000}k`}
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
                tickFormatter={(value) => `₹${value / 1000}k`}
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
                tickFormatter={(value) => `₹${value / 1000}k`}
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
      const response = await api.post('/api/transactions', payload);
      setIsManualTxModalOpen(false);
      setManualTxData({
        type: 'debit',
        amount: '',
        category: '',
        date: formatDateForInput(new Date()),
        description: '',
      });
      if (response.data.notification) {
        setNotificationMessage(response.data.notification.message);
        setShowNotificationPopup(true);
        // setTimeout(() => setShowNotificationPopup(false), 7000); // Auto-close after 5 seconds
      }
      await refreshData();
      setTimeout(() => setShowNotificationPopup(false), 7000);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to record transaction.';
      console.log(err);
      setModalError(errorMessage);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
      const token = getAuthToken();
      await api.delete(`/api/transactions/${id}`);
      setNotificationMessage('Transaction deleted successfully');
      setShowNotificationPopup(true);
      setTimeout(() => setShowNotificationPopup(false), 3000);
      fetchTransactions();
    } catch (err) {
      console.error("Failed to delete transaction", err);
      setNotificationMessage('Failed to delete transaction');
      setShowNotificationPopup(true);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL transactions? This cannot be undone.')) return;

    try {
      const token = getAuthToken();
      await api.delete('/api/transactions/all/delete');
      setNotificationMessage('All transactions deleted successfully');
      setShowNotificationPopup(true);
      setTimeout(() => setShowNotificationPopup(false), 3000);
      fetchTransactions();
    } catch (err) {
      console.error("Failed to delete all transactions", err);
      setNotificationMessage('Failed to delete all transactions');
      setShowNotificationPopup(true);
    }
  };

  // Recurring Expense Handlers
  const fetchRecurringExpenses = async () => {
    try {
      const response = await api.get('/api/recurring');
      setRecurringList(response.data);
    } catch (err) {
      console.error('Failed to fetch recurring expenses', err);
    }
  };

  const handleAddRecurring = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/recurring', newRecurringData);
      setNewRecurringData({ amount: '', category: '', frequency: 'monthly', description: '', isEssential: true });
      setIsAddingRecurring(false);
      fetchRecurringExpenses();
      refreshData();
    } catch (err) {
      console.error('Failed to add recurring expense', err);
    }
  };

  const handleDeleteRecurring = async (id) => {
    if (!window.confirm('Delete this recurring payment?')) return;
    try {
      await api.delete(`/api/recurring/${id}`);
      fetchRecurringExpenses();
      refreshData();
    } catch (err) {
      console.error('Failed to delete recurring expense', err);
    }
  };

  const toggleRecurringStatus = async (item) => {
    const newStatus = item.status === 'active' ? 'paused' : 'active';
    try {
      await api.put(`/api/recurring/${item._id}`, { status: newStatus });
      fetchRecurringExpenses();
      refreshData();
    } catch (err) {
      console.error('Failed to update recurring status', err);
    }
  };

  useEffect(() => {
    if (isRecurringModalOpen) {
      fetchRecurringExpenses();
    }
  }, [isRecurringModalOpen]);

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
    formData.append('scanType', scanType);

    try {
      const response = await api.post('/api/billscan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setIsScanModalOpen(false);
      setScanFile(null);
      setScanType('bill');

      if (response.data.type === 'statement' && response.data.transactions) {
        const unknown = response.data.transactions.filter(tx => tx.category === 'Unknown');
        if (unknown.length > 0) {
          setUnknownTransactions(unknown);
          setIsUnknownModalOpen(true);
        }
      }

      await refreshData();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to process bill scan.';
      setScanError(errorMessage);
    } finally {
      setIsScanning(false);
    }
  };

  const handleUpdateUnknownCategory = async (txId, newCategory) => {
    try {
      const token = getAuthToken();
      await api.put(`/api/transactions/${txId}`, { category: newCategory });

      setUnknownTransactions(prev => prev.filter(tx => tx._id !== txId));
      if (unknownTransactions.length <= 1) {
        setIsUnknownModalOpen(false);
        await refreshData();
      }
    } catch (err) {
      console.error("Failed to update category", err);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6', '#F97316', '#22D3EE', '#F43F5E', '#4B5563'];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 md:px-8 lg:px-12 font-sans overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-1">Financial Analysis</h1>
            <p className="text-gray-500 font-medium">Detailed tracking and recurring management</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <PeriodHeader />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2.5 rounded-xl border transition-all ${showFilters
                  ? 'bg-ledger-primary border-indigo-500 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <Filter size={18} />
              </button>
              <button
                onClick={() => setIsScanModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold shadow-sm"
              >
                <Eye size={18} className="text-indigo-500" />
                <span className="hidden sm:inline">Scan Receipt</span>
              </button>
              <button
                onClick={() => setIsManualTxModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold shadow-sm"
              >
                <Plus size={18} />
                <span>Add Expense</span>
              </button>
            </div>
          </div>
        </header>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <OverviewCard
            title="Total Income"
            value={totals.income}
            color="emerald"
            icon={TrendingUp}
          />
          <OverviewCard
            title="Total Expenses"
            value={totals.expenses}
            color="rose"
            icon={TrendingDown}
          />
          <OverviewCard
            title="Net Savings"
            value={totals.savings}
            color="indigo"
            icon={CheckCircle2}
          />
          <OverviewCard
            title="Non-Essential"
            value={totals.nonEssential}
            color="amber"
            icon={AlertTriangle}
          />
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <FilterPanel
              filters={globalFilters}
              handleFilterChange={handleFilterChange}
              categories={categories}
              pagination={pagination}
              handleLimitChange={handleLimitChange}
            />
          )}
        </AnimatePresence>

        {isLoading && data === null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24"
          >
            <Loader2 className="animate-spin h-10 w-10 text-blue-500 mb-4" />
            <p className="text-slate-400 font-medium tracking-wide">Syncing data...</p>
          </motion.div>
        )}
        {
          error && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-5 h-5" />
              <span className="text-xs sm:text-sm">{error}</span>
            </motion.div>
          )
        }

        {/* Charts and Recurring Payments */}
        {!isLoading && !error && allTransactions.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">Spending Trend</h3>
                <ChartComponent data={areaChartData} title="Expenses" dataKey="amount" isAreaChart={true} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">Category Allocation</h3>
                <ChartComponent data={pieChartData} title="Expenses" dataKey="value" />
              </motion.div>
            </div>

            {/* Recurring Payments Section */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Recurring</h3>
                <button
                  onClick={() => setIsRecurringModalOpen(true)}
                  className="text-xs text-ledger-primary font-semibold hover:underline"
                >
                  Manage
                </button>
              </div>
              <div className="space-y-4">
                {data?.upcomingRecurring?.length > 0 ? (
                  data.upcomingRecurring.map(item => (
                    <div key={item._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div>
                        <p className="text-sm font-bold text-gray-900 capitalize">{item.category}</p>
                        <p className="text-[10px] text-gray-500 uppercase font-medium">{item.frequency} • {formatDateForDisplay(item.nextOccurrence)}</p>
                      </div>
                      <p className="text-sm font-bold text-rose-600">-{formatCurrency(item.amount)}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Clock size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-xs text-gray-500">No upcoming recurring payments</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Transaction List */}
        {!isLoading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-12"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
              <div className="text-gray-500 text-sm font-medium">
                Showing {pagination.currentPage} of {Math.ceil(transactions.length / pagination.limit)} pages
              </div>
            </div>
            {transactions.length > 0 ? (
              <>
                <div className="space-y-2">
                  {(allTransactions.slice((pagination.currentPage - 1) * pagination.limit, pagination.currentPage * pagination.limit)).map((tx, index) => (
                    <TransactionCard
                      key={tx._id}
                      tx={tx}
                      toggleTransaction={toggleTransaction}
                      expandedTransactions={expandedTransactions}
                      handleDelete={handleDeleteTransaction}
                    />
                  ))}
                </div>
                <div className="flex justify-between items-center mt-6">
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1.5"
                  >
                    <Trash2 size={14} /> Clear History
                  </button>
                  <Pagination
                    pagination={{
                      ...pagination,
                      totalPages: Math.ceil(transactions.length / pagination.limit),
                      totalTransactions: transactions.length
                    }}
                    handlePageChange={handlePageChange}
                    isLoading={isLoading}
                  />
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-sm italic">No records found for this period.</p>
              </div>
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
              className="fixed inset-0 h-screen w-screen flex items-center justify-center z-50 p-4 bg-black/40 overflow-auto"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white/90 rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] shadow-xl  border border-gray-100/50 overflow-auto"
              >
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800">Add Expense</h3>
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
                    {isSubmittingManual ? 'Saving...' : 'Add Expense'}
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
              className="fixed inset-0 h-screen w-screen flex items-center justify-center z-50 p-4 bg-black/40 overflow-auto"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white/90 rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] shadow-xl  border border-gray-100/50 overflow-auto"
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
                <p className="text-[11px] sm:text-xs text-gray-500 mb-3 sm:mb-4">Upload an image or PDF to extract transaction details.</p>
                {scanError && <p className="text-red-500 text-[11px] sm:text-xs mb-3 bg-red-50/80 p-2 rounded">{scanError}</p>}
                <form onSubmit={handleScanSubmit} className="space-y-3 sm:space-y-4">
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="scanType"
                        value="bill"
                        checked={scanType === 'bill'}
                        onChange={(e) => setScanType(e.target.value)}
                        className="mr-2"
                      />
                      Single Bill
                    </label>
                    <label className="flex items-center text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="scanType"
                        value="statement"
                        checked={scanType === 'statement'}
                        onChange={(e) => setScanType(e.target.value)}
                        className="mr-2"
                      />
                      Bank Statement
                    </label>
                  </div>
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
        {/* Unknown Categories Modal */}
        <AnimatePresence>
          {isUnknownModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 h-screen w-screen flex items-center justify-center z-50 p-4 bg-black/40 overflow-auto"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white/90 rounded-xl p-4 sm:p-6 w-full max-w-lg max-h-[90vh] shadow-xl  border border-gray-100/50 overflow-auto"
              >
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800">Uncategorized Transactions</h3>
                  <button
                    onClick={() => setIsUnknownModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 p-1"
                  >
                    <IconX size={20} />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  We couldn't categorize the following transactions. Please select a category for them.
                </p>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                  {unknownTransactions.map(tx => (
                    <div key={tx._id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{tx.description}</p>
                          <p className="text-xs text-gray-500">{formatDateForDisplay(tx.date)}</p>
                        </div>
                        <p className={`text-sm font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <select
                          className="flex-1 p-2 text-xs border border-gray-300 rounded-md"
                          onChange={(e) => {
                            if (e.target.value) handleUpdateUnknownCategory(tx._id, e.target.value)
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>Select Category</option>
                          {categories.filter(c => c !== 'All' && c !== 'Unknown').map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recurring Management Modal */}
        <AnimatePresence>
          {isRecurringModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 h-screen w-screen flex items-center justify-center z-50 p-4 bg-black/40 overflow-auto"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Manage Recurring Payments</h3>
                    <p className="text-sm text-gray-500">View and manage your automated transactions</p>
                  </div>
                  <button onClick={() => setIsRecurringModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                    <IconX size={20} className="text-gray-500" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                  {/* Add New Section */}
                  {!isAddingRecurring ? (
                    <button
                      onClick={() => setIsAddingRecurring(true)}
                      className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 font-medium hover:border-indigo-300 hover:text-ledger-primary transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={18} />
                      Add New Recurring Payment
                    </button>
                  ) : (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      onSubmit={handleAddRecurring}
                      className="bg-ledger-primary-light/50 p-4 rounded-xl border border-blue-100 space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category</label>
                          <select
                            required
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-ledger-primary/20 text-sm"
                            value={newRecurringData.category}
                            onChange={(e) => setNewRecurringData({ ...newRecurringData, category: e.target.value })}
                          >
                            <option value="">Select Category</option>
                            {categories.filter(c => c !== 'All').map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Amount (₹)</label>
                          <input
                            type="number"
                            required
                            placeholder="0.00"
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-ledger-primary/20 text-sm"
                            value={newRecurringData.amount}
                            onChange={(e) => setNewRecurringData({ ...newRecurringData, amount: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Frequency</label>
                          <select
                            required
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-ledger-primary/20 text-sm"
                            value={newRecurringData.frequency}
                            onChange={(e) => setNewRecurringData({ ...newRecurringData, frequency: e.target.value })}
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Type</label>
                          <div className="flex gap-4 p-2.5">
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newRecurringData.isEssential}
                                onChange={(e) => setNewRecurringData({ ...newRecurringData, isEssential: e.target.checked })}
                                className="w-4 h-4 rounded text-ledger-primary focus:ring-ledger-primary/20"
                              />
                              Essential Expense
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 justify-end mt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingRecurring(false)}
                          className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2 bg-ledger-primary text-white rounded-lg text-sm font-bold shadow-sm hover:bg-ledger-primary-hover transition-all"
                        >
                          Save Recurring
                        </button>
                      </div>
                    </motion.form>
                  )}

                  {/* List Section */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Clock size={16} className="text-gray-400" />
                      Active Subscriptions
                    </h4>
                    {recurringList.length > 0 ? (
                      recurringList.map(item => (
                        <div key={item._id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-gray-200 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${item.status === 'active' ? 'bg-ledger-primary-light text-ledger-primary' : 'bg-gray-100 text-gray-400'}`}>
                              <Activity size={18} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-gray-900 capitalize">{item.category}</p>
                                {item.status === 'paused' && (
                                  <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-bold uppercase">Paused</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 uppercase tracking-tight">{item.frequency} • Next: {formatDateForDisplay(item.nextOccurrence)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold text-gray-900">{formatCurrency(item.amount)}</p>
                              <p className={`text-[10px] font-bold ${item.isEssential ? 'text-green-600' : 'text-orange-500'}`}>
                                {item.isEssential ? 'ESSENTIAL' : 'LIFESTYLE'}
                              </p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => toggleRecurringStatus(item)}
                                className={`p-2 rounded-lg hover:bg-gray-50 ${item.status === 'active' ? 'text-gray-400 hover:text-amber-500' : 'text-amber-500 hover:text-amber-600'}`}
                                title={item.status === 'active' ? 'Pause' : 'Resume'}
                              >
                                {item.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                              </button>
                              <button
                                onClick={() => handleDeleteRecurring(item._id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-lg"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
                        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No recurring payments set up yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notification Popup */}
        <AnimatePresence>
          {showNotificationPopup && (
            <NotificationPopup
              message={notificationMessage}
              onClose={() => setShowNotificationPopup(false)}
            />
          )}
        </AnimatePresence>
      </div >
    </div>
  );
};

export default ExpensesView;