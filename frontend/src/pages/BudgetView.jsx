import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  FunnelChart, Funnel, Treemap
} from 'recharts';
import {
  Plus, Trash2, X, Filter, BarChart2,
  PieChart as PieIcon, AreaChart as AreaIcon,
  ScatterChart as ScatterIcon, Activity as RadarIcon,
  Filter as FunnelIcon, TrendingUp 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Utility functions
const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const getAuthToken = () => localStorage.getItem('token');

const PREDEFINED_CATEGORIES = [
  'Medicine', 'Groceries', 'Rent', 'Utilities', 'Transport', 'Entertainment',
  'Salary', 'Freelance', 'Investments', 'Education', 'Dining', 'Travel',
  'Insurance', 'Savings', 'Clothing', 'Electronics', 'Health', 'Fitness'
];

const COLORS = ['#4F46E5', '#10B981', '#F43F5E', '#FBBF24', '#6B7280'];

// Key Metrics Component
const KeyMetric = ({ title, value, change, positive = true, isMobile }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ scale: 1.02 }}
    transition={{ duration: 0.3 }}
    className="bg-white p-1 sm:p-2 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all"
  >
    <h3 className={`text-[10px] sm:text-xs font-medium text-gray-600 uppercase tracking-wide`}>{title}</h3>
    <p className={`text-sm sm:text-lg font-bold text-gray-900 mt-0.5 sm:mt-1`}>{value}</p>
    <p className={`text-[10px] sm:text-xs font-medium ${positive ? 'text-green-500' : 'text-red-500'} mt-0.5 sm:mt-1`}>
      {positive ? '↑' : '↓'} {change}
    </p>
  </motion.div>
);

// Error Message Component
const ErrorMessage = ({ message, onClose, isMobile }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="bg-red-50 border-l-4 border-red-500 text-red-600 p-1 sm:p-2 rounded-lg max-w-sm mx-auto relative shadow-sm"
    role="alert"
  >
    <span className={`block text-[10px] sm:text-xs font-medium`}>{message}</span>
    <button
      onClick={onClose}
      className="absolute top-1 sm:top-2 right-1 sm:right-2 text-red-600 hover:text-red-800 transition-colors"
      aria-label="Close error message"
    >
      <X size={12} />
    </button>
  </motion.div>
);

// Chart Type Selector Component
const ChartTypeSelector = ({ chartType, setChartType, isMobile }) => (
  <div className="flex flex-wrap gap-1 p-1 bg-white/90 rounded-lg shadow-sm border border-gray-100">
    {[
      { value: 'bar', icon: <BarChart2 size={10} />, label: 'Bar' },
      { value: 'pie', icon: <PieIcon size={10} />, label: 'Pie' },
      { value: 'treemap', icon: <TrendingUp size={10} />, label: 'Treemap' },
      { value: 'area', icon: <AreaIcon size={10} />, label: 'Area' },
      { value: 'scatter', icon: <ScatterIcon size={10} />, label: 'Scatter' },
      { value: 'radar', icon: <RadarIcon size={10} />, label: 'Radar' },
      { value: 'funnel', icon: <FunnelIcon size={10} />, label: 'Funnel' },
    ].map(({ value, icon, label }) => (
      <motion.button
        key={value}
        onClick={() => setChartType(value)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`flex items-center gap-1 px-1 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
          chartType === value
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
        }`}
      >
        {icon} {label}
      </motion.button>
    ))}
  </div>
);

