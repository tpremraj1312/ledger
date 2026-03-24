/**
 * Risk Engine — Financial Transaction Risk Scoring System
 * 
 * Calculates a risk score (0–100) for each SMS-parsed transaction
 * using 5 deterministic risk factors. No AI — pure math.
 * 
 * Risk Factors:
 * 1. Amount vs User Average (spike detection)
 * 2. Transaction Frequency (rapid fire detection)
 * 3. Category-Based Risk (gambling, unknown = high)
 * 4. Sudden Spike Behavior (24-hour pattern break)
 * 5. Night-time Unusual Spending (11PM–5AM)
 */

import { getCategoryRiskWeight } from './categoryClassifier';

// ─── Risk Level Thresholds ──────────────────────────────────────────────────
export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

const getRiskLevel = (score) => {
  if (score >= 80) return RISK_LEVELS.CRITICAL;
  if (score >= 60) return RISK_LEVELS.HIGH;
  if (score >= 35) return RISK_LEVELS.MEDIUM;
  return RISK_LEVELS.LOW;
};

export const getRiskColor = (level) => {
  switch (level) {
    case RISK_LEVELS.CRITICAL: return '#DC2626';
    case RISK_LEVELS.HIGH: return '#EA580C';
    case RISK_LEVELS.MEDIUM: return '#D97706';
    case RISK_LEVELS.LOW: return '#16A34A';
    default: return '#9CA3AF';
  }
};

export const getRiskBgColor = (level) => {
  switch (level) {
    case RISK_LEVELS.CRITICAL: return '#FEF2F2';
    case RISK_LEVELS.HIGH: return '#FFF7ED';
    case RISK_LEVELS.MEDIUM: return '#FFFBEB';
    case RISK_LEVELS.LOW: return '#F0FDF4';
    default: return '#F5F7FA';
  }
};

// ─── Factor 1: Amount vs Average ────────────────────────────────────────────
/**
 * Score based on how much this transaction deviates from the user's average.
 * A transaction 3x the average scores ~50, 5x scores ~70, 10x scores ~90.
 */
const scoreAmountDeviation = (amount, avgSpending) => {
  if (avgSpending <= 0) {
    // No history — use absolute thresholds
    if (amount > 50000) return 80;
    if (amount > 20000) return 60;
    if (amount > 5000) return 40;
    if (amount > 1000) return 20;
    return 10;
  }

  const ratio = amount / avgSpending;

  if (ratio <= 0.5) return 5;
  if (ratio <= 1.0) return 10;
  if (ratio <= 1.5) return 15;
  if (ratio <= 2.0) return 25;
  if (ratio <= 3.0) return 40;
  if (ratio <= 5.0) return 60;
  if (ratio <= 10.0) return 80;
  return 95;
};

// ─── Factor 2: Transaction Frequency ────────────────────────────────────────
/**
 * Score based on how many transactions occurred in the last hour.
 * Rapid-fire spending (3+ txns/hour) is suspicious.
 */
const scoreFrequency = (recentTransactions, currentTimestamp) => {
  if (!recentTransactions || recentTransactions.length === 0) return 0;

  const oneHourAgo = new Date(currentTimestamp).getTime() - (60 * 60 * 1000);
  const recentCount = recentTransactions.filter(tx => {
    const txTime = new Date(tx.date || tx.parsedAt).getTime();
    return txTime >= oneHourAgo;
  }).length;

  if (recentCount >= 6) return 90;
  if (recentCount >= 4) return 65;
  if (recentCount >= 3) return 45;
  if (recentCount >= 2) return 25;
  return 0;
};

// ─── Factor 3: Category Risk ────────────────────────────────────────────────
/**
 * Score based on the inherent risk of the spending category.
 * Gambling = highest, groceries = lowest.
 */
const scoreCategoryRisk = (category) => {
  const weight = getCategoryRiskWeight(category);
  return Math.round(weight * 100);
};

// ─── Factor 4: Sudden Spike ─────────────────────────────────────────────────
/**
 * Score based on whether this transaction causes a spike in 24-hour spending.
 * If today's total (including this txn) exceeds 2x the daily average → risky.
 */
