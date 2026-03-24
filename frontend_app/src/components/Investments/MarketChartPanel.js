import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, StyleSheet,
    ActivityIndicator, Dimensions, Modal, PanResponder,
} from 'react-native';
import { TrendingUp, TrendingDown, Info, X, BarChart2, ChevronDown, Check } from 'lucide-react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme';
import { fmt, fetchHistorical, fetchQuote, fetchFundamentals } from '../../services/investmentService';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - spacing.md * 2;
const CHART_H = 220;

const TIMEFRAMES = [
    { key: '1D', label: '1D' }, { key: '1W', label: '1W' }, { key: '1M', label: '1M' },
    { key: '6M', label: '6M' }, { key: '1Y', label: '1Y' }, { key: '5Y', label: '5Y' }, { key: 'MAX', label: 'MAX' },
];

const TERM_DEFS = {
    PE: 'Price-to-Earnings ratio. A lower PE may indicate the stock is undervalued.',
    'Mkt Cap': 'Market Capitalization. Total market value of the company.',
    EPS: 'Earnings Per Share. Net income divided by shares outstanding.',
    '52W High': '52-week high price, indicating the highest price in the last year.',
    '52W Low': '52-week low price, indicating the lowest price in the last year.',
    'Day High': 'The highest price reached during the current trading day.',
    'Day Low': 'The lowest price reached during the current trading day.',
    Div: 'Dividend Yield. Annual dividend payment as a percentage of stock price.',
    Beta: 'Beta measures a stock\'s volatility relative to the overall market.',
};

