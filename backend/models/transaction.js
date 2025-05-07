import mongoose from 'mongoose';

// Define sub-document for items within a category
const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: [0.01, 'Item price must be positive'],
  },
  quantity: {
    type: Number,
    default: 1,
    min: [1, 'Quantity must be at least 1'],
  },
}, { _id: false });

// Define sub-document for categories
const categorySchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: [
      'Groceries',
      'Junk Food (Non-Essential)',
      'Clothing',
      'Stationery',
      'Medicine',
      'Personal Care',
      'Household Items',
      'Electronics',
      'Entertainment',
      'Transportation',
      'Utilities',
      'Education',
      'Dining Out',
      'Fees/Taxes',
      'Salary',
      'Refund',
      'Business',
      'Other',
    ],
    trim: true,
  },
  isNonEssential: {
    type: Boolean,
    required: true,
    default: false,
  },
  categoryTotal: {
    type: Number,
    required: true,
    min: [0.01, 'Category total must be positive'],
  },
  items: {
    type: [itemSchema],
    required: true,
    validate: {
      validator: (items) => items.length > 0,
      message: 'Category must contain at least one item',
    },
  },
}, { _id: false });

// Define main transaction schema
const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['debit', 'credit'],
    required: true,
  },
  category: {
    type: String,
    required: [true, 'Transaction category is required'],
    enum: [
      'Groceries',
      'Junk Food (Non-Essential)',
      'Clothing',
      'Stationery',
      'Medicine',
      'Personal Care',
      'Household Items',
      'Electronics',
      'Entertainment',
      'Transportation',
      'Utilities',
      'Education',
      'Dining Out',
      'Fees/Taxes',
      'Salary',
      'Refund',
      'Business',
      'Other',
    ],
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Transaction amount must be positive'],
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  source: {
    type: String,
    enum: ['manual', 'billscan'],
    default: 'manual',
  },
  categories: {
    type: [categorySchema],
    default: undefined,
    validate: {
      validator: function (categories) {
        if (this.source !== 'billscan') return true;
        return categories && categories.length > 0;
      },
      message: 'Categories must exist for billscan transactions',
    },
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Transaction', transactionSchema);