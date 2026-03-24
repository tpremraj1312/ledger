import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Heart, Lightbulb } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../theme';

const METRIC_CONFIG = [
    { key: 'savingsRate', label: 'Savings Rate', max: 25, color: '#10B981' }, // emerald
    { key: 'budgetAdherence', label: 'Budget Adherence', max: 25, color: '#3B82F6' }, // blue
    { key: 'overspendingFrequency', label: 'Spending Control', max: 20, color: '#8B5CF6' }, // purple
    { key: 'expenseDistribution', label: 'Expense Balance', max: 15, color: '#F59E0B' }, // amber
    { key: 'consistency', label: 'Consistency', max: 15, color: '#6366F1' }, // indigo
];

const LABEL_COLORS = {
    Excellent: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
    Good: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    Average: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    Poor: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
};

const WellnessMeter = ({ wellness }) => {
    if (!wellness) return null;

    const { score = 50, label = 'Average', metrics = {}, tips = [] } = wellness;

    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444';
    const labelStyle = LABEL_COLORS[label] || { bg: colors.gray100, text: colors.gray700, border: colors.gray200 };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconCircle}>
                    <Heart size={20} color="#10B981" />
                </View>
                <View>
                    <Text style={styles.title}>Financial Wellness</Text>
                    <Text style={styles.subtitle}>Monthly health snapshot</Text>
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.chartWrapper}>
                    <View style={styles.svgRotate}>
                        <Svg width={140} height={140} viewBox="0 0 140 140">
                            <Circle cx="70" cy="70" r={radius} stroke={colors.gray100} strokeWidth="12" fill="none" />
                            <Circle
                                cx="70" cy="70" r={radius}
                                stroke={scoreColor}
                                strokeWidth="12"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                            />
                        </Svg>
                    </View>
                    <View style={styles.scoreOverlay}>
                        <Text style={styles.scoreText}>{score}</Text>
                        <View style={[styles.labelBadge, { backgroundColor: labelStyle.bg, borderColor: labelStyle.border }]}>
                            <Text style={[styles.labelText, { color: labelStyle.text }]}>{label}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.metricsWrapper}>
                    {METRIC_CONFIG.map(m => {
                        const val = metrics[m.key] || 0;
                        const pct = Math.min(100, (val / m.max) * 100);
                        return (
                            <View key={m.key} style={styles.metricRow}>
                                <View style={styles.metricHeader}>
                                    <Text style={styles.metricLabel}>{m.label}</Text>
                                    <Text style={styles.metricVal}>{val}/{m.max}</Text>
                                </View>
                                <View style={styles.metricBarBg}>
                                    <View style={[styles.metricBarFill, { width: `${pct}%`, backgroundColor: m.color }]} />
                                </View>
                            </View>
                        );
                    })}
                </View>
            </View>

            {tips?.length > 0 && (
                <View style={styles.tipsBox}>
                    <View style={styles.tipsHeader}>
                        <Lightbulb size={18} color="#059669" />
                        <Text style={styles.tipsTitle}>IMPROVEMENT TIPS</Text>
                    </View>
                    {tips.map((tip, i) => (
                        <View key={i} style={styles.tipRow}>
                            <Text style={styles.tipBullet}>•</Text>
                            <Text style={styles.tipText}>{tip}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.sm,
        marginBottom: spacing.xl,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    iconCircle: {
        padding: spacing.sm,
        backgroundColor: '#ecfdf5',
        borderRadius: borderRadius.lg,
    },
    title: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.textPrimary,
    },
    subtitle: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    content: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: spacing.xl,
        marginBottom: spacing.xl,
    },
    chartWrapper: {
        position: 'relative',
        width: 140,
        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
    },
    svgRotate: {
        transform: [{ rotate: '-90deg' }],
    },
    scoreOverlay: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scoreText: {
        fontSize: 48,
        fontWeight: '900',
        color: colors.textPrimary,
    },
    labelBadge: {
        marginTop: 4,
        paddingHorizontal: spacing.md,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
        borderWidth: 1,
    },
    labelText: {
        fontSize: 10,
        fontWeight: fontWeight.bold,
    },
    metricsWrapper: {
        width: '100%',
        gap: spacing.md,
    },
    metricRow: {
        width: '100%',
    },
    metricHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    metricLabel: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.gray700,
    },
    metricVal: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.bold,
        color: colors.gray600,
    },
    metricBarBg: {
        height: 6,
        backgroundColor: colors.gray100,
        borderRadius: borderRadius.full,
    },
    metricBarFill: {
        height: '100%',
        borderRadius: borderRadius.full,
    },
    tipsBox: {
        backgroundColor: '#ecfdf5',
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: '#a7f3d0',
    },
    tipsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    tipsTitle: {
        fontSize: 12,
        fontWeight: fontWeight.bold,
        color: '#064e3b',
        letterSpacing: 0.5,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        marginBottom: 6,
    },
    tipBullet: {
        color: '#10B981',
        fontSize: 14,
        marginTop: -2,
    },
    tipText: {
        flex: 1,
        fontSize: fontSize.sm,
        color: '#064e3b',
        lineHeight: 20,
    },
});

export default WellnessMeter;
