/**
 * Portfolio Engine — Transaction-ledger driven portfolio computation.
 * 
 * Computes: weighted avg cost basis, realized/unrealized P&L, XIRR,
 * allocation, sector exposure, risk metrics, and portfolio snapshot.
 */

import InvestmentTransaction from '../models/InvestmentTransaction.js';
import PortfolioSnapshot from '../models/PortfolioSnapshot.js';
import { fetchLivePrice } from '../utils/marketDataProxy.js';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const ASSET_BENCHMARKS = {
    'Stock': { expectedCAGR: 12, volatility: 22, maxDrawdown: 35 },
    'Mutual Fund': { expectedCAGR: 11, volatility: 18, maxDrawdown: 28 },
    'ETF': { expectedCAGR: 10, volatility: 16, maxDrawdown: 25 },
    'Crypto': { expectedCAGR: 15, volatility: 65, maxDrawdown: 70 },
    'Gold': { expectedCAGR: 8, volatility: 12, maxDrawdown: 15 },
    'FD': { expectedCAGR: 6.5, volatility: 0, maxDrawdown: 0 },
    'Bond': { expectedCAGR: 7, volatility: 4, maxDrawdown: 5 },
    'Real Estate': { expectedCAGR: 9, volatility: 10, maxDrawdown: 20 },
};

const EQUITY_TYPES = ['Stock', 'Mutual Fund', 'ETF'];
const DEBT_TYPES = ['Bond', 'FD'];

const STOCK_SECTOR_MAP = {
    'RELIANCE': 'Energy', 'TCS': 'IT', 'INFY': 'IT', 'HDFCBANK': 'Banking',
    'ICICIBANK': 'Banking', 'SBIN': 'Banking', 'KOTAKBANK': 'Banking',
    'HINDUNILVR': 'FMCG', 'ITC': 'FMCG', 'BAJFINANCE': 'Finance',
    'BHARTIARTL': 'Telecom', 'WIPRO': 'IT', 'HCLTECH': 'IT',
    'MARUTI': 'Auto', 'TATAMOTORS': 'Auto', 'ASIANPAINT': 'Chemicals',
    'SUNPHARMA': 'Pharma', 'DRREDDY': 'Pharma', 'CIPLA': 'Pharma',
    'ULTRACEMCO': 'Cement', 'TITAN': 'Consumer', 'ADANIENT': 'Infra',
    'ADANIPORTS': 'Infra', 'POWERGRID': 'Power', 'NTPC': 'Power',
    'COALINDIA': 'Mining', 'LT': 'Infra', 'TECHM': 'IT', 'AXISBANK': 'Banking',
};

// ═══════════════════════════════════════════════════════════════
// CORE: Recalculate Holdings from Transaction Ledger
// ═══════════════════════════════════════════════════════════════

/**
 * Build holdings from transaction ledger using weighted average cost method.
 * Returns { holdingsMap, totalRealizedPL, cashFlows }
 */
const recalculateHoldings = (transactions) => {
    // holdingsMap: { symbol: { name, assetType, lots: [{qty, price, date}], totalQty, totalCost, realizedPL } }
    const holdingsMap = {};
    const cashFlows = []; // for XIRR: { amount, date }

    for (const txn of transactions) {
        const key = txn.symbol;

        if (!holdingsMap[key]) {
            holdingsMap[key] = {
                name: txn.name,
                assetType: txn.assetType,
                symbol: txn.symbol,
                totalQty: 0,
                totalCost: 0,
                realizedPL: 0,
            };
        }

        const holding = holdingsMap[key];

        if (txn.txnType === 'BUY') {
            holding.totalQty += txn.quantity;
            holding.totalCost += txn.totalAmount + (txn.fees || 0);
            // Cash flow: negative for outflow
            cashFlows.push({ amount: -(txn.totalAmount + (txn.fees || 0)), date: new Date(txn.txnDate) });
        } else if (txn.txnType === 'SELL') {
            if (holding.totalQty <= 0) continue;

            const avgCost = holding.totalCost / holding.totalQty;
            const costOfSold = avgCost * txn.quantity;
            const saleProceeds = txn.totalAmount - (txn.fees || 0);

            holding.realizedPL += saleProceeds - costOfSold;
            holding.totalQty -= txn.quantity;
            holding.totalCost -= costOfSold;

            // Cash flow: positive for inflow
            cashFlows.push({ amount: saleProceeds, date: new Date(txn.txnDate) });
        }
    }

    // Clean up: remove fully sold positions
    const activeHoldings = {};
    let totalRealizedPL = 0;

    for (const [key, holding] of Object.entries(holdingsMap)) {
        totalRealizedPL += holding.realizedPL;
        if (holding.totalQty > 0.0001) {
            activeHoldings[key] = holding;
        }
    }

    return { holdingsMap: activeHoldings, totalRealizedPL, cashFlows };
};

