/**
 * marketDataProxy.js — Fixed Yahoo Finance integration
 *
 * KEY FIX (root cause of 1D/1W graphs being invisible):
 * ───────────────────────────────────────────────────────
 * yahoo-finance2's  chart()  method schema requires  { period1, period2, interval }
 * It does NOT accept a `range` property at all — passing `range` causes a hard
 * validation error:
 *
 *   "Missing required properties: period1"
 *   "should NOT have additional properties: range"
 *
 * The original code used:
 *   yahooFinance.chart(symbol, { range: '1d', interval: '5m' })   ← WRONG
 *   yahooFinance.chart(symbol, { range: '7d', interval: '15m' })  ← WRONG
 *
 * Fix: replace `range` with explicit `period1` / `period2` Date objects
 * for every chart() call, using the helper buildPeriod1Intraday().
 *
 * ALL other previously identified bugs are also kept fixed here.
 */

import YahooFinance from 'yahoo-finance2';          // singleton — NOT a constructor
import PriceCache from '../models/PriceCache.js';
import { getMutualFundNAV } from './amfiNav.js';
import { getCryptoPrice } from './coinGecko.js';
// import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({
    suppressNotices: ["yahooSurvey"],
});
// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const REQUEST_TIMEOUT_MS = 10_000;
const CACHE_TTL_SECONDS = 60;

// NSE market hours in UTC  (IST = UTC + 5:30)
//   Open  → 09:15 IST = 03:45 UTC
//   Close → 15:30 IST = 10:00 UTC
const NSE_OPEN_HOUR_UTC = 3;
const NSE_OPEN_MIN_UTC = 45;

