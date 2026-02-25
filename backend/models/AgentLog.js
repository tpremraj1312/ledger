import mongoose from 'mongoose';

const agentLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatConversation',
        default: null,
    },
    intent: {
        type: String,
        default: '',
    },
    action: {
        type: String,
        default: '',
    },
    toolName: {
        type: String,
        default: '',
    },
    success: {
        type: Boolean,
        default: true,
    },
    denied: {
        type: Boolean,
        default: false,
    },
    denialReason: {
        type: String,
        default: '',
    },
    error: {
        type: String,
        default: '',
    },
    duration: {
        type: Number, // milliseconds
        default: 0,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

// Compound indexes for analytics queries
agentLogSchema.index({ userId: 1, timestamp: -1 });
agentLogSchema.index({ toolName: 1, timestamp: -1 });
agentLogSchema.index({ denied: 1, timestamp: -1 });

export default mongoose.model('AgentLog', agentLogSchema);
