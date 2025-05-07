import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  category: { // The category being budgeted for (can be custom)
    type: String,
    required: [true, 'Budget category is required'],
    trim: true,
  },
  type: { // Type of budget: Expense limit or Income goal
      type: String,
      enum: ['expense', 'income'],
      required: [true, 'Budget type (expense/income) is required'],
      default: 'expense', // Default to expense budget
  },
  amount: { // Budgeted amount/goal for the category within the specified period
    type: Number,
    required: [true, 'Budget amount is required'],
    min: [0, 'Budget amount cannot be negative'],
  },
  period: { // How often this budget resets/applies
      type: String,
      enum: ['Monthly', 'Yearly', 'Quarterly', 'Weekly'],
      default: 'Monthly',
      required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
   updatedAt: { // Track when the budget was last modified
    type: Date,
    default: Date.now,
  }
});

// Ensure a user has only one budget entry per unique category + period + type combination
budgetSchema.index({ user: 1, category: 1, period: 1, type: 1 }, { unique: true });

// Update `updatedAt` timestamp on modification
budgetSchema.pre('save', function(next) {
    // Only update updatedAt if the document is being modified (avoids updating on creation via `new`)
    if (this.isNew) {
        this.updatedAt = this.createdAt;
    } else {
       this.updatedAt = Date.now();
    }
    next();
});


budgetSchema.pre('findOneAndUpdate', function(next) {
    // Hook into findOneAndUpdate to set the updatedAt field automatically
    this.set({ updatedAt: Date.now() });
    next();
});


export default mongoose.model('Budget', budgetSchema);