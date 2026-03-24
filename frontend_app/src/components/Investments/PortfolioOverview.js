import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { RefreshCw, Shield, Zap } from 'lucide-react-native';
import { PieChart } from 'react-native-chart-kit';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { fmt } from '../../services/investmentService';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - spacing.md * 2 - 32;

const KPI = ({ label, value, sub, positive }) => (
    <View style={styles.kpiCard}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text style={[styles.kpiValue, positive === true && { color: colors.success }, positive === false && { color: colors.error }]}>{value}</Text>
        {sub && <Text style={[styles.kpiSub, positive === true && { color: colors.success }, positive === false && { color: colors.error }]}>{sub}</Text>}
    </View>
);

const COLORS = ['#1E6BD6', '#16A34A', '#D97706', '#06B6D4', '#EC4899', '#8B5CF6', '#F97316'];

const PortfolioOverview = ({ snapshot, onRefresh }) => {
    if (!snapshot?.summary) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No investments yet</Text>
                <Text style={styles.emptySubtitle}>Add your first investment to see your dashboard!</Text>
            </View>
        );
    }

    const s = snapshot.summary;
    const alloc = snapshot.allocation || {};
    const risk = snapshot.riskMetrics || {};
    const sectors = snapshot.sectorExposure || [];
    const plSign = s.totalUnrealizedPL >= 0;

    const allocData = Object.entries(alloc)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

    const pieData = allocData.map((d, i) => ({
        name: d.name,
        population: d.value,
        color: COLORS[i % COLORS.length],
        legendFontColor: colors.textSecondary,
        legendFontSize: 11
    }));

    return (
        <View style={styles.container}>
            {/* Refresh bar */}
            <View style={styles.refreshBar}>
                <Text style={styles.refreshText}>
                    Last: {snapshot.lastPriceRefreshAt ? new Date(snapshot.lastPriceRefreshAt).toLocaleTimeString() : 'N/A'}
                </Text>
                <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
                    <RefreshCw size={12} color={colors.textSecondary} />
                    <Text style={styles.refreshBtnText}>Refresh</Text>
                </TouchableOpacity>
            </View>

            {/* KPI Row 1 */}
            <View style={styles.kpiRow}>
                <KPI label="Total Invested" value={fmt(s.totalInvested)} />
                <KPI label="Current Value" value={fmt(s.totalCurrentValue)} positive={plSign} />
            </View>
            <View style={styles.kpiRow}>
                <KPI label="Unrealized P&L" value={`${plSign ? '+' : ''}${fmt(s.totalUnrealizedPL)}`} sub={`${plSign ? '+' : ''}${s.totalUnrealizedPLPercent}%`} positive={plSign} />
                <KPI label="XIRR" value={`${s.xirr >= 0 ? '+' : ''}${s.xirr}%`} sub="Annualized" positive={s.xirr >= 0} />
            </View>

            {/* KPI Row 2 */}
            <View style={styles.kpiRow}>
                <KPI label="Realized P&L" value={`${s.totalRealizedPL >= 0 ? '+' : ''}${fmt(s.totalRealizedPL)}`} positive={s.totalRealizedPL >= 0} />
                <KPI label="Day Change" value={`${s.dayChange >= 0 ? '+' : ''}${fmt(s.dayChange)}`} sub={`${s.dayChangePercent >= 0 ? '+' : ''}${s.dayChangePercent}%`} positive={s.dayChange >= 0} />
            </View>

            {/* Health & Diversification */}
            <View style={styles.kpiRow}>
                <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>Health</Text>
                    <View style={styles.healthRow}>
                        <Shield size={16} color={snapshot.health === 'Aggressive' ? '#D97706' : snapshot.health === 'Moderate' ? colors.primary : colors.success} />
                        <Text style={styles.healthText}>{snapshot.health || 'N/A'}</Text>
                    </View>
                </View>
                <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>Diversification</Text>
                    <Text style={[styles.kpiValue, { color: (risk.diversificationScore || 0) > 60 ? colors.success : '#D97706' }]}>
                        {risk.diversificationScore || 0}<Text style={styles.scoreMax}>/100</Text>
                    </Text>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${risk.diversificationScore || 0}%` }]} />
                    </View>
                </View>
            </View>

            {/* Allocation */}
            {allocData.length > 0 && (
                <View style={[styles.card, { paddingBottom: spacing.sm }]}>
                    <Text style={styles.cardTitle}>Asset Allocation</Text>
                    <View style={{ alignItems: 'center', marginVertical: spacing.sm }}>
                        <PieChart
                            data={pieData}
                            width={CHART_W}
                            height={140}
                            chartConfig={{ color: () => '#000' }}
                            accessor={"population"}
                            backgroundColor={"transparent"}
                            paddingLeft={"12"}
                            absolute
                        />
                    </View>
                </View>
            )}

            {/* Sectors */}
            {sectors.length > 0 && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Sector Exposure</Text>
                    {sectors.slice(0, 6).map((s, i) => (
                        <View key={s.sector} style={styles.allocRow}>
                            <Text style={[styles.allocName, { flex: 1 }]}>{s.sector}</Text>
                            <View style={[styles.allocBarTrack, { flex: 2 }]}>
                                <View style={[styles.allocBarFill, { width: `${s.percentage}%`, backgroundColor: colors.primary }]} />
                            </View>
                            <Text style={styles.allocValue}>{s.percentage}%</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Risk Metrics */}
            <View style={styles.kpiRow}>
                {[
                    { label: 'Concentration', value: risk.concentrationRisk || 'N/A', color: risk.concentrationRisk === 'High' ? colors.error : risk.concentrationRisk === 'Moderate' ? '#D97706' : colors.success },
                    { label: 'Expected CAGR', value: `${risk.expectedCAGR || 0}%`, color: colors.success },
                ].map(m => (
                    <View key={m.label} style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>{m.label}</Text>
                        <Text style={[styles.kpiValue, { color: m.color, textAlign: 'center' }]}>{m.value}</Text>
                    </View>
                ))}
            </View>

            {/* Alerts */}
            {snapshot.alerts?.length > 0 && (
                <View style={styles.alertCard}>
                    <View style={styles.alertHeader}>
                        <Zap size={14} color="#D97706" />
                        <Text style={styles.alertTitle}>Smart Alerts</Text>
                    </View>
                    {snapshot.alerts.map((a, i) => (
                        <View key={i} style={styles.alertItem}>
                            <Text style={styles.alertText}>⚠️ {a}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { gap: spacing.sm },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary },
    emptySubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4 },
    refreshBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    refreshText: { fontSize: 10, color: colors.textSecondary },
    refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.white, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.border },
    refreshBtnText: { fontSize: 10, fontWeight: fontWeight.semibold, color: colors.textSecondary },
    kpiRow: { flexDirection: 'row', gap: spacing.sm },
    kpiCard: { flex: 1, backgroundColor: colors.white, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
    kpiLabel: { fontSize: 9, fontWeight: fontWeight.bold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    kpiValue: { fontSize: 20, fontWeight: fontWeight.bold, color: colors.textPrimary },
    kpiSub: { fontSize: fontSize.xs, marginTop: 2, color: colors.textSecondary },
    healthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    healthText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
    scoreMax: { fontSize: fontSize.xs, color: colors.textSecondary },
    progressTrack: { height: 6, backgroundColor: colors.surface, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
    card: { backgroundColor: colors.white, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
    cardTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: spacing.sm },
    allocRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    allocDot: { width: 8, height: 8, borderRadius: 4 },
    allocName: { fontSize: fontSize.xs, color: colors.textSecondary, width: 60 },
    allocBarTrack: { flex: 1, height: 8, backgroundColor: colors.surface, borderRadius: 4, overflow: 'hidden' },
    allocBarFill: { height: '100%', borderRadius: 4 },
    allocValue: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textPrimary, width: 36, textAlign: 'right' },
    alertCard: { backgroundColor: '#FFFBEB', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: '#FDE68A', padding: spacing.md },
    alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
    alertTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: '#92400E' },
    alertItem: { backgroundColor: '#FEF3C7', borderRadius: borderRadius.sm, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6 },
    alertText: { fontSize: fontSize.xs, color: '#92400E' },
});

export default PortfolioOverview;
