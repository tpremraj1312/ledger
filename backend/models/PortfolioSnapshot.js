import mongoose from 'mongoose';

const holdingSchema = new mongoose.Schema({
    symbol: { type: String, required: true },
    name: { type: String, required: true },
    assetType: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    avgCostBasis: { type: Number, default: 0 },
    totalInvested: { type: Number, default: 0 },
    currentPrice: { type: Number, default: 0 },
    currentValue: { type: Number, default: 0 },
    unrealizedPL: { type: Number, default: 0 },
    unrealizedPLPercent: { type: Number, default: 0 },
    dayChange: { type: Number, default: 0 },
    dayChangePercent: { type: Number, default: 0 },
    weight: { type: Number, default: 0 }, // percentage of total portfolio
}, { _id: false });

const portfolioSnapshotSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    version: {
        type: Number,
        default: 1
    },
    holdings: [holdingSchema],
    summary: {
        totalInvested: { type: Number, default: 0 },
        totalCurrentValue: { type: Number, default: 0 },
        totalUnrealizedPL: { type: Number, default: 0 },
        totalUnrealizedPLPercent: { type: Number, default: 0 },
        totalRealizedPL: { type: Number, default: 0 },
        xirr: { type: Number, default: 0 },
        overallReturnPercent: { type: Number, default: 0 },
        dayChange: { type: Number, default: 0 },
        dayChangePercent: { type: Number, default: 0 },
    },
    allocation: {
        equity: { type: Number, default: 0 },
        debt: { type: Number, default: 0 },
        gold: { type: Number, default: 0 },
        crypto: { type: Number, default: 0 },
        other: { type: Number, default: 0 },
    },
    categoryBreakdown: [{
        assetType: String,
        invested: Number,
        currentValue: Number,
        percentage: Number,
        holdings: Number,
    }],
    sectorExposure: [{
        sector: String,
        amount: Number,
        percentage: Number,
    }],
    riskMetrics: {
        concentrationRisk: { type: String, default: 'N/A' },
        diversificationScore: { type: Number, default: 0 },
        volatilityScore: { type: Number, default: 0 },
        maxDrawdownRisk: { type: Number, default: 0 },
        expectedCAGR: { type: Number, default: 0 },
        hhi: { type: Number, default: 0 },
    },
    health: { type: String, default: 'N/A' },
    alerts: [{ type: String }],
    lastCalculatedAt: {
        type: Date,
        default: Date.now
    },
    lastPriceRefreshAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

portfolioSnapshotSchema.index({ user: 1 }, { unique: true });

const PortfolioSnapshot = mongoose.model('PortfolioSnapshot', portfolioSnapshotSchema);

export default PortfolioSnapshot;
