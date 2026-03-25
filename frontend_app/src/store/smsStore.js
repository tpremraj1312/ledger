/**
 * SMS Store — Zustand + AsyncStorage Offline-First Storage
 * 
 * Manages: parsed SMS transactions, risk scores, user spending profile.
 * Persists everything to AsyncStorage for full offline capability.
 * Provides sync-to-backend functionality when online.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseSms } from '../utils/smsParser';
import { classifyTransaction } from '../utils/categoryClassifier';
import {
  calculateRiskScore,
  calculateUserThreshold,
  buildUserProfile,
} from '../utils/riskEngine';

// ─── AsyncStorage Keys ──────────────────────────────────────────────────────
const STORAGE_KEYS = {
  TRANSACTIONS: '@sms_transactions',
  USER_PROFILE: '@sms_user_profile',
  SETTINGS: '@sms_settings',
  SEEN_HASHES: '@sms_seen_hashes',
  LAST_INBOX_SCAN: '@sms_last_inbox_scan',
};

// ─── Persistence Helpers ────────────────────────────────────────────────────

const saveToStorage = async (key, data) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`[SMSStore] Failed to save ${key}:`, err);
  }
};

const loadFromStorage = async (key, fallback = null) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`[SMSStore] Failed to load ${key}:`, err);
    return fallback;
  }
};

// ─── Zustand Store ──────────────────────────────────────────────────────────

const useSmsStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────
  transactions: [],
  userProfile: null,
  userThreshold: 50,
  seenHashes: new Set(),
  isLoading: true,
  lastAlert: null, // Last high-risk transaction for alert modal
  lastInboxScanTimestamp: null, // Tracks the last time we scanned the SMS inbox
  settings: {
    alertsEnabled: true,
    vibrationEnabled: true,
    autoSyncEnabled: true,
  },

  // ── Initialization ─────────────────────────────────────────────
  initialize: async () => {
    try {
      const [transactions, settings, seenHashesArr, lastScan] = await Promise.all([
        loadFromStorage(STORAGE_KEYS.TRANSACTIONS, []),
        loadFromStorage(STORAGE_KEYS.SETTINGS, null),
        loadFromStorage(STORAGE_KEYS.SEEN_HASHES, []),
        loadFromStorage(STORAGE_KEYS.LAST_INBOX_SCAN, null),
      ]);

      const seenHashes = new Set(seenHashesArr);
      const userProfile = buildUserProfile(transactions);
      const userThreshold = calculateUserThreshold(userProfile);

      set({
        transactions,
        userProfile,
        userThreshold,
        seenHashes,
        isLoading: false,
        settings: settings || get().settings,
        lastInboxScanTimestamp: lastScan,
      });
    } catch (err) {
      console.error('[SMSStore] Initialization failed:', err);
      set({ isLoading: false });
    }
  },

  // ── Process a Single Raw SMS ───────────────────────────────────
  processSms: (rawSms, sender = '', forceReparse = false) => {
    const state = get();

    // Step 1: Parse
    const parsed = parseSms(rawSms, sender);
    if (!parsed) return null; // Non-financial SMS

    // Step 2: Deduplicate (skip if forceReparse is true)
    if (!forceReparse && state.seenHashes.has(parsed.smsHash)) {
      return null; // Already processed
    }

    // Step 3: Classify
    parsed.category = classifyTransaction(
      parsed.merchant,
      parsed.rawSms,
      parsed.transactionType
    );

    // Step 4: Risk Score
    const riskResult = calculateRiskScore(parsed, state.userProfile || {});
    parsed.riskScore = riskResult.riskScore;
    parsed.riskLevel = riskResult.riskLevel;
    parsed.riskReasons = riskResult.riskReasons;
    parsed.factorBreakdown = riskResult.factorBreakdown;

    // Step 5: Update state (replace old entry if forceReparse)
    let newTransactions;
    if (forceReparse && state.seenHashes.has(parsed.smsHash)) {
      // Replace the old (incorrectly parsed) entry with the new one
      newTransactions = state.transactions.map(tx =>
        tx.smsHash === parsed.smsHash ? parsed : tx
      );
    } else {
      newTransactions = [parsed, ...state.transactions];
    }

    const newSeenHashes = new Set(state.seenHashes);
    newSeenHashes.add(parsed.smsHash);

    // Rebuild profile with updated history
    const newProfile = buildUserProfile(newTransactions);
    const newThreshold = calculateUserThreshold(newProfile);

    // Check if alert should trigger
    const shouldAlert =
      state.settings.alertsEnabled &&
      parsed.transactionType === 'debit' &&
      parsed.riskScore >= newThreshold;

    set({
      transactions: newTransactions,
      seenHashes: newSeenHashes,
      userProfile: newProfile,
      userThreshold: newThreshold,
      lastAlert: shouldAlert ? parsed : state.lastAlert,
    });

    // Persist asynchronously (non-blocking)
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, newTransactions);
    saveToStorage(STORAGE_KEYS.SEEN_HASHES, Array.from(newSeenHashes));

    return parsed;
  },

  // ── Batch Process Multiple SMS ─────────────────────────────────
  batchProcessSms: (smsList) => {
    const results = [];
    for (const sms of smsList) {
      const text = sms.body || sms.text || sms;
      const sender = sms.sender || sms.address || '';
      const result = get().processSms(
        typeof text === 'string' ? text : String(text),
        sender
      );
      if (result) results.push(result);
    }
    return results;
  },

  // ── Mark Transaction as Safe ───────────────────────────────────
  markAsSafe: (smsHash) => {
    const state = get();
    const updated = state.transactions.map(tx => {
      if (tx.smsHash === smsHash) {
        return {
          ...tx,
          riskScore: 0,
          riskLevel: 'low',
          riskReasons: ['Marked safe by user'],
          markedSafe: true,
        };
      }
      return tx;
    });

    set({ transactions: updated });
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, updated);
  },

  // ── Delete Transaction ─────────────────────────────────────────
  deleteTransaction: (smsHash) => {
    const state = get();
    const filtered = state.transactions.filter(tx => tx.smsHash !== smsHash);
    const newProfile = buildUserProfile(filtered);
    const newThreshold = calculateUserThreshold(newProfile);

    set({
      transactions: filtered,
      userProfile: newProfile,
      userThreshold: newThreshold,
    });

    saveToStorage(STORAGE_KEYS.TRANSACTIONS, filtered);
  },

  // ── Dismiss Alert ──────────────────────────────────────────────
  dismissAlert: () => {
    set({ lastAlert: null });
  },

  // ── Update Settings ────────────────────────────────────────────
  updateSettings: (newSettings) => {
    const current = get().settings;
    const merged = { ...current, ...newSettings };
    set({ settings: merged });
    saveToStorage(STORAGE_KEYS.SETTINGS, merged);
  },

  // ── Set Last Inbox Scan Timestamp ──────────────────────────────
  setLastInboxScanTimestamp: (timestamp) => {
    set({ lastInboxScanTimestamp: timestamp });
    saveToStorage(STORAGE_KEYS.LAST_INBOX_SCAN, timestamp);
  },

  // ── Get Recent Transactions (for HomeScreen widget) ──────────
  getRecentTransactions: (count = 3) => {
    const { transactions } = get();
    return transactions.slice(0, count);
  },

  // ── Clear All Data ─────────────────────────────────────────────
  clearAllData: async () => {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.TRANSACTIONS),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE),
      AsyncStorage.removeItem(STORAGE_KEYS.SETTINGS),
      AsyncStorage.removeItem(STORAGE_KEYS.SEEN_HASHES),
      AsyncStorage.removeItem(STORAGE_KEYS.LAST_INBOX_SCAN),
    ]);

    set({
      transactions: [],
      userProfile: null,
      userThreshold: 50,
      seenHashes: new Set(),
      lastAlert: null,
    });
  },

  // ── Stats (Derived) ────────────────────────────────────────────
  getStats: () => {
    const { transactions, userThreshold } = get();
    const today = new Date().toISOString().split('T')[0];

    const totalParsed = transactions.length;
    const highRiskCount = transactions.filter(
      tx => tx.riskScore >= userThreshold
    ).length;
    const todayCount = transactions.filter(tx => {
      const txDay = new Date(tx.parsedAt).toISOString().split('T')[0];
      return txDay === today;
    }).length;

    const totalDebits = transactions
      .filter(tx => tx.transactionType === 'debit')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalCredits = transactions
      .filter(tx => tx.transactionType === 'credit')
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      totalParsed,
      highRiskCount,
      todayCount,
      totalDebits,
      totalCredits,
      userThreshold,
    };
  },

  // ── Filtered Transactions ──────────────────────────────────────
  getFilteredTransactions: (filter = 'all') => {
    const { transactions, userThreshold } = get();

    switch (filter) {
      case 'high':
        return transactions.filter(tx => tx.riskScore >= userThreshold);
      case 'medium':
        return transactions.filter(
          tx => tx.riskScore >= 35 && tx.riskScore < userThreshold
        );
      case 'low':
        return transactions.filter(tx => tx.riskScore < 35);
      default:
        return transactions;
    }
  },
}));

export default useSmsStore;
