import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, ReferenceLine, Line, ComposedChart,
} from 'recharts';
import {
    BarChart3, TrendingUp, TrendingDown, Clock,
    Building2, Activity, X, HelpCircle, Info,
} from 'lucide-react';

const API = import.meta.env.VITE_BACKEND_URL;
const getToken = () => localStorage.getItem('token');
const TIMEFRAMES = ['1D', '1W', '1M', '6M', '1Y', '5Y', 'MAX'];
const POLL_INTERVAL = 5000;

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────
const fmtINR = (v, d = 2) =>
    v != null
        ? `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })}`
        : '—';

const fmtCompact = (v) => {
    if (!v || v === 0) return '—';
    if (v >= 1e12) return `₹${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9) return `₹${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
    if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
    return fmtINR(v, 0);
};

const fmtNum = (v, d = 2) => (v != null && v !== 0 ? Number(v).toFixed(d) : '—');

const fmtVol = (v) => {
    if (!v) return '—';
    if (v >= 1e7) return `${(v / 1e7).toFixed(2)}Cr`;
    if (v >= 1e5) return `${(v / 1e5).toFixed(2)}L`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return String(v);
};

// ─────────────────────────────────────────────────────────────────────────────
// BUG 1 FIX — TIMESTAMP HANDLING
//
// Root cause: the original code called toLocaleDateString() on every data point
// before passing it to Recharts. For a 1D chart with 5-minute candles all on
// the same calendar day, every label becomes identical ("15 Jan"). Recharts
// treats those as the same X position and collapses them to a flat line.
//
// Fix: store a numeric `ts` (milliseconds since epoch) on every data point and
// use `type="number" scale="time"` on XAxis with dataKey="ts". Recharts then
// spaces candles correctly by their actual time. tickFormatter converts ts →
// human-readable string only for display.
// ─────────────────────────────────────────────────────────────────────────────

/** Convert any date-like value from the API to milliseconds since epoch. */
const toTs = (raw) => {
    if (!raw) return null;
    if (typeof raw === 'number') {
        // Yahoo Finance sometimes returns Unix seconds; ms timestamps are > 1e12
        return raw < 4_000_000_000 ? raw * 1000 : raw;
    }
    const d = new Date(raw);
    return isNaN(d) ? null : d.getTime();
};

const tsToXLabel = (ts, tf) => {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d)) return '';
    if (tf === '1D')
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (tf === '1W')
        return d.toLocaleString('en-IN', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const tsToTooltipLabel = (ts, tf) => {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d)) return '';
    if (tf === '1D')
        return d.toLocaleString('en-IN', {
            weekday: 'short', day: 'numeric', month: 'short',
            year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
        });
    if (tf === '1W')
        return d.toLocaleString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit', hour12: true,
        });
    return d.toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// FORECAST (1D only)
// Linear regression on last 14 candles, projected to 3:30 PM IST.
// Dampened exponentially so lines converge toward the mean instead of flying off.
// ─────────────────────────────────────────────────────────────────────────────
const INTERVAL_5M = 5 * 60 * 1000;

