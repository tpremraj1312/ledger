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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Filter,
  Brain,
  PieChart as PieChartIcon,
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  WifiOff,
} from 'lucide-react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme';
import api from '../api/axios';

import AnalysisCard from '../components/AIAnalysis/AnalysisCard';
import FilterBottomSheet from '../components/FilterBottomSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CACHE_KEY = '@ledger_ai_analysis_cache';

// ─── Safe helpers ────────────────────────────────────────────────────────────

/** Safely access a field and return a string, or a fallback. */
const safeStr = (val, fallback = '') =>
  typeof val === 'string' ? val : fallback;

/** Safely access an array, always returning an array. */
const safeArr = (val) => (Array.isArray(val) ? val : []);

/** Safely parse a week label from "YYYY-MM-DD" format. */
const weekLabel = (weekStart) => {
  if (!weekStart || typeof weekStart !== 'string') return '?';
  const parts = weekStart.split('-');
  return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : weekStart.substring(0, 5);
};

const CHART_COLORS = [colors.primary, '#6366F1', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

const AIAnalysisScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [categories, setCategories] = useState(['All']);
  const [analysis, setAnalysis] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [renderError, setRenderError] = useState(false);

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
        const cachedData = await AsyncStorage.getItem(CACHE_KEY);
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            if (parsed && typeof parsed === 'object') {
              // Check if we have an inner 'data' or if it's the direct object
              const actualData = parsed.data || parsed;
              setAnalysis(actualData);
              if (parsed.timestamp) setLastUpdated(new Date(parsed.timestamp));
            }
          } catch (e) {
            console.error('Failed to parse cached AI Analysis:', e);
          }
        }

        const [txRes, budgetRes] = await Promise.all([
          api.get('/api/transactions', { params: { type: 'all', limit: 500 } }),
          api.get('/api/budgets'),
        ]).catch(() => [ { data: { transactions: [] } }, { data: [] } ]);

        const txCats = safeArr(txRes.data?.transactions).map(t => t.category).filter(Boolean);
        const budgetCats = safeArr(budgetRes.data).map(b => b.category).filter(Boolean);
        const uniqueCats = ['All', ...new Set([...txCats, ...budgetCats])].sort();
        setCategories(uniqueCats);
      } catch (err) {
        console.error('Failed to initialize AI Analysis:', err);
      }
    };

    initialize();
  }, []);

  /** 
   * Validates if a piece of analysis data is "useful" 
   * (i.e. not the default or empty strings).
   */
  const isDataUseful = (data) => {
    if (!data) return false;
    const text = safeStr(data.budgetVsExpenses);
    if (!text || text.length < 10) return false;
    if (text.includes('No expenses or budgets found')) return false;
    return true;
  };

  const generateAnalysis = async (showRefresh = false) => {
    if (!filters.startDate) return;

    setRenderError(false);
    if (showRefresh) setIsRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = {
        ...filters,
        category: filters.category === 'All' ? undefined : filters.category,
      };

      const response = await api.get('/api/ai-analysis', { params });
      const raw = response.data;
      
      // The backend returns { analysis: { ... } }
      let analysisData = raw?.analysis || raw;

      if (!analysisData || typeof analysisData !== 'object') {
        throw new Error('Invalid response from AI engine.');
      }

      // ─── CACHE LOGIC UPDATE ────────────────────────────────────────────────
      // Only overwrite the state and cache if we got actual useful analysis.
      // If we got "No data", and we ALREADY have old valid data in state/cache,
      // we might prefer to keep the old data visible but show a warning.
      
      const newlyFetchedIsUseful = isDataUseful(analysisData);
      const existingIsUseful = isDataUseful(analysis);

      if (newlyFetchedIsUseful || !existingIsUseful) {
        setAnalysis(analysisData);
        const now = new Date();
        setLastUpdated(now);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
          data: analysisData,
          timestamp: now.getTime()
        }));
      } else {
        // We got "No data" but we have old valid data. 
        // We'll keep the old data but maybe show a subtle hint.
        setError('New analysis found minimal activity; showing previous insights.');
      }
      
    } catch (err) {
      console.error('AI Analysis generation error:', err);
      setError('Intelligence core unavailable. Check connection and retry.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleApplyFilters = (newFilters) => {
    const updated = {
      ...filters,
      startDate: newFilters.startDate || filters.startDate,
      endDate: newFilters.endDate || filters.endDate,
      category: newFilters.category || 'All',
    };
    setFilters(updated);
  };

  // Re-run analysis when filters change if we already have an analysis
  useEffect(() => {
    if (analysis && (filters.startDate || filters.endDate || filters.category)) {
      // Avoid auto-refreshing on mount by checking if analysis is already there
    }
  }, [filters]);

  const onRefresh = useCallback(() => {
    generateAnalysis(true);
  }, [filters, analysis]);



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
              <Text style={styles.heroSubtitle}>
                {lastUpdated 
                  ? `Last updated: ${lastUpdated.toLocaleDateString()} ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Analyzing trends across your accounts'}
              </Text>
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
          <View style={[styles.errorBanner, error.includes('showing previous') && styles.warningBanner]}>
            {error.includes('showing previous') ? (
              <WifiOff size={18} color={colors.warning} />
            ) : (
              <AlertTriangle size={20} color={colors.error} />
            )}
            <Text style={[styles.errorCardText, error.includes('showing previous') && styles.warningText]}>
              {error}
            </Text>
          </View>
        )}

        {/* Content Area */}
        {loading && !analysis ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.centeredText}>Generating insights...</Text>
          </View>
        ) : renderError ? (
          <View style={styles.centeredState}>
            <AlertTriangle size={36} color={colors.error} />
            <Text style={[styles.centeredTitle, { color: colors.error }]}>Render Error</Text>
            <Text style={styles.centeredText}>Could not display results. Try regenerating.</Text>
          </View>
        ) : analysis ? (
          (() => {
            // Determine empty state
            const budgetText = safeStr(analysis.budgetVsExpenses);
            const isDefaultAnalysis = budgetText.includes('No expenses or budgets found');
            const expenseBreakdown = safeArr(analysis.visualizationData?.expenseBreakdown).filter(
              d => d && typeof d.category === 'string' && Number(d.percentage) > 0
            );
            const weeklySpending = safeArr(analysis.visualizationData?.weeklySpending).filter(
              d => d && weekLabel(d.weekStart) !== '?'
            );

            if (isDefaultAnalysis) {
              return (
                <View style={styles.emptyStateContainer}>
                  <View style={styles.alertIconWrapper}>
                    <AlertTriangle size={32} color={colors.textSecondary} />
                  </View>
                  <Text style={styles.emptyHeader}>Minimal Activity</Text>
                  <Text style={styles.emptyDetail}>
                    More data is needed for the selected period to generate deep behavioral insights.
                  </Text>
                </View>
              );
            }

            return (
              <View style={styles.resultsWrapper}>
                {/* 1. Fiscal Summary */}
                <AnalysisCard title="Fiscal Summary" icon={PieChartIcon}>
                  <Text style={styles.infoNarrative}>{budgetText || 'No summary available.'}</Text>

                  {expenseBreakdown.length > 0 && (
                    <View style={styles.chartBox}>
                      <Text style={styles.chartHeading}>Distribution</Text>
                      <PieChart
                        data={expenseBreakdown.map((item, index) => ({
                          name: item.category.length > 10
                            ? item.category.substring(0, 10) + '..'
                            : item.category,
                          population: Number(item.percentage) || 1,
                          color: CHART_COLORS[index % CHART_COLORS.length],
                          legendFontColor: colors.textSecondary,
                          legendFontSize: 11,
                        }))}
                        width={SCREEN_WIDTH - spacing.lg * 3}
                        height={180}
                        chartConfig={{ color: (opacity = 1) => `rgba(0,0,0,${opacity})` }}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="0"
                        absolute
                      />
                    </View>
                  )}
                </AnalysisCard>

                {/* 2. Spending Velocity */}
                <AnalysisCard title="Spending Velocity" icon={TrendingUp}>
                  <Text style={styles.infoNarrative}>
                    {safeStr(analysis.spendingPatterns, 'No spending pattern data available.')}
                  </Text>

                  {weeklySpending.length > 0 && (
                    <View style={styles.chartBox}>
                      <Text style={styles.chartHeading}>Weekly Momentum</Text>
                      <LineChart
                        data={{
                          labels: weeklySpending.map(w => weekLabel(w.weekStart)),
                          datasets: [{
                            data: weeklySpending.map(w => Math.max(0, Number(w.amount) || 0)),
                            color: () => colors.primary,
                          }],
                        }}
                        width={SCREEN_WIDTH - spacing.lg * 3}
                        height={180}
                        chartConfig={{
                          backgroundColor: colors.white,
                          backgroundGradientFrom: colors.white,
                          backgroundGradientTo: colors.white,
                          decimalPlaces: 0,
                          color: (opacity = 1) => colors.primary,
                          labelColor: () => colors.textSecondary,
                          propsForDots: { r: '4', strokeWidth: '2', stroke: colors.white },
                          propsForBackgroundLines: { strokeDasharray: '', stroke: colors.border },
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
                  <Text style={styles.infoNarrative}>
                    {safeStr(analysis.recommendations, 'No recommendations available.')}
                  </Text>

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
            );
          })()
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
  warningBanner: {
    backgroundColor: '#FFFBEB', // amber-50
    borderColor: '#FDE68A',     // amber-200
    borderWidth: 1,
  },
  warningText: {
    color: '#B45309', // amber-700
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
  centeredState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  centeredTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  centeredText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '400',
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
