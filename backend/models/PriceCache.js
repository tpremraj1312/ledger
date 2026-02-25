import mongoose from 'mongoose';

const priceCacheSchema = new mongoose.Schema({
    symbol: {
        type: String,
        required: true,
        unique: true
    },
    price: {
        type: Number,
        required: true
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
    }
});

// Index for expiry could be useful, but given we want to manually check "freshness", simple index on symbol is enough.
// We can also set a TTL index if we want Mongo to auto-delete old records, but manual update is often safer for this caching pattern.

const PriceCache = mongoose.model('PriceCache', priceCacheSchema);

export default PriceCache;
