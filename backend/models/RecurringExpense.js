import mongoose from 'mongoose';

const recurringExpenseSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0.01, 'Amount must be positive'],
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true,
    },
    description: {
        type: String,
        trim: true,
        default: '',
    },
    frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
        required: true,
        default: 'monthly',
    },
    startDate: {
        type: Date,
        required: true,
        default: Date.now,
    },
    nextOccurrence: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'paused', 'completed'],
        default: 'active',
    },
    lastGeneratedTransaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
    },
    isEssential: {
        type: Boolean,
        default: true,
    },
    familyGroupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyGroup',
        default: null,
    },
}, { timestamps: true });

// Index for cron job efficiency
recurringExpenseSchema.index({ nextOccurrence: 1, status: 1 });

const RecurringExpense = mongoose.model('RecurringExpense', recurringExpenseSchema);
export default RecurringExpense;