const scoreSuddenSpike = (amount, todayTotal, dailyAverage) => {
  if (dailyAverage <= 0) return 0;

  const newTotal = todayTotal + amount;
  const ratio = newTotal / dailyAverage;

  if (ratio <= 1.0) return 0;
  if (ratio <= 1.5) return 10;
  if (ratio <= 2.0) return 25;
  if (ratio <= 3.0) return 50;
  if (ratio <= 5.0) return 70;
  return 90;
};

// ─── Factor 5: Night-time Spending ──────────────────────────────────────────
/**
 * Score based on whether the transaction occurs during unusual hours (11PM–5AM).
 * Night-time large transactions are more suspicious.
 */
const scoreNightTime = (timestamp, amount, avgSpending) => {
  const date = new Date(timestamp);
  const hour = date.getHours();

  // Check if night-time (11PM to 5AM)
  const isNight = hour >= 23 || hour < 5;
  if (!isNight) return 0;

  // Night + large amount = suspicious
  if (avgSpending > 0 && amount > avgSpending * 2) return 60;
  if (amount > 5000) return 40;
  if (amount > 1000) return 20;
  return 10;
};

// ─── Factor Weights ─────────────────────────────────────────────────────────
const FACTOR_WEIGHTS = {
  amountDeviation: 0.30,
  frequency: 0.20,
  categoryRisk: 0.15,
  suddenSpike: 0.20,
  nightTime: 0.15,
};

// ─── Main Risk Calculator ───────────────────────────────────────────────────

/**
 * Calculate the risk score for a parsed SMS transaction.
 * 
 * @param {Object} transaction - Parsed transaction from smsParser
 * @param {Object} userProfile - User's spending profile
 * @param {number} userProfile.avgSpending - Average transaction amount
 * @param {number} userProfile.dailyAverage - Average daily spending
 * @param {number} userProfile.todayTotal - Today's cumulative spending
 * @param {Array}  userProfile.recentTransactions - Last 24h transactions
 * @returns {Object} { riskScore, riskLevel, riskReasons }
 */
export const calculateRiskScore = (transaction, userProfile = {}) => {
  const {
    amount = 0,
    category = 'Unknown',
    date = new Date().toISOString(),
    transactionType = 'debit',
  } = transaction;

  const {
    avgSpending = 0,
    dailyAverage = 0,
    todayTotal = 0,
    recentTransactions = [],
  } = userProfile;

  // Credits (income) should not trigger risk alerts
  if (transactionType === 'credit') {
    return {
      riskScore: 0,
      riskLevel: RISK_LEVELS.LOW,
      riskReasons: [],
    };
  }

  const reasons = [];

  // Calculate individual factor scores
  const amountScore = scoreAmountDeviation(amount, avgSpending);
  const frequencyScore = scoreFrequency(recentTransactions, date);
  const categoryScore = scoreCategoryRisk(category);
  const spikeScore = scoreSuddenSpike(amount, todayTotal, dailyAverage);
  const nightScore = scoreNightTime(date, amount, avgSpending);

  // Build reason strings for significant factors
  if (amountScore >= 40) {
    const multiplier = avgSpending > 0 ? (amount / avgSpending).toFixed(1) : '';
    reasons.push(
      avgSpending > 0
        ? `Amount is ${multiplier}x your average spending`
        : 'Unusually high transaction amount'
    );
  }

  if (frequencyScore >= 25) {
    reasons.push('Multiple rapid transactions detected');
  }

  if (categoryScore >= 50) {
    reasons.push(`High-risk category: ${category}`);
  }

  if (spikeScore >= 25) {
    reasons.push('Sudden spending spike today');
  }

  if (nightScore >= 20) {
    reasons.push('Unusual night-time spending');
  }

  // Weighted composite score
  const rawScore =
    (amountScore * FACTOR_WEIGHTS.amountDeviation) +
    (frequencyScore * FACTOR_WEIGHTS.frequency) +
    (categoryScore * FACTOR_WEIGHTS.categoryRisk) +
    (spikeScore * FACTOR_WEIGHTS.suddenSpike) +
    (nightScore * FACTOR_WEIGHTS.nightTime);

  const riskScore = Math.min(100, Math.max(0, Math.round(rawScore)));
  const riskLevel = getRiskLevel(riskScore);

  return {
    riskScore,
    riskLevel,
    riskReasons: reasons,
    // Detailed breakdown for debugging/display
    factorBreakdown: {
      amountDeviation: amountScore,
      frequency: frequencyScore,
      categoryRisk: categoryScore,
      suddenSpike: spikeScore,
      nightTime: nightScore,
    },
  };
};

