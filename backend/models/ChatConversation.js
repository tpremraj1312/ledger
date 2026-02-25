import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    metadata: {
        chartData: mongoose.Schema.Types.Mixed,
        actionResult: mongoose.Schema.Types.Mixed,
        confirmationRequired: { type: Boolean, default: false },
        suggestions: [String],
        responseType: { type: String, enum: ['text', 'chart', 'table', 'card', 'comparison', 'warning', 'confirmation'], default: 'text' },
    },
}, { _id: false });

const pendingConfirmationSchema = new mongoose.Schema({
    toolName: { type: String, required: true },
    params: { type: mongoose.Schema.Types.Mixed, required: true },
    nonce: { type: String, required: true },
    expiresAt: { type: Date, required: true },
}, { _id: false });

const conversationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    title: {
        type: String,
        default: 'New Conversation',
        trim: true,
    },
    messages: {
        type: [messageSchema],
        default: [],
    },
    pendingConfirmation: {
        type: pendingConfirmationSchema,
        default: null,
    },
    contextSummary: {
        type: String,
        default: '',
    },
}, {
    timestamps: true,
});

// Index for listing conversations sorted by last update
conversationSchema.index({ userId: 1, updatedAt: -1 });

// Append a message efficiently
conversationSchema.methods.addMessage = function (role, content, metadata = {}) {
    this.messages.push({ role, content, metadata, timestamp: new Date() });
    return this;
};

// Auto-generate title from first user message
conversationSchema.pre('save', function (next) {
    if (this.isNew && this.messages.length > 0) {
        const firstMsg = this.messages.find(m => m.role === 'user');
        if (firstMsg) {
            this.title = firstMsg.content.substring(0, 60) + (firstMsg.content.length > 60 ? '...' : '');
        }
    }
    next();
});

export default mongoose.model('ChatConversation', conversationSchema);
