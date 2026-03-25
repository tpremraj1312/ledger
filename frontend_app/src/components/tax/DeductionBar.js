import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, XCircle } from 'lucide-react-native';
import { colors, fontSize, fontWeight, borderRadius, spacing } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DeductionBar = ({ section }) => {
  const [expanded, setExpanded] = useState(false);
  const { section: label, limit, claimed, percentage, sources = [], eligibilityNotes = [] } = section;
  
  const isHigh = percentage >= 90;
  const isMid = percentage >= 50;
  const barColor = isHigh ? colors.success : isMid ? '#F59E0B' : colors.primaryLight;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.headerCard, expanded && styles.headerCardExpanded]} 
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.headerTop}>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.rightGroup}>
            <Text style={styles.value}>
              {formatCurrency(claimed)} <Text style={styles.limitText}>/ {formatCurrency(limit)}</Text>
            </Text>
            {expanded ? <ChevronUp size={16} color={colors.textSecondary} /> : <ChevronDown size={16} color={colors.textSecondary} />}
          </View>
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
          <Text style={styles.percentageText}>{percentage}% Utilized</Text>
          {isHigh && <Text style={styles.statusText}>Maximized!</Text>}
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedContent}>
          {(sources.length === 0 && eligibilityNotes.length === 0) ? (
            <Text style={styles.emptyText}>No investments or expenses recorded for this section yet.</Text>
          ) : (
            <>
              {sources.map((s, idx) => (
                <View key={`source-${idx}`} style={styles.sourceItem}>
                  <View style={styles.sourceLeft}>
                    <CheckCircle2 size={12} color={colors.success} style={{ marginTop: 2 }} />
                    <View>
                      <Text style={styles.sourceName}>{s.name}</Text>
                      <Text style={styles.sourceType}>{s.type}</Text>
                    </View>
                  </View>
                  <Text style={styles.sourceAmount}>{formatCurrency(s.amount)}</Text>
                </View>
              ))}

              {eligibilityNotes.length > 0 && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesTitle}>Ineligible Records</Text>
                  {eligibilityNotes.map((note, idx) => (
                    <View key={`note-${idx}`} style={styles.noteItem}>
                      <XCircle size={10} color="#DC2626" style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.noteName}>{note.item}</Text>
                        <Text style={styles.noteReason}>{note.reason}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  headerCard: {
    padding: spacing.md,
    backgroundColor: colors.white,
  },
  headerCardExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
    backgroundColor: '#FAFAFA',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  limitText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  track: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progress: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  percentageText: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  statusText: {
    fontSize: 9,
    color: colors.success,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  
  // Expanded
  expandedContent: {
    padding: spacing.md,
    backgroundColor: '#F8FAFC',
  },
  emptyText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  sourceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sourceLeft: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    paddingRight: 10,
  },
  sourceName: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  sourceType: {
    fontSize: 9,
    color: colors.gray400,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  sourceAmount: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  notesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  notesTitle: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: '#DC2626',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  noteItem: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  noteName: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  noteReason: {
    fontSize: 9,
    color: '#94A3B8',
  },
});

export default DeductionBar;
