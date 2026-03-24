import mongoose from 'mongoose';

const smsTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  smsHash: {
    type: String,
    required: true,
    index: true,
  },
  rawSms: {
    type: String,
    required: true,
  },
  sender: {
    type: String,
    default: '',
  },
  transactionType: {
    type: String,
    enum: ['debit', 'credit'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01,
  },
  merchant: {
    type: String,
    default: 'Unknown Merchant',
  },
  category: {
    type: String,
    default: 'Unknown',
  },
  date: {
    type: Date,
    required: true,
  },
  accountType: {
    type: String,
    enum: ['upi', 'card', 'wallet', 'bank', 'atm'],
    default: 'bank',
  },
  accountNumber: {
    type: String,
    default: null,
  },
  balance: {
    type: Number,
    default: null,
  },
  reference: {
    type: String,
    default: null,
  },
  riskScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
  },
  riskReasons: {
    type: [String],
    default: [],
  },
  markedSafe: {
    type: Boolean,
    default: false,
  },
  parsedAt: {
    type: Date,
    default: Date.now,
  },
  syncedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound unique index: one SMS hash per user
smsTransactionSchema.index({ user: 1, smsHash: 1 }, { unique: true });
smsTransactionSchema.index({ user: 1, date: -1 });

export default mongoose.model('SmsTransaction', smsTransactionSchema);
