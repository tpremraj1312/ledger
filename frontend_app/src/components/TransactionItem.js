import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { formatCurrency, formatDateForMobile } from '../utils/formatters';

const TransactionItem = ({ transaction }) => {
  const tx = transaction;
  const isCredit = tx.type === 'credit';

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={[styles.categoryDot, { backgroundColor: isCredit ? colors.success : colors.error }]} />
        <View style={styles.info}>
          <Text style={styles.category} numberOfLines={1}>{tx.category}</Text>
          <Text style={styles.description} numberOfLines={1}>
            {tx.description || '—'}
          </Text>
          <View style={styles.meta}>
            <Text style={styles.date}>{formatDateForMobile(tx.date)}</Text>
            {tx.source && (
              <View style={[styles.badge, tx.source === 'manual' ? styles.badgeManual : styles.badgeScan]}>
                <Text style={[styles.badgeText, tx.source === 'manual' ? styles.badgeManualText : styles.badgeScanText]}>
                  {tx.source === 'manual' ? 'Manual' : 'Scanned'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <Text style={[styles.amount, isCredit ? styles.amountCredit : styles.amountDebit]}>
        {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
  },
  category: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  date: {
    fontSize: fontSize.xs,
    color: colors.gray400,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeManual: {
    backgroundColor: colors.primary + '15',
  },
  badgeScan: {
    backgroundColor: '#8B5CF6' + '15',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: fontWeight.semibold,
  },
  badgeManualText: {
    color: colors.primary,
  },
  badgeScanText: {
    color: '#8B5CF6',
  },
  amount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  amountCredit: {
    color: colors.success,
  },
  amountDebit: {
    color: colors.error,
  },
});

export default TransactionItem;
