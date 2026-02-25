import express from 'express';
import agentRateLimit from '../middleware/agentRateLimit.js';
import {
    sendMessage,
    getConversations,
    getConversation,
    deleteConversation,
    clearAllHistory,
} from '../controllers/agentController.js';

const router = express.Router();

// Apply rate limiting to all agent routes
router.use(agentRateLimit);

// Main chat endpoint (SSE streaming)
router.post('/chat', sendMessage);

// Conversation history management
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversation);
router.delete('/conversations/:id', deleteConversation);
router.delete('/conversations', clearAllHistory);

export default router;
