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
    required: [true, 'Category is required'],
    trim: true,
    validate: {
      validator: (value) => value.length > 0,
      message: 'Category cannot be empty',
    },
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
    trim: true,
    validate: {
      validator: (value) => value.length > 0,
      message: 'Transaction category cannot be empty',
    },
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
    enum: ['manual', 'billscan', 'sms'],
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
  // Family Budget fields
  familyGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyGroup',
    default: null,
    index: true,
  },
  spentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  mode: {
    type: String,
    enum: ['PERSONAL', 'FAMILY'],
    default: 'PERSONAL',
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound indexes for family queries
transactionSchema.index({ familyGroupId: 1, date: 1 });
transactionSchema.index({ familyGroupId: 1, category: 1 });

export default mongoose.model('Transaction', transactionSchema);