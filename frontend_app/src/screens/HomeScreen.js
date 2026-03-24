import React, { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  FileText,
  Trophy,
  BarChart2,
  Brain,
  Shield,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  Filter,
  Users,
  Bell,
} from 'lucide-react-native';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import TransactionItem from '../components/TransactionItem';
import OverviewCard from '../components/OverviewCard';
import HomeScreenSkeleton from '../components/SkeletonLoader';
import FilterBottomSheet from '../components/FilterBottomSheet';
import UnknownTransactionModal from '../components/UnknownTransactionModal';
import ScanBillModal from '../components/ScanBillModal';
import SpendingChart from '../components/SpendingChart';
import CategoryChart from '../components/CategoryChart';
import { formatCurrency } from '../utils/formatters';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme';
import api from '../api/axios';

const QUICK_ACTIONS = [
  { id: 'scan', label: 'Scan Bill', icon: FileText, color: colors.primary },
  { id: 'family', label: 'Family', icon: Users, color: '#1E6BD6' },
  { id: 'gamification', label: 'Gamification', icon: Trophy, color: '#10B981' },
  { id: 'investments', label: 'Investments', icon: TrendingUp, color: '#6366F1' },
  { id: 'compare', label: 'Compare', icon: BarChart2, color: '#8B5CF6' },
  { id: 'ai', label: 'Ask AI', icon: Brain, color: '#1E6BD6' },
  { id: 'tax', label: 'Tax Advisor', icon: Shield, color: '#059669' },
];

