import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Brain, Loader2, ArrowLeft, LayoutDashboard, List, BookOpen, Newspaper, Plus, TrendingUp, TrendingDown,
  Trash2, Search, X, Info, ChevronDown, ChevronUp, RefreshCw, ExternalLink
} from 'lucide-react';
import { investmentKnowledge } from '../data/investmentKnowledgeHub.js';

const getAuthToken = () => localStorage.getItem('token');
const formatCurrency = (val) => `₹${val.toLocaleString('en-IN')}`;

// --- SUB-COMPONENTS ---

// 1. Dashboard Tab
const DashboardTab = ({ summary, loading, fetchSummary }) => {
  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" /></div>;
  if (!summary) return <div className="text-center p-10 text-gray-500">Add investments to see your dashboard!</div>;

  const allocationData = Object.entries(summary.categoryBreakdown).map(([name, value]) => ({ name, value }));
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-6 pb-20 sm:pb-0">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString()}</p>
        <button onClick={fetchSummary} className="flex items-center gap-1 text-sm text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-full transition">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Invested</p>
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(summary.totalInvested)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Current Value</p>
          <p className={`text-2xl font-bold ${summary.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatCurrency(summary.totalCurrentValue)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Gain/Loss</p>
          <div className="flex items-end gap-2">
            <p className={`text-2xl font-bold ${summary.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {summary.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(summary.totalGainLoss)}
            </p>
            <p className={`text-sm mb-1 ${summary.totalGainLossPercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              ({summary.totalGainLossPercent.toFixed(2)}%)
            </p>
          </div>
        </div>
      </div>

      {/* Charts & Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-semibold mb-4 text-gray-800">Allocation</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => formatCurrency(val)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-semibold mb-4 text-gray-800">Portfolio Health</h3>
          <div className={`text-center p-6 rounded-lg ${summary.health === 'Aggressive' ? 'bg-orange-50 text-orange-700' :
            summary.health === 'Moderate' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
            }`}>
            <p className="text-lg font-bold">{summary.health}</p>
            <p className="text-sm opacity-80">Based on your asset allocation</p>
          </div>

          {summary.alerts && summary.alerts.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-semibold text-gray-600">Smart Alerts</h4>
              {summary.alerts.map((alert, idx) => (
                <div key={idx} className="bg-yellow-50 text-yellow-700 text-sm p-2 rounded flex items-start gap-2">
                  <span>⚠️</span> <span className="flex-1">{alert}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 2. Tracker Tab (With Search & Responsiveness)
const SearchableSelect = ({ type, onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Type mapping to backend param
  const typeMap = {
    'Stock': 'stock',
    'Mutual Fund': 'mutualfund',
    'Crypto': 'crypto',
    'ETF': 'stock', // yahoo handles both
    'Gold': 'stock' // Assuming Gold ETF
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/investments/search`, {
          params: { query, type: typeMap[type] || 'stock' },
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        });
        setResults(res.data);
        setIsOpen(true);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, type]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        <input
          type="text"
          placeholder={`Search ${type}...`}
          className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
        />
        {loading && <Loader2 className="absolute right-3 top-2.5 animate-spin text-blue-500" size={16} />}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
          {results.map((item, idx) => (
            <div
              key={idx}
              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0"
              onClick={() => {
                onSelect(item);
                setQuery(item.name);
                setIsOpen(false);
              }}
            >
              <p className="font-medium text-sm text-gray-800">{item.name}</p>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{item.symbol || item.schemeCode}</span>
                {item.exchange && <span>{item.exchange}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TrackerTab = ({ investments, fetchSummary }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    assetType: 'Stock', name: '', symbol: '', quantity: '', buyPrice: '', buyDate: ''
  });

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this investment?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/investments/${id}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      fetchSummary();
    } catch (err) { console.error(err); }
  };

  const handleSearchResult = (item) => {
    setFormData({
      ...formData,
      name: item.name,
      symbol: item.symbol // or schemeCode
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/investments/add`, formData, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      setIsModalOpen(false);
      fetchSummary();
      setFormData({ assetType: 'Stock', name: '', symbol: '', quantity: '', buyPrice: '', buyDate: '' });
    } catch (err) { alert('Failed to add investment'); }
  };

  // Mobile Card Component
  const InvestmentCard = ({ inv }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-3">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-semibold text-gray-800">{inv.name}</h4>
          <p className="text-xs text-gray-500">{inv.symbol} • {inv.assetType}</p>
        </div>
        <button onClick={() => handleDelete(inv._id)} className="text-gray-400 hover:text-red-500">
          <Trash2 size={16} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm mt-3">
        <div>
          <p className="text-gray-500 text-xs">Current Val</p>
          <p className="font-semibold">{formatCurrency(inv.currentValue)}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 text-xs">P&L</p>
          <p className={`font-semibold ${inv.gainLoss >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {inv.gainLoss >= 0 ? '+' : ''}{formatCurrency(inv.gainLoss)}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pb-20 sm:pb-0">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-700">Your Portfolio</h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm transition"
        >
          <Plus size={16} /> <span className="hidden sm:inline">Add Investment</span>
        </button>
      </div>

      {/* Mobile View */}
      <div className="sm:hidden">
        {investments.map(inv => <InvestmentCard key={inv._id} inv={inv} />)}
        {investments.length === 0 && <p className="text-center text-gray-500 p-8">No investments yet.</p>}
      </div>

      {/* Desktop View */}
      <div className="hidden sm:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 font-semibold text-gray-600">Name</th>
              <th className="p-3 font-semibold text-gray-600">Type</th>
              <th className="p-3 font-semibold text-gray-600 text-right">Qty</th>
              <th className="p-3 font-semibold text-gray-600 text-right">Avg Price</th>
              <th className="p-3 font-semibold text-gray-600 text-right">LTP</th>
              <th className="p-3 font-semibold text-gray-600 text-right">Value</th>
              <th className="p-3 font-semibold text-gray-600 text-right">P&L</th>
              <th className="p-3 font-semibold text-gray-600 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {investments.map(inv => (
              <tr key={inv._id} className="border-b hover:bg-gray-50 transition">
                <td className="p-3">
                  <p className="font-medium text-gray-800">{inv.name}</p>
                  <p className="text-xs text-gray-500">{inv.symbol}</p>
                </td>
                <td className="p-3 text-gray-600">{inv.assetType}</td>
                <td className="p-3 text-right">{inv.quantity}</td>
                <td className="p-3 text-right">{formatCurrency(inv.buyPrice)}</td>
                <td className="p-3 text-right font-medium">{formatCurrency(inv.currentPrice)}</td>
                <td className="p-3 text-right font-bold">{formatCurrency(inv.currentValue)}</td>
                <td className={`p-3 text-right ${inv.gainLoss >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  <div className="flex flex-col items-end">
                    <span>{inv.gainLoss >= 0 ? '+' : ''}{formatCurrency(inv.gainLoss)}</span>
                    <span className="text-xs">({inv.gainLossPercent.toFixed(2)}%)</span>
                  </div>
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => handleDelete(inv._id)} className="text-gray-400 hover:text-red-600 p-1">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {investments.length === 0 && (
              <tr><td colSpan="8" className="p-6 text-center text-gray-500">No investments found. Add one to get started!</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Add Investment</h3>
                <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Asset Type</label>
                  <select
                    className="w-full p-2 border rounded-lg bg-gray-50"
                    value={formData.assetType}
                    onChange={e => setFormData({ ...formData, assetType: e.target.value, name: '', symbol: '' })}
                  >
                    {['Stock', 'Mutual Fund', 'Crypto', 'Gold', 'ETF'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Search Investment</label>
                  <SearchableSelect type={formData.assetType} onSelect={handleSearchResult} />
                  {formData.name && <p className="text-xs text-green-600 mt-1">Selected: {formData.name} ({formData.symbol})</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number" className="w-full p-2 border rounded-lg" required
                      value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Buy Price (Avg)</label>
                    <input
                      type="number" className="w-full p-2 border rounded-lg" required
                      value={formData.buyPrice} onChange={e => setFormData({ ...formData, buyPrice: e.target.value })}
                    />
                  </div>
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition shadow-md">
                  Add to Portfolio
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// 3. Explorer Tab (Knowledge Hub)
const ExplorerTab = () => {
  const [selectedTopic, setSelectedTopic] = useState(null);

  return (
    <div className="pb-20 sm:pb-0">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Investment Knowledge Hub</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(investmentKnowledge).map(([title, data], i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition cursor-pointer group"
            onClick={() => setSelectedTopic({ title, ...data })}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-gray-800 text-lg group-hover:text-blue-600 transition">{title}</h3>
              <Info size={16} className="text-gray-400" />
            </div>
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">{data.description}</p>
            <div className="text-xs space-y-1 bg-gray-50 p-2 rounded-lg">
              <div className="flex justify-between"><span className="text-gray-500">Risk:</span> <span className="font-medium text-gray-700">{data.risk}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Returns:</span> <span className="font-medium text-green-600">{data.returns}</span></div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedTopic && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setSelectedTopic(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 50 }}
              className="bg-white w-full max-w-2xl max-h-[85vh] rounded-xl overflow-hidden shadow-2xl flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b flex justify-between items-start bg-gray-50">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedTopic.title}</h2>
                  <p className="text-gray-600 text-sm mt-1">{selectedTopic.description}</p>
                </div>
                <button onClick={() => setSelectedTopic(null)} className="p-1 hover:bg-gray-200 rounded-full"><X size={20} /></button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                <section>
                  <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><BookOpen size={18} className="text-blue-500" /> How it Works</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                    {selectedTopic.howItWorks.map((step, idx) => <li key={idx}>{step}</li>)}
                  </ul>
                </section>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-800 text-sm mb-2">Ideal For</h4>
                    <p className="text-sm text-green-700">{selectedTopic.whoShouldInvest}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-orange-800 text-sm mb-2">Time Horizon</h4>
                    <p className="text-sm text-orange-700">{selectedTopic.horizon}</p>
                  </div>
                </div>

                <section>
                  <h3 className="font-bold text-gray-800 mb-2">Taxation (India)</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">{selectedTopic.taxation}</p>
                </section>

                <section>
                  <h3 className="font-bold text-gray-800 mb-2">Examples</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTopic.examples.map((ex, idx) => (
                      <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full border">{ex}</span>
                    ))}
                  </div>
                </section>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// 4. News Tab (Enhanced UI)
const NewsTab = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/investments/news`, { headers: { Authorization: `Bearer ${getAuthToken()}` } })
      .then(res => setNews(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20 sm:pb-0">
      {news.map((item, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition flex flex-col h-full">
          {item.image && (
            <div className="h-40 w-full overflow-hidden">
              <img src={item.image} alt="News" className="w-full h-full object-cover hover:scale-105 transition duration-500" />
            </div>
          )}
          <div className="p-4 flex flex-col flex-1">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{item.source}</span>
              <span className="text-[10px] text-gray-400">{new Date(item.pubDate).toLocaleDateString()}</span>
            </div>
            <h3 className="font-bold text-gray-800 mb-2 line-clamp-2 leading-tight">{item.title}</h3>
            <p className="text-xs text-gray-500 line-clamp-3 mb-4 flex-1">{item.summary}</p>

            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto flex items-center justify-center gap-1 w-full py-2 bg-gray-50 text-gray-700 text-xs font-semibold rounded hover:bg-blue-50 hover:text-blue-600 transition"
            >
              Read Article <ExternalLink size={12} />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
};

// 5. AI Tab (Existing Logic Wrapped)
const AIPlannerTab = () => {
  const [form, setForm] = useState({ amount: '', riskLevel: 'Moderate', investmentType: 'SIP', durationYears: '' });
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/investments`, form, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
      setRecommendations(response.data.recommendations || []);
    } catch (err) { alert('AI Error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20 sm:pb-0">
      <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-100 h-fit shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Brain size={18} className="text-purple-500" /> AI Planner</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="number" placeholder="Amount (₹)" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-200 outline-none" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
          <select className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-purple-200 outline-none" value={form.riskLevel} onChange={e => setForm({ ...form, riskLevel: e.target.value })}>
            <option value="Low">Low Risk</option>
            <option value="Moderate">Moderate Risk</option>
            <option value="High">High Risk</option>
          </select>
          <select className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-purple-200 outline-none" value={form.investmentType} onChange={e => setForm({ ...form, investmentType: e.target.value })}>
            <option value="SIP">SIP</option>
            <option value="Lump Sum">Lump Sum</option>
          </select>
          <input type="number" placeholder="Duration (Years)" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-200 outline-none" value={form.durationYears} onChange={e => setForm({ ...form, durationYears: e.target.value })} required />
          <button type="submit" disabled={loading} className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-medium hover:bg-purple-700 transition shadow-md disabled:opacity-70 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Generate Plan'}
          </button>
        </form>
      </div>

      <div className="lg:col-span-2 space-y-4">
        {recommendations.length > 0 ? recommendations.map((rec, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex justify-between mb-2">
              <h4 className="font-bold text-lg text-gray-800">{rec.planName}</h4>
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">{rec.expectedReturns}</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 mb-3 border border-blue-100">
              <strong>Why this fits:</strong> {rec.whyThisPlan}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-500">
              <div className="bg-gray-50 p-2 rounded"><strong>Risk Analysis:</strong> {rec.riskAnalysis}</div>
              <div className="bg-purple-50 p-2 rounded text-purple-700"><strong>Beginner View:</strong> {rec.beginnerExplanation}</div>
            </div>
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
            <Brain size={48} className="mb-2 opacity-20" />
            <p>Enter details to get AI investment advice</p>
          </div>
        )}
      </div>
    </div>
  );
};


// --- MAIN PAGE ---
const InvestmentsView = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/investments/summary`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      setSummary(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'tracker', label: 'Tracker', icon: <List size={18} /> },
    { id: 'explorer', label: 'Explorer', icon: <BookOpen size={18} /> },
    { id: 'news', label: 'News', icon: <Newspaper size={18} /> },
    { id: 'ai', label: 'AI Planner', icon: <Brain size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 font-sans text-gray-800">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => window.history.back()} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 shadow-sm transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Investment Command Center</h1>
            <p className="text-xs sm:text-sm text-gray-500">Track, Plan & Grow your wealth</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Scrollable on Mobile */}
      <div className="flex overflow-x-auto gap-2 mb-6 pb-2 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap border
                            ${activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-md border-transparent transform scale-105'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }
                        `}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'dashboard' && <DashboardTab summary={summary} loading={loading} fetchSummary={fetchSummary} />}
          {activeTab === 'tracker' && <TrackerTab investments={summary?.investments || []} fetchSummary={fetchSummary} />}
          {activeTab === 'explorer' && <ExplorerTab />}
          {activeTab === 'news' && <NewsTab />}
          {activeTab === 'ai' && <AIPlannerTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default InvestmentsView;