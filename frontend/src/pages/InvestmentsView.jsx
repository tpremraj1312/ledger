import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCcw, LayoutDashboard, Wallet, LineChart, Cpu, BookOpen, Loader2, ListTree, ArrowDownCircle } from 'lucide-react';
import PortfolioOverview from '../components/investments/PortfolioOverview';
import HoldingsTable from '../components/investments/HoldingsTable';
import TransactionPanel from '../components/investments/TransactionPanel';
import MarketChart from '../components/investments/MarketChart';
import InvestmentPlanner from '../components/investments/InvestmentPlanner';
import AIInsightsPanel from '../components/investments/AIInsightsPanel';
import ExplorerPanel from '../components/investments/ExplorerPanel';
import NewsPanel from '../components/investments/NewsPanel';
import '../components/investments/InvestmentStyles.css';

const API = import.meta.env.VITE_BACKEND_URL;
const getToken = () => localStorage.getItem('token');
const fmt = (v) => `₹${Math.round(v).toLocaleString('en-IN')}`;

const InvestmentsView = () => {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const fetchSnapshot = async () => {
    try {
      const res = await axios.get(`${API}/api/investments/portfolio`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setSnapshot(res.data);
    } catch (error) {
      console.error('Failed to fetch portfolio snapshot:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchSnapshot(); }, []);

  const handleTransactionComplete = () => {
    setRefreshing(true);
    fetchSnapshot();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)]">
      <Loader2 size={36} className="icc-spinner text-indigo-500 mb-4" />
      <p className="text-slate-500 font-medium">Loading Command Center...</p>
    </div>
  );

  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'holdings', label: 'Holdings', icon: <ListTree size={18} /> },
    { id: 'charts', label: 'Charts', icon: <LineChart size={18} /> },
    { id: 'transactions', label: 'Buy / Sell', icon: <ArrowDownCircle size={18} /> },
    { id: 'planner', label: 'Planner', icon: <Wallet size={18} /> },
    { id: 'ai', label: 'AI Insights', icon: <Cpu size={18} /> },
    { id: 'explorer', label: 'Explorer', icon: <BookOpen size={18} /> },
  ];

  const up = snapshot?.summary?.totalUnrealizedPL >= 0;

  return (
    <div className="icc-main-content max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8 min-h-screen bg-slate-50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sticky top-0 bg-slate-50/90 backdrop-blur-md z-30 py-2 border-b border-slate-100/50">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Investment Command Center</h1>
          <p className="text-sm text-slate-500 mt-1">Unified view of your wealth & market intelligence</p>
        </div>

        {/* Portfolio Summary Snippet */}
        {snapshot && (
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Portfolio Value</p>
              <p className="text-lg font-bold text-slate-800">{fmt(snapshot.summary.totalCurrentValue)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total P&L</p>
              <p className={`text-sm font-semibold ${up ? 'text-emerald-500' : 'text-red-500'}`}>
                {up ? '+' : ''}{fmt(snapshot.summary.totalUnrealizedPL)}
              </p>
            </div>
            <button
              onClick={() => { setRefreshing(true); fetchSnapshot(); }}
              disabled={refreshing}
              className={`p-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-100 transition ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Refresh Portfolio"
            >
              <RefreshCcw size={16} className={refreshing ? 'icc-spinner' : ''} />
            </button>
          </div>
        )}
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex gap-1 mb-6 p-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto icc-tabs-scroll">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden icc-bottom-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'active' : ''}
          >
            {React.cloneElement(tab.icon, { size: activeTab === tab.id ? 20 : 18 })}
            <span className="truncate max-w-[56px]">{tab.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="min-h-[500px] icc-fade-in relative z-20">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <PortfolioOverview snapshot={snapshot} />
            <div className="mt-8">
              <h3 className="text-lg font-bold text-slate-800 mb-4 px-1">Market News & Updates</h3>
              <NewsPanel />
            </div>
          </div>
        )}

        {activeTab === 'holdings' && (
          <HoldingsTable holdings={snapshot?.holdings || []} />
        )}

        {activeTab === 'charts' && (
          <MarketChart holdings={snapshot?.holdings || []} />
        )}

        {activeTab === 'transactions' && (
          <TransactionPanel
            holdings={snapshot?.holdings || []}
            onTransactionComplete={handleTransactionComplete}
          />
        )}

        {activeTab === 'planner' && (
          <InvestmentPlanner />
        )}

        {activeTab === 'ai' && (
          <AIInsightsPanel portfolio={snapshot} />
        )}

        {activeTab === 'explorer' && (
          <ExplorerPanel snapshot={snapshot} />
        )}
      </div>
    </div>
  );
};

export default InvestmentsView;