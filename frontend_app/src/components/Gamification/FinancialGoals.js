import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Target, Plus, X, Trash2, TrendingDown, TrendingUp, PiggyBank, CheckCircle2, AlertTriangle } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

const TYPE_CONFIG = {
    expense_limit: { label: 'Expense Limit', icon: TrendingDown, colorText: '#E11D48', colorBg: '#fff1f2', barColor: '#E11D48' },
    income_target: { label: 'Income Target', icon: TrendingUp, colorText: '#059669', colorBg: '#ecfdf5', barColor: '#10B981' },
    savings_target: { label: 'Savings Target', icon: PiggyBank, colorText: '#4f46e5', colorBg: '#eef2ff', barColor: '#6366f1' },
};

const GoalCard = ({ goal, onDelete }) => {
    const cfg = TYPE_CONFIG[goal.type] || TYPE_CONFIG.expense_limit;
    const Icon = cfg.icon;
    const isCompleted = goal.status === 'completed';
    const isFailed = goal.status === 'failed';

    const progress = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
    const daysLeft = Math.max(0, Math.ceil((new Date(goal.endDate) - new Date()) / (1000 * 60 * 60 * 24)));

    let cardBgStyle = styles.cardNormal;
    if (isCompleted) cardBgStyle = styles.cardCompleted;
    if (isFailed) cardBgStyle = styles.cardFailed;

    return (
        <View style={[styles.card, cardBgStyle]}>
            <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: cfg.colorBg }]}>
                        <Icon size={18} color={cfg.colorText} />
                    </View>
                    <View>
                        <Text style={styles.goalTitle}>{goal.title}</Text>
                        <View style={[styles.typeBadge, { backgroundColor: cfg.colorBg }]}>
                            <Text style={[styles.typeBadgeText, { color: cfg.colorText }]}>{cfg.label}</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.cardHeaderRight}>
                    {isCompleted && (
                        <View style={styles.statusBadgeCompleted}>
                            <CheckCircle2 size={12} color="#047857" />
                            <Text style={styles.statusBadgeTextCompleted}>Done</Text>
                        </View>
                    )}
                    {isFailed && (
                        <View style={styles.statusBadgeFailed}>
                            <AlertTriangle size={12} color="#b91c1c" />
                            <Text style={styles.statusBadgeTextFailed}>Missed</Text>
                        </View>
                    )}
                    {!isCompleted && !isFailed && (
                        <View style={styles.statusBadgeDays}>
                            <Text style={styles.statusBadgeTextDays}>{daysLeft}d left</Text>
                        </View>
                    )}
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(goal._id)}>
                        <Trash2 size={16} color={colors.gray400} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.progressSection}>
                <View style={styles.progressLabels}>
                    <Text style={styles.progressLabelText}>{goal.type === 'expense_limit' ? 'Spent' : 'Reached'}</Text>
                    <Text style={styles.progressValueText}>
                        {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                    </Text>
                </View>
                <View style={styles.progressBarBg}>
                    <View 
                        style={[
                            styles.progressBarFill, 
                            { 
                                width: `${progress}%`, 
                                backgroundColor: isCompleted ? '#10B981' : isFailed ? '#F87171' : (goal.type === 'expense_limit' && progress > 85 ? '#F59E0B' : cfg.barColor) 
                            }
                        ]} 
                    />
                </View>
                {goal.type === 'expense_limit' && !isCompleted && !isFailed && (
                    <Text style={styles.remainingText}>
                        {formatCurrency(Math.max(0, goal.targetAmount - goal.currentAmount))} remaining buffer
                    </Text>
                )}
            </View>
        </View>
    );
};

