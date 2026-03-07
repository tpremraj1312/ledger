import mongoose from 'mongoose';

const investmentTransactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    txnType: {
        type: String,
        enum: ['BUY', 'SELL'],
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
        type: String,
        required: true,
        index: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0.0001
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    txnDate: {
        type: Date,
        default: Date.now,
        index: true
    },
    fees: {
        type: Number,
        default: 0,
        min: 0
    },
    notes: {
        type: String,
        default: ''
    },
    idempotencyKey: {
        type: String,
        required: true,
        unique: true
    },
    snapshotVersion: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Compound index for efficient per-user queries
investmentTransactionSchema.index({ user: 1, symbol: 1, txnDate: -1 });
investmentTransactionSchema.index({ user: 1, txnType: 1 });

// Auto-calculate totalAmount before validation
investmentTransactionSchema.pre('validate', function (next) {
    if (this.quantity && this.price && !this.totalAmount) {
        this.totalAmount = this.quantity * this.price;
    }
    next();
});

const InvestmentTransaction = mongoose.model('InvestmentTransaction', investmentTransactionSchema);

export default InvestmentTransaction;
