import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Shield, TrendingUp, Zap, Target, Calculator, 
  Sparkles, CheckCircle2, ChevronRight, Info, AlertTriangle,
  ArrowDownRight, DollarSign, PiggyBank, BarChart3, RefreshCcw
} from 'lucide-react-native';
import { BarChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';

import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme';
import { formatCurrency } from '../utils/formatters';
import taxService from '../services/taxService';

import { TaxOptimizerScreenSkeleton } from '../components/SkeletonLoader';
import ScoreGauge from '../components/tax/ScoreGauge';
import DeductionBar from '../components/tax/DeductionBar';
import SimulatorModal from '../components/tax/SimulatorModal';

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

  const renderSummaryCard = (label, value, sub, icon, color, bgColor) => (
    <View style={[styles.summaryCard, { backgroundColor: bgColor }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: color + '15' }]}>{icon}</View>
        <Text style={styles.cardLabel}>{label}</Text>
      </View>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
      <Text style={styles.cardSub}>{sub}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Shield size={24} color={colors.primary} style={{ marginRight: 10 }} />
          <View>
            <Text style={styles.headerTitle}>Tax Optimizer</Text>
            <Text style={styles.headerSubtitle}>{data?.fyLabel || 'FY 2024-25'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={fetchData} style={styles.refreshBtn}>
          <RefreshCcw size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} color={colors.primary} />
        }
      >
        {/* Score & Potential Savings Section */}
        <View style={styles.heroSection}>
          <View style={styles.scoreContainer}>
            <ScoreGauge score={data?.optimizationScore || 0} />
            <Text style={styles.scoreMessage}>
              {data?.optimizationScore >= 70 ? '🎉 Excellent Optimization' : '💡 Room to Optimize'}
            </Text>
          </View>
          
          <View style={styles.savingsBanner}>
            <View style={styles.savingsHeader}>
              <Sparkles size={16} color={colors.white} />
              <Text style={styles.savingsTitle}>Potential Additional Savings</Text>
            </View>
            <Text style={styles.savingsValue}>{formatCurrency(data?.totalPotentialSaving || 0)}</Text>
            <Text style={styles.savingsSub}>{data?.recommendations?.length || 0} actionable insights detected</Text>
          </View>
        </View>

        {/* Global Summary Stats */}
        <View style={styles.statsGrid}>
          {renderSummaryCard(
            'ANNUAL INCOME', 
            formatCurrency(data?.income?.total), 
            `${data?.income?.sourceCount} Sources`,
            <DollarSign size={14} color="#1E6BD6" />, 
            '#1E6BD6', '#F0F7FF'
          )}
          {renderSummaryCard(
            'INVESTMENTS', 
            formatCurrency(data?.investments?.total), 
            `${data?.investments?.count} Instruments`,
            <Target size={14} color="#10B981" />, 
            '#10B981', '#F0FDF4'
          )}
        </View>

        {/* Regime Comparison Chart */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BarChart3 size={18} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>Regime Comparison</Text>
          </View>
          <View style={styles.chartCard}>
            <Text style={styles.regimeAdvice}>
              Recommended: <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{data?.taxLiability?.recommendedRegime}</Text>
            </Text>
            <BarChart
              data={regimeData}
              width={width - 48}
              height={200}
              yAxisLabel="₹"
              chartConfig={{
                backgroundColor: colors.white,
                backgroundGradientFrom: colors.white,
                backgroundGradientTo: colors.white,
                color: (opacity = 1) => `rgba(30, 107, 214, ${opacity})`,
                labelColor: (opacity = 1) => colors.textSecondary,
                barPercentage: 0.6,
                decimalPlaces: 0,
              }}
              style={styles.chart}
              fromZero
              showValuesOnTopOfBars
            />
          </View>
        </View>

        {/* Deduction Utilization */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Zap size={18} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>Deduction Utilization</Text>
          </View>
          <View style={styles.card}>
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

        {/* AI Recommendations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CheckCircle2 size={18} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>AI Recommendations</Text>
          </View>
          {data?.recommendations?.map((rec, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.recCard}
              onPress={() => {
                setSimRec(rec);
                setSimOpen(true);
              }}
            >
              <View style={styles.recTagRow}>
                <View style={[styles.recTag, { backgroundColor: rec.priority === 'high' ? '#FEF2F2' : '#EFF6FF' }]}>
                  <Text style={[styles.recTagText, { color: rec.priority === 'high' ? '#EF4444' : colors.primary }]}>
                    {rec.priority.toUpperCase()} PRIORITY
                  </Text>
                </View>
                <Text style={styles.recSaving}>Save {formatCurrency(rec.estimatedTaxSaving)}</Text>
              </View>
              <Text style={styles.recInstrument}>{rec.instrument}</Text>
              <Text style={styles.recDesc} numberOfLines={2}>{rec.description}</Text>
              <View style={styles.recFooter}>
                <Text style={styles.simulateLink}>Simulate Savings</Text>
                <ChevronRight size={14} color={colors.primary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <SimulatorModal 
        visible={simOpen}
        onClose={() => setSimOpen(false)}
        recommendation={simRec}
        currentTax={Math.min(data?.taxLiability?.oldRegime?.total || 0, data?.taxLiability?.newRegime?.total || 0)}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: fontWeight.bold,
  },
  refreshBtn: {
    padding: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
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
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: spacing.lg,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreMessage: {
    marginTop: 12,
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
    marginBottom: 8,
  },
  savingsTitle: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  savingsValue: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.black,
    color: colors.white,
  },
  savingsSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: fontWeight.medium,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  cardLabel: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  cardValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  cardSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
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
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  card: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  recCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    ...shadows.sm,
  },
  recTagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  recTagText: {
    fontSize: 9,
    fontWeight: fontWeight.black,
  },
  recSaving: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  recInstrument: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  recDesc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  recFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  simulateLink: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginRight: 4,
  },
});

export default TaxOptimizerScreen;
