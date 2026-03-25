/**
 * Notification Service — Local Push Notifications for Fraud Alerts
 * 
 * Uses expo-notifications to show local push notifications
 * when a high-risk SMS transaction is detected.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ─── Configure Notification Handler ─────────────────────────────────────────
// This determines how notifications behave when app is in FOREGROUND
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Initialize notification channel for Android.
 * Must be called once at app startup.
 */
export const initializeNotifications = async () => {
  if (Platform.OS === 'android') {
    // Create a high-importance channel for fraud alerts
    await Notifications.setNotificationChannelAsync('fraud-alerts', {
      name: 'Fraud Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#DC2626',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      description: 'High-priority alerts for suspicious financial transactions',
    });

    // General SMS activity channel (lower priority)
    await Notifications.setNotificationChannelAsync('sms-activity', {
      name: 'SMS Activity',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      description: 'Notifications about parsed SMS transactions',
    });
  }
};

/**
 * Send a local push notification for a high-risk (fraud) transaction.
 * 
 * @param {Object} transaction - Parsed SMS transaction object
 */
export const sendFraudAlertNotification = async (transaction) => {
  if (!transaction) return;

  const { merchant, amount, riskScore, riskLevel, riskReasons, category } = transaction;

  const formattedAmount = `₹${(amount || 0).toLocaleString('en-IN')}`;
  const reasons = (riskReasons || []).slice(0, 2).join(' • ') || 'Unusual activity detected';

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 Fraud Alert — Suspicious Transaction',
        subtitle: `${formattedAmount} at ${merchant || 'Unknown'}`,
        body: `Risk Score: ${riskScore}/100 (${(riskLevel || 'high').toUpperCase()})\n${reasons}`,
        data: {
          type: 'fraud_alert',
          smsHash: transaction.smsHash,
          transaction: JSON.stringify(transaction),
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'fraud-alert',
      },
      trigger: null, // Send immediately
    });

    console.log('[NotificationService] Fraud alert sent for:', merchant, formattedAmount);
  } catch (err) {
    console.error('[NotificationService] Failed to send fraud alert:', err);
  }
};

/**
 * Send a general SMS parsed notification (for regular transactions).
 * Only used when a transaction is auto-parsed from incoming SMS.
 * 
 * @param {Object} transaction - Parsed SMS transaction object
 */
export const sendSmsParsedNotification = async (transaction) => {
  if (!transaction) return;

  const { merchant, amount, transactionType } = transaction;
  const formattedAmount = `₹${(amount || 0).toLocaleString('en-IN')}`;
  const typeLabel = transactionType === 'credit' ? 'Credit' : 'Debit';

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `💰 ${typeLabel} — ${formattedAmount}`,
        body: `${merchant || 'Unknown Merchant'} • Auto-parsed from bank SMS`,
        data: {
          type: 'sms_parsed',
          smsHash: transaction.smsHash,
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
      },
      trigger: null,
    });
  } catch (err) {
    console.error('[NotificationService] Failed to send SMS parsed notification:', err);
  }
};

export default {
  initializeNotifications,
  sendFraudAlertNotification,
  sendSmsParsedNotification,
};
