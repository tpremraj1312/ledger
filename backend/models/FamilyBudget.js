import mongoose from 'mongoose';

const budgetCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
    },
    allocatedAmount: {
        type: Number,
        required: [true, 'Allocated amount is required'],
        min: [0, 'Allocated amount cannot be negative'],
    },
}, { _id: false });

const familyBudgetSchema = new mongoose.Schema({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyGroup',
        required: true,
    },
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12,
    },
    year: {
        type: Number,
        required: true,
    },
    categories: {
        type: [budgetCategorySchema],
        default: [],
    },
}, { timestamps: true });

// One budget per group per month
familyBudgetSchema.index({ groupId: 1, month: 1, year: 1 }, { unique: true });

const FamilyBudget = mongoose.model('FamilyBudget', familyBudgetSchema);
export default FamilyBudget;
