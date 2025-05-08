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

const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const getAuthToken = () => localStorage.getItem('token');

const PREDEFINED_CATEGORIES = [
  'Medicine', 'Groceries', 'Rent', 'Utilities', 'Transport', 'Entertainment',
  'Salary', 'Freelance', 'Investments', 'Education', 'Dining', 'Travel',
  'Insurance', 'Savings', 'Clothing', 'Electronics', 'Health', 'Fitness'
];

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
  const [errorMessage, setErrorMessage] = useState(''); // New state for error messages

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

  useEffect(() => { fetchBudgets(); }, []);

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

  // Chart rendering component
  const ChartComponent = ({ data, title, color, dataKey }) => {
    const customTooltip = ({ active, payload }) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-white p-2 border rounded shadow">
            <p className="font-semibold">{payload[0].payload.category}</p>
            <p>{`${title}: ${formatCurrency(payload[0].value)}`}</p>
            <p className="text-xs text-gray-500">{`Period: ${payload[0].payload.period}`}</p>
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
                nameKey="category"
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
            </PieChart>
          </ResponsiveContainer>
        );
      case 'treemap':
        const getTreemapColor = (value) => {
          if (value >= 10000) return '#1f77b4';
          if (value >= 5000) return '#2ca02c';
          if (value >= 2000) return '#ff7f0e';
          if (value >= 1000) return '#d62728';
          return '#9467bd';
        };

        return (
          <ResponsiveContainer width="100%" height={300}>
            <Treemap
              data={data}
              dataKey={dataKey}
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
                  />
                  {width > 80 && height > 20 && (
                    <text x={x + 4} y={y + 16} fill="#fff" fontSize={12}>
                      {name} ({value})
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
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip content={customTooltip} />
              <Legend />
              <Area type="monotone" dataKey={dataKey} name={title} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" type="category" />
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
              <PolarAngleAxis dataKey="category" />
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
                nameKey="category"
                isAnimationActive
                label={{
                  position: 'right',
                  fill: '#333',
                  fontSize: 12,
                  formatter: (entry) => `${entry.category}: ₹${entry.amount}`
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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip content={customTooltip} />
              <Legend />
              <Bar dataKey={dataKey} name={title} fill={color} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  const COLORS = ['#F87171', '#34D399', '#60A5FA', '#FBBF24', '#A78BFA'];

  return (
    <div className="p-6 space-y-8">
      {/* Error Message Display */}
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="absolute top-0 bottom-0 right-0 px-4 py-3">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Budget Insights</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg shadow hover:bg-gray-300 flex items-center"
          >
            <Filter size={18} className="mr-2" /> Filter
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg shadow hover:opacity-90 flex items-center"
          >
            <Plus size={18} className="mr-2" /> Add Budget
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white rounded-xl shadow-lg p-4 mb-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <select
                value={filter.type}
                onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                className="border p-2 rounded"
              >
                <option value="all">All Types</option>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <select
                value={filter.period}
                onChange={(e) => setFilter({ ...filter, period: e.target.value })}
                className="border p-2 rounded"
              >
                <option value="all">All Periods</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
                <option value="Weekly">Weekly</option>
              </select>
              <select
                value={filter.category}
                onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                className="border p-2 rounded"
              >
                <option value="all">All Categories</option>
                {[...new Set(budgets.map(b => b.category))].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <input
                type="date"
                value={filter.startDate}
                onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                className="border p-2 rounded"
                placeholder="Start Date"
              />
              <input
                type="date"
                value={filter.endDate}
                onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                className="border p-2 rounded"
                placeholder="End Date"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chart Type Selector */}
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium">Chart Type:</label>
        <select
          value={chartType}
          onChange={(e) => setChartType(e.target.value)}
          className="border p-2 rounded flex items-center"
        >
          <option value="bar" className="flex items-center">
            <BarChart2 size={16} className="mr-2 inline" /> Bar Chart
          </option>
          <option value="pie" className="flex items-center">
            <PieIcon size={16} className="mr-2 inline" /> Pie Chart
          </option>
          <option value="treemap" className="flex items-center">
            <TrendingUp size={16} className="mr-2 inline" /> Tree Map
          </option>
          <option value="area" className="flex items-center">
            <AreaIcon size={16} className="mr-2 inline" /> Area Chart
          </option>
          <option value="scatter" className="flex items-center">
            <ScatterIcon size={16} className="mr-2 inline" /> Scatter Chart
          </option>
          <option value="radar" className="flex items-center">
            <RadarIcon size={16} className="mr-2 inline" /> Radar Chart
          </option>
          <option value="funnel" className="flex items-center">
            <FunnelIcon size={16} className="mr-2 inline" /> Funnel Chart
          </option>
        </select>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Expense Budgets</h3>
          {expenseBudgets.length ? (
            <ChartComponent data={expenseBudgets} title="Planned" color="#F87171" dataKey="amount" />
          ) : <p className="text-gray-500">No expenses yet.</p>}
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Income Goals</h3>
          {incomeBudgets.length ? (
            <ChartComponent data={incomeBudgets} title="Goal" color="#34D399" dataKey="amount" />
          ) : <p className="text-gray-500">No income goals yet.</p>}
        </div>
      </div>

      {/* Budget Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="font-medium mb-2 text-blue-600">Expense Budget List</h3>
          {expenseBudgets.map(b => (
            <div key={b._id} className="flex justify-between items-center py-1 border-b">
              <div>
                <p>{b.category}</p>
                <p className="text-xs text-gray-500">{b.period} | {new Date(b.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span>{formatCurrency(b.amount)}</span>
                <button onClick={() => handleDeleteBudget(b._id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="font-medium mb-2 text-green-600">Income Budget List</h3>
          {incomeBudgets.map(b => (
            <div key={b._id} className="flex justify-between items-center py-1 border-b">
              <div>
                <p>{b.category}</p>
                <p className="text-xs text-gray-500">{b.period} | {new Date(b.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span>{formatCurrency(b.amount)}</span>
                <button onClick={() => handleDeleteBudget(b._id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white p-6 rounded-lg w-full max-w-md"
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Add Budget</h3>
                <button onClick={() => {
                  setIsModalOpen(false);
                  setErrorMessage('');
                  setSearchQuery('');
                  setNewBudget({ category: '', amount: '', period: 'Monthly', type: 'expense' });
                }}><X /></button>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search or enter category"
                    value={newBudget.category}
                    onChange={(e) => {
                      setNewBudget({ ...newBudget, category: e.target.value });
                      setSearchQuery(e.target.value);
                    }}
                    className="w-full border p-2 rounded"
                  />
                  {filteredSuggestions.length > 0 && searchQuery && (
                    <div className="absolute bg-white border rounded mt-1 max-h-40 overflow-y-auto w-full z-10">
                      {filteredSuggestions.map(cat => (
                        <div key={cat} onClick={() => {
                          setNewBudget({ ...newBudget, category: cat });
                          setSearchQuery(cat);
                        }} className="p-2 hover:bg-gray-100 cursor-pointer">
                          {cat}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  placeholder="Amount"
                  value={newBudget.amount}
                  onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                  className="w-full border p-2 rounded"
                  min="0"
                  step="0.01"
                />
                <select
                  value={newBudget.type}
                  onChange={(e) => setNewBudget({ ...newBudget, type: e.target.value })}
                  className="w-full border p-2 rounded"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
                <select
                  value={newBudget.period}
                  onChange={(e) => setNewBudget({ ...newBudget, period: e.target.value })}
                  className="w-full border p-2 rounded"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                  <option value="Weekly">Weekly</option>
                </select>
                <button onClick={handleAddBudget} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BudgetView;