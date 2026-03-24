import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';

const TaxSummaryCard = ({ label, value, sub, icon, color, bgColor }) => (
  <View style={[styles.card, { backgroundColor: bgColor }]}>
    <View style={styles.header}>
      <View style={[styles.iconBox, { backgroundColor: color + '18' }]}>
        {icon}
      </View>
      <Text style={[styles.label, { color: color + 'CC' }]}>{label}</Text>
    </View>
    <Text style={[styles.value, { color }]}>{value}</Text>
    {sub ? <Text style={styles.sub}>{sub}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  iconBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  sub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default TaxSummaryCard;
