/**
 * Agent Service — React Native implementation of the AI Agent API layer.
 * 
 * CRITICAL: This implementation uses XMLHttpRequest to handle SSE streaming
 * because React Native's fetch does not yet support ReadableStream for response bodies.
 * 
 * v2 Features:
 * - Real-time SSE streaming (token, status, plan, insight, charts, complete)
 * - Support for destructive action confirmation (nonce)
 * - Conversation management (get/delete/clear)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../api/config';

const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem('token');
  } catch (err) {
    return null;
  }
};

/**
 * Send a message to the AI Agent with streaming support.
 * @param {string|null} message 
 * @param {string|null} conversationId 
 * @param {Object|null} confirmAction - { nonce }
 * @param {Object} callbacks - { onToken, onStatus, onPlan, onInsight, onCharts, onComplete, onError }
 * @returns {Object} - { abort() }
 */
export const sendAgentMessage = (message, conversationId, confirmAction, callbacks) => {
  const xhr = new XMLHttpRequest();
  let cancelled = false;

  const run = async () => {
    try {
      const token = await getAuthToken();
      const url = `${BACKEND_URL}/api/agent/chat`;
      
      const body = { message };
      if (conversationId) body.conversationId = conversationId;
      if (confirmAction) body.confirmAction = confirmAction;

      xhr.open('POST', url);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      let lastIndex = 0;

      xhr.onreadystatechange = () => {
        if (cancelled) return;

        // Note: ReadyState 3 (LOADING) is used for streaming
        if (xhr.readyState === 3 || xhr.readyState === 4) {
          const responseText = xhr.responseText;
          const chunk = responseText.substring(lastIndex);
          lastIndex = responseText.length;

          if (!chunk) return;

          const lines = chunk.split('\n');
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
                  case 'plan':
                    callbacks.onPlan?.(data);
                    break;
                  case 'insight':
                    callbacks.onInsight?.(data);
                    break;
                  case 'charts':
                    callbacks.onCharts?.(data);
                    break;
                  case 'complete':
                    callbacks.onComplete?.(data);
                    break;
                  case 'error':
                    callbacks.onError?.(data.message);
                    break;
                }
              } catch (e) {
                // Ignore incomplete/malformed chunks
              }
              eventType = '';
            }
          }
        }

        if (xhr.readyState === 4) {
          if (xhr.status >= 400 && !cancelled) {
            try {
              const err = JSON.parse(xhr.responseText);
              callbacks.onError?.(err.message || 'Request failed');
            } catch (e) {
              callbacks.onError?.('Network request failed');
            }
          }
        }
      };

      xhr.onerror = () => {
        if (!cancelled) {
          callbacks.onError?.('Network error');
        }
      };

      xhr.onabort = () => {
        cancelled = true;
      };

      xhr.send(JSON.stringify(body));
    } catch (err) {
      if (!cancelled) {
        callbacks.onError?.(err.message || 'Failed to start stream');
      }
    }
  };

  run();

  return {
    abort: () => {
      cancelled = true;
      xhr.abort();
    }
  };
};

/**
 * Conversation List
 */
export const getConversations = async (page = 1) => {
  const token = await getAuthToken();
  const res = await fetch(`${BACKEND_URL}/api/agent/conversations?page=${page}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json();
};

/**
 * Get Specific Conversation
 */
export const getConversation = async (id) => {
  const token = await getAuthToken();
  const res = await fetch(`${BACKEND_URL}/api/agent/conversations/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch conversation');
  return res.json();
};

/**
 * Delete Conversation
 */
export const deleteConversation = async (id) => {
  const token = await getAuthToken();
  const res = await fetch(`${BACKEND_URL}/api/agent/conversations/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to delete conversation');
  return res.json();
};

/**
 * Clear All History
 */
export const clearAllHistory = async () => {
  const token = await getAuthToken();
  const res = await fetch(`${BACKEND_URL}/api/agent/conversations`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to clear history');
  return res.json();
};
