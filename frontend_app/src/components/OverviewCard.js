import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme';

const OverviewCard = ({ label, value, icon: Icon, iconColor, bgColor }) => {
  return (
    <View style={[styles.card, { backgroundColor: bgColor || colors.surface }]}>
      {Icon && (
        <View style={[styles.iconWrapper, { backgroundColor: (iconColor || colors.primary) + '15' }]}>
          <Icon size={20} color={iconColor || colors.primary} />
        </View>
      )}
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 140,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
});

export default OverviewCard;
