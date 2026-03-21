import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/\S+@\S+\.\S+/, 'Please use a valid email address'],
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'family-admin'],
    default: 'user'
  },
  profile: {
    fullName: String,
    phoneNumber: String,
    bio: String,
    avatar: String, // URL/Path to image
    preferredCurrency: { type: String, default: 'INR' },
    timezone: { type: String, default: 'UTC+5:30' },
    country: { type: String, default: 'India' },
    financialYear: { type: String, default: 'FY2025-26' },
  },
  settings: {
    notifications: {
      expenses: { type: Boolean, default: true },
      budgets: { type: Boolean, default: true },
      family: { type: Boolean, default: true },
      investments: { type: Boolean, default: true },
      tax: { type: Boolean, default: true },
      gamification: { type: Boolean, default: true },
      ai: { type: Boolean, default: true },
    },
    financial: {
      defaultCategory: { type: String, default: 'General' },
      defaultPaymentMethod: { type: String, default: 'UPI' },
      autoSetMonthlyBudget: { type: Boolean, default: false },
      currencyFormatting: { type: String, default: 'en-IN' },
      rounding: { type: Boolean, default: true },
    },
    tax: {
      regime: { type: String, enum: ['Old', 'New'], default: 'New' },
      autoTrackDeductions: { type: Boolean, default: true },
      planningStrategy: { type: String, enum: ['Conservative', 'Aggressive'], default: 'Conservative' },
    },
    investment: {
      riskAppetite: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
      horizon: { type: String, default: 'Medium Term' },
      autoInvestRecommendations: { type: Boolean, default: true },
      portfolioRebalancing: { type: Boolean, default: true },
    },
    gamification: {
      enabled: { type: Boolean, default: true },
      publicLeaderboard: { type: Boolean, default: false },
    },
    ai: {
      enabled: { type: Boolean, default: true },
      memoryPersonalization: { type: Boolean, default: true },
      dataUsageConsent: { type: Boolean, default: true },
      analysisDepth: { type: String, enum: ['Basic', 'Advanced'], default: 'Advanced' },
    },
    app: {
      theme: { type: String, enum: ['Light', 'Dark'], default: 'Light' },
      compactMode: { type: Boolean, default: false },
      dashboardLayout: { type: String, default: 'Default' },
    }
  },
  notificationsEnabled: {
    type: Boolean,
    default: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    validate: {
      validator: function(v) {
        // Enforce at least one number, one uppercase, one lowercase and one special character
        return /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/.test(v);
      },
      message: props => `Password does not meet complexity requirements! It needs an uppercase, lowercase, number, and special character.`
    }
  },
  currentFamilyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyGroup',
    default: null,
  },
  resetToken: {
    type: String,
    default: null,
  },
  resetTokenExpires: {
    type: Number,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare password for login
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);