// ─────────────────────────────────────────────────────────────────────────────
// TIMEFRAME CONFIG
// interval is used for BOTH chart() and historical() calls.
// range is REMOVED — we build period1/period2 explicitly everywhere.
// ─────────────────────────────────────────────────────────────────────────────
const TIMEFRAME_CONFIG = {
    '1D': { interval: '5m', days: null },   // special: market-open → now
    '1W': { interval: '15m', days: 7 },
    '1M': { interval: '1d', days: 30 },
    '6M': { interval: '1d', days: 180 },
    '1Y': { interval: '1wk', days: 365 },
    '5Y': { interval: '1mo', days: 1825 },
    'MAX': { interval: '1mo', days: 3650 },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch options that abort after REQUEST_TIMEOUT_MS. */
const withTimeout = () => ({
    fetchOptions: { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
});

/**
 * Normalise a symbol for Yahoo Finance.
 * Only appends .NS for Stock/ETF symbols that don't already have a suffix.
 * Crypto and Mutual Fund symbols are returned untouched.
 */
const normalizeSymbol = (symbol, assetType = 'Stock') => {
    if (!symbol) return symbol;
    if (assetType === 'Crypto' || assetType === 'Mutual Fund') return symbol;
    if (symbol.includes('.')) return symbol;
    return `${symbol}.NS`;
};

/**
 * Build period1 for the 1D timeframe.
 *
 * We want candles from today's NSE market open (09:15 IST / 03:45 UTC).
 * If the current UTC time is before market open (e.g. early morning),
 * use yesterday's open so we always get a full session's worth of data.
 */
const buildPeriod1ForToday = () => {
    const now = new Date();
    const open = new Date(now);
    open.setUTCHours(NSE_OPEN_HOUR_UTC, NSE_OPEN_MIN_UTC, 0, 0);

    // Before today's market open → use previous trading day's open
    if (now < open) {
        open.setUTCDate(open.getUTCDate() - 1);
    }
    return open;
};

/**
 * Build period1 for multi-day timeframes using calendar-safe arithmetic.
 * Uses setMonth/setFullYear so DST transitions don't cause off-by-one days.
 */
const buildPeriod1 = (timeframe, now) => {
    const d = new Date(now);
    switch (timeframe) {
        case '1W': d.setDate(d.getDate() - 7); break;
        case '1M': d.setMonth(d.getMonth() - 1); break;
        case '6M': d.setMonth(d.getMonth() - 6); break;
        case '1Y': d.setFullYear(d.getFullYear() - 1); break;
        case '5Y': d.setFullYear(d.getFullYear() - 5); break;
        case 'MAX': d.setFullYear(d.getFullYear() - 20); break;
        default: d.setMonth(d.getMonth() - 1); break;
    }
    return d;
};

/**
 * Normalise a raw date value from yahoo-finance2 to a JS Date.
 * chart() returns JS Date objects; historical() also returns JS Date objects.
 * Guard against epoch-second numbers just in case.
 */
const toDate = (raw) => {
    if (!raw) return null;
    if (raw instanceof Date) return raw;
    if (typeof raw === 'number') {
        return new Date(raw < 4_000_000_000 ? raw * 1000 : raw);
    }
    const d = new Date(raw);
    return isNaN(d) ? null : d;
};

// ─────────────────────────────────────────────────────────────────────────────
// CHART RESULT PARSER
//
// yahoo-finance2 chart() returns result.quotes[] where each item is:
//   { date: Date, open, high, low, close, volume }
//
// We also handle the raw fallback shape (result.timestamp + result.indicators)
// for older versions or edge cases.
// ─────────────────────────────────────────────────────────────────────────────
const parseChartResult = (result) => {
    // Primary shape: result.quotes[]
    const quotes = result?.quotes ?? [];
    if (quotes.length > 0) {
        return quotes
            .filter(v => v != null && v.close != null)
            .map(v => ({
                date: toDate(v.date),
                open: v.open ?? null,
                high: v.high ?? null,
                low: v.low ?? null,
                close: v.close,
                volume: v.volume ?? 0,
            }));
    }

    // Fallback shape: raw timestamps + indicators
    const timestamps = result?.timestamp ?? [];
    const ohlcv = result?.indicators?.quote?.[0] ?? {};
    return timestamps
        .map((ts, i) => ({
            date: new Date(ts * 1000),
            open: ohlcv.open?.[i] ?? null,
            high: ohlcv.high?.[i] ?? null,
            low: ohlcv.low?.[i] ?? null,
            close: ohlcv.close?.[i] ?? null,
            volume: ohlcv.volume?.[i] ?? 0,
        }))
        .filter(v => v.close != null);
};

// ─────────────────────────────────────────────────────────────────────────────
// LIVE PRICE
// ─────────────────────────────────────────────────────────────────────────────
export const fetchLivePrice = async (symbol, assetType, forceRefresh = false) => {
    const normalized = normalizeSymbol(symbol, assetType);

    // Cache read
    if (!forceRefresh) {
        try {
            const cached = await PriceCache.findOne({
                symbol: normalized,
                updatedAt: { $gte: new Date(Date.now() - CACHE_TTL_SECONDS * 1000) },
            });
            if (cached) {
                return {
                    price: cached.price ?? 0,
                    change: cached.change ?? 0,
                    changePercent: cached.changePercent ?? 0,
                    fromCache: true,
                };
            }
        } catch (e) {
            console.warn('PriceCache read error:', e.message);
        }
    }

    // Live fetch
    try {
        let result = { price: 0, change: 0, changePercent: 0 };

        if (['Stock', 'ETF'].includes(assetType)) {
            const q = await yahooFinance.quote(normalized, {}, withTimeout());
            result = {
                price: q.regularMarketPrice ?? 0,
                change: q.regularMarketChange ?? 0,
                changePercent: q.regularMarketChangePercent ?? 0,
            };
        } else if (assetType === 'Mutual Fund') {
            const data = await getMutualFundNAV(normalized);
            result = { price: data?.nav ?? 0, change: 0, changePercent: 0 };
        } else if (assetType === 'Crypto') {
            const data = await getCryptoPrice(normalized);
            result = {
                price: data?.price ?? 0,
                change: data?.change ?? 0,
                changePercent: data?.changePercent ?? 0,
            };
        }

        // Cache write
        try {
            await PriceCache.findOneAndUpdate(
                { symbol: normalized },
                { ...result, symbol: normalized, updatedAt: new Date() },
                { upsert: true, new: true }
            );
        } catch (e) {
            console.warn('PriceCache write error:', e.message);
        }

        return result;

    } catch (err) {
        console.error('Price fetch error:', normalized, err.message);
        return { price: 0, change: 0, changePercent: 0, error: err.message };
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// HISTORICAL / INTRADAY DATA
//
// THE MAIN FIX IS HERE:
//
// BEFORE (broken):
//   yahooFinance.chart(symbol, { range: '1d', interval: '5m' })
//   yahooFinance.chart(symbol, { range: '7d', interval: '15m' })
//
//   → Throws: "Missing required: period1" + "should NOT have: range"
//   → Returns [] → frontend gets no data → chart invisible
//
// AFTER (fixed):
//   yahooFinance.chart(symbol, { period1: <Date>, period2: <Date>, interval: '5m' })
//   yahooFinance.chart(symbol, { period1: <Date>, period2: <Date>, interval: '15m' })
//
//   1D → period1 = today's NSE market open (09:15 IST)
//   1W → period1 = 7 days ago
//
// We continue using chart() for 1D/1W because it returns intraday-resolution
// data. For longer timeframes we use historical() which is more reliable.
// ─────────────────────────────────────────────────────────────────────────────
export const fetchHistoricalData = async (symbol, timeframe = '1M', assetType = 'Stock') => {
    const normalized = normalizeSymbol(symbol, assetType);
    const config = TIMEFRAME_CONFIG[timeframe];
    if (!config) return [];

    const now = new Date();

    try {
        if (timeframe === '1D') {
            // ── Intraday 1D: 5-minute candles from market open → now ──────────
            const period1 = buildPeriod1ForToday();

            console.log(`[chart 1D] ${normalized}  period1=${period1.toISOString()}  interval=5m`);

            const result = await yahooFinance.chart(
                normalized,
                {
                    period1,          // ← REQUIRED (was missing before)
                    period2: now,     // ← optional but explicit
                    interval: '5m',
                    // NO `range` property — it is not allowed by the schema
                },
                withTimeout()
            );
            return parseChartResult(result);
        }

        if (timeframe === '1W') {
            // ── Intraday 1W: 15-minute candles for the past 7 days ───────────
            const period1 = buildPeriod1('1W', now);

            console.log(`[chart 1W] ${normalized}  period1=${period1.toISOString()}  interval=15m`);

            const result = await yahooFinance.chart(
                normalized,
                {
                    period1,          // ← REQUIRED (was missing before)
                    period2: now,
                    interval: '15m',
                    // NO `range` property
                },
                withTimeout()
            );
            return parseChartResult(result);
        }

        // ── Daily/weekly/monthly: use historical() ────────────────────────────
        const period1 = buildPeriod1(timeframe, now);

        console.log(`[historical ${timeframe}] ${normalized}  period1=${period1.toISOString()}  interval=${config.interval}`);

        const result = await yahooFinance.historical(
            normalized,
            { period1, period2: now, interval: config.interval },
            withTimeout()
        );

        if (!Array.isArray(result) || result.length === 0) return [];

        return result
            .filter(v => v.close != null)
            .map(v => ({
                date: toDate(v.date),
                open: v.open ?? null,
                high: v.high ?? null,
                low: v.low ?? null,
                close: v.close,
                volume: v.volume ?? 0,
            }));

    } catch (err) {
        console.error(`Yahoo history error: ${normalized}`, err.message);
        return [];
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// SYMBOL SEARCH
// ─────────────────────────────────────────────────────────────────────────────
export const searchStockSymbol = async (query) => {
    if (!query?.trim()) return [];
    try {
        const result = await yahooFinance.search(query, {}, withTimeout());
        return (result?.quotes ?? []).slice(0, 15).map(q => ({
            symbol: q.symbol,
            name: q.shortname || q.longname || q.symbol,
            exchange: q.exchange || '',
            type: q.quoteType || 'EQUITY',
        }));
    } catch (err) {
        console.error('Search error:', err.message);
        return [];
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNDAMENTALS
// ─────────────────────────────────────────────────────────────────────────────
export const getFundamentals = async (symbol, assetType = 'Stock') => {
    const normalized = normalizeSymbol(symbol, assetType);

    const EMPTY = {
        name: normalized, sector: 'N/A', industry: 'N/A', exchange: '',
        marketCap: 0, peRatio: 0, pbRatio: 0, eps: 0,
        dividendYield: 0, beta: 0, week52High: 0, week52Low: 0,
        volume: 0, avgVolume: 0,
    };

    try {
        const [quote, summary] = await Promise.all([
            yahooFinance.quote(normalized, {}, withTimeout()),
            yahooFinance.quoteSummary(normalized, {
                modules: ['summaryProfile', 'summaryDetail', 'defaultKeyStatistics'],
            }, withTimeout()),
        ]);

        const det = summary?.summaryDetail ?? {};
        const key = summary?.defaultKeyStatistics ?? {};
        const prof = summary?.summaryProfile ?? {};

        return {
            name: quote.longName || quote.shortName || normalized,
            sector: prof.sector || 'N/A',
            industry: prof.industry || 'N/A',
            exchange: quote.exchange || '',
            marketCap: quote.marketCap || det.marketCap || 0,
            peRatio: quote.trailingPE || det.trailingPE || 0,
            pbRatio: key.priceToBook || 0,
            eps: quote.epsTrailingTwelveMonths || 0,
            dividendYield: det.dividendYield || 0,
            beta: key.beta || 0,
            week52High: quote.fiftyTwoWeekHigh || 0,
            week52Low: quote.fiftyTwoWeekLow || 0,
            volume: quote.regularMarketVolume || 0,
            avgVolume: quote.averageDailyVolume10Day || 0,
        };

    } catch (err) {
        console.error('Fundamentals error:', normalized, err.message);
        return { ...EMPTY, error: err.message };
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// REALTIME QUOTE
// ─────────────────────────────────────────────────────────────────────────────
export const getLatestQuote = async (symbol, assetType = 'Stock') => {
    const {
        price = 0,
        change = 0,
        changePercent = 0,
        error,
    } = await fetchLivePrice(symbol, assetType, true);

    return {
        price,
        change,
        changePercent,
        timestamp: Date.now(),
        ...(error && { error }),
    };
};