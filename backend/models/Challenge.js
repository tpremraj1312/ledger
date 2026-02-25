import mongoose from 'mongoose';

const challengeSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    category: { type: String, required: true }, // 'Food', 'Shopping', 'Total', etc.
    type: {
        type: String,
        enum: ['spendingLimit', 'savingTarget', 'noSpend'],
        required: true
    },
    targetAmount: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    progressAmount: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['active', 'completed', 'failed', 'paused'],
        default: 'active'
    },
    xpReward: { type: Number, default: 50 },
    createdAt: { type: Date, default: Date.now }
});

const Challenge = mongoose.model('Challenge', challengeSchema);
export default Challenge;
