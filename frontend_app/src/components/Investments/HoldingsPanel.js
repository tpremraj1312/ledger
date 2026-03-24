import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { TrendingUp, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { fmt, fetchTxnHistory } from '../../services/investmentService';

const SORT_OPTIONS = [
    { key: 'value', label: 'Value' },
    { key: 'pl', label: 'P&L' },
    { key: 'weight', label: 'Weight' },
    { key: 'dayChange', label: 'Day' },
];

const SORT_FNS = {
    value: (a, b) => b.currentValue - a.currentValue,
    pl: (a, b) => b.unrealizedPL - a.unrealizedPL,
    weight: (a, b) => b.weight - a.weight,
    dayChange: (a, b) => (b.dayChangePercent || 0) - (a.dayChangePercent || 0),
};

const HoldingsPanel = ({ holdings }) => {
    const [sortKey, setSortKey] = useState('value');
    const [expanded, setExpanded] = useState(null);
    const [txnHistory, setTxnHistory] = useState([]);
    const [txnLoading, setTxnLoading] = useState(false);

    const sorted = useMemo(() => {
        if (!holdings?.length) return [];
        const arr = [...holdings];
        arr.sort(SORT_FNS[sortKey] || SORT_FNS.value);
        return arr;
    }, [holdings, sortKey]);

    const toggleExpand = async (symbol) => {
        if (expanded === symbol) { setExpanded(null); setTxnHistory([]); return; }
        setExpanded(symbol);
        setTxnLoading(true);
        try {
            const data = await fetchTxnHistory({ symbol, limit: 10 });
            setTxnHistory(data.transactions || []);
        } catch { setTxnHistory([]); }
        finally { setTxnLoading(false); }
    };

    if (!holdings?.length) {
        return (
            <View style={styles.emptyContainer}>
                <TrendingUp size={48} color={colors.border} />
                <Text style={styles.emptyTitle}>No holdings yet</Text>
                <Text style={styles.emptySubtitle}>Buy your first investment to build your portfolio</Text>
            </View>
        );
    }

    const renderHolding = ({ item: h }) => {
        const isExpanded = expanded === h.symbol;
        const plUp = h.unrealizedPL >= 0;
        return (
            <TouchableOpacity
                style={styles.holdingCard}
                onPress={() => toggleExpand(h.symbol)}
                activeOpacity={0.7}
            >
                {/* Header */}
                <View style={styles.holdingHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.holdingName}>{h.name}</Text>
                        <Text style={styles.holdingSymbol}>{h.symbol} · {h.assetType}</Text>
                    </View>
                    <View style={[styles.plBadge, { backgroundColor: plUp ? '#F0FDF4' : '#FEF2F2' }]}>
                        <Text style={[styles.plBadgeText, { color: plUp ? colors.success : colors.error }]}>
                            {plUp ? '+' : ''}{h.unrealizedPLPercent}%
                        </Text>
                    </View>
                </View>

                {/* Metrics */}
                <View style={styles.metricsRow}>
                    <View style={styles.metric}>
                        <Text style={styles.metricLabel}>Value</Text>
                        <Text style={styles.metricValue}>{fmt(h.currentValue)}</Text>
                    </View>
                    <View style={styles.metric}>
                        <Text style={styles.metricLabel}>P&L</Text>
                        <Text style={[styles.metricValue, { color: plUp ? colors.success : colors.error }]}>
                            {plUp ? '+' : ''}{fmt(h.unrealizedPL)}
                        </Text>
                    </View>
                    <View style={styles.metric}>
                        <Text style={styles.metricLabel}>Weight</Text>
                        <Text style={styles.metricValue}>{h.weight}%</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.holdingFooter}>
                    <Text style={styles.footerText}>{h.quantity} units @ {fmt(h.avgCostBasis)}</Text>
                    <View style={styles.expandHint}>
                        {isExpanded ? <ChevronUp size={12} color={colors.textSecondary} /> : <ChevronDown size={12} color={colors.textSecondary} />}
                        <Text style={styles.footerText}>History</Text>
                    </View>
                </View>

                {/* Expanded Transaction History */}
                {isExpanded && (
                    <View style={styles.txnSection}>
                        {txnLoading ? (
                            <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 12 }} />
                        ) : txnHistory.length > 0 ? (
                            txnHistory.map((txn, j) => (
                                <View key={txn._id || j} style={styles.txnItem}>
                                    <View style={styles.txnLeft}>
                                        <View style={[styles.txnBadge, { backgroundColor: txn.txnType === 'BUY' ? '#F0FDF4' : '#FEF2F2' }]}>
                                            <Text style={[styles.txnBadgeText, { color: txn.txnType === 'BUY' ? colors.success : colors.error }]}>{txn.txnType}</Text>
                                        </View>
                                        <Text style={styles.txnDate}>
                                            {new Date(txn.txnDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        </Text>
                                    </View>
                                    <Text style={styles.txnAmount}>{txn.quantity} × {fmt(txn.price)}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.noTxnText}>No transactions found</Text>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Sort Chips */}
            <View style={styles.sortRow}>
                <ArrowUpDown size={12} color={colors.textSecondary} />
                {SORT_OPTIONS.map(opt => (
                    <TouchableOpacity
                        key={opt.key}
                        onPress={() => setSortKey(opt.key)}
                        style={[styles.sortChip, sortKey === opt.key && styles.sortChipActive]}
                    >
                        <Text style={[styles.sortText, sortKey === opt.key && styles.sortTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <FlatList
                data={sorted}
                renderItem={renderHolding}
                keyExtractor={(h, i) => h.symbol + i}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginTop: 12 },
    emptySubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4 },
    sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
    sortChipActive: { backgroundColor: '#EBF2FC', borderColor: colors.primary },
    sortText: { fontSize: 11, fontWeight: fontWeight.semibold, color: colors.textSecondary },
    sortTextActive: { color: colors.primary },
    list: { padding: spacing.md, paddingTop: 0, gap: spacing.sm },
    holdingCard: { backgroundColor: colors.white, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
    holdingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    holdingName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
    holdingSymbol: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
    plBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
    plBadgeText: { fontSize: 11, fontWeight: fontWeight.bold },
    metricsRow: { flexDirection: 'row', gap: spacing.md },
    metric: { flex: 1 },
    metricLabel: { fontSize: 10, color: colors.textSecondary },
    metricValue: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginTop: 2 },
    holdingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.surface },
    footerText: { fontSize: 10, color: colors.textSecondary },
    expandHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    txnSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.surface },
    txnItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: borderRadius.sm, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 4 },
    txnLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    txnBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    txnBadgeText: { fontSize: 9, fontWeight: fontWeight.bold },
    txnDate: { fontSize: 11, color: colors.textSecondary },
    txnAmount: { fontSize: 11, fontWeight: fontWeight.semibold, color: colors.textPrimary },
    noTxnText: { textAlign: 'center', fontSize: fontSize.xs, color: colors.textSecondary, paddingVertical: 12 },
});

export default HoldingsPanel;
