import React, { useState, useMemo } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput,
} from 'react-native';
import {
    BookOpen, GraduationCap, Calculator, AlertTriangle,
    ArrowRight, Lightbulb, Shield, TrendingUp, Target,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { fmt } from '../../services/investmentService';

// ── Learning Modules (Static) ────────────────────────────────
const LEARNING_MODULES = [
    {
        category: 'Investment Basics', items: [
            { title: 'Asset Classes 101', desc: 'Understand Equity, Debt, Gold, and Real Estate.', time: '3 min' },
            { title: 'Risk vs Reward', desc: 'The fundamental trade-off of investing.', time: '4 min' },
            { title: 'The Magic of Compounding', desc: 'Why starting early matters more than how much.', time: '2 min' },
        ],
    },
    {
        category: 'Risk & Diversification', items: [
            { title: 'Portfolio Diversification', desc: 'How spreading investments reduces risk.', time: '4 min' },
            { title: 'Understanding Volatility', desc: 'Why prices fluctuate and how to use it.', time: '3 min' },
            { title: 'Rebalancing Strategy', desc: 'When and how to rebalance your portfolio.', time: '5 min' },
        ],
    },
    {
        category: 'Long-Term Compounding', items: [
            { title: 'Asset Allocation by Age', desc: 'How to divide money based on age and goals.', time: '5 min' },
            { title: 'SIPs & Lumpsum Strategy', desc: 'When to use SIP vs deploying bulk capital.', time: '4 min' },
            { title: 'Tax Efficient Investing', desc: 'LTCG, STCG, ELSS, and PPF explained.', time: '6 min' },
        ],
    },
];

const STAGE_ROADMAP = [
    { stage: 'Foundation (18–25)', focus: 'Cashflow & Habits', goals: ['Build 6-Month Emergency Fund', 'Clear high-interest debt', 'Start first SIP (Index Fund)'] },
    { stage: 'Accumulation (25–40)', focus: 'Wealth Creation', goals: ['Max out tax-advantaged accounts', 'Maintain 60-80% Equity', 'Buy Term & Health Insurance'] },
    { stage: 'Consolidation (40–55)', focus: 'Preservation & Growth', goals: ['Shift towards quality Debt', 'Review allocation annually', 'Plan for child education'] },
    { stage: 'Distribution (55+)', focus: 'Income Generation', goals: ['Set up SWP', 'Deep capital protection', 'Estate planning & nominations'] },
];

// ── SIP Simulator ────────────────────────────────────────────
const SIPSimulator = () => {
    const [monthly, setMonthly] = useState('10000');
    const [years, setYears] = useState('15');
    const [rate, setRate] = useState('12');
    const [stepUp, setStepUp] = useState('5');

    const { totalInvested, fv, inflAdj } = useMemo(() => {
        let inv = 0, val = 0, mon = Number(monthly) || 0;
        const y = Number(years) || 1, r = Number(rate) || 0, s = Number(stepUp) || 0;
        for (let yr = 1; yr <= y; yr++) {
            for (let m = 1; m <= 12; m++) { inv += mon; val = (val + mon) * (1 + r / 100 / 12); }
            mon += mon * (s / 100);
        }
        return { totalInvested: inv, fv: val, inflAdj: val / Math.pow(1.06, y) };
    }, [monthly, years, rate, stepUp]);

    return (
        <View style={styles.card}>
            <View style={styles.sectionHeader}>
                <Calculator size={16} color={colors.textSecondary} />
                <Text style={styles.sectionTitle}>SIP Simulator</Text>
            </View>
            <Text style={styles.simSubtitle}>Model your wealth creation journey</Text>

            {[
                { label: 'Monthly SIP (₹)', val: monthly, set: setMonthly },
                { label: 'Years', val: years, set: setYears },
                { label: 'Expected Return (%)', val: rate, set: setRate },
                { label: 'Annual Step-Up (%)', val: stepUp, set: setStepUp },
            ].map(field => (
                <View key={field.label} style={styles.simRow}>
                    <Text style={styles.simLabel}>{field.label}</Text>
                    <TextInput
                        style={styles.simInput}
                        keyboardType="numeric"
                        value={field.val}
                        onChangeText={field.set}
                    />
                </View>
            ))}

            <View style={styles.simResults}>
                <View style={styles.simResultItem}>
                    <Text style={styles.simResLabel}>Invested</Text>
                    <Text style={styles.simResValue}>{fmt(totalInvested)}</Text>
                </View>
                <View style={[styles.simResultItem, { backgroundColor: '#EBF2FC', borderColor: '#BFDBFE' }]}>
                    <Text style={[styles.simResLabel, { color: colors.primary }]}>Expected Value</Text>
                    <Text style={[styles.simResValue, { color: colors.primary }]}>{fmt(fv)}</Text>
                </View>
                <View style={styles.simResultItem}>
                    <Text style={styles.simResLabel}>Inflation Adj.</Text>
                    <Text style={styles.simResValue}>{fmt(inflAdj)}</Text>
                </View>
            </View>
        </View>
    );
};

// ── Mistake Detector ─────────────────────────────────────────
const MistakeDetector = ({ snapshot }) => {
    const alloc = snapshot?.allocation || {};
    const risk = snapshot?.riskMetrics || {};
    const holdings = snapshot?.holdings || [];

    const mistakes = [];
    if (alloc.equity > 85) mistakes.push({ sev: 'high', msg: 'Extremely high equity exposure (>85%). A crash could severely impact your portfolio.' });
    else if (alloc.equity > 70) mistakes.push({ sev: 'med', msg: 'High equity concentration. Consider diversifying into debt or gold.' });
    if (alloc.debt < 5 && holdings.length > 0) mistakes.push({ sev: 'med', msg: 'Almost no debt allocation. Stable instruments act as a cushion.' });
    if (alloc.crypto > 20) mistakes.push({ sev: 'high', msg: `Crypto at ${alloc.crypto}%. Extremely volatile — keep under 10%.` });
    if (risk.concentrationRisk === 'High') mistakes.push({ sev: 'high', msg: 'High concentration risk. Portfolio depends heavily on a few holdings.' });
    const losers = holdings.filter(h => h.unrealizedPLPercent < -15);
    if (losers.length > 0) mistakes.push({ sev: 'med', msg: `${losers.length} holding(s) down >15%. Review if the thesis still holds.` });
    if (holdings.length === 1) mistakes.push({ sev: 'med', msg: 'Single-stock portfolio. Diversify to reduce risk.' });

    if (!mistakes.length) {
        return (
            <View style={styles.successBox}>
                <Text style={styles.successTitle}>✅ No major mistakes detected!</Text>
                <Text style={styles.successSubtitle}>Your portfolio structure looks healthy.</Text>
            </View>
        );
    }

    return (
        <View style={{ gap: 8 }}>
            {mistakes.map((m, i) => (
                <View key={i} style={[styles.mistakeItem, { backgroundColor: m.sev === 'high' ? '#FEF2F2' : '#FFFBEB', borderColor: m.sev === 'high' ? '#FECACA' : '#FDE68A' }]}>
                    <AlertTriangle size={14} color={m.sev === 'high' ? colors.error : '#D97706'} />
                    <Text style={[styles.mistakeText, { color: m.sev === 'high' ? '#991B1B' : '#92400E' }]}>{m.msg}</Text>
                </View>
            ))}
        </View>
    );
};

// ── Main Explorer ────────────────────────────────────────────
const TABS = [
    { id: 'hub', label: 'Learning', icon: BookOpen },
    { id: 'roadmap', label: 'Roadmap', icon: GraduationCap },
    { id: 'tools', label: 'Tools', icon: Calculator },
    { id: 'detector', label: 'Mistakes', icon: AlertTriangle },
];

const ExplorerPanel = ({ snapshot }) => {
    const [activeTab, setActiveTab] = useState('hub');

    const alloc = snapshot?.allocation || {};
    const risk = snapshot?.riskMetrics || {};
    const insights = [];
    if (alloc.equity > 80) insights.push({ msg: 'Highly aggressive portfolio. Ensure ample emergency funds.', module: 'Risk & Diversification' });
    else if (alloc.debt < 10 && snapshot?.holdings?.length > 0) insights.push({ msg: 'Consider building a stronger debt foundation.', module: 'Risk & Diversification' });
    if (risk.concentrationRisk === 'High') insights.push({ msg: 'High concentration detected. Diversification might help.', module: 'Risk & Diversification' });

    return (
        <View style={{ flex: 1 }}>
            {/* Title */}
            <View style={styles.explorerHeader}>
                <Text style={styles.explorerTitle}>Financial Intelligence Explorer</Text>
                <Text style={styles.explorerSubtitle}>Master the art of investing and wealth creation</Text>
            </View>

            {/* Tabs */}
            <View style={styles.explorerTabs}>
                {TABS.map(t => {
                    const isActive = activeTab === t.id;
                    const Icon = t.icon;
                    return (
                        <TouchableOpacity key={t.id} onPress={() => setActiveTab(t.id)} style={[styles.explorerTab, isActive && styles.explorerTabActive]}>
                            <Icon size={14} color={isActive ? colors.primary : colors.textSecondary} />
                            <Text style={[styles.explorerTabText, isActive && styles.explorerTabTextActive]}>{t.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Insight Banner */}
                {insights.length > 0 && activeTab === 'hub' && (
                    <View style={styles.insightBanner}>
                        <Lightbulb size={16} color="#FBBF24" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.insightTitle}>Personalized Insight</Text>
                            <Text style={styles.insightMsg}>{insights[0].msg}</Text>
                            <Text style={styles.insightModule}>📖 Recommended: {insights[0].module}</Text>
                        </View>
                    </View>
                )}

                {/* Learning Hub */}
                {activeTab === 'hub' && LEARNING_MODULES.map((mod, idx) => (
                    <View key={idx} style={{ marginBottom: 16 }}>
                        <Text style={styles.catTitle}>{mod.category}</Text>
                        {mod.items.map((item, i) => (
                            <TouchableOpacity key={i} style={styles.learnCard} activeOpacity={0.7}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.learnTitle}>{item.title}</Text>
                                    <Text style={styles.learnDesc}>{item.desc}</Text>
                                </View>
                                <View style={styles.learnMeta}>
                                    <Text style={styles.learnTime}>{item.time}</Text>
                                    <ArrowRight size={12} color={colors.primary} />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                ))}

                {/* Roadmap */}
                {activeTab === 'roadmap' && (
                    <View style={{ gap: 12 }}>
                        {STAGE_ROADMAP.map((stage, idx) => (
                            <View key={idx} style={styles.roadmapCard}>
                                <View style={styles.roadmapNum}>
                                    <Text style={styles.roadmapNumText}>{idx + 1}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.roadmapStage}>{stage.stage}</Text>
                                    <Text style={styles.roadmapFocus}>Focus: {stage.focus}</Text>
                                    {stage.goals.map((g, gIdx) => (
                                        <View key={gIdx} style={styles.goalRow}>
                                            <View style={styles.goalDot} />
                                            <Text style={styles.goalText}>{g}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Tools */}
                {activeTab === 'tools' && <SIPSimulator />}

                {/* Mistake Detector */}
                {activeTab === 'detector' && (
                    <View>
                        <View style={styles.sectionHeader}>
                            <AlertTriangle size={16} color={colors.textPrimary} />
                            <Text style={styles.sectionTitle}>Portfolio Mistake Detector</Text>
                        </View>
                        <Text style={styles.detectorSubtext}>Automated analysis for common investing mistakes.</Text>
                        <MistakeDetector snapshot={snapshot} />
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    scroll: { padding: spacing.md, paddingBottom: 60 },
    card: { backgroundColor: colors.white, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    sectionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
    explorerHeader: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
    explorerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
    explorerSubtitle: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
    explorerTabs: { flexDirection: 'row', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface, marginHorizontal: spacing.md, borderRadius: borderRadius.md, marginTop: spacing.sm },
    explorerTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: borderRadius.sm },
    explorerTabActive: { backgroundColor: colors.white },
    explorerTabText: { fontSize: 11, fontWeight: fontWeight.semibold, color: colors.textSecondary },
    explorerTabTextActive: { color: colors.primary },
    insightBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#1E293B', borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md },
    insightTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.white },
    insightMsg: { fontSize: fontSize.xs, color: '#CBD5E1', lineHeight: 18, marginTop: 2 },
    insightModule: { fontSize: 10, color: '#818CF8', fontWeight: fontWeight.semibold, marginTop: 6 },
    catTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: 8 },
    learnCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: 8 },
    learnTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
    learnDesc: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
    learnMeta: { alignItems: 'center', gap: 4, marginLeft: 10 },
    learnTime: { fontSize: 10, color: colors.textSecondary },
    roadmapCard: { flexDirection: 'row', gap: 12, backgroundColor: colors.white, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
    roadmapNum: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    roadmapNumText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textSecondary },
    roadmapStage: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textPrimary },
    roadmapFocus: { fontSize: 11, fontWeight: fontWeight.semibold, color: colors.primary, marginTop: 2, marginBottom: 8 },
    goalRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
    goalDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 5 },
    goalText: { fontSize: fontSize.xs, color: colors.textSecondary, flex: 1 },
    simSubtitle: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: spacing.sm },
    simRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    simLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textSecondary },
    simInput: { width: 100, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: 10, paddingVertical: 6, fontSize: fontSize.sm, color: colors.textPrimary, textAlign: 'right' },
    simResults: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
    simResultItem: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, padding: 10, alignItems: 'center' },
    simResLabel: { fontSize: 9, fontWeight: fontWeight.bold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    simResValue: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textPrimary, marginTop: 4 },
    detectorSubtext: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 12 },
    successBox: { backgroundColor: '#F0FDF4', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: '#BBF7D0', padding: spacing.lg, alignItems: 'center' },
    successTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.success },
    successSubtitle: { fontSize: fontSize.xs, color: '#166534', marginTop: 4 },
    mistakeItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: borderRadius.md, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
    mistakeText: { flex: 1, fontSize: fontSize.xs, lineHeight: 18 },
});

export default ExplorerPanel;
