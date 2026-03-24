import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Scroll, Zap, CheckCircle2, Swords } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../theme';

const DIFFICULTY_STYLE = {
    easy: { label: 'Easy', color: '#10B981', bg: '#ecfdf5', border: '#a7f3d0' },
    medium: { label: 'Medium', color: '#F59E0B', bg: '#fffbeb', border: '#fde68a' },
    hard: { label: 'Hard', color: '#EF4444', bg: '#fef2f2', border: '#fecaca' },
};

const QuestCard = ({ mission, onAction, onClaim }) => {
    const diff = DIFFICULTY_STYLE[mission.difficulty] || DIFFICULTY_STYLE.medium;
    const isCompleted = mission.status === 'completed';
    const progress = mission.targetAmount
        ? Math.min(100, Math.max(0, (mission.progressAmount / mission.targetAmount) * 100))
        : 0;

    return (
        <View style={[styles.questCard, isCompleted && styles.questCardCompleted]}>
            <View style={styles.cardHeader}>
                <View style={styles.badgesWrapper}>
                    <View style={[styles.badgeBase, styles.typeBadge]}>
                        <Text style={styles.typeBadgeText}>
                            {mission.type === 'daily' ? 'DAILY' : 'WEEKLY'}
                        </Text>
                    </View>
                    <View style={[styles.badgeBase, { backgroundColor: diff.bg, borderColor: diff.border }]}>
                        <Text style={[styles.diffBadgeText, { color: diff.color }]}>
                            {diff.label.toUpperCase()}
                        </Text>
                    </View>
                </View>
                <View style={styles.xpBadge}>
                    <Zap size={14} color="#B45309" />
                    <Text style={styles.xpText}>{mission.xpReward} XP</Text>
                </View>
            </View>

            <Text style={styles.missionTitle}>{mission.title}</Text>
            <Text style={styles.missionDesc} numberOfLines={2}>{mission.description}</Text>

            {mission.targetAmount > 0 && (
                <View style={styles.progressWrapper}>
                    <View style={styles.progressLabels}>
                        <Text style={styles.progressLabelText}>Progress</Text>
                        <Text style={styles.progressValueText}>
                            ₹{(mission.progressAmount || 0).toLocaleString('en-IN')} / ₹{mission.targetAmount.toLocaleString('en-IN')}
                        </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: isCompleted ? '#10B981' : colors.primary }]} />
                    </View>
                </View>
            )}

            <View style={styles.actionsWrapper}>
                {mission.status === 'pending' && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={[styles.btn, styles.btnAccept]} onPress={() => onAction(mission._id, 'accepted')}>
                            <Text style={styles.btnAcceptText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.btnSkip]} onPress={() => onAction(mission._id, 'rejected')}>
                            <Text style={styles.btnSkipText}>Skip</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {mission.status === 'accepted' && !isCompleted && (
                    <View style={styles.inProgressBadge}>
                        <Text style={styles.inProgressText}>In Progress</Text>
                    </View>
                )}

                {isCompleted && onClaim && (
                    <TouchableOpacity style={[styles.btn, styles.btnClaim]} onPress={() => onClaim(mission._id)}>
                        <Text style={styles.btnClaimText}>Claim Reward</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const QuestBoard = ({ missions = [], onAction, onGenerate, onClaim }) => {
    return (
        <View style={styles.boardContainer}>
            <View style={styles.boardHeader}>
                <View style={styles.headerLeft}>
                    <View style={styles.iconCircle}>
                        <Scroll size={24} color={colors.primary} />
                    </View>
                    <View>
                        <Text style={styles.boardTitle}>Quest Board</Text>
                        <Text style={styles.boardSubtitle}>Daily & Weekly Missions</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.generateBtn} onPress={onGenerate}>
                    <Swords size={16} color={colors.white} />
                    <Text style={styles.generateBtnText}>New Quests</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.questsList}>
                {missions.length > 0 ? (
                    missions.map((mission) => (
                        <QuestCard
                            key={mission._id}
                            mission={mission}
                            onAction={onAction}
                            onClaim={onClaim}
                        />
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Scroll size={48} color={colors.gray300} style={{ marginBottom: spacing.md }} />
                        <Text style={styles.emptyTitle}>No active quests yet</Text>
                        <TouchableOpacity style={styles.generateEmptyBtn} onPress={onGenerate}>
                            <Swords size={16} color={colors.primary} />
                            <Text style={styles.generateEmptyText}>Generate Quests Now</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    boardContainer: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.sm,
        marginBottom: spacing.xl,
    },
    boardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing['2xl'],
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    iconCircle: {
        padding: spacing.sm,
        backgroundColor: colors.primaryLight + '20',
        borderRadius: borderRadius.lg,
    },
    boardTitle: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.textPrimary,
    },
    boardSubtitle: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    generateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
    },
    generateBtnText: {
        color: colors.white,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.bold,
    },
    questsList: {
        gap: spacing.lg,
    },
    questCard: {
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.white,
    },
    questCardCompleted: {
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    badgesWrapper: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    badgeBase: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
        borderWidth: 1,
    },
    typeBadge: {
        backgroundColor: colors.primaryLight + '20',
        borderColor: colors.primaryLight + '50',
    },
    typeBadgeText: {
        fontSize: 10,
        fontWeight: fontWeight.bold,
        color: colors.primary,
    },
    diffBadgeText: {
        fontSize: 10,
        fontWeight: fontWeight.bold,
    },
    xpBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#fffbeb',
        borderColor: '#fde68a',
        borderWidth: 1,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
    },
    xpText: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.bold,
        color: '#B45309',
    },
    missionTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    missionDesc: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
    },
    progressWrapper: {
        marginBottom: spacing.lg,
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    progressLabelText: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.medium,
        color: colors.gray500,
    },
    progressValueText: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.medium,
        color: colors.gray600,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: colors.gray100,
        borderRadius: borderRadius.full,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: borderRadius.full,
    },
    actionsWrapper: {
        alignItems: 'flex-end',
    },
    actionRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    btn: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
    },
    btnAccept: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    btnAcceptText: {
        color: colors.white,
        fontWeight: fontWeight.bold,
        fontSize: fontSize.sm,
    },
    btnSkip: {
        backgroundColor: colors.gray100,
        borderColor: colors.gray200,
    },
    btnSkipText: {
        color: colors.gray600,
        fontWeight: fontWeight.bold,
        fontSize: fontSize.sm,
    },
    inProgressBadge: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        backgroundColor: colors.primaryLight + '10',
        borderColor: colors.primaryLight + '50',
    },
    inProgressText: {
        color: colors.primary,
        fontWeight: fontWeight.bold,
        fontSize: fontSize.sm,
    },
    btnClaim: {
        backgroundColor: '#10B981',
        borderColor: '#059669',
    },
    btnClaimText: {
        color: colors.white,
        fontWeight: fontWeight.bold,
        fontSize: fontSize.sm,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing['3xl'],
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
        borderRadius: borderRadius.xl,
    },
    emptyTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.medium,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    generateEmptyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    generateEmptyText: {
        color: colors.primary,
        fontWeight: fontWeight.bold,
        fontSize: fontSize.md,
    },
});

export default QuestBoard;
