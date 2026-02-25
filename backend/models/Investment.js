import mongoose from 'mongoose';

const investmentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assetType: {
        type: String,
        enum: ['Stock', 'Mutual Fund', 'ETF', 'Crypto', 'Gold', 'FD', 'Bond', 'Real Estate'],
        required: true
    },
    name: {
        type: String,
        required: true
    },
    symbol: {
        type: String, // e.g., 'RELIANCE.NS', 'BTC-USD', '123456' (Scheme Code)
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    buyPrice: {
        type: Number,
        required: true,
        min: 0
    },
    buyDate: {
        type: Date,
        default: Date.now
    },
    investedAmount: {
        type: Number,
        required: true,
        min: 0
    },
    notes: {
        type: String
    }
}, {
    timestamps: true
});

// Calculate investedAmount before saving if not provided (qty * buyPrice)
investmentSchema.pre('validate', function (next) {
    if (this.quantity && this.buyPrice && !this.investedAmount) {
        this.investedAmount = this.quantity * this.buyPrice;
    }
    next();
});

const Investment = mongoose.model('Investment', investmentSchema);

export default Investment;
