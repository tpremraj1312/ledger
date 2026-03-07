/**
 * Investment Transaction Routes — Buy/Sell API with idempotency, validation, and snapshot recalculation.
 */

import express from 'express';
import InvestmentTransaction from '../models/InvestmentTransaction.js';
import { rebuildSnapshot, getSnapshot, validateSell } from '../services/portfolioEngine.js';
import { fetchHistoricalData } from '../utils/marketDataProxy.js';
import { searchStockSymbol, getFundamentals, getLatestQuote } from '../utils/marketDataProxy.js';
import { searchMutualFunds } from '../utils/amfiNav.js';
import { searchCrypto } from '../utils/coinGecko.js';
import { getMarketNews } from '../utils/newsFetcher.js';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// BUY TRANSACTION
// ═══════════════════════════════════════════════════════════════

router.post('/txn/buy', async (req, res) => {
    try {
        const { assetType, name, symbol, quantity, price, txnDate, fees, notes, idempotencyKey } = req.body;

        // Validation
        if (!assetType || !name || !symbol || !quantity || !price) {
            return res.status(400).json({ message: 'Missing required fields: assetType, name, symbol, quantity, price' });
        }
        if (quantity <= 0) return res.status(400).json({ message: 'Quantity must be positive' });
        if (price < 0) return res.status(400).json({ message: 'Price cannot be negative' });

        // Generate idempotency key if not provided
        const idemKey = idempotencyKey || `BUY_${req.user._id}_${symbol}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Idempotency check
        const existing = await InvestmentTransaction.findOne({ idempotencyKey: idemKey });
        if (existing) {
            return res.status(200).json({ message: 'Transaction already processed', transaction: existing });
        }

        const totalAmount = Number(quantity) * Number(price);

        const txn = new InvestmentTransaction({
            user: req.user._id,
            txnType: 'BUY',
            assetType,
            name,
            symbol,
            quantity: Number(quantity),
            price: Number(price),
            totalAmount,
            txnDate: txnDate ? new Date(txnDate) : new Date(),
            fees: Number(fees) || 0,
            notes: notes || '',
            idempotencyKey: idemKey,
        });

        await txn.save();

        // Trigger async snapshot recalculation
        rebuildSnapshot(req.user._id).catch(err =>
            console.error('Snapshot rebuild error after BUY:', err)
        );

        res.status(201).json({ message: 'Buy transaction recorded', transaction: txn });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(200).json({ message: 'Duplicate transaction (idempotent)' });
        }
        console.error('Buy Transaction Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// ═══════════════════════════════════════════════════════════════
// SELL TRANSACTION
// ═══════════════════════════════════════════════════════════════

router.post('/txn/sell', async (req, res) => {
    try {
        const { assetType, name, symbol, quantity, price, txnDate, fees, notes, idempotencyKey } = req.body;

        // Validation
        if (!symbol || !quantity || !price) {
            return res.status(400).json({ message: 'Missing required fields: symbol, quantity, price' });
        }
        if (quantity <= 0) return res.status(400).json({ message: 'Quantity must be positive' });

        // Validate sufficient holdings
        const validation = await validateSell(req.user._id, symbol, Number(quantity));
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        const idemKey = idempotencyKey || `SELL_${req.user._id}_${symbol}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Idempotency check
        const existing = await InvestmentTransaction.findOne({ idempotencyKey: idemKey });
        if (existing) {
            return res.status(200).json({ message: 'Transaction already processed', transaction: existing });
        }

        const holding = validation.holding;
        const totalAmount = Number(quantity) * Number(price);

        const txn = new InvestmentTransaction({
            user: req.user._id,
            txnType: 'SELL',
            assetType: assetType || holding.assetType,
            name: name || holding.name,
            symbol,
            quantity: Number(quantity),
            price: Number(price),
            totalAmount,
            txnDate: txnDate ? new Date(txnDate) : new Date(),
            fees: Number(fees) || 0,
            notes: notes || '',
            idempotencyKey: idemKey,
        });

        await txn.save();

        // Trigger async snapshot recalculation
        rebuildSnapshot(req.user._id).catch(err =>
            console.error('Snapshot rebuild error after SELL:', err)
        );

        res.status(201).json({ message: 'Sell transaction recorded', transaction: txn });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(200).json({ message: 'Duplicate transaction (idempotent)' });
        }
        console.error('Sell Transaction Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// ═══════════════════════════════════════════════════════════════
// TRANSACTION HISTORY
// ═══════════════════════════════════════════════════════════════

router.get('/txn/history', async (req, res) => {
    try {
        const { symbol, txnType, page = 1, limit = 50, startDate, endDate } = req.query;
        const query = { user: req.user._id };

        if (symbol) query.symbol = symbol;
        if (txnType) query.txnType = txnType;
        if (startDate || endDate) {
            query.txnDate = {};
            if (startDate) query.txnDate.$gte = new Date(startDate);
            if (endDate) query.txnDate.$lte = new Date(endDate);
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [transactions, total] = await Promise.all([
            InvestmentTransaction.find(query).sort({ txnDate: -1, createdAt: -1 }).skip(skip).limit(Number(limit)),
            InvestmentTransaction.countDocuments(query)
        ]);

        res.json({
            transactions,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error('Transaction History Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// ═══════════════════════════════════════════════════════════════
// PORTFOLIO SNAPSHOT (Cached — fast reads)
// ═══════════════════════════════════════════════════════════════

router.get('/portfolio', async (req, res) => {
    try {
        const snapshot = await getSnapshot(req.user._id);
        res.json(snapshot);
    } catch (error) {
        console.error('Portfolio Snapshot Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Force refresh portfolio with latest market prices
router.post('/portfolio/refresh', async (req, res) => {
    try {
        const snapshot = await rebuildSnapshot(req.user._id);
        res.json({ message: 'Portfolio refreshed', snapshot });
    } catch (error) {
        console.error('Portfolio Refresh Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Detailed P&L breakdown
router.get('/portfolio/pl', async (req, res) => {
    try {
        const snapshot = await getSnapshot(req.user._id);
        const transactions = await InvestmentTransaction.find({ user: req.user._id }).sort({ txnDate: -1 });

        // Group realized P&L by symbol
        const realizedBySymbol = {};
        const sellTxns = transactions.filter(t => t.txnType === 'SELL');

        // Need to recalculate realized P&L per symbol from ledger
        const allTxns = await InvestmentTransaction.find({ user: req.user._id }).sort({ txnDate: 1 });
        const holdingsCalc = {};

        for (const txn of allTxns) {
            if (!holdingsCalc[txn.symbol]) holdingsCalc[txn.symbol] = { qty: 0, cost: 0, realizedPL: 0 };
            const h = holdingsCalc[txn.symbol];

            if (txn.txnType === 'BUY') {
                h.qty += txn.quantity;
                h.cost += txn.totalAmount;
            } else {
                const avgCost = h.qty > 0 ? h.cost / h.qty : 0;
                const costOfSold = avgCost * txn.quantity;
                h.realizedPL += txn.totalAmount - costOfSold;
                h.qty -= txn.quantity;
                h.cost -= costOfSold;
            }
        }

        const plBreakdown = snapshot.holdings.map(h => ({
            symbol: h.symbol,
            name: h.name,
            assetType: h.assetType,
            invested: h.totalInvested,
            currentValue: h.currentValue,
            unrealizedPL: h.unrealizedPL,
            unrealizedPLPercent: h.unrealizedPLPercent,
            realizedPL: Math.round(holdingsCalc[h.symbol]?.realizedPL || 0),
            totalPL: h.unrealizedPL + Math.round(holdingsCalc[h.symbol]?.realizedPL || 0),
        }));

        res.json({
            summary: snapshot.summary,
            holdings: plBreakdown,
            recentSells: sellTxns.slice(0, 20)
        });
    } catch (error) {
        console.error('P&L Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// ═══════════════════════════════════════════════════════════════
// HISTORICAL DATA
// ═══════════════════════════════════════════════════════════════

router.get('/historical/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { timeframe = '1M', assetType = 'Stock' } = req.query;
        const history = await fetchHistoricalData(symbol, timeframe, assetType);
        res.json({ symbol, timeframe, data: history });
    } catch (error) {
        console.error('Historical Data Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// ═══════════════════════════════════════════════════════════════
// SEARCH (preserved & enhanced)
// ═══════════════════════════════════════════════════════════════

router.get('/search', async (req, res) => {
    try {
        const { query, type } = req.query;
        if (!query) return res.status(400).json({ message: 'Query parameter is required' });

        let results = [];
        if (type === 'crypto') {
            results = await searchCrypto(query);
        } else if (type === 'mutualfund') {
            results = await searchMutualFunds(query);
        } else {
            results = await searchStockSymbol(query);
        }

        res.json(results);
    } catch (error) {
        console.error('Search Error:', error);
        res.status(500).json({ message: 'Search failed' });
    }
});

// ═══════════════════════════════════════════════════════════════
// NEWS (preserved)
// ═══════════════════════════════════════════════════════════════

router.get('/news', async (req, res) => {
    try {
        const news = await getMarketNews();
        res.json(news);
    } catch (error) {
        console.error('News Error:', error);
        res.status(500).json({ message: 'Failed to fetch news' });
    }
});
// ═══════════════════════════════════════════════════════════════
// FUNDAMENTALS — Company profile + financial ratios
// ═══════════════════════════════════════════════════════════════

router.get('/fundamentals/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const fundamentals = await getFundamentals(symbol);
        res.json(fundamentals);
    } catch (error) {
        console.error('Fundamentals Error:', error);
        res.status(500).json({ message: 'Failed to fetch fundamentals' });
    }
});

// ═══════════════════════════════════════════════════════════════
// LIGHTWEIGHT QUOTE — For realtime chart tick polling
// ═══════════════════════════════════════════════════════════════

router.get('/quote/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { assetType = 'Stock' } = req.query;
        const quote = await getLatestQuote(symbol, assetType);
        res.json(quote);
    } catch (error) {
        console.error('Quote Error:', error);
        res.status(500).json({ message: 'Failed to fetch quote' });
    }
});

export default router;
