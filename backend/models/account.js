import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'; // Import bcryptjs for hashing

const accountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  bankName: {
    type: String,
    required: [true, 'Bank name is required'],
    trim: true,
    enum: ['FakeBank Inc.', 'Mock Savings', 'Digital Credit Union', 'Test National Bank'],
  },
  accountNumber: {
    type: String,
    required: [true, 'Account number is required mandatory123'],
    unique: true,
    trim: true,
    minlength: 10,
    maxlength: 16,
  },
  accountType: {
    type: String,
    enum: ['Savings', 'Current', 'Salary'],
    default: 'Savings',
  },
  balance: {
    type: Number,
    required: true,
    default: 10000,
    min: 0,
  },
  upiPin: { // Store the hash of the UPI PIN
    type: String,
    required: [true, 'UPI PIN is required'],
    // We don't store the length here, but validation during creation/update should enforce 4 or 6 digits
  },
  isPrimary: {
      type: Boolean,
      default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// --- UPI PIN Hashing ---
// Hash PIN before saving a new account or when PIN is modified
accountSchema.pre('save', async function (next) {
  // Only hash the pin if it has been modified (or is new)
  if (!this.isModified('upiPin')) return next();

  // Basic validation for PIN format (4 or 6 digits) BEFORE hashing
  if (!/^\d{4}$|^\d{6}$/.test(this.upiPin)) {
       return next(new Error('UPI PIN must be 4 or 6 digits'));
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.upiPin = await bcrypt.hash(this.upiPin, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// --- UPI PIN Comparison ---
// Method to compare submitted PIN with the stored hash during transactions
accountSchema.methods.compareUpiPin = async function (candidatePin) {
   if (!candidatePin) return false;
   return bcrypt.compare(candidatePin, this.upiPin);
};


export default mongoose.model('Account', accountSchema);