const generateForecast = (realPts, tf) => {
    if (tf !== '1D' || realPts.length < 8) return realPts;

    const last = realPts[realPts.length - 1];
    const lastD = new Date(last.ts);
    const closeD = new Date(lastD);
    closeD.setHours(15, 30, 0, 0);
    if (lastD >= closeD) return realPts;      // market already closed

    const slice = realPts.slice(-14);
    const n = slice.length;
    const xs = slice.map((_, i) => i);
    const ys = slice.map(p => p.close);
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
    const sumX2 = xs.reduce((s, x) => s + x * x, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (!denom) return realPts;

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    const mean = sumY / n;

    const pts = [];
    let t = new Date(lastD.getTime() + INTERVAL_5M);
    let step = 1;

    while (t <= closeD && step <= 20) {
        const raw = intercept + slope * (n - 1 + step);
        const damp = Math.pow(0.88, step);
        const close = parseFloat((raw * damp + mean * (1 - damp)).toFixed(2));
        pts.push({
            ts: t.getTime(),
            close: null,        // Area will not fill this
            forecastClose: close,
            high: null,
            low: null,
            volume: null,
            isForecast: true,
        });
        t = new Date(t.getTime() + INTERVAL_5M);
        step++;
    }
    return [...realPts, ...pts];
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM TOOLTIP
// ─────────────────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, timeframe }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload ?? {};
    const isForecast = d.isForecast;
    const price = isForecast ? d.forecastClose : d.close;
    const stroke = payload[0]?.stroke ?? '#6366f1';

    return (
        <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
            padding: '10px 14px', fontSize: 12, color: '#1e293b',
            boxShadow: '0 8px 24px rgba(0,0,0,.10)', minWidth: 190, pointerEvents: 'none',
        }}>
            <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6, fontWeight: 500 }}>
                {tsToTooltipLabel(d.ts, timeframe)}
                {isForecast && (
                    <span style={{
                        marginLeft: 6, color: '#8b5cf6', fontWeight: 700, fontSize: 10,
                        background: '#ede9fe', padding: '1px 6px', borderRadius: 4,
                    }}>
                        FORECAST
                    </span>
                )}
            </p>
            <p style={{ fontWeight: 700, fontSize: 15, color: stroke, marginBottom: 4 }}>
                {price != null ? fmtINR(price) : '—'}
            </p>
            {!isForecast && (
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 14px', marginTop: 4 }}>
                    {d.high != null && <><span style={{ color: '#94a3b8' }}>High</span>   <span style={{ fontWeight: 600, color: '#10b981', textAlign: 'right' }}>{fmtINR(d.high)}</span></>}
                    {d.low != null && <><span style={{ color: '#94a3b8' }}>Low</span>    <span style={{ fontWeight: 600, color: '#ef4444', textAlign: 'right' }}>{fmtINR(d.low)}</span></>}
                    {d.volume != null && <><span style={{ color: '#94a3b8' }}>Volume</span> <span style={{ fontWeight: 600, textAlign: 'right' }}>{fmtVol(d.volume)}</span></>}
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// BUG 3 FIX — TERM MODAL
//
// Every definition has 4 layers:
//   1. Plain-English tagline  — one sentence, zero jargon
//   2. Real-world analogy     — something anyone can picture
//   3. Range table            — colour-coded: green / amber / red
//   4. "What to aim for" box  — concrete ideal value for a common investor
//
// getSignal() reads the LIVE value from the component and shows an instant
// verdict banner: ✅ Looks Good / ⚠️ Be Careful / 🚨 Warning
// ─────────────────────────────────────────────────────────────────────────────
const getSignal = (term, rawValue) => {
    const v = parseFloat(rawValue);
    if (isNaN(v)) return null;

    const G = (tip) => ({ icon: '✅', label: 'Looks Good', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', tip });
    const W = (tip) => ({ icon: '⚠️', label: 'Be Careful', color: '#d97706', bg: '#fffbeb', border: '#fde68a', tip });
    const B = (tip) => ({ icon: '🚨', label: 'Warning', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', tip });
    const I = (tip) => ({ icon: 'ℹ️', label: 'Context Needed', color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', tip });

    switch (term) {
        case 'P/E Ratio':
            if (v <= 0) return B('Company is currently losing money — negative earnings');
            if (v <= 15) return G('Cheap vs earnings — possible value opportunity');
            if (v <= 30) return G('Fair price — normal for a steady company');
            if (v <= 50) return W('Expensive — only justified if strong growth is expected');
            return B('Very expensive — high risk if growth disappoints');

        case 'P/B Ratio':
            if (v < 0) return B('More debt than assets — financially fragile');
            if (v <= 1) return G('Trading below asset value — potential bargain');
            if (v <= 3) return G('Reasonable premium — typical for quality companies');
            if (v <= 6) return W('High premium — make sure growth justifies it');
            return B('Very expensive relative to assets');

        case 'EPS':
            if (v > 0) return G('Company is profitable — positive earnings per share');
            if (v === 0) return W('Breaking even — not yet profitable');
            return B('Company is losing money per share');

        case 'Div Yield':
            if (v === 0) return I('No dividend — profits reinvested for growth instead');
            if (v < 1) return W('Very low yield — minimal income from this stock');
            if (v <= 5) return G('Healthy yield — solid regular income');
            if (v <= 8) return W('High yield — verify it is sustainable long-term');
            return B('Unusually high yield — may be unsustainable');

        case 'Beta':
            if (v < 0) return I('Moves opposite to market — acts like a natural hedge');
            if (v <= 0.8) return G('Very stable — barely affected by market swings');
            if (v <= 1.2) return G('Tracks the market closely — average volatility');
            if (v <= 1.8) return W('More volatile than the market — higher swings');
            return B('Very volatile — big moves, high risk & reward');

        default: return null;
    }
};

const TERM_DEFS = {
    'Market Cap': {
        emoji: '🏢',
        tagline: 'The total price to buy 100% of the company at today\'s price',
        analogy: 'Picture the company as a house for sale. Market Cap is what it costs to buy the entire house — every brick, every room, at today\'s asking price. A ₹1 lakh crore company is a huge mansion; a ₹500 crore company is a studio apartment.',
        formula: 'Share Price  ×  Total Shares Outstanding',
        ideal: 'For beginners: Large-cap stocks (>₹20,000 Cr) are safer to start with.',
        ranges: [
            { dot: '#16a34a', label: 'Large-cap', value: '> ₹20,000 Cr', note: 'Stable giants — lower risk (e.g. TCS, Reliance)' },
            { dot: '#d97706', label: 'Mid-cap', value: '₹5,000 – 20,000 Cr', note: 'Balanced growth & risk' },
            { dot: '#dc2626', label: 'Small-cap', value: '< ₹5,000 Cr', note: 'High risk, high reward — for experienced investors' },
        ],
    },
    'P/E Ratio': {
        emoji: '⚖️',
        tagline: 'How many years of profit you\'re paying for upfront',
        analogy: 'You\'re buying a samosa stall that earns ₹1,000/year. If you pay ₹20,000 for it, your P/E is 20 — you\'ll "get your money back" in 20 years. A lower P/E means you\'re paying less for the same amount of profit — generally a better deal.',
        formula: 'Stock Price  ÷  Earnings Per Share (EPS)',
        ideal: 'For Indian markets: 15–25 is considered fair value. Always compare to peers in the same industry.',
        ranges: [
            { dot: '#16a34a', label: 'Undervalued', value: '< 15', note: 'Cheap — possible bargain, check why' },
            { dot: '#d97706', label: 'Fair Value', value: '15–30', note: 'Reasonably priced — normal range' },
            { dot: '#dc2626', label: 'Expensive', value: '> 30', note: 'High — only justified by very strong growth' },
        ],
    },
    'P/B Ratio': {
        emoji: '📚',
        tagline: 'What you pay vs. what the company actually owns',
        analogy: 'A company owns buildings, machinery, and cash worth ₹100. If you can buy all its shares for ₹80 — P/B = 0.8. You\'re buying ₹100 of stuff for just ₹80! P/B above 1 means you\'re paying extra for the company\'s brand and future earnings.',
        formula: 'Stock Price  ÷  Book Value Per Share',
        ideal: 'P/B below 1 can be a bargain (especially for banks). 1–3 is normal for most sectors.',
        ranges: [
            { dot: '#16a34a', label: 'Bargain', value: '< 1', note: 'Assets worth more than the share price' },
            { dot: '#d97706', label: 'Fair', value: '1–3', note: 'Normal premium for brand & growth' },
            { dot: '#dc2626', label: 'Expensive', value: '> 5', note: 'Paying a very steep premium' },
        ],
    },
    'EPS': {
        emoji: '🪙',
        tagline: 'The company\'s profit per share — in rupees',
        analogy: 'You own 1 share of a company. EPS of ₹50 means the company earned ₹50 of net profit "for your share" this year. You may not receive all of it (some goes back into the business), but higher EPS = healthier company. Negative EPS = company is losing money.',
        formula: 'Total Net Profit  ÷  Total Number of Shares',
        ideal: 'Positive and growing EPS year-over-year is one of the best signs of a healthy company.',
        ranges: [
            { dot: '#16a34a', label: 'Profitable', value: 'EPS > 0', note: 'Company is making money ✓' },
            { dot: '#d97706', label: 'Break-even', value: 'EPS = 0', note: 'Not yet profitable' },
            { dot: '#dc2626', label: 'Loss-making', value: 'EPS < 0', note: 'Company is losing money — be careful' },
        ],
    },
    'Div Yield': {
        emoji: '🎁',
        tagline: 'Free cash the company pays you every year just for holding the stock',
        analogy: 'Like a savings account interest rate — but from a company. If you invest ₹10,000 in a stock with 4% dividend yield, you receive ₹400 per year as cash payouts, no matter whether the stock price goes up or down.',
        formula: 'Annual Dividend Per Share  ÷  Current Share Price  ×  100',
        ideal: 'A 2–5% yield is healthy. Compare to your FD rate (~6–7%). Very high yields (>8%) need extra scrutiny.',
        ranges: [
            { dot: '#16a34a', label: 'Good income', value: '2–5%', note: 'Solid regular income stream' },
            { dot: '#d97706', label: 'Low', value: '< 2%', note: 'Minimal income — growth-focused stock' },
            { dot: '#dc2626', label: 'Risky high', value: '> 8%', note: 'Verify if the company can sustain it' },
        ],
    },
    '52W High': {
        emoji: '🏔️',
        tagline: 'The highest price this stock hit over the last 12 months',
        analogy: 'Think of it as the stock\'s "personal best" for the year. If today\'s price is close to the 52-week high, the stock is performing strongly. If it\'s far below, something has caused it to fall — you need to find out what.',
        formula: 'Highest closing price in the past 52 weeks',
        ideal: 'Current price within 5–10% of 52W High = strong uptrend. Far below = investigate before buying.',
        ranges: [
            { dot: '#16a34a', label: 'Near high', value: '> 90% of 52W High', note: 'Strong upward momentum' },
            { dot: '#d97706', label: 'Moderate dip', value: '70–90% of high', note: 'Possible recovery opportunity' },
            { dot: '#dc2626', label: 'Far below', value: '< 70% of high', note: 'Research why — could be trouble' },
        ],
    },
    '52W Low': {
        emoji: '⛏️',
        tagline: 'The lowest price this stock hit over the last 12 months',
        analogy: 'The 52-week low is the stock\'s "worst day of the year." If today\'s price is near the low, the stock is struggling. Some investors see this as a buying opportunity — but only if the company\'s fundamentals are still strong.',
        formula: 'Lowest closing price in the past 52 weeks',
        ideal: 'Price well above 52W Low = good recovery. Price near 52W Low = high risk; dig deeper.',
        ranges: [
            { dot: '#16a34a', label: 'Recovered', value: '> 30% above low', note: 'Well above its worst point' },
            { dot: '#d97706', label: 'Moderate', value: '10–30% above low', note: 'Partial recovery — watch closely' },
            { dot: '#dc2626', label: 'Near the low', value: '< 10% above low', note: 'Still struggling — proceed with caution' },
        ],
    },
    'Beta': {
        emoji: '〽️',
        tagline: 'How much this stock swings compared to the overall market',
        analogy: 'Beta is a volume knob. The market (Nifty) is volume 1. Beta 2 = this stock plays at volume 2 — twice as loud (volatile). Beta 0.5 = half as loud (calm). A roller coaster has high beta; a steady train ride has low beta.',
        formula: 'Calculated statistically vs. Nifty50 / Sensex movements',
        ideal: 'Conservative investors: Beta < 1. Aggressive growth seekers: Beta 1–2. Speculators only: Beta > 2.',
        ranges: [
            { dot: '#16a34a', label: 'Stable', value: 'Beta < 1', note: 'Smoother ride — less volatile than market' },
            { dot: '#d97706', label: 'Moderate', value: 'Beta 1–1.5', note: 'Moves with market + a bit extra' },
            { dot: '#dc2626', label: 'Volatile', value: 'Beta > 1.5', note: 'Wild swings — high risk and high reward' },
        ],
    },
    'Volume': {
        emoji: '🔊',
        tagline: 'How many shares were actually bought & sold today',
        analogy: 'Volume is like footfall in a shop. High footfall + prices rising = people are genuinely buying (bullish). High footfall + prices falling = people are rushing to exit (bearish). Low footfall = quiet day, price moves may be unreliable.',
        formula: 'Total shares traded in the current session',
        ideal: 'A big price move on HIGH volume is trustworthy. The same move on low volume is suspicious.',
        ranges: [
            { dot: '#16a34a', label: 'Bullish signal', value: '2× avg + price up', note: 'Strong genuine buying interest' },
            { dot: '#d97706', label: 'Normal', value: 'Near average volume', note: 'Regular day — no special signal' },
            { dot: '#dc2626', label: 'Bearish signal', value: '2× avg + price down', note: 'Heavy selling — exercise caution' },
        ],
    },
    'Avg Volume': {
        emoji: '📊',
        tagline: 'The usual number of shares traded on a typical day (10-day average)',
        analogy: 'Avg Volume is your baseline. If a stock normally trades 1 lakh shares a day and today it suddenly trades 10 lakh — something big is happening. Stocks with very low avg volume are like a small shop with few customers — hard to exit quickly if needed.',
        formula: '10-day rolling average of daily volume',
        ideal: 'Higher avg volume = better liquidity = safer to enter and exit. Avoid very low-volume stocks.',
        ranges: [
            { dot: '#16a34a', label: 'Liquid', value: '> 5 lakh shares/day', note: 'Easy to buy & sell — tight spreads' },
            { dot: '#d97706', label: 'Moderate', value: '1–5 lakh shares/day', note: 'Manageable — some slippage possible' },
            { dot: '#dc2626', label: 'Illiquid', value: '< 1 lakh shares/day', note: 'Hard to exit quickly — risky for traders' },
        ],
    },
};

// ── Modal Component ───────────────────────────────────────────────────────────
const TermModal = ({ term, value, onClose }) => {
    const def = TERM_DEFS[term];
    const signal = getSignal(term, value);

    useEffect(() => {
        const fn = e => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', fn);
        return () => window.removeEventListener('keydown', fn);
    }, [onClose]);

    if (!def) return null;
    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 2000,
                background: 'rgba(15,23,42,.65)', backdropFilter: 'blur(7px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
        >
            <style>{`
                @keyframes tm-pop {
                    from { opacity:0; transform:scale(.88) translateY(18px); }
                    to   { opacity:1; transform:scale(1)  translateY(0); }
                }
                .tm-body::-webkit-scrollbar { width:4px; }
                .tm-body::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px; }
            `}</style>

            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#fff', borderRadius: 22,
                    maxWidth: 500, width: '100%', maxHeight: '92vh',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '0 40px 90px rgba(0,0,0,.22)',
                    animation: 'tm-pop .26s cubic-bezier(.34,1.4,.64,1)',
                }}
            >
                {/* ── Header ── */}
                <div style={{ padding: '22px 22px 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div>
                            <span style={{ fontSize: 34, lineHeight: 1 }}>{def.emoji}</span>
                            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '6px 0 4px', letterSpacing: '-.5px' }}>{term}</h2>
                            <p style={{ fontSize: 13.5, color: '#475569', margin: 0, fontStyle: 'italic' }}>"{def.tagline}"</p>
                        </div>
                        <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <X size={16} color="#64748b" />
                        </button>
                    </div>

                    {/* Live verdict banner */}
                    {signal && value != null && (
                        <div style={{
                            marginTop: 14, padding: '9px 14px', borderRadius: 12,
                            background: signal.bg, border: `1.5px solid ${signal.border}`,
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                        }}>
                            <span style={{ fontSize: 20, flexShrink: 0 }}>{signal.icon}</span>
                            <div>
                                <p style={{ fontSize: 13, fontWeight: 800, color: signal.color, margin: '0 0 2px' }}>{signal.label}</p>
                                <p style={{ fontSize: 12.5, color: '#334155', margin: 0 }}>
                                    Current value is <strong>{typeof value === 'number' ? fmtNum(value) : value}</strong> — {signal.tip}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Scrollable body ── */}
                <div className="tm-body" style={{ overflowY: 'auto', padding: '18px 22px 4px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>

                    {/* Analogy block */}
                    <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>💡 Think of it like this</p>
                        <div style={{ background: '#fafbff', border: '1px solid #e0e7ff', borderRadius: 14, padding: '14px 16px' }}>
                            <p style={{ fontSize: 13.5, color: '#1e293b', lineHeight: 1.8, margin: 0 }}>{def.analogy}</p>
                        </div>
                    </div>

                    {/* Formula */}
                    <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>🧮 The formula</p>
                        <div style={{ background: '#0f172a', borderRadius: 10, padding: '11px 16px' }}>
                            <code style={{ fontSize: 13, color: '#7dd3fc', fontFamily: 'ui-monospace, monospace' }}>{def.formula}</code>
                        </div>
                    </div>

                    {/* Range table */}
                    <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>📊 What each value tells you</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {def.ranges.map((r, i) => (
                                <div key={i} style={{
                                    display: 'grid', gridTemplateColumns: '10px 1fr auto',
                                    alignItems: 'center', gap: 12,
                                    background: '#f8fafc', borderRadius: 11, padding: '11px 14px',
                                    border: `1.5px solid ${r.dot}22`,
                                }}>
                                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: r.dot, boxShadow: `0 0 7px ${r.dot}66`, display: 'block', flexShrink: 0 }} />
                                    <div>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: r.dot }}>{r.label}: </span>
                                        <span style={{ fontSize: 13, color: '#475569' }}>{r.value}</span>
                                    </div>
                                    <span style={{ fontSize: 11.5, color: '#64748b', textAlign: 'right', maxWidth: 160 }}>{r.note}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Ideal box */}
                    <div style={{
                        background: 'linear-gradient(135deg,#eff6ff,#f0fdf4)', borderRadius: 14,
                        border: '1px solid #bfdbfe', padding: '14px 16px',
                        display: 'flex', gap: 12, alignItems: 'flex-start',
                    }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>🎯</span>
                        <div>
                            <p style={{ fontSize: 11, fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '.5px', margin: '0 0 4px' }}>What to aim for</p>
                            <p style={{ fontSize: 13.5, color: '#1e3a5f', margin: 0, lineHeight: 1.65 }}>{def.ideal}</p>
                        </div>
                    </div>
                </div>

                {/* ── Footer ── */}
                <div style={{ padding: '14px 22px 20px', borderTop: '1px solid #f1f5f9', textAlign: 'center', flexShrink: 0 }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                            color: '#fff', border: 'none', borderRadius: 11,
                            padding: '11px 36px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                        }}
                    >
                        Got it! 👍
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Clickable info card ───────────────────────────────────────────────────────
const InfoCard = ({ label, value, icon, onClick }) => (
    <div
        onClick={onClick}
        title={`Tap to understand "${label}"`}
        style={{ cursor: 'pointer', userSelect: 'none' }}
        className="bg-white rounded-lg border border-slate-100 px-3 py-2.5 flex items-center gap-2 min-w-0 hover:border-indigo-300 hover:shadow-sm transition-all group"
    >
        {icon && <span className="text-slate-400 flex-shrink-0">{icon}</span>}
        <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider truncate flex items-center gap-1">
                {label}
                <HelpCircle size={9} className="text-indigo-300 group-hover:text-indigo-500 transition-colors" />
            </p>
            <p className="text-sm font-semibold text-slate-700 truncate">{value}</p>
        </div>
    </div>
);

// Skeleton
const ChartSkeleton = () => (
    <div style={{ padding: '8px 0' }}>
        <div style={{ height: 22, width: '40%', background: '#f1f5f9', borderRadius: 6, marginBottom: 10 }} />
        <div style={{ height: 14, width: '22%', background: '#f1f5f9', borderRadius: 6, marginBottom: 28 }} />
        <div style={{ height: 300, background: 'linear-gradient(180deg,#f8fafc,#f1f5f9)', borderRadius: 12 }} />
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const MarketChart = ({ holdings }) => {
    const [sym, setSym] = useState('');
    const [assetType, setAssetType] = useState('Stock');
    const [tf, setTf] = useState('1M');

    // rawData  = clean server data (no forecast)
    // dispData = rawData + forecast points
    const [rawData, setRawData] = useState([]);
    const [dispData, setDispData] = useState([]);

    const [loading, setLoading] = useState(false);
    const [livePrice, setLivePrice] = useState(null);

    // BUG 2 FIX: Keep intraday change separate from period change.
    // intraDayChange/Pct come from the live-quote API and are ONLY
    // used when tf === '1D'. For all other timeframes we compute
    // change from rawData[0].close → last live price so the % matches
    // the selected period (e.g. 1Y shows the 1-year gain/loss).
    const [intraDayChange, setIntraDayChange] = useState(null);
    const [intraDayPct, setIntraDayPct] = useState(null);

    const [delayed, setDelayed] = useState(false);
    const [fundamentals, setFundamentals] = useState(null);
    const [fundsLoading, setFundsLoading] = useState(false);
    const [activeTerm, setActiveTerm] = useState(null);
    const [activeVal, setActiveVal] = useState(null);

    const pollRef = useRef(null);
    const visibleRef = useRef(true);

    // ── Seed initial symbol ──────────────────────────────────────────────────
    useEffect(() => {
        if (holdings?.length && !sym) {
            setSym(holdings[0].symbol);
            setAssetType(holdings[0].assetType);
        }
    }, [holdings]);

    // ── Fetch historical data ────────────────────────────────────────────────
    useEffect(() => {
        if (!sym) return;

        // Reset ALL stale state before fetch so no bleed-over between switches
        setLoading(true);
        setRawData([]);
        setDispData([]);
        setLivePrice(null);
        setIntraDayChange(null);
        setIntraDayPct(null);
        setDelayed(false);
        setFundamentals(null);

        axios.get(`${API}/api/investments/historical/${encodeURIComponent(sym)}`, {
            params: { timeframe: tf, assetType },
            headers: { Authorization: `Bearer ${getToken()}` },
        })
            .then(r => {
                const cleaned = (r.data.data ?? [])
                    .map(p => {
                        const ts = toTs(p.date);           // BUG 1 FIX: numeric ms
                        if (!ts || p.close == null) return null;
                        return {
                            ts,
                            close: p.close,
                            high: p.high ?? null,
                            low: p.low ?? null,
                            volume: p.volume ?? null,
                            isForecast: false,
                        };
                    })
                    .filter(Boolean)
                    .sort((a, b) => a.ts - b.ts);          // ensure chronological

                setRawData(cleaned);
                setDispData(generateForecast(cleaned, tf));
                if (cleaned.length) setLivePrice(cleaned[cleaned.length - 1].close);
            })
            .catch(() => { setRawData([]); setDispData([]); })
            .finally(() => setLoading(false));

        // Fundamentals (stocks/ETFs only)
        if (['Stock', 'ETF'].includes(assetType)) {
            setFundsLoading(true);
            axios.get(`${API}/api/investments/fundamentals/${encodeURIComponent(sym)}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            })
                .then(r => setFundamentals(r.data))
                .catch(() => setFundamentals(null))
                .finally(() => setFundsLoading(false));
        }
    }, [sym, tf, assetType]);

    // Rebuild forecast whenever raw data or timeframe changes
    useEffect(() => {
        if (rawData.length) setDispData(generateForecast(rawData, tf));
    }, [rawData, tf]);

    // ── Live polling ─────────────────────────────────────────────────────────
    const pollPrice = useCallback(() => {
        if (!sym || !visibleRef.current) return;
        axios.get(`${API}/api/investments/quote/${encodeURIComponent(sym)}`, {
            params: { assetType },
            headers: { Authorization: `Bearer ${getToken()}` },
        })
            .then(r => {
                const q = r.data;
                if (q?.price > 0) {
                    setLivePrice(q.price);
                    // Store intraday-specific stats — only used when tf==='1D'
                    setIntraDayChange(q.change ?? null);
                    setIntraDayPct(q.changePercent ?? null);
                    setDelayed(false);
                    setRawData(prev => {
                        if (!prev.length) return prev;
                        const next = [...prev];
                        const last = next[next.length - 1];
                        next[next.length - 1] = {
                            ...last,
                            close: q.price,
                            high: last.high != null ? Math.max(last.high, q.price) : q.price,
                            low: last.low != null ? Math.min(last.low, q.price) : q.price,
                        };
                        return next;
                    });
                } else {
                    setDelayed(true);
                }
            })
            .catch(() => setDelayed(true));
    }, [sym, assetType]);

    useEffect(() => {
        clearInterval(pollRef.current);
        if (!sym) return;
        pollRef.current = setInterval(pollPrice, POLL_INTERVAL);
        return () => clearInterval(pollRef.current);
    }, [sym, pollPrice]);

    useEffect(() => {
        const fn = () => {
            visibleRef.current = !document.hidden;
            if (!document.hidden && sym) pollPrice();
        };
        document.addEventListener('visibilitychange', fn);
        return () => document.removeEventListener('visibilitychange', fn);
    }, [sym, pollPrice]);

    // ── Empty state ──────────────────────────────────────────────────────────
    if (!holdings?.length) return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <BarChart3 size={48} className="opacity-20 mb-3" />
            <p className="text-lg font-semibold text-slate-600">No holdings to chart</p>
            <p className="text-sm">Add investments to view market charts</p>
        </div>
    );

    // ── Derived display values ───────────────────────────────────────────────
    const realPts = dispData.filter(d => !d.isForecast);
    const last = livePrice ?? (realPts.length ? realPts[realPts.length - 1].close : 0);
    const periodFirst = realPts.length ? realPts[0].close : 0;

    // BUG 2 FIX: correct change/pct per timeframe
    const change = (tf === '1D' && intraDayChange != null)
        ? intraDayChange
        : last - periodFirst;
    const pct = (tf === '1D' && intraDayPct != null)
        ? intraDayPct
        : (periodFirst ? (change / periodFirst) * 100 : 0);

    const up = change >= 0;
    const lineColor = up ? '#10b981' : '#ef4444';
    const foreColor = '#8b5cf6';
    const hasForecast = dispData.some(d => d.isForecast);

    return (
        <>
            {activeTerm && (
                <TermModal
                    term={activeTerm}
                    value={activeVal}
                    onClose={() => { setActiveTerm(null); setActiveVal(null); }}
                />
            )}

            <div className="space-y-4">
                {/* ── Controls ──────────────────────────────────────────────── */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-3 items-center justify-between">
                    <select
                        className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 max-w-[280px] truncate"
                        value={sym}
                        onChange={e => {
                            const h = holdings.find(x => x.symbol === e.target.value);
                            setSym(e.target.value);
                            if (h) setAssetType(h.assetType);
                        }}
                    >
                        {holdings.map(h => (
                            <option key={h.symbol} value={h.symbol}>{h.name} ({h.symbol})</option>
                        ))}
                    </select>

                    <div className="flex items-center gap-1.5 flex-wrap">
                        {delayed && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold bg-amber-50 text-amber-600 rounded-md border border-amber-200">
                                <Clock size={10} /> Delayed
                            </span>
                        )}
                        {hasForecast && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold bg-violet-50 text-violet-600 rounded-md border border-violet-200">
                                ✦ AI Forecast
                            </span>
                        )}
                        <div className="flex gap-0.5 bg-slate-100 p-0.5 rounded-lg">
                            {TIMEFRAMES.map(t => (
                                <button
                                    key={t} onClick={() => setTf(t)}
                                    className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-md transition-all ${t === tf ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Chart ─────────────────────────────────────────────────── */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    {loading ? <ChartSkeleton /> : dispData.length ? (
                        <>
                            {/* Price header */}
                            <div className="flex flex-wrap justify-between items-center mb-5 gap-2">
                                <div className="flex items-baseline gap-3 flex-wrap">
                                    <span className="text-3xl font-bold text-slate-800">{fmtINR(last)}</span>
                                    <span className={`inline-flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-lg ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                        {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {up ? '+' : ''}{Number(change).toFixed(2)} ({Number(pct).toFixed(2)}%)
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {tf === '1D' ? 'Today\'s change' : `${tf} period change`}
                                    </span>
                                </div>
                                <span className="text-xs text-slate-400">{realPts.length} data points</span>
                            </div>

                            {/* Recharts */}
                            <div style={{ height: 340 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={dispData} margin={{ top: 5, right: 26, bottom: 5, left: 0 }}>
                                        <defs>
                                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={lineColor} stopOpacity={0.15} />
                                                <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

                                        {/*
                                          BUG 1 FIX: XAxis uses numeric `ts` with scale="time".
                                          Recharts distributes ticks correctly across the time range,
                                          which is the ONLY way 1D/1W (many same-day points) render.
                                        */}
                                        <XAxis
                                            dataKey="ts"
                                            type="number"
                                            scale="time"
                                            domain={['dataMin', 'dataMax']}
                                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickCount={7}
                                            tickFormatter={ts => tsToXLabel(ts, tf)}
                                        />
                                        <YAxis
                                            domain={['auto', 'auto']}
                                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                                            axisLine={false}
                                            tickLine={false}
                                            width={74}
                                            tickFormatter={v => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                                        />
                                        <Tooltip
                                            content={<CustomTooltip timeframe={tf} />}
                                            cursor={{ stroke: '#cbd5e1', strokeWidth: 1.5 }}
                                        />
                                        {livePrice && (
                                            <ReferenceLine
                                                y={livePrice}
                                                stroke={lineColor}
                                                strokeDasharray="4 3"
                                                strokeWidth={1}
                                                label={{ value: fmtINR(livePrice, 1), fill: lineColor, fontSize: 10, position: 'insideRight' }}
                                            />
                                        )}
                                        {/* Real price area */}
                                        <Area
                                            type="monotone"
                                            dataKey="close"
                                            stroke={lineColor}
                                            strokeWidth={2.5}
                                            fill="url(#areaGrad)"
                                            dot={false}
                                            connectNulls={false}
                                            animationDuration={300}
                                            isAnimationActive={realPts.length < 400}
                                        />
                                        {/* Forecast dashed line */}
                                        {hasForecast && (
                                            <Line
                                                type="monotone"
                                                dataKey="forecastClose"
                                                stroke={foreColor}
                                                strokeWidth={2}
                                                strokeDasharray="6 4"
                                                dot={false}
                                                connectNulls
                                                animationDuration={500}
                                            />
                                        )}
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Legend */}
                            {hasForecast && (
                                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 flex-wrap text-[11px]">
                                    <span className="flex items-center gap-1.5 text-slate-500">
                                        <span style={{ width: 18, height: 2.5, background: lineColor, display: 'inline-block', borderRadius: 2 }} />
                                        Actual price
                                    </span>
                                    <span className="flex items-center gap-1.5 text-violet-500">
                                        <span style={{ width: 18, borderTop: `2.5px dashed ${foreColor}`, display: 'inline-block' }} />
                                        AI trend forecast
                                    </span>
                                    <span className="flex items-center gap-1 text-slate-400 ml-auto">
                                        <Info size={10} />
                                        Projection only — not financial advice
                                    </span>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-center py-20 text-slate-400 text-sm">
                            No chart data for this symbol / timeframe.
                        </p>
                    )}
                </div>

                {/* ── Financial Overview ─────────────────────────────────────── */}
                {['Stock', 'ETF'].includes(assetType) && (
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <Building2 size={15} className="text-indigo-500" />
                            <h3 className="text-sm font-semibold text-slate-700">Financial Overview</h3>
                            {fundamentals?.sector && fundamentals.sector !== 'N/A' && (
                                <span className="ml-auto px-2 py-0.5 text-[10px] font-medium bg-indigo-50 text-indigo-600 rounded-full">
                                    {fundamentals.sector}{fundamentals.industry && fundamentals.industry !== 'N/A' ? ` · ${fundamentals.industry}` : ''}
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-400 mb-3 flex items-center gap-1">
                            <HelpCircle size={10} className="text-indigo-300" />
                            Tap any metric to understand exactly what it means in plain English
                        </p>

                        {fundsLoading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                                {Array.from({ length: 10 }).map((_, i) => (
                                    <div key={i} style={{ height: 58, background: '#f8fafc', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
                                ))}
                            </div>
                        ) : fundamentals ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                                {[
                                    { label: 'Market Cap', value: fmtCompact(fundamentals.marketCap), raw: fundamentals.marketCap },
                                    { label: 'P/E Ratio', value: fmtNum(fundamentals.peRatio), raw: fundamentals.peRatio },
                                    { label: 'P/B Ratio', value: fmtNum(fundamentals.pbRatio), raw: fundamentals.pbRatio },
                                    { label: 'EPS', value: fundamentals.eps ? `₹${fmtNum(fundamentals.eps)}` : '—', raw: fundamentals.eps },
                                    { label: 'Div Yield', value: fundamentals.dividendYield ? `${fmtNum(fundamentals.dividendYield)}%` : '—', raw: fundamentals.dividendYield },
                                    { label: '52W High', value: fundamentals.week52High ? fmtINR(fundamentals.week52High) : '—', raw: fundamentals.week52High },
                                    { label: '52W Low', value: fundamentals.week52Low ? fmtINR(fundamentals.week52Low) : '—', raw: fundamentals.week52Low },
                                    { label: 'Beta', value: fmtNum(fundamentals.beta), raw: fundamentals.beta },
                                    { label: 'Volume', value: fmtVol(fundamentals.volume), icon: <Activity size={12} />, raw: fundamentals.volume },
                                    { label: 'Avg Volume', value: fmtVol(fundamentals.avgVolume), raw: fundamentals.avgVolume },
                                ].map(({ label, value, icon, raw }) => (
                                    <InfoCard
                                        key={label}
                                        label={label}
                                        value={value}
                                        icon={icon}
                                        onClick={() => { setActiveTerm(label); setActiveVal(raw); }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 text-center py-4">
                                Fundamentals not available for this instrument
                            </p>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default MarketChart;