// Filter Panel Component
const FilterPanel = ({ filter, setFilter, budgets, showFilter, isMobile }) => (
  <AnimatePresence>
    {showFilter && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white/90 p-1 sm:p-2 rounded-lg shadow-sm border border-gray-100"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-1 sm:gap-2">
          {[
            {
              type: 'select',
              value: filter.type,
              onChange: (e) => setFilter({ ...filter, type: e.target.value }),
              options: [
                { value: 'all', label: 'All Types' },
                { value: 'expense', label: 'Expense' },
                { value: 'income', label: 'Income' },
              ],
            },
            {
              type: 'select',
              value: filter.period,
              onChange: (e) => setFilter({ ...filter, period: e.target.value }),
              options: [
                { value: 'all', label: 'All Periods' },
                { value: 'Weekly', label: 'Weekly' },
                { value: 'Monthly', label: 'Monthly' },
                { value: 'Quarterly', label: 'Quarterly' },
                { value: 'Yearly', label: 'Yearly' },
              ],
            },
            {
              type: 'select',
              value: filter.category,
              onChange: (e) => setFilter({ ...filter, category: e.target.value }),
              options: [
                { value: 'all', label: 'All Categories' },
                ...[...new Set(budgets.map(b => b.category))].map(cat => ({ value: cat, label: cat })),
              ],
            },
            {
              type: 'date',
              value: filter.startDate,
              onChange: (e) => setFilter({ ...filter, startDate: e.target.value }),
              placeholder: 'Start Date',
            },
            {
              type: 'date',
              value: filter.endDate,
              onChange: (e) => setFilter({ ...filter, endDate: e.target.value }),
              placeholder: 'End Date',
            },
          ].map((field, index) => (
            <div key={index}>
              {field.type === 'select' ? (
                <select
                  value={field.value}
                  onChange={field.onChange}
                  className={`w-full bg-white/50 border border-gray-200 rounded-lg p-0.5 sm:p-1 text-[10px] sm:text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all shadow-sm`}
                >
                  {field.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="date"
                  value={field.value}
                  onChange={field.onChange}
                  className={`w-full bg-white/50 border border-gray-200 rounded-lg p-0.5 sm:p-1 text-[10px] sm:text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all shadow-sm`}
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Chart Component
const ChartComponent = ({ data, title, color, dataKey, isMobile }) => {
  const customTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 p-1 sm:p-2 rounded-lg shadow-sm border border-gray-100 text-[10px] sm:text-xs">
          <p className="font-semibold text-gray-900">{payload[0].payload.category}</p>
          <p className="text-gray-700">{`${title}: ${formatCurrency(payload[0].value)}`}</p>
          <p className="text-gray-500">{`Period: ${payload[0].payload.period}`}</p>
        </div>
      );
    }
    return null;
  };

  const chartHeight = isMobile ? 150 : 250; // Further reduced height for mobile

  switch (dataKey) {
    case 'pie':
      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <PieChart margin={{ top: 3, right: 3, left: 3, bottom: 3 }}>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={isMobile ? 50 : 80}
              label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
              labelLine={{ stroke: '#e5e7eb' }}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={customTooltip} />
          </PieChart>
        </ResponsiveContainer>
      );
    case 'treemap':
      const getTreemapColor = (value) => {
        if (value >= 10000) return '#4F46E5';
        if (value >= 5000) return '#10B981';
        if (value >= 2000) return '#F43F5E';
        if (value >= 1000) return '#FBBF24';
        return '#6B7280';
      };

      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <Treemap
            data={data}
            dataKey="amount"
            nameKey="category"
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
                  fill={getTreemapColor(value)}
                  stroke="#fff"
                  className="transition-all duration-300"
                />
                {width > (isMobile ? 30 : 60) && height > 15 && (
                  <text x={x + 3} y={y + 10} fill="#fff" fontSize={isMobile ? 6 : 10} fontWeight={500}>
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
    case 'area':
      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart data={data} margin={{ top: 3, right: 3, left: isMobile ? -20 : -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="category" tick={{ fill: '#374151', fontSize: isMobile ? 6 : 10 }} tickMargin={3} />
            <YAxis tick={{ fill: '#374151', fontSize: isMobile ? 6 : 10 }} tickMargin={3} />
            <Tooltip content={customTooltip} />
            <Legend wrapperStyle={{ fontSize: isMobile ? 6 : 10 }} />
            <Area
              type="monotone"
              dataKey="amount"
              name={title}
              fill={color}
              fillOpacity={0.4}
              stroke={color}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    case 'scatter':
      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <ScatterChart margin={{ top: 3, right: 3, left: isMobile ? -20 : -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="category" type="category" tick={{ fill: '#374151', fontSize: isMobile ? 6 : 10 }} tickMargin={3} />
            <YAxis dataKey="amount" type="number" name={title} tick={{ fill: '#374151', fontSize: isMobile ? 6 : 10 }} tickMargin={3} />
            <Tooltip content={customTooltip} />
            <Legend wrapperStyle={{ fontSize: isMobile ? 6 : 10 }} />
            <Scatter name={title} data={data} fill={color} />
          </ScatterChart>
        </ResponsiveContainer>
      );
    case 'radar':
      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <RadarChart data={data} margin={{ top: 3, right: 3, left: 3, bottom: 3 }}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="category" tick={{ fill: '#374151', fontSize: isMobile ? 6 : 10 }} />
            <PolarRadiusAxis tick={{ fill: '#374151', fontSize: isMobile ? 6 : 10 }} />
            <Tooltip content={customTooltip} />
            <Legend wrapperStyle={{ fontSize: isMobile ? 6 : 10 }} />
            <Radar name={title} dataKey="amount" stroke={color} fill={color} fillOpacity={0.6} />
          </RadarChart>
        </ResponsiveContainer>
      );
    case 'funnel':
      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <FunnelChart margin={{ top: 3, right: 3, left: 3, bottom: 3 }}>
            <Tooltip content={customTooltip} />
            <Funnel
              data={data}
              dataKey="amount"
              nameKey="category"
              isAnimationActive
              label={{
                position: 'right',
                fill: '#1f2937',
                fontSize: isMobile ? 6 : 10,
                formatter: (entry) => `${entry.category}: ${formatCurrency(entry.amount)}`
              }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      );
    default:
      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={data} margin={{ top: 3, right: 3, left: isMobile ? -20 : -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="category" tick={{ fill: '#374151', fontSize: isMobile ? 6 : 10 }} tickMargin={3} />
            <YAxis tick={{ fill: '#374151', fontSize: isMobile ? 6 : 10 }} tickMargin={3} />
            <Tooltip content={customTooltip} />
            <Legend wrapperStyle={{ fontSize: isMobile ? 6 : 10 }} />
            <Bar dataKey="amount" name={title} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
  }
};

// Budget List Item Component
const BudgetListItem = ({ budget, handleDeleteBudget, isMobile }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3 }}
    className="flex justify-between items-center p-1 sm:p-2 bg-white/50 rounded-lg shadow-sm hover:shadow-md transition-all"
  >
    <div className="flex-1">
      <p className={`text-[10px] sm:text-xs font-medium text-gray-900`}>{budget.category}</p>
      <p className={`text-[9px] sm:text-xs text-gray-500`}>{budget.period} | {new Date(budget.createdAt).toLocaleDateString()}</p>
    </div>
    <div className="flex items-center gap-1">
      <span className={`text-[10px] sm:text-xs font-semibold text-gray-900`}>{formatCurrency(budget.amount)}</span>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => handleDeleteBudget(budget._id)}
        className="text-red-500 hover:text-red-700 transition-colors p-0.5 sm:p-1 rounded-full hover:bg-red-50"
        aria-label={`Delete ${budget.category} budget`}
      >
        <Trash2 size={10} />
      </motion.button>
    </div>
  </motion.div>
);

// Budget List Component
const BudgetList = ({ title, budgets, color, handleDeleteBudget, isMobile }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-white/90 rounded-lg p-1 sm:p-2 shadow-sm border border-gray-100"
  >
    <h3 className={`text-xs sm:text-base font-semibold ${color} mb-1 sm:mb-2`}>{title}</h3>
    <div className="space-y-1 max-h-[150px] sm:max-h-[200px] overflow-y-auto">
      {budgets.length ? (
        budgets.map(b => (
          <BudgetListItem key={b._id} budget={b} handleDeleteBudget={handleDeleteBudget} isMobile={isMobile} />
        ))
      ) : (
        <p className={`text-gray-500 text-[10px] sm:text-xs text-center py-2 sm:py-3`}>No {title.toLowerCase()} yet.</p>
      )}
    </div>
  </motion.div>
);

// Add Budget Modal Component
const AddBudgetModal = ({ isModalOpen, setIsModalOpen, newBudget, setNewBudget, handleAddBudget, searchQuery, setSearchQuery, filteredSuggestions, isMobile }) => (
  <AnimatePresence>
    {isModalOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-1 sm:p-2"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white/95 p-2 sm:p-3 rounded-lg w-full max-w-[280px] sm:max-w-xs shadow-sm"
        >
          <div className="flex justify-between items-center mb-2 sm:mb-3">
            <h3 className={`text-sm sm:text-base font-bold text-gray-900`}>Add New Budget</h3>
            <motion.button
              whileHover={{ rotate: 90 }}
              onClick={() => {
                setIsModalOpen(false);
                setSearchQuery('');
                setNewBudget({ category: '', amount: '', period: 'Monthly', type: 'expense' });
              }}
              className="text-gray-500 hover:text-gray-700 p-0.5 sm:p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close modal"
            >
              <X size={12} />
            </motion.button>
          </div>
          <div className="space-y-1 sm:space-y-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search or enter category"
                value={newBudget.category}
                onChange={(e) => {
                  setNewBudget({ ...newBudget, category: e.target.value });
                  setSearchQuery(e.target.value);
                }}
                className={`w-full bg-white/50 border border-gray-200 rounded-lg p-0.5 sm:p-1 text-[10px] sm:text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all shadow-sm`}
              />
              {filteredSuggestions.length > 0 && searchQuery && (
                <div className="absolute bg-white/95 border border-gray-200 rounded-lg mt-0.5 max-h-28 overflow-y-auto w-full z-10 shadow-sm">
                  {filteredSuggestions.map(cat => (
                    <motion.div
                      key={cat}
                      onClick={() => {
                        setNewBudget({ ...newBudget, category: cat });
                        setSearchQuery(cat);
                      }}
                      whileHover={{ backgroundColor: '#EBF5FF' }}
                      className={`p-1 sm:p-2 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer text-[10px] sm:text-xs text-gray-700 transition-colors`}
                    >
                      {cat}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
            <input
              type="number"
              placeholder="Amount (₹)"
              value={newBudget.amount}
              onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
              className={`w-full bg-white/50 border border-gray-200 rounded-lg p-0.5 sm:p-1 text-[10px] sm:text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all shadow-sm`}
              min="0"
              step="0.01"
            />
            <select
              value={newBudget.type}
              onChange={(e) => setNewBudget({ ...newBudget, type: e.target.value })}
              className={`w-full bg-white/50 border border-gray-200 rounded-lg p-0.5 sm:p-1 text-[10px] sm:text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all shadow-sm`}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <select
              value={newBudget.period}
              onChange={(e) => setNewBudget({ ...newBudget, period: e.target.value })}
              className={`w-full bg-white/50 border border-gray-200 rounded-lg p-0.5 sm:p-1 text-[10px] sm:text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all shadow-sm`}
            >
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Yearly">Yearly</option>
            </select>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddBudget}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-0.5 sm:p-1 rounded-lg font-medium hover:bg-indigo-700 transition-all shadow-sm text-[10px] sm:text-sm"
            >
              Save Budget
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const BudgetView = () => {
  const [budgets, setBudgets] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBudget, setNewBudget] = useState({ category: '', amount: '', period: 'Monthly', type: 'expense' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState({ 
    type: 'all', 
    period: 'all', 
    category: 'all', 
    startDate: '', 
    endDate: '' 
  });
  const [chartType, setChartType] = useState('bar');
  const [showFilter, setShowFilter] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  const fetchBudgets = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setErrorMessage('Please log in to view budgets.');
        return;
      }
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/budgets`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setBudgets(res.data || []);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to fetch budgets.');
    }
  };

  const handleAddBudget = async () => {
    const token = getAuthToken();
    if (!token) {
      setErrorMessage('Please log in to add a budget.');
      return;
    }
    if (!newBudget.category.trim() || !newBudget.amount || parseFloat(newBudget.amount) <= 0) {
      setErrorMessage('Please enter a valid category and a positive amount.');
      return;
    }

    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/budgets`, {
        ...newBudget,
        amount: parseFloat(newBudget.amount),
        category: newBudget.category.trim(),
      }, { headers: { Authorization: `Bearer ${token}` } });
      await fetchBudgets();
      setIsModalOpen(false);
      setNewBudget({ category: '', amount: '', period: 'Monthly', type: 'expense' });
      setSearchQuery('');
      setErrorMessage('');
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to add budget.');
    }
  };

  const handleDeleteBudget = async (id) => {
    const token = getAuthToken();
    if (!token) {
      setErrorMessage('Please log in to delete a budget.');
      return;
    }
    try {
      await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/budgets/${id}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      fetchBudgets();
      setErrorMessage('');
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to delete budget.');
    }
  };

  useEffect(() => {
    fetchBudgets();
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter budgets
  const filteredBudgets = budgets.filter(b => {
    const budgetDate = new Date(b.createdAt);
    const startDate = filter.startDate ? new Date(filter.startDate) : null;
    const endDate = filter.endDate ? new Date(filter.endDate) : null;

    return (
      (filter.type === 'all' || b.type === filter.type) &&
      (filter.period === 'all' || b.period === filter.period) &&
      (filter.category === 'all' || b.category === filter.category) &&
      (!startDate || budgetDate >= startDate) &&
      (!endDate || budgetDate <= endDate)
    );
  });

  const expenseBudgets = filteredBudgets.filter(b => b.type === 'expense');
  const incomeBudgets = filteredBudgets.filter(b => b.type === 'income');

  // Dynamic category suggestions
  const usedCategories = [...new Set(budgets.map(b => b.category))];
  const availableCategories = PREDEFINED_CATEGORIES.filter(cat => !usedCategories.includes(cat));
  const filteredSuggestions = searchQuery
    ? availableCategories.filter(cat => cat.toLowerCase().includes(searchQuery.toLowerCase()))
    : availableCategories;

  // Calculate key metrics (overview data)
  const totalExpenses = expenseBudgets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
  const totalIncome = incomeBudgets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
  const netBalance = totalIncome - totalExpenses;
  const expenseChange = expenseBudgets.length > 1 ? ((expenseBudgets[expenseBudgets.length - 1].amount - expenseBudgets[0].amount) / expenseBudgets[0].amount * 100).toFixed(1) : '0.0';
  const incomeChange = incomeBudgets.length > 1 ? ((incomeBudgets[incomeBudgets.length - 1].amount - incomeBudgets[0].amount) / incomeBudgets[0].amount * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-1 sm:p-2 lg:p-4 space-y-1 sm:space-y-2">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
          <h1 className={`text-base sm:text-xl font-extrabold text-gray-900 tracking-tight`}>Financial Overview</h1>
          <div className="flex gap-1 w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilter(!showFilter)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 bg-white/90 text-gray-900 px-2.5 sm:px-2.5 py-1.5 sm:py-1 mx-4 rounded-lg font-medium shadow-sm hover:shadow-md hover:bg-white transition-all text-[10px] sm:text-xs`}
            >
              <Filter size={27} /> {showFilter ? 'Hide Filters' : 'Show Filters'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsModalOpen(true)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-2.5 mx-4 sm:px-2.5 py-1.5 sm:py-1 rounded-lg font-medium shadow-sm hover:shadow-md transition-all text-[10px] sm:text-xs`}
            >
              <Plus size={27} /> Add Budget
            </motion.button>
          </div>
        </header>

        {/* Error Message */}
        {errorMessage && <ErrorMessage message={errorMessage} onClose={() => setErrorMessage('')} isMobile={isMobile} />}

        {/* Key Metrics */}
        <section className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-1 sm:gap-2">
          <KeyMetric
            title="Total Expenses"
            value={formatCurrency(totalExpenses)}
            change={`${Math.abs(expenseChange)}% vs last period`}
            positive={expenseChange <= 0}
            isMobile={isMobile}
          />
          <KeyMetric
            title="Total Income"
            value={formatCurrency(totalIncome)}
            change={`${Math.abs(incomeChange)}% vs last period`}
            positive={incomeChange >= 0}
            isMobile={isMobile}
          />
          <KeyMetric
            title="Net Balance"
            value={formatCurrency(netBalance)}
            change={netBalance >= 0 ? 'Positive' : 'Negative'}
            positive={netBalance >= 0}
            isMobile={isMobile}
          />
          <KeyMetric
            title="Categories"
            value={usedCategories.length}
            change="vs all categories"
            positive={true}
            isMobile={isMobile}
          />
        </section>

        {/* Main Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-1 sm:gap-2">
          {/* Left Column: Charts and Filters */}
          <div className="lg:col-span-2 space-y-1 sm:space-y-2">
            <FilterPanel
              filter={filter}
              setFilter={setFilter}
              budgets={budgets}
              showFilter={showFilter}
              isMobile={isMobile}
            />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/90 rounded-lg p-1 sm:p-2 shadow-sm border border-gray-100"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                <h2 className={`text-xs sm:text-sm font-semibold text-gray-900`}>Income vs Expenses</h2>
                <ChartTypeSelector chartType={chartType} setChartType={setChartType} isMobile={isMobile} />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <div>
                  <h3 className={`text-[10px] sm:text-xs font-medium text-gray-600 mb-0.5 sm:mb-1`}>Expenses</h3>
                  {expenseBudgets.length ? (
                    <ChartComponent data={expenseBudgets} title="Planned" color="#F43F5E" dataKey={chartType} isMobile={isMobile} />
                  ) : (
                    <p className={`text-gray-500 text-center py-2 sm:py-4 text-[10px] sm:text-xs`}>No expenses added yet.</p>
                  )}
                </div>
                <div>
                  <h3 className={`text-[10px] sm:text-xs font-medium text-gray-600 mb-0.5 sm:mb-1`}>Income</h3>
                  {incomeBudgets.length ? (
                    <ChartComponent data={incomeBudgets} title="Goal" color="#10B981" dataKey={chartType} isMobile={isMobile} />
                  ) : (
                    <p className={`text-gray-500 text-center py-2 sm:py-4 text-[10px] sm:text-xs`}>No income goals added yet.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Budget Lists */}
          <div className="space-y-1 sm:space-y-2">
            <BudgetList
              title="Expense Budgets"
              budgets={expenseBudgets}
              color="text-red-600"
              handleDeleteBudget={handleDeleteBudget}
              isMobile={isMobile}
            />
            <BudgetList
              title="Income Goals"
              budgets={incomeBudgets}
              color="text-green-600"
              handleDeleteBudget={handleDeleteBudget}
              isMobile={isMobile}
            />
          </div>
        </div>

        {/* Add Budget Modal */}
        <AddBudgetModal
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          newBudget={newBudget}
          setNewBudget={setNewBudget}
          handleAddBudget={handleAddBudget}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredSuggestions={filteredSuggestions}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
};

export default BudgetView;