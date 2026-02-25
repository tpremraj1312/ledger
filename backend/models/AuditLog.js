import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyGroup',
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    action: {
        type: String,
        enum: [
            'GROUP_CREATED',
            'MEMBER_INVITED',
            'MEMBER_JOINED',
            'MEMBER_REMOVED',
            'MEMBER_LEFT',
            'ROLE_CHANGED',
            'GROUP_DISSOLVED',
            'TRANSACTION_ADDED',
            'TRANSACTION_EDITED',
            'TRANSACTION_DELETED',
            'BUDGET_UPDATED',
            'BUDGET_COPIED',
            'RECURRING_CREATED',
            'RECURRING_PROCESSED',
        ],
        required: true,
    },
    details: {
        type: String,
        default: '',
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

auditLogSchema.index({ groupId: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
