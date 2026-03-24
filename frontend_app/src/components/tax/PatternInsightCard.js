import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Heart, GraduationCap, Home, PiggyBank, Lightbulb } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

const SECTION_ICONS = {
  '80D_self': Heart,
  '80E': GraduationCap,
  '24b': Home,
  '80CCD_1B': PiggyBank,
};

const PatternInsightCard = ({ insight }) => {
  const IconComponent = SECTION_ICONS[insight.section] || Lightbulb;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <IconComponent size={14} color="#7C3AED" />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{insight.title}</Text>
          <Text style={styles.desc} numberOfLines={2}>{insight.description}</Text>
          {insight.triggerAmount > 0 && (
            <Text style={styles.trigger}>Related: {formatCurrency(insight.triggerAmount)}</Text>
          )}
          <View style={styles.footer}>
            <View style={styles.sectionTag}>
              <Text style={styles.sectionText}>{insight.sectionName}</Text>
            </View>
            <Text style={styles.saving}>Save {formatCurrency(insight.estimatedTaxSaving)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
    marginBottom: 8,
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  desc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  trigger: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: fontWeight.semibold,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  sectionTag: {
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  sectionText: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: colors.gray400,
  },
  saving: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: '#059669',
  },
});

export default PatternInsightCard;
