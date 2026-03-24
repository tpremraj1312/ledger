import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, RefreshControl,
    StyleSheet, ActivityIndicator, SafeAreaView, Modal, Pressable
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
    ArrowLeft, LayoutDashboard, ListTree, LineChart,
    ArrowDownCircle, Wallet, Brain, BookOpen, RefreshCcw, ChevronDown, Check, Menu, X
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme';
import { fetchPortfolio, fmt } from '../services/investmentService';

import PortfolioOverview from '../components/Investments/PortfolioOverview';
import NewsPanel from '../components/Investments/NewsPanel';
import HoldingsPanel from '../components/Investments/HoldingsPanel';
import TransactionPanel from '../components/Investments/TransactionPanel';
import MarketChartPanel from '../components/Investments/MarketChartPanel';
import InvestmentPlanner from '../components/Investments/InvestmentPlanner';
import AIInsightsPanel from '../components/Investments/AIInsightsPanel';
import ExplorerPanel from '../components/Investments/ExplorerPanel';
import { InvestmentScreenSkeleton } from '../components/SkeletonLoader';

const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'holdings', label: 'Holdings', icon: ListTree },
    { id: 'charts', label: 'Market Charts', icon: LineChart },
    { id: 'transactions', label: 'Buy/Sell', icon: ArrowDownCircle },
    { id: 'planner', label: 'AI Planner', icon: Wallet },
    { id: 'ai', label: 'AI Insights', icon: Brain },
    { id: 'explorer', label: 'Explorer', icon: BookOpen },
];

const InvestmentScreen = () => {
    const navigation = useNavigation();
    const [snapshot, setSnapshot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [menuVisible, setMenuVisible] = useState(false);

    const loadSnapshot = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            const data = await fetchPortfolio();
            setSnapshot(data);
        } catch (err) {
            console.error('Portfolio fetch error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadSnapshot(); }, [loadSnapshot]);

    const handleTransactionComplete = () => {
        setRefreshing(true);
        loadSnapshot(true);
    };

    const up = snapshot?.summary?.totalUnrealizedPL >= 0;
    const activeTabData = TABS.find(t => t.id === activeTab) || TABS[0];

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Investments</Text>
                    <View style={{ width: 40 }} />
                </View>
                <InvestmentScreenSkeleton />
            </SafeAreaView>
        );
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSnapshot(true)} colors={[colors.primary]} />}
                        showsVerticalScrollIndicator={false}
                    >
                        <PortfolioOverview snapshot={snapshot} onRefresh={() => loadSnapshot(true)} />
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Market News</Text>
                        </View>
                        <NewsPanel />
                    </ScrollView>
                );
            case 'holdings':
                return <HoldingsPanel holdings={snapshot?.holdings || []} />;
            case 'charts':
                return <MarketChartPanel holdings={snapshot?.holdings || []} />;
            case 'transactions':
                return (
                    <TransactionPanel
                        holdings={snapshot?.holdings || []}
                        onTransactionComplete={handleTransactionComplete}
                    />
                );
            case 'planner':
                return <InvestmentPlanner />;
            case 'ai':
                return <AIInsightsPanel portfolio={snapshot} />;
            case 'explorer':
                return <ExplorerPanel snapshot={snapshot} />;
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={22} color={colors.textPrimary} />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Investments</Text>

                {snapshot ? (
                    <TouchableOpacity
                        onPress={() => loadSnapshot(true)}
                        disabled={refreshing}
                        style={[styles.refreshBtn, refreshing && { opacity: 0.5 }]}
                    >
                        <RefreshCcw size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                ) : <View style={{ width: 40 }} />}
            </View>

            {/* Top Row: Hamburger Menu + Portfolio Summary Pill */}
            <View style={styles.topRow}>
                <TouchableOpacity style={styles.hamburgerBtn} onPress={() => setMenuVisible(true)}>
                    <Menu size={24} color={colors.textPrimary} />
                </TouchableOpacity>

                {snapshot?.summary ? (
                    <View style={styles.summaryPill}>
                        <View>
                            <Text style={styles.summaryLabel}>PORTFOLIO</Text>
                            <Text style={styles.summaryValue}>{fmt(snapshot.summary.totalCurrentValue)}</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View>
                            <Text style={styles.summaryLabel}>P&L</Text>
                            <Text style={[styles.summaryPL, { color: up ? colors.success : colors.error }]}>
                                {up ? '+' : ''}{fmt(snapshot.summary.totalUnrealizedPL)}
                            </Text>
                        </View>
                    </View>
                ) : <View style={{ flex: 1 }} />}
            </View>

            {/* Hamburger Modal */}
            <Modal visible={menuVisible} transparent animationType="fade">
                <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
                    <View style={styles.menuContainer}>
                        <View style={styles.menuHeader}>
                            <Text style={styles.menuTitle}>Investment Menu</Text>
                            <TouchableOpacity onPress={() => setMenuVisible(false)}>
                                <X size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView bounces={false} style={{ maxHeight: 400 }}>
                            {TABS.map(tab => {
                                const isActive = activeTab === tab.id;
                                const Icon = tab.icon;
                                return (
                                    <TouchableOpacity
                                        key={tab.id}
                                        style={[styles.menuItem, isActive && styles.menuItemActive]}
                                        onPress={() => {
                                            setActiveTab(tab.id);
                                            setMenuVisible(false);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.menuItemLeft}>
                                            <Icon size={20} color={isActive ? colors.primary : colors.textSecondary} />
                                            <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
                                                {tab.label}
                                            </Text>
                                        </View>
                                        {isActive && <Check size={18} color={colors.primary} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>

            {/* Content */}
            <View style={styles.content}>
                {renderContent()}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        zIndex: 10,
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.textPrimary,
    },
    refreshBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        marginTop: spacing.sm,
        gap: spacing.sm,
    },
    summaryPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.sm,
    },
    hamburgerBtn: {
        width: 48,
        height: 48,
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.sm,
    },
    summaryLabel: {
        fontSize: 9,
        fontWeight: fontWeight.bold,
        color: colors.textSecondary,
        letterSpacing: 1,
    },
    summaryValue: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.textPrimary,
        marginTop: 2,
    },
    summaryDivider: {
        width: 1,
        height: 32,
        backgroundColor: colors.border,
        marginHorizontal: spacing.lg,
    },
    summaryPL: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
        marginTop: 2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 80,
    },
    menuContainer: {
        width: '85%',
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        ...shadows.xl,
    },
    menuHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.gray50,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    menuTitle: {
        fontSize: 10,
        fontWeight: fontWeight.bold,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray50,
    },
    menuItemActive: {
        backgroundColor: '#EBF2FC',
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    menuItemText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.textPrimary,
    },
    menuItemTextActive: {
        fontWeight: fontWeight.bold,
        color: colors.primary,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: 40,
    },
    sectionHeader: {
        marginTop: spacing.xl,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.bold,
        color: colors.textPrimary,
    },
});

export default InvestmentScreen;
