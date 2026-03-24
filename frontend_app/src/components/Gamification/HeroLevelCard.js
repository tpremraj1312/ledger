import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Trophy, Star } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../theme';

const HeroLevelCard = ({ profile }) => {
    const { level = 1, xp = 0, title = 'Rookie Saver' } = profile || {};

    const nextLevelXp = level * 500;
    const currentLevelBaseXp = (level - 1) * 500;
    const progress = Math.min(100, Math.max(0, ((xp - currentLevelBaseXp) / 500) * 100));

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.titleText}>{title}</Text>
                    <View style={styles.levelBadge}>
                        <Star size={16} color={colors.primary} />
                        <Text style={styles.levelText}>Level {level}</Text>
                    </View>
                </View>
                <View style={styles.iconContainer}>
                    <Trophy size={28} color={colors.primary} />
                </View>
            </View>

            <View style={styles.progressSection}>
                <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>Next Level Progress</Text>
                    <Text style={styles.progressValue}>{xp} / {nextLevelXp} XP</Text>
                </View>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.remainingText}>
                    {nextLevelXp - xp} XP needed to reach Level {level + 1}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.sm,
        marginBottom: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing['2xl'],
    },
    titleText: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    levelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    levelText: {
        color: colors.primary,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
    },
    iconContainer: {
        padding: spacing.sm,
        backgroundColor: colors.primaryLight + '20',
        borderRadius: borderRadius.lg,
    },
    progressSection: {
        marginTop: 'auto',
    },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    progressLabel: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    progressValue: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.textPrimary,
    },
    progressBarBg: {
        height: 10,
        backgroundColor: colors.gray100,
        borderRadius: borderRadius.full,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: borderRadius.full,
    },
    remainingText: {
        textAlign: 'right',
        fontSize: fontSize.xs,
        color: colors.gray400,
        marginTop: spacing.sm,
    },
});

export default HeroLevelCard;
