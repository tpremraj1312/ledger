/**
 * SmsAutoListener — Robust Real-Time SMS Auto-Read Component
 * 
 * Architecture:
 * 1. INBOX POLLING: Reads SMS inbox via react-native-get-sms-android every 30s
 * 2. APP RESUME: Scans for new SMS when app comes to foreground
 * 3. REAL-TIME FALLBACK: Uses react-native-android-sms-listener when foregrounded
 * 4. DEDUP: Uses smsHash to never process the same SMS twice
 * 5. NOTIFICATIONS: Fires local push notification on high-risk fraud
 * 
 * This replaces the old approach that relied solely on BroadcastReceiver
 * (which silently failed when Activity was null or app was backgrounded).
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { PermissionsAndroid, Platform, AppState, NativeModules } from 'react-native';
import useSmsStore from '../store/smsStore';
import { useFinancial } from '../context/FinancialContext';
import api from '../api/axios';
import {
  sendFraudAlertNotification,
} from '../utils/notificationService';

// Conditionally import native SMS modules — they may not exist on iOS/web
let SmsListener = null;
let SmsAndroid = null;

try {
  SmsListener = require('react-native-android-sms-listener').default;
} catch (e) {
  console.log('[SmsAutoListener] react-native-android-sms-listener not available');
}

try {
  SmsAndroid = NativeModules.SmsAndroid || require('react-native-get-sms-android').default;
} catch (e) {
  console.log('[SmsAutoListener] react-native-get-sms-android not available');
}

// ─── Config ─────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 30000; // 30 seconds
const MAX_SMS_TO_READ = 50;     // Read last 50 SMS per poll
const SMS_MAX_AGE_MS = 24 * 60 * 60 * 1000; // Only process SMS from last 24 hours

const SmsAutoListener = () => {
  const { refreshData } = useFinancial();
  const pollTimerRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const listenerSubRef = useRef(null);
  const isProcessingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  /**
   * Request all SMS permissions from the user.
   * Returns true if at least READ_SMS is granted.
   */
  const requestPermissions = useCallback(async () => {
    if (Platform.OS !== 'android') return false;

    try {
      const statuses = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      ]);

      const canRead = statuses[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;
      const canReceive = statuses[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED;

      console.log(`[SmsAutoListener] Permissions — READ_SMS: ${canRead}, RECEIVE_SMS: ${canReceive}`);
      return canRead;
    } catch (err) {
      console.error('[SmsAutoListener] Permission request failed:', err);
      return false;
    }
  }, []);

  /**
   * Process a single SMS message: parse → classify → risk score → sync → notify.
   * Returns the parsed transaction or null.
   */
  const processOneSms = useCallback(async (body, sender) => {
    try {
      const store = useSmsStore.getState();

      // Check if auto-sync is enabled
      if (store.settings && !store.settings.autoSyncEnabled) {
        return null;
      }

      const result = store.processSms(body, sender, false);
      if (!result) return null;

      console.log('[SmsAutoListener] ✅ Financial SMS parsed:', result.transactionType, '₹' + result.amount, 'at', result.merchant);

      // Sync to backend
      try {
        await api.post('/api/sms/sync', { transactions: [result] });
        console.log('[SmsAutoListener] ✅ Backend sync successful');
      } catch (syncErr) {
        console.error('[SmsAutoListener] Backend sync failed (will retry later):', syncErr.message);
      }

      // Send fraud notification if high risk
      const threshold = store.userThreshold || 50;
      if (result.transactionType === 'debit' && result.riskScore >= threshold) {
        console.log('[SmsAutoListener] 🚨 HIGH RISK detected! Score:', result.riskScore, '/ Threshold:', threshold);
        await sendFraudAlertNotification(result);
      }

      return result;
    } catch (err) {
      console.error('[SmsAutoListener] Error processing SMS:', err);
      return null;
    }
  }, []);

  /**
   * Read SMS inbox using react-native-get-sms-android and process new messages.
   * This is the PRIMARY and most reliable method.
   */
  const scanInbox = useCallback(async () => {
    if (Platform.OS !== 'android' || !SmsAndroid || isProcessingRef.current) return;

    isProcessingRef.current = true;

    try {
      const store = useSmsStore.getState();
      const lastTimestamp = store.lastInboxScanTimestamp || (Date.now() - SMS_MAX_AGE_MS);

      // Build filter: only read SMS after lastTimestamp
      const filter = {
        box: 'inbox',
        maxCount: MAX_SMS_TO_READ,
        minDate: lastTimestamp,
      };

      const messages = await new Promise((resolve, reject) => {
        SmsAndroid.list(
          JSON.stringify(filter),
          (fail) => {
            console.error('[SmsAutoListener] SMS list failed:', fail);
            reject(new Error(fail));
          },
          (count, smsList) => {
            try {
              const parsed = JSON.parse(smsList);
              resolve(parsed);
            } catch (e) {
              resolve([]);
            }
          }
        );
      });

      if (!messages || messages.length === 0) {
        isProcessingRef.current = false;
        return;
      }

      console.log(`[SmsAutoListener] 📥 Inbox scan: ${messages.length} SMS found since last scan`);

      let newCount = 0;
      let shouldRefreshUI = false;

      for (const msg of messages) {
        const body = msg.body || '';
        const sender = msg.address || '';

        if (!body || body.length < 10) continue;

        const result = await processOneSms(body, sender);
        if (result) {
          newCount++;
          shouldRefreshUI = true;
        }
      }

      // Update the last scan timestamp to NOW
      useSmsStore.getState().setLastInboxScanTimestamp(Date.now());

      if (shouldRefreshUI) {
        console.log(`[SmsAutoListener] 📊 ${newCount} new financial SMS processed. Refreshing UI...`);
        try {
          await refreshData(true);
        } catch (err) {
          console.error('[SmsAutoListener] UI refresh failed:', err);
        }
      }
    } catch (err) {
      console.error('[SmsAutoListener] Inbox scan error:', err);
    } finally {
      isProcessingRef.current = false;
    }
  }, [processOneSms, refreshData]);

  /**
   * Set up the real-time BroadcastReceiver listener (bonus — works when foregrounded).
   */
  const setupRealtimeListener = useCallback(() => {
    if (!SmsListener) return null;

    try {
      const subscription = SmsListener.addListener(async (message) => {
        console.log('[SmsAutoListener] 📲 Real-time SMS received from:', message.originatingAddress);

        const result = await processOneSms(message.body, message.originatingAddress);
        if (result) {
          // Update scan timestamp so polling doesn't re-process
          useSmsStore.getState().setLastInboxScanTimestamp(Date.now());
          try {
            await refreshData(true);
          } catch (err) {
            console.error('[SmsAutoListener] UI refresh failed:', err);
          }
        }
      });

      console.log('[SmsAutoListener] 📡 Real-time BroadcastReceiver listener active');
      return subscription;
    } catch (err) {
      console.warn('[SmsAutoListener] Real-time listener setup failed:', err);
      return null;
    }
  }, [processOneSms, refreshData]);

  /**
   * Handle AppState changes — scan inbox whenever app comes to foreground.
   */
  const handleAppStateChange = useCallback((nextAppState) => {
    if (
      appStateRef.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      console.log('[SmsAutoListener] 📱 App resumed — scanning inbox for new SMS...');
      scanInbox();
    }
    appStateRef.current = nextAppState;
  }, [scanInbox]);

  // ─── Main Effect ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let isMounted = true;

    const initialize = async () => {
      // 1. Request permissions
      const canRead = await requestPermissions();
      if (!canRead) {
        console.log('[SmsAutoListener] ❌ SMS permissions denied. Auto-read disabled.');
        return;
      }

      // 2. Initialize SMS store if needed
      const store = useSmsStore.getState();
      if (store.transactions.length === 0 && !hasInitializedRef.current) {
        await store.initialize();
        hasInitializedRef.current = true;
      }

      if (!isMounted) return;

      // 3. Do an initial inbox scan
      console.log('[SmsAutoListener] 🚀 Starting initial inbox scan...');
      await scanInbox();

      // 4. Set up periodic polling (every 30 seconds)
      pollTimerRef.current = setInterval(() => {
        if (isMounted) scanInbox();
      }, POLL_INTERVAL_MS);

      // 5. Set up real-time listener as bonus
      listenerSubRef.current = setupRealtimeListener();

      // 6. Listen for app state changes
      const appStateSub = AppState.addEventListener('change', handleAppStateChange);

      // Store cleanup ref
      listenerSubRef.current = {
        smsListener: listenerSubRef.current,
        appStateSub,
      };

      console.log('[SmsAutoListener] ✅ Fully initialized — Polling + Real-time + AppState');
    };

    initialize();

    return () => {
      isMounted = false;

      // Clear polling interval
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      // Remove real-time listener
      if (listenerSubRef.current?.smsListener?.remove) {
        listenerSubRef.current.smsListener.remove();
      }

      // Remove AppState listener
      if (listenerSubRef.current?.appStateSub?.remove) {
        listenerSubRef.current.appStateSub.remove();
      }

      console.log('[SmsAutoListener] 🧹 Cleaned up all listeners');
    };
  }, [requestPermissions, scanInbox, setupRealtimeListener, handleAppStateChange]);

  // Invisible background component
  return null;
};

export default SmsAutoListener;
