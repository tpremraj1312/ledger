import api from '../api/axios';

// ─── Formatters ───────────────────────────────────────────────
export const fmt = (v) => `₹${Math.round(v).toLocaleString('en-IN')}`;

export const fmtCompact = (v) => {
    if (!v || v === 0) return '—';
    if (v >= 1e12) return `₹${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9) return `₹${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
    if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
    return fmt(v);
};

// ─── Portfolio ────────────────────────────────────────────────
export const fetchPortfolio = () =>
    api.get('/api/investments/portfolio').then(r => r.data);

// ─── Transaction History ─────────────────────────────────────
export const fetchTxnHistory = (params = {}) =>
    api.get('/api/investments/txn/history', { params }).then(r => r.data);

// ─── Buy / Sell ──────────────────────────────────────────────
export const buyInvestment = (data) =>
    api.post('/api/investments/txn/buy', data).then(r => r.data);

export const sellInvestment = (data) =>
    api.post('/api/investments/txn/sell', data).then(r => r.data);

// ─── Search ──────────────────────────────────────────────────
export const searchInvestments = (query, type = 'stock') =>
    api.get('/api/investments/search', { params: { query, type } }).then(r => r.data);

// ─── Quote (Live Price) ──────────────────────────────────────
export const fetchQuote = (symbol, assetType = 'Stock') =>
    api.get(`/api/investments/quote/${encodeURIComponent(symbol)}`, { params: { assetType } }).then(r => r.data);

// ─── Historical Data ────────────────────────────────────────
export const fetchHistorical = (symbol, timeframe, assetType) =>
    api.get(`/api/investments/historical/${encodeURIComponent(symbol)}`, { params: { timeframe, assetType } }).then(r => r.data?.data || r.data);

// ─── Fundamentals ────────────────────────────────────────────
export const fetchFundamentals = (symbol) =>
    api.get(`/api/investments/fundamentals/${encodeURIComponent(symbol)}`).then(r => r.data);

// ─── AI Analysis ─────────────────────────────────────────────
export const fetchAIAnalysis = () =>
    api.post('/api/investments/ai/analyze', {}).then(r => r.data);

// ─── AI Planner ──────────────────────────────────────────────
export const generatePlan = (inputs) =>
    api.post('/api/investments/ai/planner', inputs).then(r => r.data);

// ─── News ────────────────────────────────────────────────────
export const fetchNews = () =>
    api.get('/api/investments/news').then(r => r.data);
