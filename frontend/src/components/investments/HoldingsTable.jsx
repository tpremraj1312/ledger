import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { TrendingUp, ChevronDown, ChevronUp, ArrowUpDown, Loader2 } from 'lucide-react';

const API = import.meta.env.VITE_BACKEND_URL;
const getToken = () => localStorage.getItem('token');
const fmt = (v) => `₹${Math.round(v).toLocaleString('en-IN')}`;

const SORT_KEYS = {
    name: (a, b) => a.name.localeCompare(b.name),
    value: (a, b) => b.currentValue - a.currentValue,
    pl: (a, b) => b.unrealizedPL - a.unrealizedPL,
    plPct: (a, b) => b.unrealizedPLPercent - a.unrealizedPLPercent,
    weight: (a, b) => b.weight - a.weight,
    dayChange: (a, b) => b.dayChangePercent - a.dayChangePercent,
};

const HoldingsTable = ({ holdings }) => {
    const [sortKey, setSortKey] = useState('value');
    const [sortAsc, setSortAsc] = useState(false);
    const [expanded, setExpanded] = useState(null);
    const [txnHistory, setTxnHistory] = useState([]);
    const [txnLoading, setTxnLoading] = useState(false);

    const sorted = useMemo(() => {
        if (!holdings?.length) return [];
        const arr = [...holdings];
        const comparator = SORT_KEYS[sortKey] || SORT_KEYS.value;
        arr.sort((a, b) => sortAsc ? -comparator(a, b) : comparator(a, b));
        return arr;
    }, [holdings, sortKey, sortAsc]);

    const handleSort = (key) => {
        if (sortKey === key) setSortAsc(!sortAsc);
        else { setSortKey(key); setSortAsc(false); }
    };

    const toggleExpand = async (symbol) => {
        if (expanded === symbol) { setExpanded(null); setTxnHistory([]); return; }
        setExpanded(symbol);
        setTxnLoading(true);
        try {
            const r = await axios.get(`${API}/api/investments/txn/history`, {
                params: { symbol, limit: 10 },
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setTxnHistory(r.data.transactions || []);
        } catch { setTxnHistory([]); }
        finally { setTxnLoading(false); }
    };

    const SortIcon = ({ k }) => (
        <ArrowUpDown size={11} className={`inline ml-0.5 ${sortKey === k ? 'text-indigo-500' : 'text-slate-300'}`} />
    );

    if (!holdings?.length) return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <TrendingUp size={48} className="opacity-20 mb-3" />
            <p className="text-lg font-semibold text-slate-600">No holdings yet</p>
            <p className="text-sm">Buy your first investment to build your portfolio</p>
        </div>
    );

    const maxPL = Math.max(...sorted.map(h => Math.abs(h.unrealizedPLPercent || 0)), 1);

    return (
        <div className="space-y-4">
            {/* Desktop */}
            <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide icc-sortable" onClick={() => handleSort('name')}>Holding <SortIcon k="name" /></th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Type</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Qty</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Avg Cost</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">LTP</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide icc-sortable" onClick={() => handleSort('value')}>Value <SortIcon k="value" /></th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide icc-sortable" onClick={() => handleSort('pl')}>P&L <SortIcon k="pl" /></th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide icc-sortable" onClick={() => handleSort('dayChange')}>Day <SortIcon k="dayChange" /></th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide icc-sortable" onClick={() => handleSort('weight')}>Weight <SortIcon k="weight" /></th>
                            <th className="px-4 py-3 w-8" />
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((h, i) => (
                            <React.Fragment key={h.symbol + i}>
                                <tr className={`border-b border-slate-50 hover:bg-slate-50/50 transition cursor-pointer ${expanded === h.symbol ? 'bg-slate-50/60' : ''}`}
                                    onClick={() => toggleExpand(h.symbol)}>
                                    <td className="px-4 py-3.5">
                                        <p className="font-semibold text-slate-800">{h.name}</p>
                                        <p className="text-xs text-slate-400">{h.symbol}</p>
                                    </td>
                                    <td className="px-4 py-3.5"><span className="px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-full">{h.assetType}</span></td>
                                    <td className="px-4 py-3.5 text-right text-slate-700">{h.quantity}</td>
                                    <td className="px-4 py-3.5 text-right text-slate-700">{fmt(h.avgCostBasis)}</td>
                                    <td className="px-4 py-3.5 text-right font-semibold text-slate-800">{fmt(h.currentPrice)}</td>
                                    <td className="px-4 py-3.5 text-right font-bold text-slate-800">{fmt(h.currentValue)}</td>
                                    <td className="px-4 py-3.5 text-right">
                                        <p className={`font-semibold ${h.unrealizedPL >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{h.unrealizedPL >= 0 ? '+' : ''}{fmt(h.unrealizedPL)}</p>
                                        <div className="flex items-center justify-end gap-2 mt-1">
                                            <span className={`text-xs ${h.unrealizedPL >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>({h.unrealizedPLPercent >= 0 ? '+' : ''}{h.unrealizedPLPercent}%)</span>
                                            <div className="icc-pl-bar">
                                                <div className={`icc-pl-bar-fill ${h.unrealizedPL >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`}
                                                    style={{ width: `${Math.min(100, (Math.abs(h.unrealizedPLPercent) / maxPL) * 100)}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-right">
                                        <span className={`text-xs font-semibold ${(h.dayChangePercent || 0) >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                            {(h.dayChangePercent || 0) >= 0 ? '+' : ''}{h.dayChangePercent || 0}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-xs text-slate-500">{h.weight}%</span>
                                            <div className="icc-weight-bar"><div className="icc-weight-bar-fill" style={{ width: `${Math.min(100, h.weight)}%` }} /></div>
                                        </div>
                                    </td>
                                    <td className="px-2 py-3.5 text-slate-400">
                                        {expanded === h.symbol ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </td>
                                </tr>

                                {/* Expanded Transaction History */}
                                {expanded === h.symbol && (
                                    <tr className="icc-expand-row">
                                        <td colSpan={10} className="px-6 py-4">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Transaction History — {h.name}</p>
                                            {txnLoading ? (
                                                <div className="flex justify-center py-4"><Loader2 size={18} className="icc-spinner text-indigo-500" /></div>
                                            ) : txnHistory.length ? (
                                                <div className="space-y-1.5">
                                                    {txnHistory.map((txn, j) => (
                                                        <div key={txn._id || j} className="flex items-center justify-between text-sm bg-white px-4 py-2.5 rounded-lg border border-slate-100">
                                                            <div className="flex items-center gap-3">
                                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${txn.txnType === 'BUY' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>{txn.txnType}</span>
                                                                <span className="text-slate-600">{new Date(txn.txnDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-slate-700 font-medium">{txn.quantity} × {fmt(txn.price)}</span>
                                                                <span className="ml-3 font-semibold text-slate-800">{fmt(txn.totalAmount)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <p className="text-sm text-slate-400 text-center py-3">No transactions found</p>}
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-3">
                {sorted.map((h, i) => (
                    <div key={h.symbol + i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm" onClick={() => toggleExpand(h.symbol)}>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="font-semibold text-slate-800">{h.name}</p>
                                <p className="text-xs text-slate-400">{h.symbol} · {h.assetType}</p>
                            </div>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${h.unrealizedPL >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                {h.unrealizedPLPercent >= 0 ? '+' : ''}{h.unrealizedPLPercent}%
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                            <div><p className="text-xs text-slate-400">Value</p><p className="font-semibold text-slate-800">{fmt(h.currentValue)}</p></div>
                            <div><p className="text-xs text-slate-400">P&L</p><p className={`font-semibold ${h.unrealizedPL >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{h.unrealizedPL >= 0 ? '+' : ''}{fmt(h.unrealizedPL)}</p></div>
                            <div><p className="text-xs text-slate-400">Weight</p><p className="font-semibold text-slate-700">{h.weight}%</p></div>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50 text-xs text-slate-400">
                            <span>{h.quantity} units @ {fmt(h.avgCostBasis)}</span>
                            <span className="flex items-center gap-1">
                                {expanded === h.symbol ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                History
                            </span>
                        </div>

                        {expanded === h.symbol && (
                            <div className="mt-3 pt-3 border-t border-slate-100 icc-fade-in">
                                {txnLoading ? <div className="flex justify-center py-3"><Loader2 size={16} className="icc-spinner text-indigo-500" /></div>
                                    : txnHistory.length ? (
                                        <div className="space-y-1.5">
                                            {txnHistory.map((txn, j) => (
                                                <div key={txn._id || j} className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${txn.txnType === 'BUY' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>{txn.txnType}</span>
                                                        <span className="text-slate-500">{new Date(txn.txnDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                                    </div>
                                                    <span className="font-medium text-slate-700">{txn.quantity} × {fmt(txn.price)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-xs text-slate-400 text-center py-2">No transactions</p>}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HoldingsTable;
