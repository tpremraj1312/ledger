import React, { useMemo, useState, useRef, useEffect } from 'react';
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
  Dimensions,
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
  MessageSquare,
  ChevronRight,
} from 'lucide-react-native';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import TransactionItem from '../components/TransactionItem';
import OverviewCard from '../components/OverviewCard';
import HomeScreenSkeleton from '../components/SkeletonLoader';
import FilterBottomSheet from '../components/FilterBottomSheet';
import UnknownTransactionModal from '../components/UnknownTransactionModal';
import ScanBillModal from '../components/ScanBillModal';
import SpendingChart from '../components/SpendingChart';
import CategoryChart from '../components/CategoryChart';
import { formatCurrency } from '../utils/formatters';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';
import api from '../api/axios';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_CARD_WIDTH = SCREEN_WIDTH - 64;

// 8 Features in squares with light pastel backgrounds
const GRID_ACTIONS = [
  { id: 'scan', label: 'Bill Scan', icon: FileText, color: '#1E6BD6', bg: '#EFF6FF' },
  { id: 'investments', label: 'Investments', icon: TrendingUp, color: '#6366F1', bg: '#EEF2FF' },
  { id: 'compare', label: 'Compare', icon: BarChart2, color: '#8B5CF6', bg: '#F5F3FF' },
  { id: 'ai_analysis', label: 'AI Analysis', icon: Brain, color: '#10B981', bg: '#ECFDF5' },
  { id: 'gamification', label: 'Quests', icon: Trophy, color: '#F59E0B', bg: '#FFFBEB' },
  { id: 'family', label: 'Family', icon: Users, color: '#14B8A6', bg: '#F0FDFA' },
  { id: 'tax', label: 'Tax Advisor', icon: Shield, color: '#059669', bg: '#D1FAE5' },
  { id: 'sms', label: 'SMS Parser', icon: MessageSquare, color: '#EC4899', bg: '#FDF2F8' },
];

const CAROUSEL_ITEMS = [
  { id: '1', title: 'Smart Investments', subtitle: 'AI-powered portfolio planning', cta: 'Explore', route: 'Investments', icon: TrendingUp, accent: '#6366F1' },
  { id: '2', title: 'Tax Optimizer', subtitle: 'Maximize your tax savings', cta: 'Optimize', route: 'TaxOptimizer', icon: Shield, accent: '#059669' },
  { id: '3', title: 'AI Analysis', subtitle: 'Deep financial insights', cta: 'Analyze', route: 'AIAnalysis', icon: Brain, accent: '#1E6BD6' },
  { id: '4', title: 'Family Finance', subtitle: 'Track family budgets together', cta: 'Manage', route: 'FamilyDashboard', icon: Users, accent: '#14B8A6' },
  { id: '5', title: 'Finance Quests', subtitle: 'Complete gamified challenges', cta: 'Play Now', route: 'Gamification', icon: Trophy, accent: '#F59E0B' },
  { id: '6', title: 'Budget Compare', subtitle: 'See how you stack up', cta: 'Compare', route: 'BudgetComparison', icon: BarChart2, accent: '#8B5CF6' },
  { id: '7', title: 'SMS Parser', subtitle: 'Read bank SMS automatically', cta: 'Parse', route: 'Placeholder', icon: MessageSquare, accent: '#EC4899' },
];

const CarouselCard = React.memo(({ item, onPress }) => {
  const Icon = item.icon;
  return (
    <TouchableOpacity
      style={[styles.carouselCard, { borderLeftColor: item.accent, borderLeftWidth: 4 }]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.carouselContent}>
        <View style={{ flex: 1 }}>
          <Text style={styles.carouselTitle}>{item.title}</Text>
          <Text style={styles.carouselSubtitle}>{item.subtitle}</Text>
          <View style={[styles.carouselCta, { backgroundColor: item.accent + '12' }]}>
            <Text style={[styles.carouselCtaText, { color: item.accent }]}>{item.cta}</Text>
            <ChevronRight size={14} color={item.accent} />
          </View>
        </View>
        <View style={[styles.carouselIconBox, { backgroundColor: item.accent + '10' }]}>
          <Icon size={32} color={item.accent} />
        </View>
      </View>
    </TouchableOpacity>
  );
});

