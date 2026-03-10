import mongoose from 'mongoose';

const financialGoalSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    type: {
        type: String,
        enum: ['expense_limit', 'income_target', 'savings_target'],
        required: true
    },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, default: 0 },
    period: {
        type: String,
        enum: ['weekly', 'monthly', 'custom'],
        default: 'monthly'
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ['active', 'completed', 'failed'],
        default: 'active'
    },
    xpReward: { type: Number, default: 100 },
    completedAt: { type: Date },
}, { timestamps: true });

financialGoalSchema.index({ user: 1, status: 1 });

const FinancialGoal = mongoose.model('FinancialGoal', financialGoalSchema);
export default FinancialGoal;
