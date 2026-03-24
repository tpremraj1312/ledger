import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, Lightbulb, BarChart3, Info } from 'lucide-react-native';

const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#0D1B2A',
  textSecondary: '#44556B',
  border: '#E0E6EE',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  primary: '#1E6BD6',
  violet: '#8B5CF6',
};

const INSIGHT_CONFIGS = {
  warning: { 
    icon: AlertTriangle, 
    bg: '#FEF3C7', 
    border: '#FDE68A', 
    iconColor: '#D97706', 
    badgeBg: '#FFFBEB', 
    badgeText: '#B45309' 
  },
  opportunity: { 
    icon: Lightbulb, 
    bg: '#D1FAE5', 
    border: '#A7F3D0', 
    iconColor: '#059669', 
    badgeBg: '#F0FDF4', 
    badgeText: '#047857' 
  },
  metric: { 
    icon: BarChart3, 
    bg: '#DBEAFE', 
    border: '#BFDBFE', 
    iconColor: '#2563EB', 
    badgeBg: '#EFF6FF', 
    badgeText: '#1D4ED8' 
  },
  tip: { 
    icon: Info, 
    bg: '#F3E8FF', 
    border: '#E9D5FF', 
    iconColor: '#7C3AED', 
    badgeBg: '#FAF5FF', 
    badgeText: '#6D28D9' 
  },
};

const SEVERITY_DOTS = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
};

export default function InsightCard({ insight }) {
  if (!insight) return null;

  const config = INSIGHT_CONFIGS[insight.type] || INSIGHT_CONFIGS.tip;
  const Icon = config.icon;

  return (
    <View style={[styles.container, { backgroundColor: config.badgeBg, borderColor: config.border }]}>
      <View style={styles.iconWrapper}>
        <Icon size={16} color={config.iconColor} />
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: config.bg }]}>
            <Text style={[styles.badgeText, { color: config.badgeText }]}>{insight.type.toUpperCase()}</Text>
          </View>
          <View style={[styles.severityDot, { backgroundColor: SEVERITY_DOTS[insight.severity] || SEVERITY_DOTS.medium }]} />
        </View>
        <Text style={styles.title}>{insight.title}</Text>
        <Text style={styles.body}>{insight.body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 4,
    gap: 10,
  },
  iconWrapper: {
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  body: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
});
