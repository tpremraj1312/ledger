import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Brain, Shield, Target, TrendingUp, AlertTriangle, Zap } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { fmt, fetchAIAnalysis } from '../../services/investmentService';

const Gauge = ({ value, label }) => {
    const color = value > 60 ? colors.error : value > 40 ? '#D97706' : colors.success;
    return (
        <View style={styles.gaugeItem}>
            <Text style={styles.gaugeLabel}>{label}</Text>
            <Text style={[styles.gaugeValue, { color }]}>{value}</Text>
            <View style={styles.gaugeTrack}>
                <View style={[styles.gaugeFill, { width: `${Math.min(value, 100)}%`, backgroundColor: color }]} />
            </View>
        </View>
    );
};

const AIInsightsPanel = ({ portfolio }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleAnalyze = async () => {
        setLoading(true);
        try { const r = await fetchAIAnalysis(); setData(r); }
        catch { Alert.alert('Error', 'AI Analysis failed. Please try again.'); }
        finally { setLoading(false); }
    };

    // Initial state — CTA
    if (!data) {
        return (
            <View style={styles.ctaContainer}>
                <Brain size={56} color={colors.border} />
                <Text style={styles.ctaTitle}>AI Investment Intelligence</Text>
                <Text style={styles.ctaSubtitle}>
                    Get risk scoring, projections, crash impact analysis, and personalized portfolio optimization.
                </Text>
                <TouchableOpacity style={styles.ctaBtn} onPress={handleAnalyze} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                        <>
                            <Brain size={16} color={colors.white} />
                            <Text style={styles.ctaBtnText}>Generate Analysis</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        );
    }

    const { riskScore: rs = {}, health: h = {}, projection: proj = {}, crashImpact: crash = [], narrative: n = {} } = data;

    const allocChart = Object.keys(h.recommendedAllocation || {})
        .filter(k => k !== 'cash')
        .map(k => ({
            name: k.charAt(0).toUpperCase() + k.slice(1),
            current: (h.currentAllocation || {})[k] || 0,
            recommended: (h.recommendedAllocation || {})[k] || 0,
        }));

    return (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Grade & Summary */}
            <View style={styles.card}>
                <View style={styles.gradeRow}>
                    <View style={styles.gradeBadge}>
                        <Text style={styles.gradeText}>{n.grade || '—'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.gradeSummary}>{n.summary || 'Analysis complete'}</Text>
                        {n.topPriority && <Text style={styles.gradeSubtext}>{n.topPriority}</Text>}
                    </View>
                </View>
                <TouchableOpacity style={styles.reanalyzeBtn} onPress={handleAnalyze} disabled={loading}>
                    {loading ? <ActivityIndicator size="small" color={colors.textSecondary} /> : <Brain size={14} color={colors.textSecondary} />}
                    <Text style={styles.reanalyzeBtnText}>Re-analyze</Text>
                </TouchableOpacity>
            </View>

            {/* Risk */}
            <View style={styles.card}>
                <View style={styles.sectionHeader}>
                    <Shield size={15} color={colors.primary} />
                    <Text style={styles.sectionTitle}>Risk Assessment</Text>
                </View>
                <View style={styles.gaugeGrid}>
                    <Gauge value={rs.overall || 0} label="Overall" />
                    <Gauge value={rs.volatility || 0} label="Volatility" />
                    <Gauge value={rs.concentration || 0} label="Concent." />
                    <Gauge value={rs.drawdown || 0} label="Drawdown" />
                </View>
                {n.riskExplanation && (
                    <View style={styles.noteBox}>
                        <Text style={styles.noteText}>{n.riskExplanation}</Text>
                    </View>
                )}
            </View>

            {/* Allocation Comparison */}
            {allocChart.length > 0 && (
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <Target size={15} color={colors.success} />
                        <Text style={styles.sectionTitle}>Current vs Recommended</Text>
                    </View>
                    {allocChart.map(d => (
                        <View key={d.name} style={styles.allocCompRow}>
                            <Text style={styles.allocCompLabel}>{d.name}</Text>
                            <View style={styles.allocCompBars}>
                                <View style={styles.allocCompTrack}>
                                    <View style={[styles.allocCompFill, { width: `${d.current}%`, backgroundColor: colors.primary }]} />
                                </View>
                                <View style={styles.allocCompTrack}>
                                    <View style={[styles.allocCompFill, { width: `${d.recommended}%`, backgroundColor: colors.success }]} />
                                </View>
                            </View>
                            <View style={styles.allocCompValues}>
                                <Text style={styles.allocCompVal}>{d.current}%</Text>
                                <Text style={[styles.allocCompVal, { color: colors.success }]}>{d.recommended}%</Text>
                            </View>
                        </View>
                    ))}
                    <View style={styles.legendRow}>
                        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={styles.legendText}>Current</Text></View>
                        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.success }]} /><Text style={styles.legendText}>Recommended</Text></View>
                    </View>
                </View>
            )}

            {/* Projection */}
            <View style={styles.rowCards}>
                <View style={[styles.card, { flex: 1 }]}>
                    <View style={styles.sectionHeader}>
                        <TrendingUp size={15} color={colors.success} />
                        <Text style={styles.sectionTitle}>Projection ({proj.years || 10}Y)</Text>
                    </View>
                    <View style={styles.projItem}><Text style={styles.projLabel}>Projected</Text><Text style={[styles.projValue, { color: colors.success }]}>{fmt(proj.projected || 0)}</Text></View>
                    <View style={styles.projItem}><Text style={styles.projLabel}>Inflation Adj.</Text><Text style={[styles.projValue, { color: colors.primary }]}>{fmt(proj.inflationAdjusted || 0)}</Text></View>
                    <View style={styles.projItem}><Text style={styles.projLabel}>Growth</Text><Text style={styles.projValue}>{fmt(proj.growth || 0)}</Text></View>
                </View>
            </View>

            {/* Crash Impact */}
            {crash.length > 0 && (
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <AlertTriangle size={15} color="#D97706" />
                        <Text style={styles.sectionTitle}>Crash Impact</Text>
                    </View>
                    {crash.map((c, i) => (
                        <View key={i} style={styles.crashRow}>
                            <Text style={styles.crashScenario}>{c.scenario}</Text>
                            <Text style={styles.crashImpact}>{fmt(c.impact)} ({c.impactPct}%)</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Financial Health */}
            <View style={styles.card}>
                <View style={styles.sectionHeader}>
                    <Zap size={15} color={colors.primary} />
                    <Text style={styles.sectionTitle}>Financial Health</Text>
                </View>
                <View style={styles.healthGrid}>
                    <View style={[styles.healthItem, { backgroundColor: h.emergencyStatus === 'ADEQUATE' ? '#F0FDF4' : '#FFFBEB' }]}>
                        <Text style={[styles.healthBadge, { color: h.emergencyStatus === 'ADEQUATE' ? colors.success : '#D97706' }]}>{h.emergencyStatus || '—'}</Text>
                        <Text style={styles.healthSub}>{h.emergencyMsg || ''}</Text>
                    </View>
                    <View style={styles.healthItem}>
                        <Text style={styles.healthLabel}>Savings Rate</Text>
                        <Text style={[styles.healthValue, { color: (h.savingsRate || 0) > 20 ? colors.success : '#D97706' }]}>{h.savingsRate || 0}%</Text>
                    </View>
                    <View style={styles.healthItem}>
                        <Text style={styles.healthLabel}>Current SIP</Text>
                        <Text style={styles.healthValue}>{fmt(h.currentSIP || 0)}</Text>
                    </View>
                    <View style={[styles.healthItem, { backgroundColor: '#EBF2FC' }]}>
                        <Text style={[styles.healthLabel, { color: colors.primary }]}>Recommended SIP</Text>
                        <Text style={[styles.healthValue, { color: colors.primary }]}>{fmt(h.recommendedSIP || 0)}</Text>
                    </View>
                </View>
                <View style={styles.returnRow}>
                    <View style={styles.returnItem}><Text style={styles.healthLabel}>Nominal Return</Text><Text style={[styles.healthValue, { color: colors.success }]}>{h.nominalReturn || 0}%</Text></View>
                    <View style={styles.returnItem}><Text style={styles.healthLabel}>Real Return</Text><Text style={[styles.healthValue, { color: colors.primary }]}>{h.realReturn || 0}%</Text></View>
                </View>
            </View>

            {/* Rebalancing */}
            {h.rebalancing?.length > 0 && (
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <Target size={15} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Rebalancing Actions</Text>
                    </View>
                    {h.rebalancing.map((r, i) => (
                        <View key={i} style={[styles.rebalRow, { backgroundColor: r.action === 'REDUCE' ? '#FEF2F2' : '#F0FDF4' }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={[styles.actionBadge, { backgroundColor: r.action === 'REDUCE' ? '#FEE2E2' : '#DCFCE7' }]}>
                                    <Text style={[styles.actionText, { color: r.action === 'REDUCE' ? colors.error : colors.success }]}>{r.action}</Text>
                                </View>
                                <Text style={styles.rebalAsset}>{r.asset}</Text>
                            </View>
                            <Text style={styles.rebalTarget}>{r.current}% → {r.target}%</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Tax Hints */}
            {h.taxHints?.length > 0 && (
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>💰 Tax Efficiency</Text>
                    {h.taxHints.map((t, i) => (
                        <View key={i} style={styles.taxItem}>
                            <Text style={styles.taxText}>{t}</Text>
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    ctaContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 40 },
    ctaTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, marginTop: 16, textAlign: 'center' },
    ctaSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 20 },
    ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, backgroundColor: colors.primary, borderRadius: borderRadius.lg, marginTop: 24 },
    ctaBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.white },
    scroll: { padding: spacing.md, paddingBottom: 60, gap: spacing.sm },
    card: { backgroundColor: colors.white, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
    gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    gradeBadge: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    gradeText: { fontSize: 20, fontWeight: fontWeight.bold, color: colors.white },
    gradeSummary: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
    gradeSubtext: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
    reanalyzeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, marginTop: spacing.sm },
    reanalyzeBtnText: { fontSize: 11, fontWeight: fontWeight.semibold, color: colors.textSecondary },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    sectionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
    gaugeGrid: { flexDirection: 'row', gap: 8 },
    gaugeItem: { flex: 1, alignItems: 'center' },
    gaugeLabel: { fontSize: 10, color: colors.textSecondary, marginBottom: 4 },
    gaugeValue: { fontSize: 20, fontWeight: fontWeight.bold },
    gaugeTrack: { width: '100%', height: 5, backgroundColor: colors.surface, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
    gaugeFill: { height: '100%', borderRadius: 3 },
    noteBox: { backgroundColor: colors.surface, borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10 },
    noteText: { fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 18 },
    allocCompRow: { marginBottom: 10 },
    allocCompLabel: { fontSize: 11, fontWeight: fontWeight.semibold, color: colors.textSecondary, marginBottom: 4 },
    allocCompBars: { gap: 3 },
    allocCompTrack: { height: 6, backgroundColor: colors.surface, borderRadius: 3, overflow: 'hidden' },
    allocCompFill: { height: '100%', borderRadius: 3 },
    allocCompValues: { flexDirection: 'row', gap: 12, marginTop: 2 },
    allocCompVal: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.primary },
    legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 10, color: colors.textSecondary },
    rowCards: { flexDirection: 'row', gap: spacing.sm },
    projItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    projLabel: { fontSize: 11, color: colors.textSecondary },
    projValue: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textPrimary },
    crashRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
    crashScenario: { fontSize: fontSize.xs, color: colors.textSecondary },
    crashImpact: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.error },
    healthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    healthItem: { width: '48%', backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: 12 },
    healthLabel: { fontSize: 10, color: colors.textSecondary },
    healthValue: { fontSize: 18, fontWeight: fontWeight.bold, color: colors.textPrimary, marginTop: 4 },
    healthBadge: { fontSize: 11, fontWeight: fontWeight.bold },
    healthSub: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
    returnRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    returnItem: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: 12 },
    rebalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
    actionBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    actionText: { fontSize: 9, fontWeight: fontWeight.bold },
    rebalAsset: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textPrimary },
    rebalTarget: { fontSize: fontSize.xs, color: colors.textSecondary },
    taxItem: { backgroundColor: '#FFFBEB', borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 8, marginTop: 6 },
    taxText: { fontSize: fontSize.xs, color: '#92400E' },
});

export default AIInsightsPanel;