const HomeScreen = () => {
  const navigation = useNavigation();
  const { data, loading: isLoading, error, totals, refreshData, filters, updateFilters } = useFinancial();
  const { user, logout } = useAuth();

  const {
    hasGroup,
    group,
    familyFinancialData,
    financialLoading: isFamilyLoading,
    refreshFamilyFinancialData
  } = useFamily();

  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [unknownTransactions, setUnknownTransactions] = useState([]);
  const [isUnknownModalOpen, setIsUnknownModalOpen] = useState(false);

  const handleRefresh = async () => {
    await refreshData();
    if (hasGroup) {
      await refreshFamilyFinancialData();
    }
  };

  // Auto-scroll logic for Carousel
  const carouselRef = useRef(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const nextIndex = (currentSlideIndex + 1) % CAROUSEL_ITEMS.length;
      carouselRef.current?.scrollToOffset({
        offset: nextIndex * (CAROUSEL_CARD_WIDTH + 16),
        animated: true,
      });
      setCurrentSlideIndex(nextIndex);
    }, 4000); // Slide changes every 4 seconds

    return () => clearInterval(timer);
  }, [currentSlideIndex]);

  const onCarouselScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CAROUSEL_CARD_WIDTH + 16));
    if (index !== currentSlideIndex) {
      setCurrentSlideIndex(index);
    }
  };

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
    switch (actionId) {
      case 'scan': setIsScanModalOpen(true); break;
      case 'investments': navigation.navigate('Investments'); break;
      case 'compare': navigation.navigate('BudgetComparison'); break;
      case 'ai_analysis': navigation.navigate('AIAnalysis'); break;
      case 'gamification': navigation.navigate('Gamification'); break;
      case 'family': navigation.navigate('FamilyDashboard'); break;
      case 'tax': navigation.navigate('TaxOptimizer'); break;
      case 'sms': navigation.navigate('SMSParser'); break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isFamilyLoading}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Prominent Header (PhonePe Style) */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Hello, {user?.username || 'there'} 👋</Text>
              <Text style={styles.headerSubtitle}>Here's your financial overview</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Notifications')}>
                <Bell size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={() => setIsFilterVisible(true)}>
                <Filter size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Feature Discovery Carousel in Header Banner */}
          <FlatList
            ref={carouselRef}
            data={CAROUSEL_ITEMS}
            horizontal
            pagingEnabled={false}
            snapToInterval={CAROUSEL_CARD_WIDTH + 16}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 32 }}
            keyExtractor={(item) => item.id}
            onScroll={onCarouselScroll}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <CarouselCard item={item} onPress={() => navigation.navigate(item.route)} />
            )}
          />
        </View>

        {/* 2x4 Grid Actions (Square Cards) */}
        <View style={styles.gridSection}>
          <Text style={styles.gridSectionTitle}>Services</Text>
          <View style={styles.gridContainer}>
            {GRID_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.gridItem}
                activeOpacity={0.7}
                onPress={() => handleActionPress(action.id)}
              >
                <View style={[styles.gridIconSquare, { backgroundColor: action.bg }]}>
                  <action.icon size={26} color={action.color} />
                </View>
                <Text style={styles.gridLabel} numberOfLines={2}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

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

            {/* Family Overview Card (if in group) */}
            {hasGroup && (
              <View style={styles.familyCard}>
                <View style={styles.familyHeader}>
                  <Users size={18} color={colors.primary} />
                  <Text style={styles.familyTitle}>{group?.name} Family</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('FamilyDashboard')}>
                    <Text style={styles.familyLink}>View Dashboard</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.familyStatsRow}>
                  <View style={styles.familyStat}>
                    <Text style={styles.familyStatLabel}>Total Expenses</Text>
                    <Text style={[styles.familyStatValue, { color: colors.error }]}>
                      {formatCurrency(familyFinancialData?.totalExpense)}
                    </Text>
                  </View>
                  <View style={styles.familyDivider} />
                  <View style={styles.familyStat}>
                    <Text style={styles.familyStatLabel}>Total Income</Text>
                    <Text style={[styles.familyStatValue, { color: colors.success }]}>
                      {formatCurrency(familyFinancialData?.totalIncome)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

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

      {/* Removed FAB since it's now in the Bottom Tab Bar */}

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
    backgroundColor: '#1E6BD6',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl, // Increased bottom padding for carousel
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: '500', // Removed bold
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: '#e0e7ff',
    marginTop: spacing.xs,
    fontWeight: '400',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  logoutText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '500', // Removed bold
  },

  // Carousel Styles
  carouselCard: {
    width: CAROUSEL_CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginRight: 16,
    marginTop: 8,
    ...shadows.sm,
  },
  carouselContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  carouselTitle: {
    fontSize: 16,
    fontWeight: '500', // Removed bold
    color: colors.textPrimary,
  },
  carouselSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  carouselCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  carouselCtaText: {
    fontSize: 13,
    fontWeight: '500', // Removed bold
    marginRight: 4,
  },
  carouselIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },

  // Grid Styles
  gridSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    marginTop: 8,
  },
  gridSectionTitle: {
    fontSize: 18,
    fontWeight: '500', // Removed bold
    color: colors.textPrimary,
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 24,
  },
  gridIconSquare: {
    width: 60,
    height: 60,
    borderRadius: 18, // Squared with rounded corners
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '500', // Removed bold
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 14,
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
    fontWeight: '500', // Removed bold
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
    fontWeight: '400',
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
    fontWeight: '500', // Removed bold
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
    fontWeight: '500', // Removed bold
  },

  // Family Card
  familyCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    backgroundColor: '#EEF2FF', // Very light primary-tinted background
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  familyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  familyTitle: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  familyLink: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.primary,
  },
  familyStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  familyStat: {
    flex: 1,
    alignItems: 'center',
  },
  familyStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  familyStatValue: {
    fontSize: fontSize.lg,
    fontWeight: '500', // Removed bold
    color: colors.textPrimary,
  },
  familyDivider: {
    width: 1,
    height: '100%',
    backgroundColor: colors.border,
  },
});

export default HomeScreen;
