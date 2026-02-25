import mongoose from 'mongoose';

const missionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    weekStartDate: { type: Date, required: true },
    weekEndDate: { type: Date, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String },
    type: { type: String, enum: ['daily', 'weekly'], default: 'weekly' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    targetRule: { type: Object },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'completed', 'failed', 'rejected'],
        default: 'pending'
    },
    xpReward: { type: Number, default: 30 },
    progressAmount: { type: Number, default: 0 },
    targetAmount: { type: Number },
    createdAt: { type: Date, default: Date.now }
});

missionSchema.index({ user: 1, status: 1, weekEndDate: 1 });
missionSchema.index({ user: 1, category: 1 });

const Mission = mongoose.model('Mission', missionSchema);
export default Mission;
