import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    role: {
        type: String,
        enum: ['ADMIN', 'MEMBER', 'VIEWER'],
        default: 'VIEWER',
        required: true,
    },
    joinedAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });

const familyGroupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Group name is required'],
        trim: true,
        maxlength: [100, 'Group name cannot exceed 100 characters'],
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    members: {
        type: [memberSchema],
        validate: {
            validator: (members) => members.length > 0,
            message: 'Group must have at least one member',
        },
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

// Indexes
familyGroupSchema.index({ 'members.user': 1, isActive: 1 });
familyGroupSchema.index({ createdBy: 1 });
// Enforce unique family name per creator
familyGroupSchema.index({ createdBy: 1, name: 1 }, { unique: true });

const FamilyGroup = mongoose.model('FamilyGroup', familyGroupSchema);
export default FamilyGroup;
