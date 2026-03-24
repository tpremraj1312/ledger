import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Activity, Zap, Trophy, Target, Flame, Award } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../theme';

const REASON_CONFIG = {
    tx_: { icon: Zap, label: 'Transaction Logged', colorBg: '#eff6ff', colorText: '#2563eb' },
    family_tx_: { icon: Zap, label: 'Family Transaction', colorBg: '#f3e8ff', colorText: '#9333ea' },
    challenge_completed_: { icon: Trophy, label: 'Challenge Completed', colorBg: '#fffbeb', colorText: '#d97706' },
    quest_completed_: { icon: Target, label: 'Quest Completed', colorBg: '#ecfdf5', colorText: '#059669' },
    quest_claimed_: { icon: Award, label: 'Quest Claimed', colorBg: '#ecfdf5', colorText: '#059669' },
    goal_completed_: { icon: Target, label: 'Goal Achieved', colorBg: '#eef2ff', colorText: '#4f46e5' },
    badge_: { icon: Award, label: 'Badge Unlocked', colorBg: '#fffbeb', colorText: '#d97706' },
    streak_bonus_: { icon: Flame, label: 'Streak Bonus', colorBg: '#fff7ed', colorText: '#ea580c' },
};

const getReasonConfig = (reason) => {
    for (const [prefix, config] of Object.entries(REASON_CONFIG)) {
        if (reason?.startsWith(prefix)) return config;
    }
    return { icon: Zap, label: reason?.replace(/_/g, ' ') || 'Activity', colorBg: colors.gray100, colorText: colors.gray600 };
};

const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

const ActivityFeed = ({ activity = [] }) => {
    if (!activity || activity.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.iconBox}>
                        <Activity size={20} color={colors.gray500} />
                    </View>
                    <View>
                        <Text style={styles.title}>Activity Feed</Text>
                        <Text style={styles.subtitle}>Your recent XP activity</Text>
                    </View>
                </View>
                <View style={styles.emptyState}>
                    <Activity size={40} color={colors.gray300} style={{ marginBottom: spacing.md }} />
                    <Text style={styles.emptyTitle}>No activity yet</Text>
                    <Text style={styles.emptyDesc}>Start logging transactions to earn XP</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={[styles.iconBox, { backgroundColor: '#fffbeb' }]}>
                    <Activity size={20} color="#d97706" />
                </View>
                <View>
                    <Text style={styles.title}>Activity Feed</Text>
                    <Text style={styles.subtitle}>Recent XP earnings</Text>
                </View>
            </View>

            <View style={styles.list}>
                {activity.map((entry, i) => {
                    const config = getReasonConfig(entry.reason);
                    const Icon = config.icon;

                    return (
                        <View key={`${entry.reason}-${entry.date}-${i}`} style={styles.row}>
                            <View style={[styles.rowIconBox, { backgroundColor: config.colorBg }]}>
                                <Icon size={16} color={config.colorText} />
                            </View>
                            <View style={styles.rowContent}>
                                <Text style={styles.rowLabel} numberOfLines={1}>{config.label}</Text>
                                <Text style={styles.rowTime}>{formatTime(entry.date)}</Text>
                            </View>
                            <Text style={styles.xpText}>+{entry.amount} XP</Text>
                        </View>
                    );
                })}
            </View>
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
    iconBox: {
        padding: spacing.sm,
        backgroundColor: colors.gray100,
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
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing['2xl'],
    },
    emptyTitle: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.medium,
        color: colors.gray500,
        marginBottom: 4,
    },
    emptyDesc: {
        fontSize: fontSize.sm,
        color: colors.gray400,
    },
    list: {
        maxHeight: 300,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
    },
    rowIconBox: {
        padding: spacing.sm,
        borderRadius: borderRadius.lg,
    },
    rowContent: {
        flex: 1,
    },
    rowLabel: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.gray800,
        textTransform: 'capitalize',
        marginBottom: 2,
    },
    rowTime: {
        fontSize: fontSize.xs,
        color: colors.gray500,
    },
    xpText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.bold,
        color: '#4f46e5',
    },
});

export default ActivityFeed;
