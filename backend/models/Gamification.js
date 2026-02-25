import mongoose from 'mongoose';

const badgeSchema = new mongoose.Schema({
    id: { type: String, required: true }, // unique identifier e.g., 'first_save'
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true }, // emoji or url
    unlockedAt: { type: Date, default: Date.now },
    isNew: { type: Boolean, default: true } // to show popup
});

const gamificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    badges: [badgeSchema],
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastStreakDate: { type: Date },
    streakHistory: [{
        date: { type: Date, required: true },
        status: { type: String, enum: ['active', 'frozen', 'broken'], default: 'active' }
    }],
    title: { type: String, default: 'Rookie Saver' },
    xpHistory: [{
        date: { type: Date, default: Date.now },
        amount: Number,
        reason: String
    }],
    lastActivityDate: { type: Date, default: Date.now }
}, { timestamps: true });

// Level calculation: Level = 1 + floor(sqrt(XP / 100)) or similar curve
// Let's use a simple linear-ish curve: Level N requires 100 * N XP total?
// Or: Level = Math.floor(XP / 500) + 1
gamificationSchema.methods.calculateLevel = function () {
    return Math.floor(this.xp / 500) + 1;
};

const Gamification = mongoose.model('Gamification', gamificationSchema);
export default Gamification;
