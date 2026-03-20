import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useFinancial } from '../context/FinancialContext';
import {
  COMMON_AXIS_PROPS,
  COMMON_TOOLTIP_PROPS,
  CHART_COLORS,
  formatCurrencyCompact,
  formatDateChart
} from '../utils/chartStyles';
import { useFamily } from '../context/FamilyContext';
import api from '../api/axios';
import PeriodHeader from '../components/PeriodHeader';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  FunnelChart, Funnel, Treemap, LabelList
} from 'recharts';
import {
  FileText, Loader2, AlertTriangle, PlusCircle, Filter, BarChart2, PieChart as PieIcon,
  AreaChart as AreaIcon, ScatterChart as ScatterIcon, Activity as RadarIcon,
  Filter as FunnelIcon, LayoutGrid as TreemapIcon, ChevronLeft, ChevronRight, Brain, Trophy, Users, Shield, X as IconX
} from 'lucide-react';

// Variants for animations
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

// Helper Functions
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₹0.00';
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const HomeView = React.memo(({ setActiveTab = () => console.warn('setActiveTab not provided.') }) => {
  const { data, loading: isLoading, error, totals, refreshData } = useFinancial();
  const { group, hasGroup, familyFinancialData } = useFamily();
  const [chartType, setChartType] = useState('area');
  const [showFilters, setShowFilters] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanFile, setScanFile] = useState(null);
  const [scanError, setScanError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState('bill');
  const [unknownTransactions, setUnknownTransactions] = useState([]);
  const [isUnknownModalOpen, setIsUnknownModalOpen] = useState(false);

  // Derived data
  const transactions = useMemo(() => data?.transactions || [], [data]);
  const budgets = useMemo(() => data?.budgets || [], [data]);
  const summaryData = useMemo(() => ({
    totalExpenses: totals.expenses,
    totalIncome: totals.income,
    netSavings: totals.savings,
    budgetUsage: totals.budgetUsage,
    topCategory: data?.categoryBreakdown?.[0]?.category || 'N/A'
  }), [totals, data]);

  // Simplified Chart and Overview Data using Backend-Aggregated Values
  const {
    expenseOverTimeData,
    expenseCategoryData,
    budgetCategoryData,
    blendedChartData,
    categories,
    overview,
  } = useMemo(() => {
    const trend = data?.trendData || [];
    const expenseCategory = data?.categoryBreakdown || [];
    const expenseBudgets = budgets.filter(b => b.type === 'expense');

    // Categories list for potential filters
    const currentCategories = ['All', ...new Set([
      ...expenseCategory.map(c => c.name),
      ...budgets.map(b => b.category)
    ])];

    // Expenses Over Time (Aggregated by backend)
    const expenseOverTime = trend.map(t => ({
      date: formatDateChart(t.date),
      amount: t.amount,
      rawDate: t.date
    })).sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));

    // Expense Categories (Pre-aggregated by backend)
    const budgetCategory = expenseBudgets.reduce((acc, b) => {
      acc[b.category] = (acc[b.category] || 0) + b.amount;
      return acc;
    }, {});

    const budgetCategoryList = Object.entries(budgetCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Blended data for Comparison
    const allDates = [...new Set([
      ...trend.map(t => formatDateChart(t.date)),
      ...expenseBudgets.map(b => formatDateChart(b.createdAt))
    ])].sort((a, b) => new Date(a) - new Date(b));

    // Map trend to display dates for lookup
    const trendMap = trend.reduce((acc, t) => {
      acc[formatDateChart(t.date)] = t.amount;
      return acc;
    }, {});

    const budgetByDateMap = expenseBudgets.reduce((acc, b) => {
      const date = formatDateChart(b.createdAt);
      acc[date] = (acc[date] || 0) + b.amount;
      return acc;
    }, {});

    const blendedData = allDates.map(date => ({
      date,
      expense: trendMap[date] || 0,
      budget: budgetByDateMap[date] || 0,
    }));

    const totalExpenses = totals.expenses;
    const totalBudget = expenseBudgets.reduce((sum, b) => sum + b.amount, 0);
    const avgExpense = transactions.length > 0 ? totalExpenses / transactions.length : 0;
    const topCategory = expenseCategory.length > 0 ? expenseCategory[0].name : 'N/A';

    return {
      expenseOverTimeData: expenseOverTime,
      expenseCategoryData: expenseCategory,
      budgetCategoryData: budgetCategoryList,
      blendedChartData: blendedData,
      categories: currentCategories,
      overview: {
        totalExpenses,
        avgExpense,
        totalBudget,
        topCategory,
        transactionCount: data?.transactions?.length || 0, // This is count of the list, fine for overview
        budgetCount: expenseBudgets.length,
      },
    };
  }, [data, totals, budgets, transactions.length]);

  // Expanded Handlers for Scanning
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

    const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
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

  // Chart Component (unchanged)
  const ChartComponent = React.memo(({ data, title, dataKey, nameKey = 'name', isBlended = false }) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-[300px] flex items-center justify-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-400 text-sm">No data available for the selected period</p>
        </div>
      );
    }

    return (
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {isBlended ? (
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.1} />
                  <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS[1]} stopOpacity={0.1} />
                  <stop offset="95%" stopColor={CHART_COLORS[1]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis
                dataKey={nameKey}
                {...COMMON_AXIS_PROPS}
                tickFormatter={formatDateChart}
              />
              <YAxis
                {...COMMON_AXIS_PROPS}
                tickFormatter={formatCurrencyCompact}
              />
              <Tooltip {...COMMON_TOOLTIP_PROPS} />
              <Area
                type="monotone"
                dataKey="expense"
                stroke={CHART_COLORS[0]}
                fillOpacity={1}
                fill="url(#colorExpense)"
                name="Expenses"
              />
              <Area
                type="monotone"
                dataKey="budget"
                stroke={CHART_COLORS[1]}
                fillOpacity={1}
                fill="url(#colorBudget)"
                name="Budget"
              />
              <Legend />
            </AreaChart>
          ) : (
            <BarChart data={data} layout={nameKey === 'name' ? 'vertical' : 'horizontal'}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              {nameKey === 'name' ? (
                <>
                  <XAxis type="number" {...COMMON_AXIS_PROPS} tickFormatter={formatCurrencyCompact} />
                  <YAxis
                    type="category"
                    dataKey={nameKey}
                    {...COMMON_AXIS_PROPS}
                    width={100}
                  />
                </>
              ) : (
                <>
                  <XAxis
                    dataKey={nameKey}
                    {...COMMON_AXIS_PROPS}
                    tickFormatter={formatDateChart}
                  />
                  <YAxis
                    {...COMMON_AXIS_PROPS}
                    tickFormatter={formatCurrencyCompact}
                  />
                </>
              )}
              <Tooltip {...COMMON_TOOLTIP_PROPS} />
              <Bar
                dataKey={dataKey}
                fill={CHART_COLORS[0]}
                radius={[0, 4, 4, 0]}
                name="Amount"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-6 md:space-y-8 animate-pulse">
        {/* Action Buttons Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="relative overflow-hidden p-4 md:p-6 rounded-2xl bg-gray-100">
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-7 h-7 bg-gray-200 rounded-lg" />
                <div className="h-3 w-16 bg-gray-200 rounded" />
              </div>
              <div className="absolute inset-0 bg-shimmer animate-shimmer" />
            </div>
          ))}
        </div>
        {/* Overview Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="relative overflow-hidden p-4 md:p-5 rounded-2xl bg-gray-100 border border-gray-100/80">
              <div className="space-y-3">
                <div className="h-3 w-24 bg-gray-200 rounded" />
                <div className="h-6 w-32 bg-gray-200 rounded" />
              </div>
              <div className="absolute inset-0 bg-shimmer animate-shimmer" />
            </div>
          ))}
        </div>
        {/* Charts Skeleton */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-5 md:p-6 space-y-6">
          <div className="h-5 w-40 bg-gray-200 rounded" />
          <div className="relative overflow-hidden h-[300px] bg-gray-100 rounded-xl">
            <div className="absolute left-8 top-4 bottom-8 w-px bg-gray-200" />
            <div className="absolute left-8 right-4 bottom-8 h-px bg-gray-200" />
            <div className="absolute bottom-8 left-12 right-8 flex items-end gap-3 h-3/4 px-2">
              {[60, 80, 45, 90, 55, 70, 40].map((h, i) => (
                <div key={i} className="flex-1 bg-gray-200 rounded-t" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="absolute inset-0 bg-shimmer animate-shimmer" />
          </div>
        </div>
        {/* Recent Transactions Skeleton */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-5 md:p-6 space-y-4">
          <div className="h-5 w-36 bg-gray-200 rounded" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="relative overflow-hidden p-4 bg-gray-50/60 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 w-2/5 bg-gray-200 rounded" />
                  <div className="h-2.5 w-3/5 bg-gray-200 rounded" />
                  <div className="h-2 w-1/4 bg-gray-200 rounded" />
                </div>
                <div className="h-5 w-24 bg-gray-200 rounded" />
              </div>
              <div className="absolute inset-0 bg-shimmer animate-shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 text-center p-4">
        <AlertTriangle className="text-red-500 w-12 h-12" />
        <p className="text-red-600 font-medium">{error}</p>
        <button
          onClick={refreshData}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Action Buttons */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4"
      >
        <motion.button
          variants={cardVariants}
          whileHover="hover"
          onClick={() => setIsScanModalOpen(true)}
          className="p-4 md:p-6 rounded-2xl shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white flex flex-col items-center justify-center transition-all hover:shadow-lg hover:scale-[1.02]"
        >
          <FileText className="w-7 h-7 mb-2" />
          <p className="text-sm md:text-base font-medium">Scan Bill</p>
        </motion.button>

        <motion.button
          variants={cardVariants}
          whileHover="hover"
          onClick={() => setActiveTab('gamification')}
          className="p-4 md:p-6 rounded-2xl shadow-md bg-gradient-to-br from-green-500 to-emerald-600 text-white flex flex-col items-center justify-center transition-all hover:shadow-lg hover:scale-[1.02]"
        >
          <Trophy className="w-7 h-7 mb-2" />
          <p className="text-sm md:text-base font-medium">Gamification</p>
        </motion.button>

        <motion.button
          variants={cardVariants}
          whileHover="hover"
          onClick={() => setActiveTab('compare')}
          className="p-4 md:p-6 rounded-2xl shadow-md bg-gradient-to-br from-purple-500 to-violet-600 text-white flex flex-col items-center justify-center transition-all hover:shadow-lg hover:scale-[1.02]"
        >
          <BarChart2 className="w-7 h-7 mb-2" />
          <p className="text-sm md:text-base font-medium text-center">Compare Budget vs Expenses</p>
        </motion.button>

        <motion.button
          variants={cardVariants}
          whileHover="hover"
          onClick={() => setActiveTab('ai-analysis')}
          className="p-4 md:p-6 rounded-2xl shadow-md bg-gradient-to-br from-orange-500 to-amber-600 text-white flex flex-col items-center justify-center transition-all hover:shadow-lg hover:scale-[1.02]"
        >
          <Brain className="w-7 h-7 mb-2" />
          <p className="text-sm md:text-base font-medium">AI Analysis</p>
        </motion.button>

        <motion.button
          variants={cardVariants}
          whileHover="hover"
          onClick={() => setActiveTab('tax-advisor')}
          className="p-4 md:p-6 rounded-2xl shadow-md bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex flex-col items-center justify-center transition-all hover:shadow-lg hover:scale-[1.02]"
        >
          <Shield className="w-7 h-7 mb-2" />
          <p className="text-sm md:text-base font-medium">Optimize My Taxes</p>
        </motion.button>
      </motion.div>

      {/* Period Header */}
      <div className="flex justify-start">
        <PeriodHeader />
      </div>

      {/* Overview Cards */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
      >
        {[
          { label: 'Total Expenses', value: formatCurrency(overview.totalExpenses), color: 'text-blue-700', bg: 'bg-blue-50/80' },
          { label: 'Total Budget', value: formatCurrency(overview.totalBudget), color: 'text-emerald-700', bg: 'bg-emerald-50/80' },
          { label: 'Top Category', value: overview.topCategory, color: 'text-purple-700', bg: 'bg-purple-50/80', capitalize: true },
          { label: 'Transactions', value: overview.transactionCount, color: 'text-amber-700', bg: 'bg-amber-50/80' },
        ].map((item, index) => (
          <motion.div
            key={item.label}
            variants={cardVariants}
            whileHover="hover"
            className={`p-4 md:p-5 rounded-2xl shadow-sm ${item.bg} border border-gray-100/80`}
            custom={index}
          >
            <p className="text-xs md:text-sm text-gray-600 mb-1">{item.label}</p>
            <p className={`text-lg md:text-xl font-bold ${item.color} ${item.capitalize ? 'capitalize' : ''}`}>
              {item.value}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Family Snapshot Section */}
      {hasGroup && (
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-violet-100/50 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-bl-full -mr-16 -mt-16" />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                  <Users size={20} />
                </div>
                <h3 className="text-xl font-black">{group?.name} Snapshot</h3>
              </div>
              <p className="text-white/70 text-sm font-medium">Your collective financial footprint this month.</p>
            </div>

            <div className="grid grid-cols-2 sm:flex gap-4 sm:gap-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Group Spending</p>
                <p className="text-2xl font-black">{formatCurrency(familyFinancialData?.totalExpense || 0)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Active Budget</p>
                <p className="text-2xl font-black">{formatCurrency(familyFinancialData?.totalBudget || 0)}</p>
              </div>
              <button
                onClick={() => setActiveTab('family-dashboard')}
                className="col-span-2 sm:col-auto bg-white text-violet-700 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-lg active:scale-95"
              >
                Go to Hub
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expenses Insights */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-5 md:p-6"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-3 sm:mb-0">Expenses Insights</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'area', icon: <AreaIcon size={16} /> },
              { value: 'bar', icon: <BarChart2 size={16} /> },
              { value: 'pie', icon: <PieIcon size={16} /> },
              { value: 'treemap', icon: <TreemapIcon size={16} /> },
              { value: 'scatter', icon: <ScatterIcon size={16} /> },
              { value: 'radar', icon: <RadarIcon size={16} /> },
              { value: 'funnel', icon: <FunnelIcon size={16} /> },
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => setChartType(type.value)}
                className={`p-2 rounded-lg transition ${chartType === type.value ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {type.icon}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h4 className="text-base font-semibold text-gray-800 mb-3">Expenses Over Time</h4>
            <ChartComponent
              data={expenseOverTimeData}
              title="Expenses Over Time"
              dataKey="amount"
              nameKey="date"
            />
          </div>

          <div>
            <h4 className="text-base font-semibold text-gray-800 mb-3">Expense Categories</h4>
            <ChartComponent
              data={expenseCategoryData}
              title="Expense Categories"
              dataKey="value"
              nameKey="name"
            />
          </div>
        </div>
      </motion.div>

      {/* Budget Insights */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-5 md:p-6"
      >
        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-5">Budget Insights</h3>
        {/* Budget vs comparison chart often redundant with blendedChartData below */}
        <div>
          <h4 className="text-base font-semibold text-gray-800 mb-3">Budget Categories</h4>
          <ChartComponent
            data={budgetCategoryData}
            title="Budget Categories"
            dataKey="value"
            nameKey="name"
          />
        </div>
      </motion.div>

      {/* Comparison */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-5 md:p-6"
      >
        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-5">Comparison Insights</h3>
        <ChartComponent
          data={blendedChartData}
          title="Expenses vs Budget"
          dataKey="expense"
          nameKey="date"
          isBlended={true}
        />
      </motion.div>

      {/* Expense History */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-5 md:p-6"
      >
        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-5">Recent Expenses</h3>

        {transactions.length > 0 ? (
          <>
            <div className="space-y-3">
              {transactions.slice(0, 10).map((tx, index) => (  // limit to 10 most recent
                <motion.div
                  key={tx._id}
                  custom={index}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  className="p-4 bg-gray-50/60 rounded-xl border border-gray-100"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 capitalize">{tx.category}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{tx.description || '—'}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDateChart(tx.date)}</p>
                      {tx.source && (
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${tx.source === 'manual' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                          {tx.source === 'manual' ? 'Manual' : 'Scanned'}
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-semibold text-red-600 text-right">
                      -{formatCurrency(tx.amount)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {transactions.length > 10 && (
              <p className="text-center text-sm text-gray-500 mt-6">
                Showing 10 most recent of {transactions.length} transactions
              </p>
            )}
          </>
        ) : (
          <p className="text-gray-500 text-center py-12">No expenses recorded in this period.</p>
        )}
      </motion.div>

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
                        <p className="text-xs text-gray-500">{formatDateChart(tx.date)}</p>
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
    </div>
  );
});

export default HomeView;