import mongoose from 'mongoose';

const historicalPointSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    open: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
    low: { type: Number, default: 0 },
    close: { type: Number, required: true },
    volume: { type: Number, default: 0 }
}, { _id: false });

const priceCacheSchema = new mongoose.Schema({
    symbol: {
        type: String,
        required: true,
        index: true
    },
    price: {
        type: Number,
        required: true
    },
    change: {
        type: Number,
        default: 0
    },
    changePercent: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: 'INR'
    },
    assetType: {
        type: String
    },
    lastFetched: {
        type: Date,
        default: Date.now
    },
    // Historical price data for charts
    history: [historicalPointSchema],
    historyTimeframe: {
        type: String,
        enum: ['1D', '1W', '1M', '6M', '1Y', '5Y', 'MAX', null],
        default: null
    },
    historyLastFetched: {
        type: Date,
        default: null
    }
});

// Compound index for historical lookups
priceCacheSchema.index({ symbol: 1, historyTimeframe: 1 });

const PriceCache = mongoose.model('PriceCache', priceCacheSchema);

export default PriceCache;
