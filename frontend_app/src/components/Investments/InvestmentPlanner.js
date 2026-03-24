import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Calculator, Target, TrendingUp, ArrowRight, CheckCircle } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { fmt, generatePlan } from '../../services/investmentService';

const RISK_OPTIONS = ['conservative', 'moderate', 'aggressive'];
const ALLOC_COLORS = { Equity: '#1E6BD6', Debt: '#16A34A', Gold: '#D97706', Crypto: '#06B6D4', Cash: '#94A3B8' };

const InvestmentPlanner = () => {
    const [inputs, setInputs] = useState({ income: '', expenses: '', age: '', riskPreference: 'moderate', investmentAmount: '' });
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!inputs.income || !inputs.expenses) {
            Alert.alert('Missing Fields', 'Please enter income and expenses.');
            return;
        }
        setLoading(true);
        try {
            const r = await generatePlan(inputs);
            setPlan(r);
        } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Planner failed'); }
        finally { setLoading(false); }
    };

    const allocData = plan ? Object.entries(plan.allocation).map(([k, v]) => ({
        name: k.charAt(0).toUpperCase() + k.slice(1), value: v,
    })) : [];

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Input Form */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Calculator size={20} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>Smart Investment Planner</Text>
                            <Text style={styles.cardSubtitle}>Get a personalized, practical investment plan.</Text>
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Monthly Income (₹)</Text>
                            <TextInput style={styles.input} keyboardType="numeric" placeholder="50000" placeholderTextColor={colors.textSecondary} value={inputs.income} onChangeText={v => setInputs({ ...inputs, income: v })} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Monthly Expenses (₹)</Text>
                            <TextInput style={styles.input} keyboardType="numeric" placeholder="30000" placeholderTextColor={colors.textSecondary} value={inputs.expenses} onChangeText={v => setInputs({ ...inputs, expenses: v })} />
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Age</Text>
                            <TextInput style={styles.input} keyboardType="numeric" placeholder="30" placeholderTextColor={colors.textSecondary} value={inputs.age} onChangeText={v => setInputs({ ...inputs, age: v })} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Risk Preference</Text>
                            <View style={styles.riskRow}>
                                {RISK_OPTIONS.map(r => (
                                    <TouchableOpacity key={r} onPress={() => setInputs({ ...inputs, riskPreference: r })}
                                        style={[styles.riskChip, inputs.riskPreference === r && styles.riskChipActive]}>
                                        <Text style={[styles.riskText, inputs.riskPreference === r && styles.riskTextActive]}>
                                            {r.charAt(0).toUpperCase() + r.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                            <>
                                <Target size={16} color={colors.white} />
                                <Text style={styles.submitBtnText}>Generate Plan</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Results */}
                {plan && (
                    <>
                        {/* Key Metrics */}
                        <View style={styles.metricsGrid}>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>MONTHLY SURPLUS</Text>
                                <Text style={[styles.metricValue, { color: plan.monthlySurplus > 0 ? colors.success : colors.error }]}>
                                    {fmt(plan.monthlySurplus)}
                                </Text>
                                <Text style={styles.metricSub}>Savings rate: {plan.savingsRate}%</Text>
                            </View>
                            <View style={[styles.metricCard, { backgroundColor: '#EBF2FC', borderColor: '#BFDBFE' }]}>
                                <Text style={[styles.metricLabel, { color: colors.primary }]}>RECOMMENDED SIP</Text>
                                <Text style={[styles.metricValue, { color: colors.primary }]}>{fmt(plan.recommendedSIP)}</Text>
                                <Text style={[styles.metricSub, { color: colors.primary }]}>/month</Text>
                            </View>
                            <View style={[styles.metricCard, { backgroundColor: plan.emergencyPriority ? '#FFFBEB' : '#F0FDF4', borderColor: plan.emergencyPriority ? '#FDE68A' : '#BBF7D0' }]}>
                                <Text style={styles.metricLabel}>EMERGENCY FUND</Text>
                                <Text style={styles.metricValue}>{fmt(plan.emergencyTarget)}</Text>
                                <Text style={[styles.metricSub, { color: plan.emergencyPriority ? '#D97706' : colors.success }]}>
                                    {plan.emergencyPriority ? '⚠️ Build first' : '✅ On track'}
                                </Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>RISK LEVEL</Text>
                                <Text style={[styles.metricValue, { textTransform: 'capitalize' }]}>{plan.riskLevel}</Text>
                                <Text style={styles.metricSub}>Age: {plan.age}</Text>
                            </View>
                        </View>

                        {/* Allocation */}
                        {allocData.length > 0 && (
                            <View style={styles.card}>
                                <Text style={styles.sectionTitle}>Suggested Allocation</Text>
                                {allocData.map(d => (
                                    <View key={d.name} style={styles.allocRow}>
                                        <View style={[styles.allocDot, { backgroundColor: ALLOC_COLORS[d.name] || colors.primary }]} />
                                        <Text style={styles.allocName}>{d.name}</Text>
                                        <View style={styles.allocTrack}>
                                            <View style={[styles.allocFill, { width: `${d.value}%`, backgroundColor: ALLOC_COLORS[d.name] || colors.primary }]} />
                                        </View>
                                        <Text style={styles.allocValue}>{d.value}%</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Projections */}
                        {plan.projections?.length > 0 && (
                            <View style={styles.card}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                                    <TrendingUp size={15} color={colors.primary} />
                                    <Text style={styles.sectionTitle}>Growth Projections</Text>
                                </View>
                                <View style={styles.projGrid}>
                                    {plan.projections.map(p => (
                                        <View key={p.years} style={styles.projCard}>
                                            <Text style={styles.projYear}>{p.years} Years</Text>
                                            <Text style={styles.projValue}>{fmt(p.corpus)}</Text>
                                            <Text style={styles.projSub}>Real: {fmt(p.inflationAdjusted)}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Action Steps */}
                        {plan.steps?.length > 0 && (
                            <View style={styles.card}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                                    <ArrowRight size={15} color={colors.primary} />
                                    <Text style={styles.sectionTitle}>Action Steps</Text>
                                </View>
                                {plan.steps.map((step, i) => (
                                    <View key={i} style={styles.stepItem}>
                                        <CheckCircle size={14} color={colors.primary} />
                                        <Text style={styles.stepText}>{step}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    scroll: { padding: spacing.md, paddingBottom: 60, gap: spacing.sm },
    card: { backgroundColor: colors.white, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: spacing.md },
    cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
    cardSubtitle: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
    label: { fontSize: 11, fontWeight: fontWeight.semibold, color: colors.textSecondary, marginBottom: 4, marginTop: 8 },
    input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: fontSize.sm, color: colors.textPrimary },
    row: { flexDirection: 'row', gap: spacing.sm },
    riskRow: { flexDirection: 'row', gap: 4 },
    riskChip: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: borderRadius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    riskChipActive: { backgroundColor: '#EBF2FC', borderColor: colors.primary },
    riskText: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.textSecondary },
    riskTextActive: { color: colors.primary },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: colors.primary, borderRadius: borderRadius.lg, marginTop: spacing.md },
    submitBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.white },
    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    metricCard: { width: '48%', backgroundColor: colors.white, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
    metricLabel: { fontSize: 9, fontWeight: fontWeight.bold, color: colors.textSecondary, letterSpacing: 1 },
    metricValue: { fontSize: 18, fontWeight: fontWeight.bold, color: colors.textPrimary, marginTop: 4 },
    metricSub: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
    sectionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
    allocRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    allocDot: { width: 8, height: 8, borderRadius: 4 },
    allocName: { fontSize: fontSize.xs, color: colors.textSecondary, width: 56 },
    allocTrack: { flex: 1, height: 8, backgroundColor: colors.surface, borderRadius: 4, overflow: 'hidden' },
    allocFill: { height: '100%', borderRadius: 4 },
    allocValue: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textPrimary, width: 32, textAlign: 'right' },
    projGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    projCard: { width: '48%', backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: 12, alignItems: 'center' },
    projYear: { fontSize: 10, color: colors.textSecondary },
    projValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary, marginVertical: 4 },
    projSub: { fontSize: 10, color: colors.textSecondary },
    stepItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.surface, borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
    stepText: { flex: 1, fontSize: fontSize.xs, color: colors.textPrimary, lineHeight: 18 },
});

export default InvestmentPlanner;
