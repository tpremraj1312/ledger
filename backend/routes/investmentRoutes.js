import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getInvestmentRecommendations } from '../utils/investmentHelper.js';
import Investment from '../models/Investment.js';
import PriceCache from '../models/PriceCache.js';
import { fetchLivePrice, searchStockSymbol } from '../utils/marketDataProxy.js';
import { getMutualFundNAV, searchMutualFunds } from '../utils/amfiNav.js';
import { getCryptoPrice, searchCrypto } from '../utils/coinGecko.js';
import { getMarketNews } from '../utils/newsFetcher.js';

const router = express.Router();

// (Removed `fetchRealTimePrice` - now using `fetchLivePrice` directly from proxy)

// @route   GET /api/investments/summary
// @desc    Get portfolio summary, health, and alerts
// @access  Private
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const investments = await Investment.find({ user: req.user._id });

    let totalInvested = 0;
    let totalCurrentValue = 0;
    let equityAllocation = 0;
    let debtAllocation = 0;
    let categoryBreakdown = {};

    // Process investments in parallel for price fetching
    const processedInvestments = await Promise.all(investments.map(async (inv) => {
      const priceData = await fetchLivePrice(inv.symbol, inv.assetType);
      const currentPrice = priceData.price > 0 ? priceData.price : inv.buyPrice;
      const currentValue = inv.quantity * currentPrice;

      totalInvested += inv.investedAmount;
      totalCurrentValue += currentValue;

      if (['Stock', 'Mutual Fund', 'ETF', 'Crypto'].includes(inv.assetType)) {
        equityAllocation += currentValue;
      } else if (['Bond', 'FD'].includes(inv.assetType)) {
        debtAllocation += currentValue;
      }

      categoryBreakdown[inv.assetType] = (categoryBreakdown[inv.assetType] || 0) + currentValue;

      return {
        ...inv.toObject(),
        currentPrice,
        currentValue,
        gainLoss: currentValue - inv.investedAmount,
        gainLossPercent: inv.investedAmount > 0 ? ((currentValue - inv.investedAmount) / inv.investedAmount) * 100 : 0
      };
    }));

    const totalGainLoss = totalCurrentValue - totalInvested;
    const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

    const equityPercent = totalCurrentValue > 0 ? (equityAllocation / totalCurrentValue) * 100 : 0;
    const debtPercent = totalCurrentValue > 0 ? (debtAllocation / totalCurrentValue) * 100 : 0;

    let health = 'Conservative';
    if (equityPercent > 70) health = 'Aggressive';
    else if (equityPercent >= 40) health = 'Moderate';

    const alerts = [];
    if (equityPercent > 80) alerts.push('High equity exposure (>80%). Consider rebalancing.');
    if (debtPercent < 10) alerts.push('Low debt allocation (<10%). Consider adding stable assets.');
    const lowPerformers = processedInvestments.filter(i => i.gainLossPercent < -10);
    if (lowPerformers.length > 0) alerts.push(`${lowPerformers.length} investments are down by >10%.`);

    res.json({
      totalInvested,
      totalCurrentValue,
      totalGainLoss,
      totalGainLossPercent,
      categoryBreakdown,
      allocation: { equity: equityPercent, debt: debtPercent },
      health,
      alerts,
      investments: processedInvestments
    });
  } catch (error) {
    console.error('Portfolio Summary Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/investments/live
// @desc    Get detailed list of investments with live prices
// @access  Private
router.get('/live', authMiddleware, async (req, res) => {
  // Reuse summary logic for simplicity as it already calculates everything
  // In a larger app, this might be paginated or lighter
  try {
    const investments = await Investment.find({ user: req.user._id });
    const processedInvestments = await Promise.all(investments.map(async (inv) => {
      const priceData = await fetchLivePrice(inv.symbol, inv.assetType);
      const currentPrice = priceData.price > 0 ? priceData.price : inv.buyPrice;
      const currentValue = inv.quantity * currentPrice;
      return {
        ...inv.toObject(),
        currentPrice,
        currentValue,
        gainLoss: currentValue - inv.investedAmount,
        gainLossPercent: inv.investedAmount > 0 ? ((currentValue - inv.investedAmount) / inv.investedAmount) * 100 : 0
      };
    }));
    res.json(processedInvestments);
  } catch (error) {
    console.error('Live Prices Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   POST /api/investments/refresh
// @desc    Force refresh prices
// @access  Private
router.post('/refresh', authMiddleware, async (req, res) => {
  try {
    const investments = await Investment.find({ user: req.user._id });
    const processedInvestments = await Promise.all(investments.map(async (inv) => {
      // Force refresh = true
      const priceData = await fetchLivePrice(inv.symbol, inv.assetType, true);
      return { symbol: inv.symbol, price: priceData.price };
    }));
    res.json({ message: 'Prices refreshed', count: processedInvestments.length });
  } catch (error) {
    console.error('Refresh Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/investments/news
// @desc    Get enhanced market news
// @access  Private
router.get('/news', authMiddleware, async (req, res) => {
  try {
    const news = await getMarketNews();
    res.json(news);
  } catch (error) {
    console.error('News Error:', error);
    res.status(500).json({ message: 'Failed to fetch news' });
  }
});

// @route   GET /api/investments/search
// @desc    Search for investment symbols (stocks, crypto, mutual funds)
// @access  Private
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { query, type } = req.query; // type: 'stock' | 'crypto' | 'mutualfund'
    if (!query) return res.status(400).json({ message: 'Query parameter is required' });

    let results = [];
    if (type === 'crypto') {
      results = await searchCrypto(query);
    } else if (type === 'mutualfund') {
      results = await searchMutualFunds(query);
    } else {
      // Default to stock
      results = await searchStockSymbol(query);
    }

    res.json(results);
  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
});

// @route   POST /api/investments (AI Planner)
router.post('/', authMiddleware, async (req, res) => {
  const { amount, riskLevel, investmentType, durationYears } = req.body;
  if (!amount || !riskLevel || !investmentType || !durationYears) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  try {
    const recommendations = await getInvestmentRecommendations({
      amount, riskLevel, investmentType, durationYears
    });
    res.status(200).json({ recommendations });
  } catch (error) {
    console.error('Gemini investment error:', error.message);
    res.status(500).json({ message: 'Failed to fetch investment recommendations', error: error.message });
  }
});

// @route   POST /api/investments/add
router.post('/add', authMiddleware, async (req, res) => {
  try {
    const { assetType, name, symbol, quantity, buyPrice, buyDate, notes } = req.body;
    if (!assetType || !name || !symbol || !quantity) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }
    const newInvestment = new Investment({
      user: req.user._id,
      assetType, name, symbol,
      quantity: Number(quantity),
      buyPrice: Number(buyPrice) || 0,
      investedAmount: Number(quantity) * (Number(buyPrice) || 0),
      buyDate: buyDate || Date.now(),
      notes
    });
    await newInvestment.save();
    res.status(201).json(newInvestment);
  } catch (error) {
    console.error('Add Investment Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   DELETE /api/investments/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.id);
    if (!investment) return res.status(404).json({ message: 'Investment not found' });
    if (investment.user.toString() !== req.user._id.toString()) return res.status(401).json({ message: 'Not authorized' });
    await investment.deleteOne();
    res.json({ message: 'Investment removed' });
  } catch (error) {
    console.error('Delete Investment Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
