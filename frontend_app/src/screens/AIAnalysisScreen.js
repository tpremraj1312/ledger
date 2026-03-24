import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Filter,
  RefreshCcw,
  Brain,
  PieChart as PieChartIcon,
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme';
import api from '../api/axios';

import AnalysisCard from '../components/AIAnalysis/AnalysisCard';
import FilterBottomSheet from '../components/FilterBottomSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CACHE_KEY = '@ledger_ai_analysis_cache';

const AIAnalysisScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [categories, setCategories] = useState(['All']);
  const [analysis, setAnalysis] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: 'All',
  });

  // Init dates and load cached data
  useEffect(() => {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const initialFilters = {
      startDate: lastMonth.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      category: 'All',
    };
    setFilters(initialFilters);

    const initialize = async () => {
      try {
        // Load from cache first
        const cachedData = await AsyncStorage.getItem(CACHE_KEY);
        if (cachedData) {
          try {
            setAnalysis(JSON.parse(cachedData));
          } catch (e) {
            console.error('Failed to parse cached AI Analysis:', e);
          }
        }

        // Fetch categories for filtering
        const [txRes, budgetRes] = await Promise.all([
          api.get('/api/transactions', { params: { type: 'all', limit: 500 } }),
          api.get('/api/budgets'),
        ]);

        const txCats = (txRes.data.transactions || []).map(t => t.category).filter(Boolean);
        const budgetCats = (budgetRes.data || []).map(b => b.category).filter(Boolean);
        const uniqueCats = ['All', ...new Set([...txCats, ...budgetCats])].sort();
        setCategories(uniqueCats);
      } catch (err) {
        console.error('Failed to initialize AI Analysis:', err);
      }
    };

    initialize();
  }, []);

  const generateAnalysis = async (showRefresh = false) => {
    if (!filters.startDate) return;

    if (showRefresh) setIsRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const params = {
        ...filters,
        category: filters.category === 'All' ? undefined : filters.category,
      };

      const response = await api.get('/api/ai-analysis', { params });
      const analysisData = response.data.analysis;

      setAnalysis(analysisData);

      // Save to cache
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(analysisData));
    } catch (err) {
      console.error('AI Analysis generation error:', err);
      setError('Intelligence core unavailable. Check connection and retry.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      startDate: newFilters.startDate || prev.startDate,
      endDate: newFilters.endDate || prev.endDate,
      category: newFilters.category || 'All',
    }));
  };

  const onRefresh = useCallback(() => {
    generateAnalysis(true);
  }, [filters]);

  // BUG FIX: analysis?.budgetVsExpenses might not be a string (or null)
  // Ensure we check for string type before calling .includes()
  const isDefaultAnalysis = typeof analysis?.budgetVsExpenses === 'string' &&
    analysis.budgetVsExpenses.includes('No expenses or budgets found');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Intelligence</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setIsFilterVisible(true)}
          activeOpacity={0.7}
        >
          <Filter size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Core Intelligence Hero */}
        <View style={styles.heroSection}>
          <View style={styles.heroRow}>
            <View style={styles.brainIconBox}>
              <Brain size={24} color={colors.primary} />
            </View>
            <View style={styles.heroTextContent}>
              <Text style={styles.heroTitle}>Financial Insight Engine</Text>
              <Text style={styles.heroSubtitle}>Analyzing trends across your accounts</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.mainGenerateBtn, loading && styles.btnLoading]}
            onPress={() => generateAnalysis()}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <Sparkles size={18} color={colors.white} />
                <Text style={styles.mainGenerateText}>
                  {analysis ? 'Regenerate Analysis' : 'Run Full Analysis'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <AlertTriangle size={20} color={colors.error} />
            <Text style={styles.errorCardText}>{error}</Text>
          </View>
        )}

        {/* Content Area */}
        {analysis && !loading ? (
          isDefaultAnalysis ? (
            <View style={styles.emptyStateContainer}>
              <View style={styles.alertIconWrapper}>
                <AlertTriangle size={32} color={colors.textSecondary} />
              </View>
              <Text style={styles.emptyHeader}>Minimal Activity</Text>
              <Text style={styles.emptyDetail}>
                More data is needed for the selected period to generate deep behavioral insights.
              </Text>
            </View>
          ) : (
            <View style={styles.resultsWrapper}>

              {/* 1. Fiscal Summary */}
              <AnalysisCard title="Fiscal Summary" icon={PieChartIcon}>
                <Text style={styles.infoNarrative}>{analysis.budgetVsExpenses}</Text>

                {analysis.visualizationData?.expenseBreakdown?.length > 0 && (
                  <View style={styles.chartBox}>
                    <Text style={styles.chartHeading}>Distribution</Text>
                    <PieChart
                      data={analysis.visualizationData.expenseBreakdown.map((item, index) => ({
                        name: item.category.length > 10 ? item.category.substring(0, 10) + '..' : item.category,
                        population: Number(item.percentage) || 1,
                        color: [colors.primary, '#6366F1', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'][index % 6],
                        legendFontColor: colors.textSecondary,
                        legendFontSize: 11
                      }))}
                      width={SCREEN_WIDTH - spacing.lg * 3}
                      height={180}
                      chartConfig={{ color: (opacity = 1) => `rgba(0,0,0,${opacity})` }}
                      accessor={"population"}
                      backgroundColor={"transparent"}
                      paddingLeft={"0"}
                      absolute
                    />
                  </View>
                )}
              </AnalysisCard>

              {/* 2. Spending Velocity */}
              <AnalysisCard title="Spending Velocity" icon={TrendingUp}>
                <Text style={styles.infoNarrative}>{analysis.spendingPatterns}</Text>

                {analysis.visualizationData?.weeklySpending?.length > 0 && (
                  <View style={styles.chartBox}>
                    <Text style={styles.chartHeading}>Weekly Momentum</Text>
                    <LineChart
                      data={{
                        labels: analysis.visualizationData.weeklySpending.map(w => {
                          const parts = w.weekStart.split('-');
                          return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : w.weekStart.substring(5);
                        }),
                        datasets: [
                          {
                            data: analysis.visualizationData.weeklySpending.map(w => Number(w.amount) || 0),
                            color: (opacity = 1) => colors.primary
                          }
                        ]
                      }}
                      width={SCREEN_WIDTH - spacing.lg * 3}
                      height={180}
                      chartConfig={{
                        backgroundColor: colors.white,
                        backgroundGradientFrom: colors.white,
                        backgroundGradientTo: colors.white,
                        decimalPlaces: 0,
                        color: (opacity = 1) => colors.primary,
                        labelColor: (opacity = 1) => colors.textSecondary,
                        propsForDots: { r: '4', strokeWidth: '2', stroke: colors.white },
                        propsForBackgroundLines: { strokeDasharray: '', stroke: colors.border }
                      }}
                      bezier
                      style={{ marginVertical: 8, borderRadius: 12 }}
                      withInnerLines={false}
                      withOuterLines={false}
                    />
                  </View>
                )}
              </AnalysisCard>

              {/* 3. AI Recommendations */}
              <AnalysisCard title="AI Recommendations" icon={Lightbulb}>
                <Text style={styles.infoNarrative}>{analysis.recommendations}</Text>

                <View style={styles.tipStack}>
                  {['Optimize Discretionary Spending', 'Automate Savings Goals', 'Monitor Large Transfers'].map((tip, idx) => (
                    <View key={idx} style={styles.tipCard}>
                      <CheckCircle2 size={16} color={colors.primary} />
                      <Text style={styles.tipLabelText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              </AnalysisCard>

            </View>
          )
        ) : !loading && (
          <View style={styles.notStartedState}>
            <View style={styles.notStartedIcon}>
              <Sparkles size={40} color={colors.gray400} />
            </View>
            <Text style={styles.notStartedTitle}>No Analysis Prepared</Text>
            <Text style={styles.notStartedSubtitle}>
              Run the analysis engine to see your personalized financial insights.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <FilterBottomSheet
        visible={isFilterVisible}
        onClose={() => setIsFilterVisible(false)}
        currentFilters={filters}
        categories={categories}
        onApply={handleApplyFilters}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    marginLeft: -spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  filterButton: {
    padding: spacing.xs,
    marginRight: -spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  heroSection: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  brainIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  heroTextContent: {
    flex: 1,
  },
  heroTitle: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  heroSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '400',
  },
  mainGenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  btnLoading: {
    opacity: 0.6,
  },
  mainGenerateText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  errorCardText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: '400',
  },
  resultsWrapper: {
    gap: 0,
  },
  infoNarrative: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 22,
    fontWeight: '400',
  },
  chartBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  chartHeading: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  tipStack: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  tipLabelText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing.xl,
  },
  alertIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyHeader: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyDetail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400',
  },
  notStartedState: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
  },
  notStartedIcon: {
    marginBottom: spacing.lg,
  },
  notStartedTitle: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  notStartedSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '400',
  },
});

export default AIAnalysisScreen;