// ═══════════════════════════════════════════════════════════════
// XIRR Calculation
// ═══════════════════════════════════════════════════════════════

const computeXIRR = (cashFlows, currentPortfolioValue) => {
    try {
        if (cashFlows.length === 0 || currentPortfolioValue <= 0) return 0;

        // Add terminal cash flow (current value as positive)
        const allFlows = [
            ...cashFlows,
            { amount: currentPortfolioValue, date: new Date() }
        ];

        // Filter out zero amounts
        const validFlows = allFlows.filter(f => Math.abs(f.amount) > 0.01);
        if (validFlows.length < 2) return 0;

        // Check if we have both positive and negative flows
        const hasNeg = validFlows.some(f => f.amount < 0);
        const hasPos = validFlows.some(f => f.amount > 0);
        if (!hasNeg || !hasPos) return 0;

        // Newton-Raphson method for XIRR
        const daysBetween = (d1, d2) => (d1 - d2) / (1000 * 60 * 60 * 24);
        const firstDate = validFlows.reduce((min, f) => f.date < min ? f.date : min, validFlows[0].date);

        const f = (rate) => {
            return validFlows.reduce((sum, flow) => {
                const years = daysBetween(flow.date, firstDate) / 365.25;
                return sum + flow.amount / Math.pow(1 + rate, years);
            }, 0);
        };

        const fPrime = (rate) => {
            return validFlows.reduce((sum, flow) => {
                const years = daysBetween(flow.date, firstDate) / 365.25;
                return sum + (-years * flow.amount) / Math.pow(1 + rate, years + 1);
            }, 0);
        };

        let rate = 0.1; // initial guess 10%
        for (let i = 0; i < 100; i++) {
            const fVal = f(rate);
            const fPrimeVal = fPrime(rate);
            if (Math.abs(fPrimeVal) < 1e-10) break;
            const newRate = rate - fVal / fPrimeVal;
            if (Math.abs(newRate - rate) < 1e-7) {
                rate = newRate;
                break;
            }
            rate = newRate;
            // Guard against divergence
            if (rate < -0.99) rate = -0.99;
            if (rate > 10) rate = 10;
        }

        return isFinite(rate) ? parseFloat((rate * 100).toFixed(2)) : 0;
    } catch (err) {
        console.error('XIRR computation error:', err);
        return 0;
    }
};

// ═══════════════════════════════════════════════════════════════
// Risk & Allocation Metrics
// ═══════════════════════════════════════════════════════════════

