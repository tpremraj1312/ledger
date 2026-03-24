import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme';

const MetricCard = ({ title, budgeted, actual, diff, diffStatus, type = 'debit' }) => {
  const isUp = diffStatus === 'Over Budget' || diffStatus === 'Above Goal';
  const diffColor = isUp ? (type === 'debit' ? colors.error : colors.success) : (type === 'debit' ? colors.success : colors.warning);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.grid}>
        <View style={[styles.box, { backgroundColor: colors.primaryLight + '15' }]}>
          <Text style={styles.boxLabel}>{type === 'debit' ? 'Budgeted' : 'Goal'}</Text>
          <Text style={[styles.boxValue, { color: colors.primaryDark }]}>{budgeted}</Text>
        </View>
        <View style={[styles.box, { backgroundColor: (type === 'debit' ? colors.errorLight : colors.successLight) }]}>
          <Text style={styles.boxLabel}>Actual</Text>
          <Text style={[styles.boxValue, { color: type === 'debit' ? colors.error : colors.success }]}>{actual}</Text>
        </View>
        <View style={[styles.box, { backgroundColor: diffColor + '15' }]}>
          <Text style={styles.boxLabel}>Difference</Text>
          <Text style={[styles.boxValue, { color: diffColor }]}>{diff}</Text>
          <Text style={styles.statusText}>{diffStatus}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.base,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  box: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
  },
  boxLabel: {
    fontSize: 10,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  boxValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  statusText: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: fontWeight.medium,
  }
});

export default MetricCard;
