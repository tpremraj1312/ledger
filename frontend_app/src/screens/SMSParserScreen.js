/**
 * SMSParserScreen — Full SMS Parser Dashboard
 * 
 * Features:
 * - Stats bar (Total Parsed, High Risk, Today's count)
 * - Manual SMS paste input for parsing
 * - FlatList of all parsed SMS transactions
 * - Filter by risk level (All / Low / Medium / High)
 * - Risk alert modal for high-risk transactions
 * - Pull-to-refresh, skeleton loaders, empty states
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  ArrowLeft, MessageSquare, AlertTriangle, Shield, Send,
  Inbox, Filter, Trash2, BarChart2,
} from 'lucide-react-native';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';
import useSmsStore from '../store/smsStore';
import SMSCard from '../components/sms/SMSCard';
import RiskAlertModal from '../components/sms/RiskAlertModal';
import api from '../api/axios';
import { useFinancial } from '../context/FinancialContext';

// ─── Filter Tabs ────────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'high', label: 'High Risk' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

// ─── Stat Card Sub-Component ────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconWrap, { backgroundColor: color + '12' }]}>
      <Icon size={16} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ─── Skeleton Loader ────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonRow}>
      <View style={[styles.skeletonBox, { width: 36, height: 36, borderRadius: 10 }]} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={[styles.skeletonBox, { width: '60%', height: 14 }]} />
        <View style={[styles.skeletonBox, { width: '40%', height: 10, marginTop: 6 }]} />
      </View>
      <View style={[styles.skeletonBox, { width: 60, height: 16 }]} />
    </View>
  </View>
);

// ─── Empty State ────────────────────────────────────────────────────────────
const EmptyState = ({ filter }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIcon}>
      <Inbox size={40} color={colors.gray400} />
    </View>
    <Text style={styles.emptyTitle}>
      {filter === 'all' ? 'No SMS Parsed Yet' : `No ${filter} risk transactions`}
    </Text>
    <Text style={styles.emptySubtitle}>
      {filter === 'all'
        ? 'Paste a bank SMS below to start parsing your financial transactions automatically.'
        : 'Try selecting a different filter to see more results.'
      }
    </Text>
  </View>
);

// ─── Main Screen ────────────────────────────────────────────────────────────
const SMSParserScreen = ({ navigation }) => {
  const {
    transactions,
    isLoading,
    lastAlert,
    settings,
    initialize,
    processSms,
    markAsSafe,
    deleteTransaction,
    dismissAlert,
    getStats,
    getFilteredTransactions,
  } = useSmsStore();

  const [activeFilter, setActiveFilter] = useState('all');
  const [smsInput, setSmsInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Initialize store on mount
  useEffect(() => {
    initialize();
  }, []);

  const stats = useMemo(() => getStats(), [transactions]);
  const filteredTransactions = useMemo(
    () => getFilteredTransactions(activeFilter),
    [transactions, activeFilter]
  );

  const { refreshData } = useFinancial();

  const handleParseSms = useCallback(async () => {
    const text = smsInput.trim();
    if (!text) {
      Alert.alert('Empty Input', 'Please paste an SMS message to parse.');
      return;
    }

    setIsParsing(true);

    try {
      // Small delay to allow UI to show loader
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = processSms(text, '', true); // forceReparse=true for manual input
      
      if (result) {
        setSmsInput('');
        
        // Background sync to backend so Tax Optimizer and Gamification engines run
        try {
          await api.post('/api/sms/sync', { transactions: [result] });
          // Force refresh the global context so Home / Tax screens update immediately
          refreshData(true);
        } catch (syncErr) {
          console.error('[SMS Parser] Sync error:', syncErr);
        }

        Alert.alert(
          'SMS Parsed',
          `${result.transactionType === 'debit' ? 'Debit' : 'Credit'} of ₹${result.amount} at ${result.merchant}\nRisk Score: ${result.riskScore}/100`,
        );
      } else {
        Alert.alert(
          'Not a Financial SMS',
          'This message does not appear to be a bank transaction SMS. Try pasting a different message.',
        );
      }
    } finally {
      setIsParsing(false);
    }
  }, [smsInput, processSms, refreshData]);

  const handleDelete = useCallback((hash) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this parsed SMS?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(hash) },
      ]
    );
  }, [deleteTransaction]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await initialize();
    setRefreshing(false);
  }, [initialize]);

  const renderItem = useCallback(({ item }) => (
    <SMSCard
      transaction={item}
      onMarkSafe={markAsSafe}
      onDelete={handleDelete}
    />
  ), [markAsSafe, handleDelete]);

  const keyExtractor = useCallback((item) => item.smsHash, []);

  // ── Loading State ──
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SMS Parser</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.content}>
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SMS Parser</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Stats Bar */}
      <View style={styles.statsRow}>
        <StatCard label="Total" value={stats.totalParsed} icon={MessageSquare} color={colors.primary} />
        <StatCard label="High Risk" value={stats.highRiskCount} icon={AlertTriangle} color={colors.error} />
        <StatCard label="Today" value={stats.todayCount} icon={BarChart2} color={colors.success} />
      </View>

      {/* Manual SMS Input */}
      <View style={styles.inputSection}>
        <TextInput
          style={styles.textInput}
          placeholder="Paste bank SMS here to parse..."
          placeholderTextColor={colors.gray400}
          value={smsInput}
          onChangeText={setSmsInput}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        <TouchableOpacity
          style={[styles.parseButton, (!smsInput.trim() || isParsing) && styles.parseButtonDisabled]}
          onPress={handleParseSms}
          disabled={!smsInput.trim() || isParsing}
          activeOpacity={0.7}
        >
          {isParsing ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Send size={16} color={colors.white} />
              <Text style={styles.parseButtonText}>Parse</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, activeFilter === f.key && styles.filterTabActive]}
            onPress={() => setActiveFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterText,
              activeFilter === f.key && styles.filterTextActive,
            ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transaction List */}
      <FlatList
        data={filteredTransactions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState filter={activeFilter} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />

      {/* Risk Alert Modal */}
      <RiskAlertModal
        visible={!!lastAlert}
        transaction={lastAlert}
        onDismiss={dismissAlert}
        onMarkSafe={markAsSafe}
        vibrationEnabled={settings.vibrationEnabled}
      />
    </SafeAreaView>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.lg,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '400',
  },

  // Input
  inputSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  textInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    minHeight: 72,
    fontWeight: '400',
  },
  parseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  parseButtonDisabled: {
    opacity: 0.5,
  },
  parseButtonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: '500',
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.white,
  },

  // List
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400',
  },

  // Skeleton
  skeletonCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonBox: {
    backgroundColor: colors.gray200,
    borderRadius: 6,
    height: 12,
  },
});

export default SMSParserScreen;
