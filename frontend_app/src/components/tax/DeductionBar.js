import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, borderRadius } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

const DeductionBar = ({ label, claimed, limit, percentage }) => {
  const isHigh = percentage >= 90;
  const isMid = percentage >= 50;
  
  const barColor = isHigh ? colors.success : isMid ? '#F59E0B' : colors.primaryLight;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {formatCurrency(claimed)} / {formatCurrency(limit)}
        </Text>
      </View>
      <View style={styles.track}>
        <View 
          style={[
            styles.progress, 
            { 
              width: `${Math.min(percentage, 100)}%`, 
              backgroundColor: barColor 
            }
          ]} 
        />
      </View>
      <View style={styles.footer}>
        <Text style={styles.percentageText}>{percentage}% Utlized</Text>
        {isHigh && <Text style={styles.statusText}>Maximized!</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  value: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  track: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  percentageText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  statusText: {
    fontSize: 10,
    color: colors.success,
    fontWeight: fontWeight.bold,
  },
});

export default DeductionBar;
