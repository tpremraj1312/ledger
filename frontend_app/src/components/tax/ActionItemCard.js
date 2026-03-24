import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';

const URGENCY_STYLES = {
  high: { border: '#FCA5A5', bg: '#FEF2F2' },
  medium: { border: '#FCD34D', bg: '#FFFBEB' },
  low: { border: '#93C5FD', bg: '#EFF6FF' },
};

const URGENCY_TAG = {
  high: { bg: '#FEE2E2', text: '#DC2626' },
  medium: { bg: '#FEF3C7', text: '#D97706' },
  low: { bg: '#DBEAFE', text: '#1E6BD6' },
};

const ActionItemCard = ({ item }) => {
  const style = URGENCY_STYLES[item.urgency] || URGENCY_STYLES.medium;
  const tag = URGENCY_TAG[item.urgency] || URGENCY_TAG.medium;

  return (
    <View style={[styles.card, { borderLeftColor: style.border, backgroundColor: style.bg }]}>
      <View style={styles.content}>
        <View style={styles.left}>
          <View style={styles.tagRow}>
            <View style={[styles.tag, { backgroundColor: tag.bg }]}>
              <Text style={[styles.tagText, { color: tag.text }]}>
                {(item.urgency || '').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.sectionText}>{item.section}</Text>
          </View>
          <Text style={styles.action}>{item.action}</Text>
          {item.reasoning ? (
            <Text style={styles.reasoning} numberOfLines={2}>{item.reasoning}</Text>
          ) : null}
        </View>
        <View style={styles.right}>
          <Text style={styles.saving}>{item.estimatedSaving}</Text>
          <Text style={styles.savingLabel}>saving</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 3,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: 8,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  left: {
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionText: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: colors.gray400,
  },
  action: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  reasoning: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  right: {
    alignItems: 'flex-end',
  },
  saving: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: '#059669',
  },
  savingLabel: {
    fontSize: 9,
    color: colors.gray400,
  },
});

export default ActionItemCard;
