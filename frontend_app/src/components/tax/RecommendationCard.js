import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { ChevronDown, ChevronUp, Clock, TrendingUp, Target, Info, Lightbulb, Play } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PRIO_STYLES = {
  high: { bg: '#FEF2F2', text: '#EF4444', dot: '#EF4444', label: 'HIGH' },
  medium: { bg: '#FFFBEB', text: '#D97706', dot: '#D97706', label: 'MEDIUM' },
  low: { bg: '#EFF6FF', text: '#1E6BD6', dot: '#1E6BD6', label: 'LOW' },
};

const RISK_STYLES = {
  'Very Low': { bg: '#ECFDF5', text: '#059669' },
  'Low': { bg: '#F0FDF4', text: '#16A34A' },
  'Moderate': { bg: '#FFFBEB', text: '#D97706' },
  'Moderate-High': { bg: '#FFF7ED', text: '#EA580C' },
  'High': { bg: '#FEF2F2', text: '#DC2626' },
  'N/A': { bg: '#EFF6FF', text: '#1E6BD6' },
};

const RecommendationCard = ({ rec, onSimulate }) => {
  const [expanded, setExpanded] = useState(false);
  const prio = PRIO_STYLES[rec.priority] || PRIO_STYLES.medium;
  const risk = RISK_STYLES[rec.riskLevel] || RISK_STYLES['N/A'];

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const whyText = rec.actionDetails?.why || rec.why;
  const lockIn = rec.lockIn;
  const expectedReturn = rec.meta?.expectedReturn || rec.expectedReturn;
  const maxInvestable = rec.actionDetails?.maxInvestable || rec.maxInvestable;
  const wealthImpact = rec.meta?.wealthImpact || rec.wealthImpact;

  return (
    <TouchableOpacity style={styles.card} onPress={toggleExpand} activeOpacity={0.7}>
      {/* Tag Row */}
      <View style={styles.tagRow}>
        <View style={styles.tagsLeft}>
          <View style={[styles.tag, { backgroundColor: prio.bg }]}>
            <View style={[styles.dot, { backgroundColor: prio.dot }]} />
            <Text style={[styles.tagText, { color: prio.text }]}>{prio.label}</Text>
          </View>
          {rec.riskLevel && (
            <View style={[styles.tag, { backgroundColor: risk.bg }]}>
              <Text style={[styles.tagText, { color: risk.text }]}>{rec.riskLevel}</Text>
            </View>
          )}
          {rec.source === 'pattern_detection' && (
            <View style={[styles.tag, { backgroundColor: '#F5F3FF' }]}>
              <Lightbulb size={9} color="#7C3AED" />
              <Text style={[styles.tagText, { color: '#7C3AED' }]}>Pattern</Text>
            </View>
          )}
        </View>
        <View style={styles.savingRight}>
          <Text style={styles.savingAmount}>{formatCurrency(rec.estimatedTaxSaving)}</Text>
          <Text style={styles.savingLabel}>tax saving</Text>
        </View>
      </View>

      {/* Title & Description */}
      <Text style={styles.instrument}>{rec.instrument}</Text>
      <Text style={styles.desc} numberOfLines={expanded ? undefined : 2}>{rec.description}</Text>

      {/* Expanded Details */}
      {expanded && (
        <View style={styles.expandedSection}>
          {/* Why box */}
          {whyText ? (
            <View style={styles.whyBox}>
              <Info size={12} color="#0D9488" style={{ marginTop: 1 }} />
              <Text style={styles.whyText}>{whyText}</Text>
            </View>
          ) : null}

          {/* Meta grid */}
          <View style={styles.metaGrid}>
            {lockIn ? (
              <View style={styles.metaItem}>
                <View style={styles.metaHeader}>
                  <Clock size={10} color={colors.gray400} />
                  <Text style={styles.metaLabel}>Lock-in</Text>
                </View>
                <Text style={styles.metaValue}>{lockIn}</Text>
              </View>
            ) : null}
            {expectedReturn ? (
              <View style={styles.metaItem}>
                <View style={styles.metaHeader}>
                  <TrendingUp size={10} color={colors.gray400} />
                  <Text style={styles.metaLabel}>Returns</Text>
                </View>
                <Text style={styles.metaValue}>{expectedReturn}</Text>
              </View>
            ) : null}
            {maxInvestable ? (
              <View style={styles.metaItem}>
                <View style={styles.metaHeader}>
                  <Target size={10} color={colors.gray400} />
                  <Text style={styles.metaLabel}>Max Invest</Text>
                </View>
                <Text style={styles.metaValue}>{formatCurrency(maxInvestable)}</Text>
              </View>
            ) : null}
          </View>

          {/* Wealth Impact */}
          {wealthImpact ? (
            <View style={styles.wealthBox}>
              <Text style={styles.wealthLabel}>Wealth Impact</Text>
              <Text style={styles.wealthText}>{wealthImpact}</Text>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.simulateBtn}
              onPress={(e) => { e.stopPropagation?.(); onSimulate?.(rec); }}
            >
              <Play size={12} color={colors.primary} />
              <Text style={styles.simulateBtnText}>Simulate</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Expand indicator */}
      <View style={styles.expandRow}>
        <Text style={styles.expandText}>{expanded ? 'Show less' : 'View details'}</Text>
        {expanded ? (
          <ChevronUp size={14} color={colors.primary} />
        ) : (
          <ChevronDown size={14} color={colors.primary} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    ...shadows.sm,
  },
  tagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tagsLeft: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  tagText: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  savingRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  savingAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: '#059669',
  },
  savingLabel: {
    fontSize: 9,
    color: colors.gray400,
    fontWeight: fontWeight.semibold,
  },
  instrument: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  desc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  expandedSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  whyBox: {
    flexDirection: 'row',
    backgroundColor: '#F0FDFA',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  whyText: {
    flex: 1,
    fontSize: 11,
    color: '#115E59',
    lineHeight: 16,
    fontWeight: fontWeight.medium,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metaItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  metaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  wealthBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  wealthLabel: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  wealthText: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  simulateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  simulateBtnText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 4,
  },
  expandText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
});

export default RecommendationCard;
