/**
 * SMSCard — Reusable SMS Transaction Display Card
 * 
 * Shows: risk badge, amount, merchant, category, timestamp.
 * Expandable raw SMS + parsed JSON view.
 * Swipe support via onMarkSafe / onDelete props.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import {
  ChevronDown, ChevronUp, Shield, Trash2,
  TrendingUp, TrendingDown, Clock, CreditCard, Smartphone,
} from 'lucide-react-native';
import { getRiskColor, getRiskBgColor } from '../../utils/riskEngine';
import { getCategoryColor } from '../../utils/categoryClassifier';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../theme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const formatCurrency = (amount) =>
  `₹${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const ACCOUNT_ICONS = {
  upi: Smartphone,
  card: CreditCard,
  wallet: Smartphone,
  bank: CreditCard,
  atm: CreditCard,
};

const SMSCard = ({ transaction, onMarkSafe, onDelete }) => {
  const [expanded, setExpanded] = useState(false);

  const {
    transactionType, amount, merchant, category, date,
    riskScore, riskLevel, riskReasons, rawSms,
    accountType, accountNumber, balance, reference,
    markedSafe, parsedAt,
  } = transaction;

  const riskColor = getRiskColor(riskLevel);
  const riskBg = getRiskBgColor(riskLevel);
  const categoryColor = getCategoryColor(category);
  const isDebit = transactionType === 'debit';
  const AccountIcon = ACCOUNT_ICONS[accountType] || CreditCard;

  const toggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  }, []);

  return (
    <View style={styles.card}>
      {/* Top Row: Risk Badge + Amount */}
      <TouchableOpacity
        style={styles.cardHeader}
        activeOpacity={0.7}
        onPress={toggleExpand}
      >
        <View style={styles.leftSection}>
          {/* Risk Badge */}
          <View style={[styles.riskBadge, { backgroundColor: riskBg }]}>
            <Text style={[styles.riskScore, { color: riskColor }]}>
              {riskScore}
            </Text>
          </View>

          {/* Merchant & Category */}
          <View style={styles.infoBlock}>
            <Text style={styles.merchant} numberOfLines={1}>{merchant}</Text>
            <View style={styles.categoryRow}>
              <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
              <Text style={styles.categoryText}>{category}</Text>
              <Text style={styles.separator}>·</Text>
              <Clock size={10} color={colors.textSecondary} />
              <Text style={styles.timeText}>{formatTime(date)}</Text>
            </View>
          </View>
        </View>

        {/* Amount + Expand */}
        <View style={styles.rightSection}>
          <Text style={[styles.amount, { color: isDebit ? colors.error : colors.success }]}>
            {isDebit ? '-' : '+'}{formatCurrency(amount)}
          </Text>
          {expanded
            ? <ChevronUp size={16} color={colors.textSecondary} />
            : <ChevronDown size={16} color={colors.textSecondary} />
          }
        </View>
      </TouchableOpacity>

      {/* Risk Reasons (always visible if high risk) */}
      {riskReasons && riskReasons.length > 0 && !markedSafe && (
        <View style={[styles.reasonsRow, { backgroundColor: riskBg }]}>
          {riskReasons.map((reason, i) => (
            <Text key={i} style={[styles.reasonText, { color: riskColor }]}>
              ⚠ {reason}
            </Text>
          ))}
        </View>
      )}

      {/* Safe Badge */}
      {markedSafe && (
        <View style={styles.safeBadge}>
          <Shield size={12} color={colors.success} />
          <Text style={styles.safeText}>Marked safe</Text>
        </View>
      )}

      {/* Expanded Details */}
      {expanded && (
        <View style={styles.expandedSection}>
          {/* Metadata Grid */}
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Type</Text>
              <View style={styles.metaValueRow}>
                {isDebit
                  ? <TrendingDown size={12} color={colors.error} />
                  : <TrendingUp size={12} color={colors.success} />
                }
                <Text style={styles.metaValue}>
                  {transactionType.charAt(0).toUpperCase() + transactionType.slice(1)}
                </Text>
              </View>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Account</Text>
              <View style={styles.metaValueRow}>
                <AccountIcon size={12} color={colors.textSecondary} />
                <Text style={styles.metaValue}>
                  {accountType?.toUpperCase()}{accountNumber ? ` ${accountNumber}` : ''}
                </Text>
              </View>
            </View>
            {balance !== null && balance !== undefined && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Balance</Text>
                <Text style={styles.metaValue}>{formatCurrency(balance)}</Text>
              </View>
            )}
            {reference && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Ref</Text>
                <Text style={styles.metaValue} numberOfLines={1}>{reference}</Text>
              </View>
            )}
          </View>

          {/* Raw SMS */}
          <View style={styles.rawSmsBox}>
            <Text style={styles.rawSmsLabel}>Raw SMS</Text>
            <Text style={styles.rawSmsText} selectable>{rawSms}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            {!markedSafe && onMarkSafe && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onMarkSafe(transaction.smsHash)}
                activeOpacity={0.7}
              >
                <Shield size={14} color={colors.success} />
                <Text style={[styles.actionText, { color: colors.success }]}>Mark Safe</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onDelete(transaction.smsHash)}
                activeOpacity={0.7}
              >
                <Trash2 size={14} color={colors.error} />
                <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  riskBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  riskScore: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  infoBlock: {
    flex: 1,
  },
  merchant: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  categoryText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  separator: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginHorizontal: 4,
  },
  timeText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginLeft: 2,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: fontSize.md,
    fontWeight: '500',
    marginBottom: 2,
  },
  reasonsRow: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  reasonText: {
    fontSize: fontSize.xs,
    fontWeight: '400',
    marginBottom: 2,
  },
  safeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    backgroundColor: '#F0FDF4',
  },
  safeText: {
    fontSize: fontSize.xs,
    color: colors.success,
    marginLeft: 4,
    fontWeight: '400',
  },
  expandedSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  metaItem: {
    width: '50%',
    marginBottom: spacing.sm,
  },
  metaLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  metaValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaValue: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '400',
  },
  rawSmsBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  rawSmsLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  rawSmsText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 18,
    fontWeight: '400',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    gap: 4,
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});

export default React.memo(SMSCard);
