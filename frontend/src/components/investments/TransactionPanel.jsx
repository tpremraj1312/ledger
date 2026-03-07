import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, ArrowUpCircle, ArrowDownCircle, Info, DollarSign } from 'lucide-react';

const API = import.meta.env.VITE_BACKEND_URL;
const getToken = () => localStorage.getItem('token');
const fmt = (v) => `₹${Math.round(v).toLocaleString('en-IN')}`;

const SearchableSelect = ({ type, onSelect }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const typeMap = { 'Stock': 'stock', 'Mutual Fund': 'mutualfund', 'Crypto': 'crypto', 'ETF': 'stock', 'Gold': 'stock' };

    useEffect(() => {
        const t = setTimeout(async () => {
            if (query.length < 2) { setResults([]); return; }
            setLoading(true);
            try {
                const r = await axios.get(`${API}/api/investments/search`, { params: { query, type: typeMap[type] || 'stock' }, headers: { Authorization: `Bearer ${getToken()}` } });
                setResults(Array.isArray(r.data) ? r.data : []);
                setOpen(true);
            } catch { setResults([]); }
            finally { setLoading(false); }
        }, 500);
        return () => clearTimeout(t);
    }, [query, type]);

    return (
        <div className="relative">
            <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                    placeholder={`Search ${type}...`} value={query} onChange={e => setQuery(e.target.value)} onFocus={() => setOpen(true)} />
                {loading && <Loader2 size={14} className="icc-spinner absolute right-3 top-3 text-indigo-500" />}
            </div>
            {open && results.length > 0 && (
                <div className="icc-search-dropdown bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {results.map((item, i) => (
                        <div key={i} className="px-4 py-2.5 cursor-pointer hover:bg-indigo-50 border-b border-slate-50 last:border-b-0 transition"
                            onClick={() => { onSelect(item); setQuery(item.name || item.symbol); setOpen(false); }}>
                            <p className="text-sm font-medium text-slate-700">{item.name || item.symbol}</p>
                            <p className="text-xs text-slate-400 flex justify-between"><span>{item.symbol || item.schemeCode}</span>{item.exchange && <span>{item.exchange}</span>}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Live price preview component
const LivePricePreview = ({ symbol, assetType }) => {
    const [quote, setQuote] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!symbol) { setQuote(null); return; }
        setLoading(true);
        axios.get(`${API}/api/investments/quote/${encodeURIComponent(symbol)}`, {
            params: { assetType: assetType || 'Stock' },
            headers: { Authorization: `Bearer ${getToken()}` }
        })
            .then(r => setQuote(r.data))
            .catch(() => setQuote(null))
            .finally(() => setLoading(false));
    }, [symbol, assetType]);

    if (!symbol || loading) return loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 mt-2">
            <Loader2 size={12} className="icc-spinner" /> Fetching live price...
        </div>
    ) : null;

    if (!quote || !quote.price) return null;

    const up = (quote.changePercent || 0) >= 0;
    return (
        <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2 mt-2 border border-slate-100">
            <span className="icc-live-dot" />
            <div className="flex-1">
                <span className="text-sm font-semibold text-slate-800">₹{quote.price.toFixed(2)}</span>
                <span className={`text-xs ml-2 font-medium ${up ? 'text-emerald-600' : 'text-red-500'}`}>
                    {up ? '+' : ''}{(quote.changePercent || 0).toFixed(2)}%
                </span>
            </div>
            <span className="text-[10px] text-slate-400">Live</span>
        </div>
    );
};