// ─── Dynamic User Threshold Calculator ──────────────────────────────────────

/**
 * Calculate a personalized risk threshold for the user.
 * 
 * Low spenders get a lower threshold (more sensitive alerts).
 * High spenders get a higher threshold (less noise).
 * 
 * @param {Object} userProfile
 * @param {number} userProfile.avgSpending - Average transaction amount
 * @param {number} userProfile.dailyAverage - Average daily spending
 * @param {number} userProfile.spendingVariance - Std deviation of daily spending
 * @param {number} userProfile.totalTransactions - Total transaction count
 * @returns {number} Threshold (0–100)
 */
export const calculateUserThreshold = (userProfile = {}) => {
  const {
    avgSpending = 0,
    dailyAverage = 0,
    spendingVariance = 0,
    totalTransactions = 0,
  } = userProfile;

  // New users with no history: use a default threshold
  if (totalTransactions < 5) return 50;

  let threshold = 50; // Base threshold

  // Adjust based on average spending level
  if (avgSpending > 10000) threshold += 10;    // High spender
  else if (avgSpending > 5000) threshold += 5;  // Moderate spender
  else if (avgSpending < 500) threshold -= 10;  // Very low spender

  // Adjust based on spending variance
  // High variance = user has variable spending, raise threshold to reduce noise
  if (dailyAverage > 0 && spendingVariance > 0) {
    const cv = spendingVariance / dailyAverage; // Coefficient of variation
    if (cv > 1.5) threshold += 10;
    else if (cv > 1.0) threshold += 5;
  }

  // Adjust based on transaction volume
  if (totalTransactions > 100) threshold += 5;  // Active user, raise threshold
  if (totalTransactions > 500) threshold += 5;

  // Clamp between 30 and 85
  return Math.min(85, Math.max(30, threshold));
};

// ─── User Profile Builder ───────────────────────────────────────────────────

/**
 * Build a user spending profile from transaction history.
 * Used by both the risk calculator and threshold calculator.
 * 
 * @param {Array} transactions - Array of parsed SMS transactions
 * @returns {Object} User profile
 */
export const buildUserProfile = (transactions = []) => {
  if (!transactions || transactions.length === 0) {
    return {
      avgSpending: 0,
      dailyAverage: 0,
      todayTotal: 0,
      spendingVariance: 0,
      totalTransactions: 0,
      recentTransactions: [],
    };
  }

  // Filter debit transactions only
  const debits = transactions.filter(tx => tx.transactionType === 'debit');

  if (debits.length === 0) {
    return {
      avgSpending: 0,
      dailyAverage: 0,
      todayTotal: 0,
      spendingVariance: 0,
      totalTransactions: transactions.length,
      recentTransactions: [],
    };
  }

  // Average transaction amount
  const totalAmount = debits.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const avgSpending = totalAmount / debits.length;

  // Daily spending calculation
  const dailyTotals = {};
  for (const tx of debits) {
    const day = new Date(tx.date || tx.parsedAt).toISOString().split('T')[0];
    dailyTotals[day] = (dailyTotals[day] || 0) + (tx.amount || 0);
  }

  const dailyAmounts = Object.values(dailyTotals);
  const dailyAverage = dailyAmounts.length > 0
    ? dailyAmounts.reduce((a, b) => a + b, 0) / dailyAmounts.length
    : 0;

  // Spending variance (standard deviation)
  const variance = dailyAmounts.length > 1
    ? Math.sqrt(
        dailyAmounts.reduce((sum, val) => sum + Math.pow(val - dailyAverage, 2), 0) /
        (dailyAmounts.length - 1)
      )
    : 0;

  // Today's total
  const today = new Date().toISOString().split('T')[0];
  const todayTotal = dailyTotals[today] || 0;

  // Last 24h transactions
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  const recentTransactions = debits.filter(tx => {
    return new Date(tx.date || tx.parsedAt).getTime() >= oneDayAgo;
  });

  return {
    avgSpending,
    dailyAverage,
    todayTotal,
    spendingVariance: variance,
    totalTransactions: transactions.length,
    recentTransactions,
  };
};

export default {
  calculateRiskScore,
  calculateUserThreshold,
  buildUserProfile,
  getRiskLevel,
  getRiskColor,
  getRiskBgColor,
  RISK_LEVELS,
};