const computeMetrics = (holdings, totalCurrentValue) => {
    // Allocation by asset class
    const allocationMap = { equity: 0, debt: 0, gold: 0, crypto: 0, other: 0 };
    const categoryMap = {};
    const sectorMap = {};

    for (const h of holdings) {
        const val = h.currentValue || 0;

        // Allocation bucket
        if (EQUITY_TYPES.includes(h.assetType)) allocationMap.equity += val;
        else if (DEBT_TYPES.includes(h.assetType)) allocationMap.debt += val;
        else if (h.assetType === 'Gold') allocationMap.gold += val;
        else if (h.assetType === 'Crypto') allocationMap.crypto += val;
        else allocationMap.other += val;

        // Category breakdown
        if (!categoryMap[h.assetType]) categoryMap[h.assetType] = { invested: 0, currentValue: 0, count: 0 };
        categoryMap[h.assetType].invested += h.totalInvested;
        categoryMap[h.assetType].currentValue += val;
        categoryMap[h.assetType].count += 1;

        // Sector exposure (stocks only)
        if (h.assetType === 'Stock' && h.symbol) {
            const ticker = h.symbol.replace('.NS', '').replace('.BO', '').toUpperCase();
            const sector = STOCK_SECTOR_MAP[ticker] || 'Other';
            sectorMap[sector] = (sectorMap[sector] || 0) + val;
        }
    }

    // Convert allocation to percentages
    const total = totalCurrentValue || 1;
    const allocation = {
        equity: parseFloat(((allocationMap.equity / total) * 100).toFixed(1)),
        debt: parseFloat(((allocationMap.debt / total) * 100).toFixed(1)),
        gold: parseFloat(((allocationMap.gold / total) * 100).toFixed(1)),
        crypto: parseFloat(((allocationMap.crypto / total) * 100).toFixed(1)),
        other: parseFloat(((allocationMap.other / total) * 100).toFixed(1)),
    };

    // Category breakdown array
    const categoryBreakdown = Object.entries(categoryMap).map(([assetType, data]) => ({
        assetType,
        invested: Math.round(data.invested),
        currentValue: Math.round(data.currentValue),
        percentage: parseFloat(((data.currentValue / total) * 100).toFixed(1)),
        holdings: data.count,
    })).sort((a, b) => b.currentValue - a.currentValue);

    // Sector exposure array
    const stockTotal = allocationMap.equity || 1;
    const sectorExposure = Object.entries(sectorMap).map(([sector, amount]) => ({
        sector,
        amount: Math.round(amount),
        percentage: parseFloat(((amount / stockTotal) * 100).toFixed(1)),
    })).sort((a, b) => b.amount - a.amount);

    // HHI concentration risk
    const weights = categoryBreakdown.map(c => c.percentage / 100);
    const hhi = weights.reduce((s, w) => s + w * w, 0);
    let concentrationRisk = 'Low';
    if (hhi > 0.25) concentrationRisk = 'High';
    else if (hhi > 0.15) concentrationRisk = 'Moderate';

    // Diversification score
    const typeCount = categoryBreakdown.length;
    const typeDiversity = Math.min(1, typeCount / 4);
    const evenness = 1 - hhi;
    const diversificationScore = Math.min(100, Math.round(typeDiversity * 50 + evenness * 50));

    // Expected CAGR & Volatility
    let expectedCAGR = 0;
    let volatilityScore = 0;
    let maxDrawdownRisk = 0;

    categoryBreakdown.forEach(c => {
        const benchmark = ASSET_BENCHMARKS[c.assetType];
        if (benchmark) {
            const weight = c.percentage / 100;
            expectedCAGR += weight * benchmark.expectedCAGR;
            volatilityScore += weight * benchmark.volatility;
            maxDrawdownRisk = Math.max(maxDrawdownRisk, benchmark.maxDrawdown * weight);
        }
    });

    // Health assessment
    let health = 'Conservative';
    if (allocation.equity > 70) health = 'Aggressive';
    else if (allocation.equity >= 40) health = 'Moderate';

    // Alerts
    const alerts = [];
    if (allocation.equity > 80) alerts.push('High equity exposure (>80%). Consider rebalancing.');
    if (allocation.debt < 10 && totalCurrentValue > 0) alerts.push('Low debt allocation (<10%). Consider adding stable assets.');
    if (allocation.crypto > 15) alerts.push('High crypto exposure (>15%). Very volatile — consider reducing.');
    const losers = holdings.filter(h => h.unrealizedPLPercent < -10);
    if (losers.length > 0) alerts.push(`${losers.length} holdings are down by > 10%.`);

    return {
        allocation,
        categoryBreakdown,
        sectorExposure,
        riskMetrics: {
            concentrationRisk,
            diversificationScore,
            volatilityScore: parseFloat(volatilityScore.toFixed(1)),
            maxDrawdownRisk: parseFloat(maxDrawdownRisk.toFixed(1)),
            expectedCAGR: parseFloat(expectedCAGR.toFixed(1)),
            hhi: parseFloat(hhi.toFixed(3)),
        },
        health,
        alerts,
    };
};

// ═══════════════════════════════════════════════════════════════
// MASTER: Rebuild entire portfolio snapshot
// ═══════════════════════════════════════════════════════════════

