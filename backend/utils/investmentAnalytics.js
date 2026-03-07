/**
 * Investment Analytics Engine — Deep portfolio analysis computations.
 * All calculations server-side, no LLM involvement.
 *
 * Provides: asset allocation, sector exposure, concentration risk,
 * diversification score, expected CAGR, risk score, drawdown risk,
 * rebalancing suggestions, and underperformer detection.
 */

// ═══════════════════════════════════════════════════════════════
// BENCHMARK DATA — Configurable expected returns & volatility
// ═══════════════════════════════════════════════════════════════
const ASSET_BENCHMARKS = {
    'Stock': { expectedCAGR: 12, volatility: 22, maxDrawdown: 35, sector: true },
    'Mutual Fund': { expectedCAGR: 11, volatility: 18, maxDrawdown: 28, sector: false },
    'ETF': { expectedCAGR: 10, volatility: 16, maxDrawdown: 25, sector: false },
    'Crypto': { expectedCAGR: 15, volatility: 65, maxDrawdown: 70, sector: false },
    'Gold': { expectedCAGR: 8, volatility: 12, maxDrawdown: 15, sector: false },
    'FD': { expectedCAGR: 6.5, volatility: 0, maxDrawdown: 0, sector: false },
    'Bond': { expectedCAGR: 7, volatility: 4, maxDrawdown: 5, sector: false },
    'Real Estate': { expectedCAGR: 9, volatility: 10, maxDrawdown: 20, sector: false },
};

// Sector classification for Indian stocks (simplified)
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

const TARGET_ALLOCATION = {
    'Stock': 30, 'Mutual Fund': 30, 'ETF': 10, 'Gold': 10,
    'FD': 10, 'Bond': 5, 'Crypto': 3, 'Real Estate': 2,
};

// ═══════════════════════════════════════════════════════════════
// CORE ANALYTICS
// ═══════════════════════════════════════════════════════════════

/**
 * Full portfolio analytics — the master function.
 */
