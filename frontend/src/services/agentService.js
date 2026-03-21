/**
 * Agent Service — Frontend API layer for AI Agent endpoints
 * Uses fetch for SSE streaming (EventSource doesn't support POST + headers)
 *
 * v2 Enhancements:
 *   - New SSE event handlers: plan, insight, charts
 *   - Progressive rendering support
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
});

/**
 * Send a message to the AI Agent with SSE streaming.
 * Returns an object with methods to handle the stream.
 *
 * @param {string} message
 * @param {string|null} conversationId
 * @param {Object|null} confirmAction - { nonce } for confirming destructive actions
 * @param {Object} callbacks - { onToken, onStatus, onComplete, onError, onPlan, onInsight, onCharts }
 * @returns {Object} - { abort() } to cancel the stream
 */
export const sendAgentMessage = (message, conversationId, confirmAction, callbacks) => {
    const controller = new AbortController();

    const run = async () => {
        try {
            const body = { message };
            if (conversationId) body.conversationId = conversationId;
            if (confirmAction) body.confirmAction = confirmAction;

            const response = await fetch(`${BACKEND_URL}/api/agent/chat`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ message: 'Request failed' }));
                callbacks.onError?.(err.message || 'Request failed');
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                let eventType = '';
                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        eventType = line.slice(7).trim();
                    } else if (line.startsWith('data: ') && eventType) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            switch (eventType) {
                                case 'token':
                                    callbacks.onToken?.(data.text);
                                    break;
                                case 'status':
                                    callbacks.onStatus?.(data);
                                    break;
                                case 'complete':
                                    callbacks.onComplete?.(data);
                                    break;
                                case 'error':
                                    callbacks.onError?.(data.message);
                                    break;
                                // v2 events
                                case 'plan':
                                    callbacks.onPlan?.(data);
                                    break;
                                case 'insight':
                                    callbacks.onInsight?.(data);
                                    break;
                                case 'charts':
                                    callbacks.onCharts?.(data);
                                    break;
                            }
                        } catch {
                            // Ignore unparseable lines
                        }
                        eventType = '';
                    }
                }
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                callbacks.onError?.(error.message || 'Connection failed');
            }
        }
    };

    run();

    return { abort: () => controller.abort() };
};

/**
 * Get all conversations (paginated)
 */
export const getConversations = async (page = 1) => {
    const res = await fetch(`${BACKEND_URL}/api/agent/conversations?page=${page}`, {
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return res.json();
};

/**
 * Get a single conversation with messages
 */
export const getConversation = async (id) => {
    const res = await fetch(`${BACKEND_URL}/api/agent/conversations/${id}`, {
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch conversation');
    return res.json();
};

/**
 * Delete a specific conversation
 */
export const deleteConversation = async (id) => {
    const res = await fetch(`${BACKEND_URL}/api/agent/conversations/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete conversation');
    return res.json();
};

/**
 * Clear all conversation history
 */
export const clearAllHistory = async () => {
    const res = await fetch(`${BACKEND_URL}/api/agent/conversations`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to clear history');
    return res.json();
};
