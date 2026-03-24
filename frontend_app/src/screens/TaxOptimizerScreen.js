import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Shield, TrendingUp, Zap, Target, Calculator,
  Sparkles, CheckCircle2, ChevronRight, AlertTriangle,
  ArrowDownRight, DollarSign, PiggyBank, BarChart3, RefreshCcw,
  BookOpen, MessageCircle, AlertCircle, ArrowUpRight, Lightbulb
} from 'lucide-react-native';
import { BarChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';

import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme';
import { formatCurrency } from '../utils/formatters';
import taxService from '../services/taxService';

import { TaxOptimizerScreenSkeleton } from '../components/SkeletonLoader';
import Header from '../components/ui/Header';
import ScoreGauge from '../components/tax/ScoreGauge';
import DeductionBar from '../components/tax/DeductionBar';
import SimulatorModal from '../components/tax/SimulatorModal';
import TaxSummaryCard from '../components/tax/TaxSummaryCard';
import RecommendationCard from '../components/tax/RecommendationCard';
import ActionItemCard from '../components/tax/ActionItemCard';
import PatternInsightCard from '../components/tax/PatternInsightCard';

const { width } = Dimensions.get('window');

const TaxOptimizerScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [simOpen, setSimOpen] = useState(false);
  const [simRec, setSimRec] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await taxService.getFullAnalysis();
      setData(result);
    } catch (err) {
      setError('Failed to load tax intelligence. Pull to refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error && !data) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <AlertTriangle size={48} color={colors.error} />
        <Text style={[styles.loadingText, { color: colors.error, marginTop: 16 }]}>{error}</Text>
        <TouchableOpacity style={styles.retryBtnLarge} onPress={fetchData}>
          <Text style={styles.retryBtnText}>Retry Analysis</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.container}>
        <TaxOptimizerScreenSkeleton />
      </SafeAreaView>
    );
  }

  const regimeData = {
    labels: ['Old', 'New'],
    datasets: [{
      data: [
        data?.taxLiability?.oldRegime?.total || 0,
        data?.taxLiability?.newRegime?.total || 0
      ]
    }]
  };

  const ai = data?.aiInsights || {};
  const patternInsights = data?.patternInsights || [];
  const currentBestTax = Math.min(
    data?.taxLiability?.oldRegime?.total || 0,
    data?.taxLiability?.newRegime?.total || 0
  );
  const afterOptimizationTax = Math.max(0, currentBestTax - (data?.totalPotentialSaving || 0));
  const highCount = (data?.recommendations || []).filter(r => r.priority === 'high').length;

  return (
    <SafeAreaView style={styles.container}>
      {/* ─── Header ─── */}
      <Header
        title="Tax Optimizer"
        subtitle={data?.fyLabel || 'FY 2024-25'}
        rightElement={
          <View style={styles.headerRight}>
            {highCount > 0 && (
              <View style={styles.highBadge}>
                <View style={styles.highDot} />
                <Text style={styles.highBadgeText}>{highCount} High</Text>
              </View>
            )}
            <TouchableOpacity onPress={fetchData} style={styles.refreshBtn}>
              <RefreshCcw size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} colors={[colors.primary]} />
        }
      >
        {/* ─── 1. Score & Potential Savings Hero ─── */}
        <View style={styles.heroSection}>
          <View style={styles.scoreContainer}>
            <ScoreGauge score={data?.optimizationScore || 0} />
            <Text style={styles.scoreMessage}>
              {data?.optimizationScore >= 70 ? '🎉 Excellent Optimization' : '💡 Room to Optimize'}
            </Text>
          </View>

          <View style={styles.savingsBanner}>
            <View style={styles.savingsHeader}>
              <Sparkles size={14} color={colors.white} />
              <Text style={styles.savingsTitle}>Potential Additional Savings</Text>
            </View>
            <Text style={styles.savingsValue}>{formatCurrency(data?.totalPotentialSaving || 0)}</Text>
            <Text style={styles.savingsSub}>
              {data?.recommendations?.length || 0} actionable insights detected
            </Text>
          </View>
        </View>

        {/* ─── 2. Summary Stats (4 cards) ─── */}
        <View style={styles.statsGrid}>
          <TaxSummaryCard
            label="Annual Income"
            value={formatCurrency(data?.income?.total)}
            sub={`${data?.income?.sourceCount || 0} Sources`}
            icon={<DollarSign size={12} color="#1E6BD6" />}
            color="#1E6BD6"
            bgColor="#F0F7FF"
          />
          <TaxSummaryCard
            label="Expenses"
            value={formatCurrency(data?.expenses?.total)}
            sub={`${data?.expenses?.categoryCount || 0} Categories`}
            icon={<ArrowDownRight size={12} color="#E11D48" />}
            color="#E11D48"
            bgColor="#FFF1F2"
          />
        </View>
        <View style={styles.statsGrid}>
          <TaxSummaryCard
            label="Investments"
            value={formatCurrency(data?.investments?.total)}
            sub={`${data?.investments?.count || 0} Instruments`}
            icon={<Target size={12} color="#10B981" />}
            color="#10B981"
            bgColor="#F0FDF4"
          />
          <TaxSummaryCard
            label="Savings Rate"
            value={`${data?.savingsRate || 0}%`}
            sub={
              (data?.savingsRate || 0) >= 30 ? 'Healthy' :
              (data?.savingsRate || 0) >= 15 ? 'Room to improve' : 'Needs attention'
            }
            icon={<PiggyBank size={12} color={
              (data?.savingsRate || 0) >= 30 ? '#10B981' :
              (data?.savingsRate || 0) >= 15 ? '#D97706' : '#DC2626'
            } />}
            color={
              (data?.savingsRate || 0) >= 30 ? '#10B981' :
              (data?.savingsRate || 0) >= 15 ? '#D97706' : '#DC2626'
            }
            bgColor={
              (data?.savingsRate || 0) >= 30 ? '#F0FDF4' :
              (data?.savingsRate || 0) >= 15 ? '#FFFBEB' : '#FEF2F2'
            }
          />
        </View>

        {/* ─── 3. Tax Liability + Potential Savings ─── */}
        <View style={styles.liabilityRow}>
          <View style={styles.liabilityCard}>
            <View style={styles.liabilityHeader}>
              <Calculator size={13} color="#D97706" />
              <Text style={styles.liabilityLabel}>Est. Tax Liability</Text>
            </View>
            <Text style={styles.liabilityValue}>{formatCurrency(currentBestTax)}</Text>
            <Text style={styles.liabilitySub}>
              Under {data?.taxLiability?.recommendedRegime}
            </Text>
          </View>
          <View style={[styles.liabilityCard, styles.savingsCard]}>
            <View style={styles.liabilityHeader}>
              <Sparkles size={13} color={colors.white} />
              <Text style={[styles.liabilityLabel, { color: 'rgba(255,255,255,0.8)' }]}>
                Can Save
              </Text>
            </View>
            <Text style={[styles.liabilityValue, { color: colors.white }]}>
              {formatCurrency(data?.totalPotentialSaving || 0)}
            </Text>
            <Text style={[styles.liabilitySub, { color: 'rgba(255,255,255,0.6)' }]}>
              {data?.recommendations?.length || 0} recommendations
            </Text>
          </View>
        </View>

        {/* ─── 4. Regime Comparison ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BarChart3 size={16} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>Regime Comparison</Text>
          </View>
          <View style={styles.chartCard}>
            <Text style={styles.regimeAdvice}>
              Recommended:{' '}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {data?.taxLiability?.recommendedRegime}
              </Text>
              {data?.taxLiability?.savingByChoosingRecommended > 0 &&
                ` (saves ${formatCurrency(data.taxLiability.savingByChoosingRecommended)})`
              }
            </Text>
            <BarChart
              data={regimeData}
              width={width - 56}
              height={180}
              yAxisLabel="₹"
              chartConfig={{
                backgroundColor: colors.white,
                backgroundGradientFrom: colors.white,
                backgroundGradientTo: colors.white,
                color: (opacity = 1) => `rgba(30, 107, 214, ${opacity})`,
                labelColor: () => colors.textSecondary,
                barPercentage: 0.6,
                decimalPlaces: 0,
              }}
              style={styles.chart}
              fromZero
              showValuesOnTopOfBars
            />

            {/* Detailed regime breakdown */}
            {[
              { label: 'Old Regime', d: data?.taxLiability?.oldRegime, rec: data?.taxLiability?.recommendedRegime === 'Old Regime' },
              { label: 'New Regime', d: data?.taxLiability?.newRegime, rec: data?.taxLiability?.recommendedRegime === 'New Regime' },
            ].map(r => (
              <View key={r.label} style={[
                styles.regimeDetail,
                r.rec && styles.regimeDetailRecommended
              ]}>
                <View style={styles.regimeDetailHeader}>
                  <Text style={styles.regimeDetailLabel}>{r.label}</Text>
                  {r.rec && (
                    <View style={styles.bestBadge}>
                      <CheckCircle2 size={9} color="#0D9488" />
                      <Text style={styles.bestBadgeText}>Best</Text>
                    </View>
                  )}
                </View>
                <View style={styles.regimeDetailGrid}>
                  <View style={styles.regimeDetailItem}>
                    <Text style={styles.regimeDetailItemLabel}>Taxable</Text>
                    <Text style={styles.regimeDetailItemValue}>{formatCurrency(r.d?.taxableIncome)}</Text>
                  </View>
                  <View style={styles.regimeDetailItem}>
                    <Text style={styles.regimeDetailItemLabel}>Tax</Text>
                    <Text style={styles.regimeDetailItemValue}>{formatCurrency(r.d?.tax)}</Text>
                  </View>
                  <View style={styles.regimeDetailItem}>
                    <Text style={styles.regimeDetailItemLabel}>Total</Text>
                    <Text style={styles.regimeDetailItemValue}>{formatCurrency(r.d?.total)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ─── 5. Deduction Utilization ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Zap size={16} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>Deduction Utilization</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.deductionSummary}>
              <Text style={styles.deductionSummaryLabel}>Total Used</Text>
              <Text style={styles.deductionSummaryValue}>
                {formatCurrency(data?.deductions?.total)} / {formatCurrency(data?.deductions?.totalPossible)}
              </Text>
            </View>
            {data?.deductions?.sections?.map((sec) => (
              <DeductionBar
                key={sec.sectionKey}
                label={sec.section}
                claimed={sec.claimed}
                limit={sec.limit}
                percentage={sec.percentage}
              />
            ))}
          </View>
        </View>

        {/* ─── 6. Pattern Insights ─── */}
        {patternInsights.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Lightbulb size={16} color="#7C3AED" />
              <Text style={styles.sectionTitle}>Detected Opportunities</Text>
            </View>
            <View style={styles.patternContainer}>
              <Text style={styles.patternSub}>
                {patternInsights.length} optimization(s) from your spending
              </Text>
              {patternInsights.map(p => (
                <PatternInsightCard key={p.id} insight={p} />
              ))}
            </View>
          </View>
        )}

        {/* ─── 7. AI Insights ─── */}
        {ai.overallAssessment && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Sparkles size={16} color="#7C3AED" />
              <Text style={styles.sectionTitle}>AI Tax Insights</Text>
            </View>
            <View style={styles.card}>
              {/* Overall Assessment */}
              <View style={styles.aiAssessment}>
                <Text style={styles.aiAssessmentText}>{ai.overallAssessment}</Text>
              </View>

              {/* Strengths */}
              {ai.strengths?.length > 0 && (
                <View style={styles.aiBlock}>
                  <View style={[styles.aiBlockHeader, { backgroundColor: '#ECFDF5' }]}>
                    <CheckCircle2 size={11} color="#059669" />
                    <Text style={[styles.aiBlockTitle, { color: '#059669' }]}>
                      What You're Doing Well
                    </Text>
                  </View>
                  <View style={styles.aiBlockContent}>
                    {ai.strengths.map((s, i) => (
                      <View key={i} style={styles.aiListItem}>
                        <Text style={[styles.aiDot, { color: '#10B981' }]}>•</Text>
                        <Text style={[styles.aiListText, { color: '#065F46' }]}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Improvements */}
              {ai.improvements?.length > 0 && (
                <View style={styles.aiBlock}>
                  <View style={[styles.aiBlockHeader, { backgroundColor: '#FFFBEB' }]}>
                    <ArrowUpRight size={11} color="#D97706" />
                    <Text style={[styles.aiBlockTitle, { color: '#D97706' }]}>
                      Areas to Improve
                    </Text>
                  </View>
                  <View style={styles.aiBlockContent}>
                    {ai.improvements.map((s, i) => (
                      <View key={i} style={styles.aiListItem}>
                        <Text style={[styles.aiDot, { color: '#D97706' }]}>•</Text>
                        <Text style={[styles.aiListText, { color: '#92400E' }]}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Income & Expense Insights */}
              {ai.incomeInsights && (
                <View style={[styles.aiInfoBox, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}>
                  <View style={styles.aiInfoHeader}>
                    <DollarSign size={10} color="#1E6BD6" />
                    <Text style={[styles.aiInfoLabel, { color: '#1E6BD6' }]}>Income Analysis</Text>
                  </View>
                  <Text style={[styles.aiInfoText, { color: '#1E40AF' }]}>{ai.incomeInsights}</Text>
                </View>
              )}
              {ai.expenseInsights && (
                <View style={[styles.aiInfoBox, { backgroundColor: '#FFF1F2', borderColor: '#FFE4E6' }]}>
                  <View style={styles.aiInfoHeader}>
                    <ArrowDownRight size={10} color="#E11D48" />
                    <Text style={[styles.aiInfoLabel, { color: '#E11D48' }]}>Expense Analysis</Text>
                  </View>
                  <Text style={[styles.aiInfoText, { color: '#9F1239' }]}>{ai.expenseInsights}</Text>
                </View>
              )}

              {/* Regime Advice */}
              {ai.regimeAdvice && (
                <View style={[styles.aiInfoBox, { backgroundColor: '#F0FDFA', borderColor: '#CCFBF1' }]}>
                  <View style={styles.aiInfoHeader}>
                    <Shield size={10} color="#0D9488" />
                    <Text style={[styles.aiInfoLabel, { color: '#0D9488' }]}>Regime Recommendation</Text>
                  </View>
                  <Text style={[styles.aiInfoText, { color: '#115E59' }]}>{ai.regimeAdvice}</Text>
                </View>
              )}

              {/* Action Items */}
              {ai.actionItems?.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <View style={styles.aiInfoHeader}>
                    <Zap size={10} color={colors.textSecondary} />
                    <Text style={[styles.aiInfoLabel, { color: colors.textSecondary }]}>
                      Recommended Actions
                    </Text>
                  </View>
                  <View style={{ marginTop: 8 }}>
                    {ai.actionItems.map((item, i) => (
                      <ActionItemCard key={i} item={item} />
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ─── 8. Savings Projection ─── */}
        <View style={styles.projectionBanner}>
          <View style={styles.projectionDecor} />
          <View style={{ position: 'relative', zIndex: 1 }}>
            <View style={styles.projectionHeader}>
              <Sparkles size={14} color={colors.white} />
              <Text style={styles.projectionTitle}>Savings Projection</Text>
            </View>
            <Text style={styles.projectionSub}>If all recommendations are followed</Text>
            <View style={styles.projectionGrid}>
              <View style={styles.projectionItem}>
                <Text style={styles.projectionItemLabel}>Current</Text>
                <Text style={styles.projectionItemValue}>{formatCurrency(currentBestTax)}</Text>
              </View>
              <View style={styles.projectionItem}>
                <Text style={styles.projectionItemLabel}>After</Text>
                <Text style={styles.projectionItemValue}>{formatCurrency(afterOptimizationTax)}</Text>
              </View>
              <View style={[styles.projectionItem, styles.projectionItemHighlight]}>
                <Text style={styles.projectionItemLabelHL}>You Save</Text>
                <Text style={styles.projectionItemValue}>
                  {formatCurrency(data?.totalPotentialSaving || 0)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─── 9. Recommendations ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CheckCircle2 size={16} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>Recommendations</Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.countBadge}>{data?.recommendations?.length || 0} total</Text>
          </View>
          {(data?.recommendations?.length || 0) > 0 ? (
            data.recommendations.map((rec, index) => (
              <RecommendationCard
                key={`${rec.sectionKey}-${rec.instrument}-${index}`}
                rec={rec}
                onSimulate={(r) => {
                  setSimRec(r);
                  setSimOpen(true);
                }}
              />
            ))
          ) : (
            <View style={styles.emptyRec}>
              <CheckCircle2 size={32} color="#10B981" />
              <Text style={styles.emptyRecTitle}>All deduction limits maximized!</Text>
              <Text style={styles.emptyRecSub}>Your tax planning looks great.</Text>
            </View>
          )}
        </View>

        {/* ─── 10. Action Center ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Zap size={16} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>Quick Tools</Text>
          </View>
          <View style={styles.toolsGrid}>
            <TouchableOpacity
              style={styles.toolCard}
              onPress={() => navigation.navigate('ITRGuide')}
              activeOpacity={0.7}
            >
              <View style={[styles.toolIcon, { backgroundColor: '#EFF6FF' }]}>
                <BookOpen size={18} color="#1E6BD6" />
              </View>
              <Text style={styles.toolLabel}>ITR Guide</Text>
              <Text style={styles.toolSub}>Step-by-step</Text>
              <ChevronRight size={14} color={colors.gray400} style={styles.toolArrow} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolCard}
              onPress={() => navigation.navigate('AgentChat')}
              activeOpacity={0.7}
            >
              <View style={[styles.toolIcon, { backgroundColor: '#F5F3FF' }]}>
                <MessageCircle size={18} color="#7C3AED" />
              </View>
              <Text style={styles.toolLabel}>AI Assistant</Text>
              <Text style={styles.toolSub}>Ask tax questions</Text>
              <ChevronRight size={14} color={colors.gray400} style={styles.toolArrow} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 11. Disclaimer ─── */}
        <View style={styles.disclaimer}>
          <View style={styles.disclaimerHeader}>
            <AlertCircle size={11} color="#D97706" />
            <Text style={styles.disclaimerTitle}>Disclaimer</Text>
          </View>
          <Text style={styles.disclaimerText}>
            Indicative analysis based on recorded data. Consult a qualified CA for accurate filing. Rules subject to change.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── Simulator Bottom Sheet ─── */}
      <SimulatorModal
        visible={simOpen}
        onClose={() => setSimOpen(false)}
        recommendation={simRec}
        currentTax={currentBestTax}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  loadingText: {
    marginTop: 12,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  retryBtnLarge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    ...shadows.sm,
  },
  retryBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },

  // Header Right & Badges
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  highBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    gap: 4,
  },
  highDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  highBadgeText: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: '#DC2626',
  },
  refreshBtn: {
    padding: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    padding: spacing.lg,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreMessage: {
    marginTop: 10,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  savingsBanner: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  savingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  savingsTitle: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  savingsValue: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  savingsSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: fontWeight.medium,
    marginTop: 2,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },

  // Liability Row
  liabilityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    marginTop: 10,
  },
  liabilityCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  savingsCard: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  liabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  liabilityLabel: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  liabilityValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  liabilitySub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  countBadge: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: colors.gray400,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },

  // Chart
  chartCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  regimeAdvice: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  chart: {
    marginVertical: 4,
    borderRadius: 12,
  },

  // Regime details
  regimeDetail: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  regimeDetailRecommended: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  regimeDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  regimeDetailLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 3,
  },
  bestBadgeText: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: '#0D9488',
  },
  regimeDetailGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  regimeDetailItem: {
    flex: 1,
  },
  regimeDetailItemLabel: {
    fontSize: 9,
    color: colors.gray400,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
  },
  regimeDetailItemValue: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },

  // Card
  card: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  deductionSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  deductionSummaryLabel: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: colors.gray400,
    textTransform: 'uppercase',
  },
  deductionSummaryValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },

  // Pattern section
  patternContainer: {
    backgroundColor: '#FAF5FF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  patternSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 12,
  },

  // AI section
  aiAssessment: {
    backgroundColor: '#FAF5FF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  aiAssessmentText: {
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  aiBlock: {
    marginBottom: 12,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  aiBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  aiBlockTitle: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aiBlockContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  aiListItem: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  aiDot: {
    fontSize: fontSize.sm,
    marginTop: -1,
  },
  aiListText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  aiInfoBox: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: 8,
    borderWidth: 1,
  },
  aiInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  aiInfoLabel: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aiInfoText: {
    fontSize: 11,
    lineHeight: 16,
  },

  // Projection
  projectionBanner: {
    backgroundColor: '#0D9488',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: 20,
    overflow: 'hidden',
    ...shadows.md,
  },
  projectionDecor: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  projectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  projectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  projectionSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: fontWeight.semibold,
    marginBottom: 14,
  },
  projectionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  projectionItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  projectionItemHighlight: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  projectionItemLabel: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  projectionItemLabelHL: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  projectionItemValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },

  // Empty recommendations
  emptyRec: {
    backgroundColor: '#ECFDF5',
    borderRadius: borderRadius.lg,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  emptyRecTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: '#065F46',
    marginTop: 8,
  },
  emptyRecSub: {
    fontSize: fontSize.xs,
    color: '#059669',
    marginTop: 2,
  },

  // Tools Grid
  toolsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  toolCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    ...shadows.sm,
  },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  toolLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  toolSub: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  toolArrow: {
    marginTop: 8,
  },

  // Disclaimer
  disclaimer: {
    backgroundColor: '#FFFBEB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  disclaimerTitle: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: '#D97706',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  disclaimerText: {
    fontSize: 10,
    color: '#92400E',
    lineHeight: 15,
    textAlign: 'center',
  },
});

export default TaxOptimizerScreen;