const HomeScreen = () => {
  const navigation = useNavigation();
  const { data, loading: isLoading, error, totals, refreshData, filters, updateFilters } = useFinancial();
  const { user, logout } = useAuth();
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [unknownTransactions, setUnknownTransactions] = useState([]);
  const [isUnknownModalOpen, setIsUnknownModalOpen] = useState(false);

  // Derived data — same logic as web HomeView
  const transactions = useMemo(() => data?.transactions || [], [data]);
  const budgets = useMemo(() => data?.budgets || [], [data]);

  const overview = useMemo(() => {
    const expenseBudgets = budgets.filter(b => b.type === 'expense');
    const totalBudget = expenseBudgets.reduce((sum, b) => sum + b.amount, 0);
    const topCategory = data?.categoryBreakdown?.[0]?.name || 'N/A';

    return {
      totalExpenses: totals.expenses,
      totalIncome: totals.income,
      netSavings: totals.savings,
      totalBudget,
      topCategory,
      transactionCount: transactions.length,
    };
  }, [totals, data, budgets, transactions.length]);

  const handleScanSubmit = async (selectedFile, scanType) => {
    try {
      const formData = new FormData();
      formData.append('bill', { 
        uri: selectedFile.uri, 
        name: selectedFile.name, 
        type: selectedFile.type 
      });
      formData.append('scanType', scanType);

      const response = await api.post('/api/billscan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setIsScanModalOpen(false);
      await refreshData();

      // Check if statement scan returned unknown transaction categories
      if (response.data.type === 'statement' && response.data.transactions) {
        const unknown = response.data.transactions.filter(tx => tx.category === 'Unknown');
        if (unknown.length > 0) {
          setUnknownTransactions(unknown);
          setIsUnknownModalOpen(true);
          return;
        }
      } 
      
      // Check normal bill scan unknown categories
      if (response.data.unknownCategories && response.data.unknownCategories.length > 0) {
        setUnknownTransactions(response.data.unknownCategories);
        setIsUnknownModalOpen(true);
      } else {
        Alert.alert('Success', 'Document scanned and processed successfully!');
      }
    } catch (err) {
      console.error('Bill scan error:', err);
      throw err; // Let ScanBillModal catch it to show the error internally
    }
  };

  const handleUpdateUnknownCategory = async (txId, newCategory) => {
    try {
      await api.put(`/api/transactions/${txId}`, { category: newCategory });
      await refreshData();
      
      const remaining = unknownTransactions.filter(tx => tx._id !== txId);
      if (remaining.length <= 1) {
        setIsUnknownModalOpen(false);
      }
    } catch (err) {
      console.error("Failed to update category", err);
      Alert.alert('Update Failed', 'Could not categorize transaction. Please try again.');
    }
  };

  const handleActionPress = (actionId) => {
    if (actionId === 'scan') {
      setIsScanModalOpen(true);
    } else if (actionId === 'gamification') {
      navigation.navigate('Gamification');
    } else if (actionId === 'investments') {
      navigation.navigate('Investments');
    } else if (actionId === 'compare') {
      navigation.navigate('BudgetComparison');
    } else if (actionId === 'ai') {
      navigation.navigate('AgentChat');
    } else if (actionId === 'tax') {
      navigation.navigate('TaxOptimizer');
    } else if (actionId === 'family') {
      navigation.navigate('FamilyDashboard');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshData}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hello, {user?.username || 'there'} 👋
            </Text>
            <Text style={styles.headerSubtitle}>Here's your financial overview</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.filterButton} onPress={() => navigation.navigate('Notifications')}>
              <Bell size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterButton} onPress={() => setIsFilterVisible(true)}>
              <Filter size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions — ALWAYS VISIBLE */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsContent}
          style={styles.quickActionsScroll}
        >
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickAction}
              activeOpacity={0.7}
              onPress={() => handleActionPress(action.id)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: action.color + '12' }]}>
                <action.icon size={22} color={action.color} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Conditional Content: Skeleton, Error, or Data */}
        {isLoading && !data ? (
          <HomeScreenSkeleton />
        ) : error ? (
          <View style={styles.errorContainer}>
            <AlertTriangle size={48} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refreshData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Overview Cards */}
        <View style={styles.overviewGrid}>
          <View style={styles.overviewRow}>
            <View style={{ flex: 1 }}>
              <OverviewCard
                label="Total Income"
                value={formatCurrency(overview.totalIncome)}
                icon={TrendingUp}
                iconColor={colors.success}
                bgColor={colors.successLight}
              />
            </View>
            <View style={{ width: spacing.md }} />
            <View style={{ flex: 1 }}>
              <OverviewCard
                label="Total Expenses"
                value={formatCurrency(overview.totalExpenses)}
                icon={TrendingDown}
                iconColor={colors.error}
                bgColor={colors.errorLight}
              />
            </View>
          </View>
          <View style={[styles.overviewRow, { marginTop: spacing.md }]}>
            <View style={{ flex: 1 }}>
              <OverviewCard
                label="Net Savings"
                value={formatCurrency(overview.netSavings)}
                icon={Wallet}
                iconColor={colors.primary}
                bgColor={colors.primary + '08'}
              />
            </View>
            <View style={{ width: spacing.md }} />
            <View style={{ flex: 1 }}>
              <OverviewCard
                label="Top Category"
                value={overview.topCategory}
                icon={PieChart}
                iconColor="#8B5CF6"
                bgColor="#8B5CF608"
              />
            </View>
          </View>
        </View>

        {/* Charts Section */}
        <View style={styles.section}>
          <SpendingChart data={data?.trendData || []} />
          <CategoryChart data={data?.categoryBreakdown || []} title="Expense Categories" />
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Expenses</Text>
          {transactions.length > 0 ? (
            <>
              {transactions.slice(0, 10).map((tx) => (
                <TransactionItem key={tx._id} transaction={tx} />
              ))}
              {transactions.length > 10 && (
                <Text style={styles.moreText}>
                  Showing 10 of {transactions.length} transactions
                </Text>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No expenses recorded in this period.</Text>
            </View>
          )}
        </View>
      </>
    )}

    {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button for AI Agent */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('AgentChat')}
        activeOpacity={0.8}
      >
        <Brain size={24} color="#FFF" />
      </TouchableOpacity>

      <FilterBottomSheet
        visible={isFilterVisible}
        onClose={() => setIsFilterVisible(false)}
        currentFilters={filters}
        onApply={(newFilters) => updateFilters(newFilters)}
      />

      <ScanBillModal
        visible={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onScanSubmit={handleScanSubmit}
      />

      <UnknownTransactionModal
        visible={isUnknownModalOpen}
        onClose={() => {
          setIsUnknownModalOpen(false);
          refreshData();
        }}
        transactions={unknownTransactions}
        onUpdateCategory={handleUpdateUnknownCategory}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.base,
  },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.errorLight,
  },
  logoutText: {
    color: colors.error,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  quickActionsScroll: {
    marginTop: spacing.base,
    marginBottom: spacing.xl,
  },
  quickActionsContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  quickAction: {
    alignItems: 'center',
    width: 72,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickActionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  overviewGrid: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  overviewRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'stretch',
  },
  section: {
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.base,
  },
  moreText: {
    textAlign: 'center',
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.base,
  },
  emptyState: {
    padding: spacing['3xl'],
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
    marginTop: spacing.base,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
});

export default HomeScreen;