const FinancialGoals = ({ goals = [], onCreate, onDelete }) => {
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        title: '',
        type: 'expense_limit',
        targetAmount: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: (() => {
            const d = new Date();
            d.setMonth(d.getMonth() + 1);
            return d.toISOString().split('T')[0];
        })(),
    });

    const activeGoals = goals.filter(g => g.status === 'active');
    const completedGoals = goals.filter(g => g.status === 'completed' || g.status === 'failed');

    const handleSubmit = async () => {
        if (!form.title || !form.targetAmount) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        setSubmitting(true);
        await onCreate({ ...form, targetAmount: Number(form.targetAmount) });
        setForm(prev => ({ ...prev, title: '', targetAmount: '' }));
        setShowForm(false);
        setSubmitting(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.headerIconBox}>
                        <Target size={20} color="#4f46e5" />
                    </View>
                    <View>
                        <Text style={styles.title}>Financial Goals</Text>
                        <Text style={styles.subtitle}>Track your targets</Text>
                    </View>
                </View>
                <TouchableOpacity 
                    style={styles.toggleBtn} 
                    onPress={() => setShowForm(!showForm)}
                >
                    {showForm ? <X size={16} color={colors.white} /> : <Plus size={16} color={colors.white} />}
                    <Text style={styles.toggleBtnText}>{showForm ? 'Cancel' : 'New Goal'}</Text>
                </TouchableOpacity>
            </View>

            {showForm && (
                <View style={styles.formContainer}>
                    <Text style={styles.inputLabel}>Goal Name</Text>
                    <TextInput
                        style={styles.input}
                        value={form.title}
                        onChangeText={t => setForm(p => ({ ...p, title: t }))}
                        placeholder="e.g., Reduce monthly spending"
                    />

                    <Text style={styles.inputLabel}>Target Amount (₹)</Text>
                    <TextInput
                        style={styles.input}
                        value={form.targetAmount}
                        onChangeText={t => setForm(p => ({ ...p, targetAmount: t }))}
                        placeholder="20000"
                        keyboardType="numeric"
                    />

                    <TouchableOpacity 
                        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} 
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                            <>
                                <Target size={16} color={colors.white} />
                                <Text style={styles.submitBtnText}>Create Goal</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {activeGoals.length > 0 ? (
                <View style={styles.goalsList}>
                    {activeGoals.map(goal => (
                        <GoalCard key={goal._id} goal={goal} onDelete={onDelete} />
                    ))}
                </View>
            ) : (
                !showForm && (
                    <View style={styles.emptyState}>
                        <Target size={40} color={colors.gray300} style={{ marginBottom: spacing.sm }} />
                        <Text style={styles.emptyTitle}>No active goals</Text>
                        <Text style={styles.emptyDesc}>Set a financial target to start tracking</Text>
                    </View>
                )
            )}

            {completedGoals.length > 0 && (
                <View style={styles.pastGoalsSection}>
                    <Text style={styles.pastGoalsTitle}>PAST GOALS</Text>
                    <View style={styles.goalsList}>
                        {completedGoals.slice(0, 5).map(goal => (
                            <GoalCard key={goal._id} goal={goal} onDelete={onDelete} />
                        ))}
                    </View>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    headerIconBox: {
        padding: spacing.sm,
        backgroundColor: '#eef2ff',
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
    toggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: '#4f46e5',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
    },
    toggleBtnText: {
        color: colors.white,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.bold,
    },
    formContainer: {
        backgroundColor: colors.gray50,
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.gray200,
        marginBottom: spacing.xl,
    },
    inputLabel: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.gray700,
        marginBottom: spacing.xs,
    },
    input: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginBottom: spacing.md,
        fontSize: fontSize.base,
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: '#4f46e5',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        marginTop: spacing.sm,
    },
    submitBtnDisabled: {
        opacity: 0.7,
    },
    submitBtnText: {
        color: colors.white,
        fontWeight: fontWeight.bold,
        fontSize: fontSize.base,
    },
    goalsList: {
        gap: spacing.md,
    },
    card: {
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
    },
    cardNormal: {
        backgroundColor: colors.white,
        borderColor: colors.gray100,
    },
    cardCompleted: {
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0',
    },
    cardFailed: {
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    cardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    iconWrapper: {
        padding: spacing.sm,
        borderRadius: borderRadius.md,
    },
    goalTitle: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.bold,
        color: colors.textPrimary,
        marginBottom: 2,
    },
    typeBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
    },
    typeBadgeText: {
        fontSize: 10,
        fontWeight: fontWeight.bold,
    },
    cardHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    statusBadgeCompleted: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#d1fae5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
    },
    statusBadgeTextCompleted: {
        color: '#047857',
        fontSize: 10,
        fontWeight: fontWeight.bold,
    },
    statusBadgeFailed: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#fee2e2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
    },
    statusBadgeTextFailed: {
        color: '#b91c1c',
        fontSize: 10,
        fontWeight: fontWeight.bold,
    },
    statusBadgeDays: {
        backgroundColor: colors.gray100,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
    },
    statusBadgeTextDays: {
        color: colors.gray500,
        fontSize: 10,
        fontWeight: fontWeight.bold,
    },
    deleteBtn: {
        padding: 4,
    },
    progressSection: {},
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    progressLabelText: {
        fontSize: 10,
        fontWeight: fontWeight.medium,
        color: colors.gray500,
    },
    progressValueText: {
        fontSize: 10,
        fontWeight: fontWeight.bold,
        color: colors.gray600,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: colors.gray100,
        borderRadius: borderRadius.full,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: borderRadius.full,
    },
    remainingText: {
        fontSize: 10,
        color: colors.gray500,
        marginTop: 4,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing['3xl'],
        borderWidth: 2,
        borderColor: colors.gray200,
        borderStyle: 'dashed',
        borderRadius: borderRadius.xl,
        marginBottom: spacing.xl,
    },
    emptyTitle: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.medium,
        color: colors.gray500,
        marginBottom: 2,
    },
    emptyDesc: {
        fontSize: fontSize.sm,
        color: colors.gray400,
    },
    pastGoalsSection: {
        marginTop: spacing.xl,
    },
    pastGoalsTitle: {
        fontSize: 12,
        fontWeight: fontWeight.bold,
        color: colors.gray500,
        marginBottom: spacing.sm,
        letterSpacing: 0.5,
    },
});

export default FinancialGoals;