const MarketChartPanel = ({ holdings }) => {
    const [selectedSymbol, setSelectedSymbol] = useState(holdings?.[0]?.symbol || '');
    const [timeframe, setTimeframe] = useState('1M');
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [quote, setQuote] = useState(null);
    const [fundamentals, setFundamentals] = useState(null);
    const [termModal, setTermModal] = useState(null);
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [tooltipPos, setTooltipPos] = useState(null);
    const pollRef = useRef(null);

    const selectedHolding = holdings?.find(h => h.symbol === selectedSymbol);

    const loadChart = useCallback(async () => {
        if (!selectedSymbol) return;
        setLoading(true);
        setTooltipPos(null);
        try {
            const data = await fetchHistorical(selectedSymbol, timeframe, selectedHolding?.assetType || 'Stock');
            setChartData(Array.isArray(data) ? data : data.prices || []);
        } catch { setChartData([]); }
        finally { setLoading(false); }
    }, [selectedSymbol, timeframe, selectedHolding?.assetType]);

    const loadQuote = useCallback(async () => {
        if (!selectedSymbol) return;
        try {
            const q = await fetchQuote(selectedSymbol, selectedHolding?.assetType || 'Stock');
            setQuote(q);
        } catch { }
    }, [selectedSymbol, selectedHolding?.assetType]);

    const loadFundamentals = useCallback(async () => {
        if (!selectedSymbol) return;
        try {
            const f = await fetchFundamentals(selectedSymbol);
            setFundamentals(f);
        } catch { setFundamentals(null); }
    }, [selectedSymbol]);

    useEffect(() => { loadChart(); loadQuote(); loadFundamentals(); }, [loadChart, loadQuote, loadFundamentals]);

    // Live polling every 30s for 1D
    useEffect(() => {
        if (timeframe === '1D') {
            pollRef.current = setInterval(loadQuote, 30000);
            return () => clearInterval(pollRef.current);
        }
        return () => { };
    }, [timeframe, loadQuote]);

    const up = (quote?.changePercent || 0) >= 0;

    // Chart dimensions and scales
    const dataPoints = chartData.map(d => d.close || d.price || 0);
    const maxPrice = dataPoints.length ? Math.max(...dataPoints) : 1;
    const minPrice = dataPoints.length ? Math.min(...dataPoints) : 0;
    const range = (maxPrice - minPrice) || 1;
    const paddedMin = minPrice - range * 0.1;
    const paddedMax = maxPrice + range * 0.1;
    const paddedRange = paddedMax - paddedMin || 1;

    const scaleX = (i) => (i / Math.max(1, chartData.length - 1)) * CHART_W;
    const scaleY = (val) => CHART_H - ((val - paddedMin) / paddedRange) * CHART_H;

    let pathD = '';
    chartData.forEach((d, i) => {
        const x = scaleX(i);
        const y = scaleY(d.close || d.price || 0);
        pathD += i === 0 ? `M${x},${y}` : ` L${x},${y}`;
    });
    let areaD = pathD + ` L${CHART_W},${CHART_H} L0,${CHART_H} Z`;

    const handlePan = (x) => {
        if (!chartData.length) return;
        // prevent x from being outside the bounds due to padding
        const boundedX = Math.max(0, Math.min(CHART_W, x));
        let index = Math.round((boundedX / CHART_W) * (chartData.length - 1));
        index = Math.max(0, Math.min(chartData.length - 1, index));
        const pt = chartData[index];
        setTooltipPos({
            x: scaleX(index),
            y: scaleY(pt.close || pt.price || 0),
            value: pt.close || pt.price || 0,
            date: pt.timestamp || pt.date || new Date().toISOString()
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => handlePan(evt.nativeEvent.locationX),
            onPanResponderMove: (evt) => handlePan(evt.nativeEvent.locationX),
            onPanResponderRelease: () => setTooltipPos(null),
        })
    ).current;

    if (!holdings?.length) {
        return (
            <View style={styles.emptyContainer}>
                <BarChart2 size={48} color={colors.border} />
                <Text style={styles.emptyTitle}>No holdings to chart</Text>
                <Text style={styles.emptySubtitle}>Buy an investment first, then view its price chart here.</Text>
            </View>
        );
    }

    // Build fundamental cards
    const fundCards = fundamentals ? [
        { label: 'PE', value: fundamentals.pe },
        { label: 'EPS', value: fundamentals.eps ? `₹${fundamentals.eps}` : null },
        { label: 'Mkt Cap', value: fundamentals.marketCap ? `₹${(fundamentals.marketCap / 1e7).toFixed(0)}Cr` : null },
        { label: '52W High', value: fundamentals.high52 ? `₹${fundamentals.high52}` : null },
        { label: '52W Low', value: fundamentals.low52 ? `₹${fundamentals.low52}` : null },
        { label: 'Div', value: fundamentals.dividendYield ? `${fundamentals.dividendYield}%` : null },
        { label: 'Beta', value: fundamentals.beta },
        { label: 'Day High', value: quote?.dayHigh ? `₹${quote.dayHigh}` : null },
        { label: 'Day Low', value: quote?.dayLow ? `₹${quote.dayLow}` : null },
    ].filter(c => c.value != null) : [];

    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
            {/* Custom Symbol Dropdown Trigger */}
            <TouchableOpacity 
                style={styles.dropdownTrigger} 
                onPress={() => setDropdownVisible(true)}
                activeOpacity={0.7}
            >
                <View>
                    <Text style={styles.dropdownLabel}>Selected Asset</Text>
                    <Text style={styles.dropdownSymbol}>{selectedHolding?.name || selectedSymbol}</Text>
                </View>
                <ChevronDown size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Custom Dropdown Modal */}
            <Modal visible={dropdownVisible} transparent animationType="fade">
                <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setDropdownVisible(false)}>
                    <View style={styles.dropdownMenu}>
                        <View style={styles.dropdownHeader}>
                            <Text style={styles.dropdownTitle}>Select Asset</Text>
                            <TouchableOpacity onPress={() => setDropdownVisible(false)}>
                                <X size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {holdings.map(h => (
                                <TouchableOpacity
                                    key={h.symbol}
                                    style={[styles.dropdownItem, selectedSymbol === h.symbol && styles.dropdownItemActive]}
                                    onPress={() => { setSelectedSymbol(h.symbol); setDropdownVisible(false); }}
                                >
                                    <Text style={[styles.dropdownItemText, selectedSymbol === h.symbol && styles.dropdownItemTextActive]}>
                                        {h.name} ({h.symbol})
                                    </Text>
                                    {selectedSymbol === h.symbol && <Check size={18} color={colors.primary} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Live Price Header */}
            {quote && (
                <View style={[styles.priceHeader, tooltipPos && { opacity: 0.3 }]}>
                    <View>
                        <Text style={styles.priceSymbol}>{selectedSymbol}</Text>
                        <Text style={styles.priceValue}>₹{(quote.price || 0).toFixed(2)}</Text>
                    </View>
                    <View style={[styles.changeBadge, { backgroundColor: up ? '#F0FDF4' : '#FEF2F2' }]}>
                        {up ? <TrendingUp size={14} color={colors.success} /> : <TrendingDown size={14} color={colors.error} />}
                        <Text style={[styles.changeText, { color: up ? colors.success : colors.error }]}>
                            {up ? '+' : ''}{(quote.changePercent || 0).toFixed(2)}%
                        </Text>
                    </View>
                </View>
            )}

            {/* Tooltip Override Header (Web-like UX) */}
            {tooltipPos && (
                <View style={[styles.priceHeader, { position: 'absolute', top: spacing.md + 65, left: spacing.md, right: spacing.md, zIndex: 10 }]}>
                    <View>
                        <Text style={styles.priceSymbol}>
                            {new Date(tooltipPos.date).toLocaleDateString()}
                        </Text>
                        <Text style={styles.priceValue}>₹{tooltipPos.value.toFixed(2)}</Text>
                    </View>
                    <View style={styles.changeBadge}>
                        <Text style={styles.changeText}>Holding</Text>
                    </View>
                </View>
            )}

            {/* Timeframe Selector */}
            <View style={styles.tfRow}>
                {TIMEFRAMES.map(tf => (
                    <TouchableOpacity
                        key={tf.key}
                        onPress={() => setTimeframe(tf.key)}
                        style={[styles.tfChip, timeframe === tf.key && styles.tfChipActive]}
                    >
                        <Text style={[styles.tfText, timeframe === tf.key && styles.tfTextActive]}>{tf.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Web-like SVG Chart Area */}
            <View style={styles.chartContainer}>
                {loading ? (
                    <View style={styles.chartLoading}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.chartLoadingText}>Loading chart...</Text>
                    </View>
                ) : chartData.length === 0 ? (
                    <View style={styles.chartLoading}>
                        <Text style={styles.chartLoadingText}>No data available for this timeframe</Text>
                    </View>
                ) : (
                    <View style={styles.svgChartWrapper} {...panResponder.panHandlers}>
                        <Svg width={CHART_W} height={CHART_H}>
                            <Defs>
                                <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                    <Stop offset="0" stopColor={up ? colors.success : colors.error} stopOpacity="0.25" />
                                    <Stop offset="1" stopColor={up ? colors.success : colors.error} stopOpacity="0.0" />
                                </LinearGradient>
                            </Defs>
                            
                            {/* Grid Lines */}
                            <Line x1="0" y1={CHART_H * 0.25} x2={CHART_W} y2={CHART_H * 0.25} stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" />
                            <Line x1="0" y1={CHART_H * 0.50} x2={CHART_W} y2={CHART_H * 0.50} stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" />
                            <Line x1="0" y1={CHART_H * 0.75} x2={CHART_W} y2={CHART_H * 0.75} stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" />

                            {/* Area Fill */}
                            <Path d={areaD} fill="url(#areaGradient)" />
                            {/* Line Stroke */}
                            <Path d={pathD} fill="none" stroke={up ? colors.success : colors.error} strokeWidth="2.5" />

                            {/* Tooltip Crosshair */}
                            {tooltipPos && (
                                <>
                                    <Line
                                        x1={tooltipPos.x}
                                        y1={0}
                                        x2={tooltipPos.x}
                                        y2={CHART_H}
                                        stroke={colors.textSecondary}
                                        strokeWidth="1.5"
                                        strokeDasharray="4 4"
                                    />
                                    <View style={{ left: tooltipPos.x - 6, top: tooltipPos.y - 6, position: 'absolute' }}>
                                        <View style={styles.tooltipDot} />
                                    </View>
                                </>
                            )}
                        </Svg>
                    </View>
                )}
            </View>

            {/* Price stats */}
            {chartData.length > 0 && (
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Open</Text>
                        <Text style={styles.statValue}>₹{(chartData[0]?.close || chartData[0]?.price || 0).toFixed(2)}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Close</Text>
                        <Text style={styles.statValue}>₹{(chartData[chartData.length - 1]?.close || chartData[chartData.length - 1]?.price || 0).toFixed(2)}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>High</Text>
                        <Text style={[styles.statValue, { color: colors.success }]}>₹{maxPrice.toFixed(2)}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Low</Text>
                        <Text style={[styles.statValue, { color: colors.error }]}>₹{minPrice.toFixed(2)}</Text>
                    </View>
                </View>
            )}

            {/* Fundamentals */}
            {fundCards.length > 0 && (
                <View style={styles.fundSection}>
                    <Text style={styles.fundTitle}>Fundamentals</Text>
                    <View style={styles.fundGrid}>
                        {fundCards.map(card => (
                            <TouchableOpacity
                                key={card.label}
                                style={styles.fundCard}
                                onPress={() => TERM_DEFS[card.label] && setTermModal(card.label)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.fundCardHeader}>
                                    <Text style={styles.fundLabel}>{card.label}</Text>
                                    {TERM_DEFS[card.label] && <Info size={10} color={colors.textSecondary} />}
                                </View>
                                <Text style={styles.fundValue}>{card.value}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {/* Term Definition Modal */}
            <Modal visible={!!termModal} transparent animationType="fade">
                <TouchableOpacity style={styles.termOverlay} activeOpacity={1} onPress={() => setTermModal(null)}>
                    <View style={styles.termCard}>
                        <View style={styles.termHeader}>
                            <Text style={styles.termTitle}>{termModal}</Text>
                            <TouchableOpacity onPress={() => setTermModal(null)}><X size={18} color={colors.textSecondary} /></TouchableOpacity>
                        </View>
                        <Text style={styles.termBody}>{TERM_DEFS[termModal] || ''}</Text>
                    </View>
                </TouchableOpacity>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginTop: 12 },
    emptySubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
    dropdownTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.white, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
    dropdownLabel: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.textSecondary, letterSpacing: 1, marginBottom: 2 },
    dropdownSymbol: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
    dropdownOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    dropdownMenu: { width: '85%', backgroundColor: colors.white, borderRadius: borderRadius.xl, overflow: 'hidden', ...shadows.lg },
    dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.gray50, borderBottomWidth: 1, borderBottomColor: colors.border },
    dropdownTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
    dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray50 },
    dropdownItemActive: { backgroundColor: colors.primaryLight + '10' },
    dropdownItemText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textPrimary },
    dropdownItemTextActive: { color: colors.primary, fontWeight: fontWeight.bold },
    priceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.white, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
    priceSymbol: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.textSecondary, letterSpacing: 1 },
    priceValue: { fontSize: 26, fontWeight: fontWeight.bold, color: colors.textPrimary, marginTop: 2 },
    changeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    changeText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    tfRow: { flexDirection: 'row', gap: 4, marginBottom: spacing.sm },
    tfChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: borderRadius.sm, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
    tfChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tfText: { fontSize: 11, fontWeight: fontWeight.bold, color: colors.textSecondary },
    tfTextActive: { color: colors.white },
    chartContainer: { backgroundColor: colors.white, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, minHeight: CHART_H + 40, marginBottom: spacing.sm },
    chartLoading: { height: CHART_H, alignItems: 'center', justifyContent: 'center' },
    chartLoadingText: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 8 },
    chartArea: { flexDirection: 'row', height: CHART_H, padding: spacing.sm },
    yAxis: { width: 50, justifyContent: 'space-between', paddingVertical: 4 },
    yLabel: { fontSize: 9, color: colors.textSecondary },
    chartBars: { flex: 1, flexDirection: 'row' },
    statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
    statItem: { flex: 1, backgroundColor: colors.white, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, padding: 10, alignItems: 'center' },
    statLabel: { fontSize: 9, color: colors.textSecondary, fontWeight: fontWeight.semibold },
    statValue: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textPrimary, marginTop: 2 },
    fundSection: { backgroundColor: colors.white, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
    fundTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: spacing.sm },
    fundGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    fundCard: { width: '31%', backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: 10 },
    fundCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    fundLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: fontWeight.semibold },
    fundValue: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textPrimary, marginTop: 4 },
    termOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
    termCard: { backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.lg, marginHorizontal: 40, width: SCREEN_W - 80 },
    termHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    termTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
    termBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
    svgChartWrapper: { paddingTop: spacing.md, paddingHorizontal: 0, overflow: 'hidden' },
    tooltipDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.white, borderWidth: 3, borderColor: colors.primary, ...shadows.sm },
});

export default MarketChartPanel;