const TransactionPanel = ({ onTransactionComplete, holdings }) => {
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({ assetType: 'Stock', name: '', symbol: '', quantity: '', price: '', fees: '', txnDate: '', notes: '' });
    const [sellSym, setSellSym] = useState('');
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [histLoad, setHistLoad] = useState(false);

    useEffect(() => { fetchHistory(); }, []);

    const fetchHistory = async () => {
        setHistLoad(true);
        try { const r = await axios.get(`${API}/api/investments/txn/history`, { params: { limit: 30 }, headers: { Authorization: `Bearer ${getToken()}` } }); setHistory(r.data.transactions || []); } catch { }
        finally { setHistLoad(false); }
    };

    const handleBuy = async e => {
        e.preventDefault(); setLoading(true);
        try {
            await axios.post(`${API}/api/investments/txn/buy`, {
                ...form,
                fees: Number(form.fees) || 0,
            }, { headers: { Authorization: `Bearer ${getToken()}` } });
            setModal(null);
            setForm({ assetType: 'Stock', name: '', symbol: '', quantity: '', price: '', fees: '', txnDate: '', notes: '' });
            onTransactionComplete();
            fetchHistory();
        }
        catch (err) { alert(err.response?.data?.message || 'Failed'); }
        finally { setLoading(false); }
    };

    const handleSell = async e => {
        e.preventDefault(); setLoading(true);
        const h = holdings?.find(x => x.symbol === sellSym);
        try {
            await axios.post(`${API}/api/investments/txn/sell`, {
                ...form,
                symbol: sellSym,
                name: h?.name || form.name,
                assetType: h?.assetType || form.assetType,
                fees: Number(form.fees) || 0,
            }, { headers: { Authorization: `Bearer ${getToken()}` } });
            setModal(null);
            setForm({ assetType: 'Stock', name: '', symbol: '', quantity: '', price: '', fees: '', txnDate: '', notes: '' });
            setSellSym('');
            onTransactionComplete();
            fetchHistory();
        }
        catch (err) { alert(err.response?.data?.message || 'Failed'); }
        finally { setLoading(false); }
    };

    const inputCls = "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200";

    // Compute valuation preview
    const qty = Number(form.quantity) || 0;
    const price = Number(form.price) || 0;
    const fees = Number(form.fees) || 0;
    const totalCost = qty * price + fees;
    const sellHolding = holdings?.find(x => x.symbol === sellSym);

    return (
        <div className="space-y-5">
            <div className="flex gap-3">
                <button onClick={() => setModal('buy')} className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-lg hover:bg-emerald-600 transition shadow-sm"><ArrowDownCircle size={16} /> Buy</button>
                <button onClick={() => setModal('sell')} className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 text-sm font-semibold rounded-lg hover:bg-red-100 transition"><ArrowUpCircle size={16} /> Sell</button>
            </div>

            {/* History */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">Transaction History</h3>
                    <span className="text-xs text-slate-400">{history.length} transactions</span>
                </div>
                {histLoad ? <div className="flex justify-center py-10"><Loader2 size={24} className="icc-spinner text-indigo-500" /></div>
                    : !history.length ? <p className="text-center py-10 text-slate-400">No transactions yet</p>
                        : <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-50">
                            {history.map((txn, i) => (
                                <div key={txn._id || i} className="flex justify-between items-center px-5 py-3 hover:bg-slate-50/50 transition">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${txn.txnType === 'BUY' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                            {txn.txnType === 'BUY' ? <ArrowDownCircle size={16} className="text-emerald-500" /> : <ArrowUpCircle size={16} className="text-red-500" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-700">{txn.name}</p>
                                            <p className="text-xs text-slate-400">{txn.symbol} · {new Date(txn.txnDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-semibold ${txn.txnType === 'BUY' ? 'text-emerald-600' : 'text-red-500'}`}>{txn.txnType === 'BUY' ? '-' : '+'}{fmt(txn.totalAmount)}</p>
                                        <p className="text-xs text-slate-400">{txn.quantity} × {fmt(txn.price)}{txn.fees > 0 ? ` + ${fmt(txn.fees)} fees` : ''}</p>
                                    </div>
                                </div>
                            ))}
                        </div>}
            </div>

            {/* Buy Modal */}
            <AnimatePresence>
                {modal === 'buy' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ArrowDownCircle size={20} className="text-emerald-500" /> Buy Investment</h3>
                                <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleBuy} className="space-y-4">
                                <div><label className="block text-xs font-medium text-slate-600 mb-1">Asset Type</label><select className={inputCls} value={form.assetType} onChange={e => setForm({ ...form, assetType: e.target.value, name: '', symbol: '' })}>
                                    {['Stock', 'Mutual Fund', 'Crypto', 'Gold', 'ETF', 'FD', 'Bond'].map(t => <option key={t}>{t}</option>)}
                                </select></div>
                                <div><label className="block text-xs font-medium text-slate-600 mb-1">Search Investment</label><SearchableSelect type={form.assetType} onSelect={item => setForm({ ...form, name: item.name, symbol: item.symbol || item.schemeCode })} />
                                    {form.symbol && <LivePricePreview symbol={form.symbol} assetType={form.assetType} />}
                                    {form.name && !form.symbol && <p className="text-xs text-emerald-600 mt-1">✓ {form.name}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Quantity</label><input className={inputCls} type="number" step="any" required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
                                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Buy Price (₹)</label><input className={inputCls} type="number" step="any" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Fees/Brokerage (₹)</label><input className={inputCls} type="number" step="any" placeholder="0" value={form.fees} onChange={e => setForm({ ...form, fees: e.target.value })} /></div>
                                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Date (optional)</label><input className={inputCls} type="date" value={form.txnDate} onChange={e => setForm({ ...form, txnDate: e.target.value })} /></div>
                                </div>

                                {/* Valuation Preview */}
                                {qty > 0 && price > 0 && (
                                    <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl px-4 py-3 text-center">
                                        <p className="text-xs text-indigo-500 font-medium mb-1">Total Investment</p>
                                        <p className="text-xl font-bold text-indigo-700">{fmt(totalCost)}</p>
                                        <p className="text-[10px] text-indigo-400 mt-0.5">{qty} × ₹{price.toFixed(2)}{fees > 0 ? ` + ₹${fees} fees` : ''}</p>
                                    </div>
                                )}

                                <button type="submit" disabled={loading} className="w-full py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition flex items-center justify-center gap-2">
                                    {loading ? <Loader2 size={16} className="icc-spinner" /> : 'Add to Portfolio'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sell Modal */}
            <AnimatePresence>
                {modal === 'sell' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ArrowUpCircle size={20} className="text-red-500" /> Sell Investment</h3>
                                <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSell} className="space-y-4">
                                <div><label className="block text-xs font-medium text-slate-600 mb-1">Select Holding</label><select className={inputCls} value={sellSym} onChange={e => setSellSym(e.target.value)} required>
                                    <option value="">— Select —</option>
                                    {(holdings || []).map(h => <option key={h.symbol} value={h.symbol}>{h.name} ({h.quantity} units @ {fmt(h.avgCostBasis)})</option>)}
                                </select></div>

                                {sellSym && <LivePricePreview symbol={sellSym} assetType={sellHolding?.assetType} />}

                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Quantity</label><input className={inputCls} type="number" step="any" required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder={sellHolding ? `Max: ${sellHolding.quantity}` : ''} /></div>
                                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Sell Price (₹)</label><input className={inputCls} type="number" step="any" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Fees/Brokerage (₹)</label><input className={inputCls} type="number" step="any" placeholder="0" value={form.fees} onChange={e => setForm({ ...form, fees: e.target.value })} /></div>
                                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Date (optional)</label><input className={inputCls} type="date" value={form.txnDate} onChange={e => setForm({ ...form, txnDate: e.target.value })} /></div>
                                </div>

                                {/* Sell Valuation Preview */}
                                {qty > 0 && price > 0 && sellHolding && (
                                    <div className="bg-red-50/60 border border-red-100 rounded-xl px-4 py-3 text-center">
                                        <p className="text-xs text-red-500 font-medium mb-1">Sale Proceeds</p>
                                        <p className="text-xl font-bold text-slate-800">{fmt(qty * price - fees)}</p>
                                        <div className="flex justify-center gap-4 mt-1 text-[10px]">
                                            <span className="text-slate-400">Cost Basis: {fmt(qty * sellHolding.avgCostBasis)}</span>
                                            <span className={`font-semibold ${(qty * price - fees) >= (qty * sellHolding.avgCostBasis) ? 'text-emerald-600' : 'text-red-500'}`}>
                                                P&L: {(qty * price - fees) >= (qty * sellHolding.avgCostBasis) ? '+' : ''}{fmt(qty * price - fees - qty * sellHolding.avgCostBasis)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <button type="submit" disabled={loading || !sellSym} className="w-full py-2.5 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 disabled:opacity-50 transition flex items-center justify-center gap-2">
                                    {loading ? <Loader2 size={16} className="icc-spinner" /> : 'Sell'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TransactionPanel;
