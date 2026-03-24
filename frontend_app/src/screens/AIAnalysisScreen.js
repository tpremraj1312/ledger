import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Filter, RefreshCcw, Brain, PieChart as PieChartIcon, TrendingUp, Lightbulb, AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import api from '../api/axios';

import AnalysisCard from '../components/AIAnalysis/AnalysisCard';
import FilterBottomSheet from '../components/FilterBottomSheet';

const screenWidth = Dimensions.get('window').width;

const AIAnalysisScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [filters, setFilters] = useState({
    startDate: '', 
    endDate: '',
    category: 'All'
  });
  
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [categories, setCategories] = useState(['All']);
  const [analysis, setAnalysis] = useState(null);

  // Init dates to last 30 days and fetch categories ONLY on mount
  useEffect(() => {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    setFilters({
      startDate: lastMonth.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      category: 'All'
    });

    const fetchCategories = async () => {
      try {
        const [txRes, budgetRes] = await Promise.all([
          api.get('/api/transactions', { params: { type: 'all', limit: 1000 } }),
          api.get('/api/budgets')
        ]);
        const txCats = (txRes.data.transactions || []).map(t => t.category).filter(Boolean);
        const budgetCats = (budgetRes.data || []).map(b => b.category).filter(Boolean);
        const uniqueCats = ['All', ...new Set([...txCats, ...budgetCats])].sort();
        setCategories(uniqueCats);
      } catch (err) {
        console.error("Failed to load categories for AI analysis.");
      }
    };
    fetchCategories();
  }, []);

  const generateAnalysis = async () => {
    if (!filters.startDate) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await api.get('/api/ai-analysis', { 
        params: { ...filters, category: filters.category === 'All' ? undefined : filters.category } 
      });
      setAnalysis(response.data.analysis);
    } catch (err) {
      console.error('AI Analysis error:', err);
      setError('Failed to load AI intelligence. Please try again.');
    } finally {
      setLoading(false);
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

  const isDefaultAnalysis = analysis?.budgetVsExpenses?.includes('No expenses or budgets found');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Financial Intelligence</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setIsFilterVisible(true)}>
            <Filter size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Intro / Action Section */}
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>AI-powered insights</Text>
          <Text style={styles.introSubtitle}>
            Get a deep dive into your spending habits and smart recommendations for the selected period.
          </Text>
          <TouchableOpacity 
            style={[styles.generateBtn, loading && styles.generateBtnDisabled]} 
            onPress={generateAnalysis}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" style={{marginRight: 8}} />
            ) : (
              <Brain size={20} color={colors.white} style={{marginRight: 8}} />
            )}
            <Text style={styles.generateBtnText}>
              {loading ? 'Analyzing...' : 'Generate Analysis'}
            </Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <AlertTriangle size={24} color={colors.error} style={{marginBottom: 8}} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* AI Analysis Content */}
        {analysis && !loading && !error && (
          isDefaultAnalysis ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{analysis.budgetVsExpenses}</Text>
            </View>
          ) : (
            <View style={styles.analysisResults}>
              
              {/* 1. Budget vs Expenses */}
              <AnalysisCard title="Budget vs. Expenses" icon={PieChartIcon}>
                <Text style={styles.analysisText}>{analysis.budgetVsExpenses}</Text>
                
                {analysis.visualizationData?.expenseBreakdown?.length > 0 && (
                  <View style={styles.chartWrapper}>
                    <Text style={styles.chartTitle}>Category Breakdown</Text>
                    <PieChart
                      data={analysis.visualizationData.expenseBreakdown.map((item, index) => ({
                        name: item.category.length > 10 ? item.category.substring(0, 10) + '..' : item.category,
                        population: item.percentage, // Using percentage since the web UI labels it
                        color: [colors.primary, '#EC4899', '#14B8A6', '#F59E0B', '#8B5CF6', colors.error][index % 6],
                        legendFontColor: colors.textSecondary,
                        legendFontSize: 11
                      }))}
                      width={screenWidth - spacing.lg * 4}
                      height={200}
                      chartConfig={{ color: (opacity = 1) => `rgba(0,0,0,${opacity})` }}
                      accessor={"population"}
                      backgroundColor={"transparent"}
                      paddingLeft={"0"}
                      absolute
                    />
                  </View>
                )}
              </AnalysisCard>

              {/* 2. Spending Patterns */}
              <AnalysisCard title="Spending Patterns" icon={TrendingUp}>
                <Text style={styles.analysisText}>{analysis.spendingPatterns}</Text>
                
                {analysis.visualizationData?.weeklySpending?.length > 0 && (
                  <View style={styles.chartWrapper}>
                    <Text style={styles.chartTitle}>Weekly Trends</Text>
                    <LineChart
                      data={{
                        labels: analysis.visualizationData.weeklySpending.map(w => {
                          const parts = w.weekStart.split('-');
                          return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : w.weekStart.substring(0, 5);
                        }),
                        datasets: [
                          { data: analysis.visualizationData.weeklySpending.map(w => w.amount), color: () => colors.primary }
                        ]
                      }}
                      width={screenWidth - spacing.lg * 4}
                      height={220}
                      chartConfig={{
                        backgroundColor: colors.surface,
                        backgroundGradientFrom: colors.surface,
                        backgroundGradientTo: colors.surface,
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(30, 107, 214, ${opacity})`,
                        labelColor: (opacity = 1) => colors.textSecondary,
                        propsForDots: { r: '4', strokeWidth: '2', stroke: colors.white },
                      }}
                      bezier
                      style={{ marginVertical: spacing.sm, borderRadius: borderRadius.md }}
                    />
                  </View>
                )}
              </AnalysisCard>

              {/* 3. Recommendations */}
              <AnalysisCard title="Smart Recommendations" icon={Lightbulb}>
                <Text style={styles.analysisText}>{analysis.recommendations}</Text>
                
                <View style={styles.tipsList}>
                  {['Reduce non-essential spending', 'Set up automatic savings', 'Review subscriptions'].map((tip, index) => (
                    <View key={index} style={styles.tipItem}>
                      <CheckCircle2 size={16} color={colors.primary} style={styles.tipIcon} />
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              </AnalysisCard>

            </View>
          )
        )}
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
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  introSection: {
    marginBottom: spacing.xl,
    alignItems: 'flex-start',
  },
  introTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  introSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateBtnDisabled: {
    opacity: 0.7,
  },
  generateBtnText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  errorBox: {
    backgroundColor: colors.errorLight,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  emptyBox: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  analysisResults: {
    marginTop: spacing.xs,
  },
  analysisText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  chartWrapper: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.xs,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  tipsList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight + '10',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primaryLight + '30',
  },
  tipIcon: {
    marginRight: spacing.sm,
  },
  tipText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  }
});

export default AIAnalysisScreen;
