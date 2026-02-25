import mongoose from 'mongoose';

const familyInviteSchema = new mongoose.Schema({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyGroup',
        required: true,
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    email: {
        type: String,
        required: [true, 'Invitee email is required'],
        lowercase: true,
        trim: true,
    },
    tokenHash: {
        type: String,
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    used: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

// Indexes
familyInviteSchema.index({ tokenHash: 1 });
familyInviteSchema.index({ groupId: 1, email: 1 });
familyInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL auto-cleanup

const FamilyInvite = mongoose.model('FamilyInvite', familyInviteSchema);
export default FamilyInvite;