export const rebuildSnapshot = async (userId) => {
    // 1. Fetch all transactions sorted by date
    const transactions = await InvestmentTransaction.find({ user: userId }).sort({ txnDate: 1, createdAt: 1 });

    if (transactions.length === 0) {
        // Return/save empty snapshot
        const emptySnapshot = await PortfolioSnapshot.findOneAndUpdate(
            { user: userId },
            {
                $set: {
                    holdings: [],
                    summary: { totalInvested: 0, totalCurrentValue: 0, totalUnrealizedPL: 0, totalUnrealizedPLPercent: 0, totalRealizedPL: 0, xirr: 0, overallReturnPercent: 0, dayChange: 0, dayChangePercent: 0 },
                    allocation: { equity: 0, debt: 0, gold: 0, crypto: 0, other: 0 },
                    categoryBreakdown: [],
                    sectorExposure: [],
                    riskMetrics: { concentrationRisk: 'N/A', diversificationScore: 0, volatilityScore: 0, maxDrawdownRisk: 0, expectedCAGR: 0, hhi: 0 },
                    health: 'N/A',
                    alerts: [],
                    lastCalculatedAt: new Date(),
                    lastPriceRefreshAt: new Date(),
                },
                $inc: { version: 1 }
            },
            { upsert: true, new: true }
        );
        return emptySnapshot;
    }

    // 2. Recalculate holdings from ledger
    const { holdingsMap, totalRealizedPL, cashFlows } = recalculateHoldings(transactions);

    // 3. Fetch live prices for all active holdings (parallel)
    const holdingEntries = Object.values(holdingsMap);
    const priceResults = await Promise.all(
        holdingEntries.map(h => fetchLivePrice(h.symbol, h.assetType))
    );

    // 4. Build enriched holdings with current values
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalDayChange = 0;

    const enrichedHoldings = holdingEntries.map((h, i) => {
        const priceData = priceResults[i];
        const currentPrice = priceData.price > 0 ? priceData.price : (h.totalCost / h.totalQty);
        const avgCostBasis = h.totalQty > 0 ? h.totalCost / h.totalQty : 0;
        const currentValue = h.totalQty * currentPrice;
        const unrealizedPL = currentValue - h.totalCost;
        const unrealizedPLPercent = h.totalCost > 0 ? (unrealizedPL / h.totalCost) * 100 : 0;
        const dayChange = (priceData.change || 0) * h.totalQty;

        totalInvested += h.totalCost;
        totalCurrentValue += currentValue;
        totalDayChange += dayChange;

        return {
            symbol: h.symbol,
            name: h.name,
            assetType: h.assetType,
            quantity: parseFloat(h.totalQty.toFixed(4)),
            avgCostBasis: parseFloat(avgCostBasis.toFixed(2)),
            totalInvested: Math.round(h.totalCost),
            currentPrice: parseFloat(currentPrice.toFixed(2)),
            currentValue: Math.round(currentValue),
            unrealizedPL: Math.round(unrealizedPL),
            unrealizedPLPercent: parseFloat(unrealizedPLPercent.toFixed(2)),
            dayChange: Math.round(dayChange),
            dayChangePercent: parseFloat((priceData.changePercent || 0).toFixed(2)),
            weight: 0, // calculated below
        };
    });

    // Set weights
    enrichedHoldings.forEach(h => {
        h.weight = totalCurrentValue > 0 ? parseFloat(((h.currentValue / totalCurrentValue) * 100).toFixed(1)) : 0;
    });

    // Sort by value descending
    enrichedHoldings.sort((a, b) => b.currentValue - a.currentValue);

    // 5. Compute XIRR
    const xirr = computeXIRR(cashFlows, totalCurrentValue);

    // 6. Compute metrics
    const metrics = computeMetrics(enrichedHoldings, totalCurrentValue);

    const totalUnrealizedPL = totalCurrentValue - totalInvested;
    const totalUnrealizedPLPercent = totalInvested > 0 ? (totalUnrealizedPL / totalInvested) * 100 : 0;
    const overallReturnPercent = totalInvested > 0 ? ((totalCurrentValue + totalRealizedPL - totalInvested) / totalInvested) * 100 : 0;
    const dayChangePercent = totalCurrentValue > 0 ? (totalDayChange / (totalCurrentValue - totalDayChange)) * 100 : 0;

    // 7. Atomically write snapshot
    const snapshot = await PortfolioSnapshot.findOneAndUpdate(
        { user: userId },
        {
            $set: {
                holdings: enrichedHoldings,
                summary: {
                    totalInvested: Math.round(totalInvested),
                    totalCurrentValue: Math.round(totalCurrentValue),
                    totalUnrealizedPL: Math.round(totalUnrealizedPL),
                    totalUnrealizedPLPercent: parseFloat(totalUnrealizedPLPercent.toFixed(2)),
                    totalRealizedPL: Math.round(totalRealizedPL),
                    xirr,
                    overallReturnPercent: parseFloat(overallReturnPercent.toFixed(2)),
                    dayChange: Math.round(totalDayChange),
                    dayChangePercent: parseFloat(dayChangePercent.toFixed(2)),
                },
                ...metrics,
                lastCalculatedAt: new Date(),
                lastPriceRefreshAt: new Date(),
            },
            $inc: { version: 1 }
        },
        { upsert: true, new: true }
    );

    return snapshot;
};

/**
 * Get the cached snapshot (fast read). Rebuilds if none exists.
 */
export const getSnapshot = async (userId) => {
    let snapshot = await PortfolioSnapshot.findOne({ user: userId });
    if (!snapshot) {
        snapshot = await rebuildSnapshot(userId);
    }
    return snapshot;
};

/**
 * Check if current user has sufficient holdings to sell.
 */
export const validateSell = async (userId, symbol, quantity) => {
    const snapshot = await PortfolioSnapshot.findOne({ user: userId });
    if (!snapshot) return { valid: false, message: 'No portfolio found.' };

    const holding = snapshot.holdings.find(h => h.symbol === symbol);
    if (!holding) return { valid: false, message: `No holdings found for ${symbol}.` };
    if (holding.quantity < quantity) return { valid: false, message: `Insufficient quantity. You hold ${holding.quantity} units of ${symbol}.` };

    return { valid: true, holding };
};