export const computePortfolioAnalytics = (investments) => {
    if (!investments || investments.length === 0) {
        return {
            totalInvested: 0, holdingCount: 0,
            allocation: [], sectorExposure: [],
            concentrationRisk: 'N/A', diversificationScore: 0,
            expectedCAGR: 0, riskScore: 0, maxDrawdownRisk: 0,
            summary: 'No investments found. Start investing to see analytics.',
        };
    }

    const totalInvested = investments.reduce((s, i) => s + (i.investedAmount || 0), 0);

    // ── Asset Allocation ──
    const byType = {};
    investments.forEach(i => {
        const type = i.assetType || 'Other';
        if (!byType[type]) byType[type] = { invested: 0, count: 0, holdings: [] };
        byType[type].invested += i.investedAmount || 0;
        byType[type].count += 1;
        byType[type].holdings.push(i);
    });

    const allocation = Object.entries(byType)
        .map(([type, data]) => ({
            assetType: type,
            invested: Math.round(data.invested),
            percentage: totalInvested > 0 ? parseFloat(((data.invested / totalInvested) * 100).toFixed(1)) : 0,
            holdings: data.count,
        }))
        .sort((a, b) => b.invested - a.invested);

    // ── Sector Exposure (for stocks) ──
    const sectorMap = {};
    investments.forEach(i => {
        if (i.assetType === 'Stock' && i.symbol) {
            const ticker = i.symbol.replace('.NS', '').replace('.BO', '').toUpperCase();
            const sector = STOCK_SECTOR_MAP[ticker] || 'Other';
            sectorMap[sector] = (sectorMap[sector] || 0) + (i.investedAmount || 0);
        }
    });
    const stockTotal = byType['Stock']?.invested || 0;
    const sectorExposure = Object.entries(sectorMap)
        .map(([sector, amount]) => ({
            sector,
            amount: Math.round(amount),
            percentage: stockTotal > 0 ? parseFloat(((amount / stockTotal) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

    // ── Concentration Risk (Herfindahl Index) ──
    const weights = allocation.map(a => a.percentage / 100);
    const hhi = weights.reduce((s, w) => s + w * w, 0);
    // HHI: 0-1. Below 0.15 = diversified, 0.15-0.25 = moderate, above 0.25 = concentrated
    let concentrationRisk = 'Low';
    if (hhi > 0.25) concentrationRisk = 'High';
    else if (hhi > 0.15) concentrationRisk = 'Moderate';

    // ── Diversification Score (0-100) ──
    const assetTypeCount = allocation.length;
    const maxTypes = Object.keys(ASSET_BENCHMARKS).length;
    const typeDiversity = Math.min(1, assetTypeCount / 4); // Having 4+ types is ideal
    const evenness = 1 - (hhi / 1); // Lower HHI = more even
    const diversificationScore = Math.min(100, Math.round((typeDiversity * 50 + evenness * 50)));

    // ── Expected Portfolio CAGR ──
    let expectedCAGR = 0;
    allocation.forEach(a => {
        const benchmark = ASSET_BENCHMARKS[a.assetType];
        if (benchmark) {
            expectedCAGR += (a.percentage / 100) * benchmark.expectedCAGR;
        }
    });
    expectedCAGR = parseFloat(expectedCAGR.toFixed(1));

    // ── Risk Score (weighted volatility) ──
    let riskScore = 0;
    allocation.forEach(a => {
        const benchmark = ASSET_BENCHMARKS[a.assetType];
        if (benchmark) {
            riskScore += (a.percentage / 100) * benchmark.volatility;
        }
    });
    riskScore = parseFloat(riskScore.toFixed(1));

    // ── Max Drawdown Risk ──
    let maxDrawdownRisk = 0;
    allocation.forEach(a => {
        const benchmark = ASSET_BENCHMARKS[a.assetType];
        if (benchmark) {
            maxDrawdownRisk = Math.max(maxDrawdownRisk, benchmark.maxDrawdown * (a.percentage / 100));
        }
    });
    maxDrawdownRisk = parseFloat(maxDrawdownRisk.toFixed(1));

    return {
        totalInvested: Math.round(totalInvested),
        holdingCount: investments.length,
        allocation,
        sectorExposure,
        concentrationRisk,
        hhi: parseFloat(hhi.toFixed(3)),
        diversificationScore,
        expectedCAGR,
        riskScore,
        maxDrawdownRisk,
    };
};

/**
 * Rebalancing suggestions — compare current vs target allocation.
 */
export const computeRebalancingSuggestions = (investments) => {
    const analytics = computePortfolioAnalytics(investments);
    if (analytics.totalInvested === 0) return { suggestions: [], message: 'No investments to rebalance.' };

    const suggestions = [];
    const currentMap = {};
    analytics.allocation.forEach(a => { currentMap[a.assetType] = a.percentage; });

    for (const [type, targetPct] of Object.entries(TARGET_ALLOCATION)) {
        const currentPct = currentMap[type] || 0;
        const diff = currentPct - targetPct;
        const diffAmount = Math.round((Math.abs(diff) / 100) * analytics.totalInvested);

        if (Math.abs(diff) >= 3) { // Only suggest if deviation is >= 3%
            suggestions.push({
                assetType: type,
                currentPct: parseFloat(currentPct.toFixed(1)),
                targetPct,
                deviation: parseFloat(diff.toFixed(1)),
                action: diff > 0 ? 'REDUCE' : 'INCREASE',
                amount: diffAmount,
                message: diff > 0
                    ? `Overweight in ${type} by ${Math.abs(diff).toFixed(1)}%. Consider reducing by ~₹${diffAmount.toLocaleString('en-IN')}.`
                    : `Underweight in ${type} by ${Math.abs(diff).toFixed(1)}%. Consider adding ~₹${diffAmount.toLocaleString('en-IN')}.`,
            });
        }
    }

    return {
        suggestions: suggestions.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation)),
        totalInvested: analytics.totalInvested,
        diversificationScore: analytics.diversificationScore,
    };
};

/**
 * Detect underperforming assets — holdings that are below their asset-class CAGR.
 */
export const detectUnderperformers = (investments) => {
    const now = new Date();
    const underperformers = [];

    investments.forEach(inv => {
        const daysHeld = Math.max(1, Math.floor((now - new Date(inv.buyDate)) / (1000 * 60 * 60 * 24)));
        const yearsHeld = daysHeld / 365.25;
        const benchmark = ASSET_BENCHMARKS[inv.assetType];
        if (!benchmark || yearsHeld < 0.25) return; // Skip if held less than 3 months

        // Expected growth based on benchmark CAGR
        const expectedValue = inv.investedAmount * Math.pow(1 + benchmark.expectedCAGR / 100, yearsHeld);
        const expectedGrowth = expectedValue - inv.investedAmount;

        // Flag if asset is older than 6 months (since we don't have current prices, flag for review)
        if (yearsHeld > 0.5) {
            underperformers.push({
                name: inv.name,
                symbol: inv.symbol,
                assetType: inv.assetType,
                investedAmount: inv.investedAmount,
                daysHeld: Math.round(daysHeld),
                yearsHeld: parseFloat(yearsHeld.toFixed(1)),
                benchmarkCAGR: benchmark.expectedCAGR,
                expectedGrowth: Math.round(expectedGrowth),
                recommendation: `Review ${inv.name} — held for ${yearsHeld.toFixed(1)} years. Expected ~${benchmark.expectedCAGR}% annual growth. Verify current market value.`,
            });
        }
    });

    return underperformers.sort((a, b) => b.yearsHeld - a.yearsHeld);
};

/**
 * SIP projection calculator.
 */
export const simulateSIP = (monthlyAmount, annualReturnPct, years) => {
    const monthlyRate = annualReturnPct / 12 / 100;
    const months = years * 12;
    const totalInvested = monthlyAmount * months;

    // Future value of annuity formula
    const futureValue = monthlyAmount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    const wealthGained = futureValue - totalInvested;

    // Year-by-year breakdown
    const yearlyBreakdown = [];
    for (let y = 1; y <= years; y++) {
        const m = y * 12;
        const fv = monthlyAmount * ((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate) * (1 + monthlyRate);
        const inv = monthlyAmount * m;
        yearlyBreakdown.push({
            year: y,
            invested: Math.round(inv),
            value: Math.round(fv),
            gains: Math.round(fv - inv),
        });
    }

    return {
        monthlyInvestment: monthlyAmount,
        annualReturn: annualReturnPct,
        durationYears: years,
        totalInvested: Math.round(totalInvested),
        futureValue: Math.round(futureValue),
        wealthGained: Math.round(wealthGained),
        yearlyBreakdown,
    };
};

/**
 * Capital gains estimation for each holding.
 */
export const estimateCapitalGains = (investments) => {
    const now = new Date();
    const results = [];

    investments.forEach(inv => {
        const daysHeld = Math.floor((now - new Date(inv.buyDate)) / (1000 * 60 * 60 * 24));
        const isLongTerm = daysHeld > 365;
        const benchmark = ASSET_BENCHMARKS[inv.assetType];
        const years = daysHeld / 365.25;

        // Estimate current value using benchmark CAGR
        const estCurrentValue = inv.investedAmount * Math.pow(1 + (benchmark?.expectedCAGR || 8) / 100, years);
        const estGain = estCurrentValue - inv.investedAmount;

        let taxRate = 0;
        let taxType = 'N/A';
        if (inv.assetType === 'Stock' || inv.assetType === 'Mutual Fund' || inv.assetType === 'ETF') {
            taxRate = isLongTerm ? 10 : 15; // LTCG: 10%, STCG: 15% (equity)
            taxType = isLongTerm ? 'LTCG' : 'STCG';
        } else if (inv.assetType === 'Crypto') {
            taxRate = 30; // Flat 30% on crypto gains
            taxType = 'CRYPTO';
        } else {
            taxRate = isLongTerm ? 20 : 30; // Debt/Gold: LTCG 20%, STCG at slab
            taxType = isLongTerm ? 'LTCG' : 'STCG';
        }

        const estTax = Math.max(0, estGain) * (taxRate / 100);

        results.push({
            name: inv.name,
            assetType: inv.assetType,
            invested: Math.round(inv.investedAmount),
            estCurrentValue: Math.round(estCurrentValue),
            estGain: Math.round(estGain),
            daysHeld,
            holdingPeriod: isLongTerm ? 'Long-term' : 'Short-term',
            taxType,
            taxRate,
            estTax: Math.round(estTax),
        });
    });

    return {
        holdings: results,
        totalInvested: results.reduce((s, r) => s + r.invested, 0),
        totalEstValue: results.reduce((s, r) => s + r.estCurrentValue, 0),
        totalEstGain: results.reduce((s, r) => s + r.estGain, 0),
        totalEstTax: results.reduce((s, r) => s + r.estTax, 0),
    };
};
