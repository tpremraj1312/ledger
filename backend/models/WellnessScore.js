import mongoose from 'mongoose';

const wellnessScoreSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    label: { type: String }, // Poor, Average, Good, Excellent
    metrics: {
        savingsRate: Number,
        budgetAdherence: Number,
        expenseTrend: Number,
        investmentConsistency: Number
    },
    tips: [String],
    calculatedAt: { type: Date, default: Date.now }
});

const WellnessScore = mongoose.model('WellnessScore', wellnessScoreSchema);
export default WellnessScore;
