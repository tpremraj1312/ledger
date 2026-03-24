import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Filter, RefreshCcw, AlertTriangle } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import api from '../api/axios';

import MetricCard from '../components/BudgetComparison/MetricCard';
import ComparisonVisualizer from '../components/BudgetComparison/ComparisonVisualizer';
import FilterBottomSheet from '../components/FilterBottomSheet';

const BudgetComparisonScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  const [filters, setFilters] = useState({
    startDate: '', // web used last 30 days as default, we can leave blank and let backend use its default or set it
    endDate: '',
    category: 'All'
  });
  
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [categories, setCategories] = useState(['All']);
  const [summaryData, setSummaryData] = useState({ debitComparison: null, creditComparison: null });

  // Init dates to last 30 days
  useEffect(() => {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    setFilters({
      startDate: lastMonth.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      category: 'All'
    });
  }, []);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!filters.startDate) return; // wait till init
    
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [comparisonRes, txRes, budgetRes] = await Promise.all([
        api.get('/api/budget-comparison', { params: { ...filters, category: filters.category === 'All' ? undefined : filters.category } }),
        api.get('/api/transactions', { params: { type: 'all', limit: 500 } }),
        api.get('/api/budgets')
      ]);

      const { debitComparison, creditComparison } = comparisonRes.data;
      setSummaryData({ debitComparison, creditComparison });

      // Build categories
      const txCats = (txRes.data.transactions || []).map(t => t.category).filter(Boolean);
      const budgetCats = (budgetRes.data || []).map(b => b.category).filter(Boolean);
      const uniqueCats = ['All', ...new Set([...txCats, ...budgetCats])].sort();
      setCategories(uniqueCats);

    } catch (err) {
      console.error('Budget comparison error:', err);
      setError('Failed to load comparison data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApplyFilters = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      startDate: newFilters.startDate || prev.startDate,
      endDate: newFilters.endDate || prev.endDate,
      category: newFilters.category || 'All',
    }));
  };

  const hasData = summaryData.debitComparison?.comparison?.length > 0 || summaryData.creditComparison?.comparison?.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Budget vs Actual</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setIsFilterVisible(true)}>
            <Filter size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => fetchData(true)} disabled={loading || refreshing}>
            <RefreshCcw size={20} color={(loading || refreshing) ? colors.border : colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <AlertTriangle size={40} color={colors.error} style={{marginBottom: spacing.md}} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : !hasData ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyText}>No data to compare for the selected period.</Text>
          </View>
        ) : (
          <>
            {/* Debit Summary (Expenses) */}
            {summaryData.debitComparison && summaryData.debitComparison.totals && (
              <>
                <Text style={styles.sectionTitle}>Expense Overview</Text>
                <MetricCard 
                  title="Total Expenses"
                  type="debit"
                  budgeted={summaryData.debitComparison.totals.totalBudgetedExpenseFormatted || '₹0'}
                  actual={summaryData.debitComparison.totals.totalActualExpenseFormatted || '₹0'}
                  diff={summaryData.debitComparison.totals.totalDifferenceFormatted || '₹0'}
                  diffStatus={summaryData.debitComparison.totals.totalStatus || 'On Track'}
                />
                
                {summaryData.debitComparison.comparison && summaryData.debitComparison.comparison.length > 0 && (
                  <ComparisonVisualizer 
                    data={summaryData.debitComparison.comparison} 
                    isDebit={true} 
                  />
                )}
              </>
            )}

            {/* Credit Summary (Incomes) */}
            {summaryData.creditComparison && summaryData.creditComparison.totals && (
              <>
                <Text style={styles.sectionTitle}>Income Overview</Text>
                <MetricCard 
                  title="Total Income"
                  type="credit"
                  budgeted={summaryData.creditComparison.totals.totalIncomeGoalFormatted || '₹0'}
                  actual={summaryData.creditComparison.totals.totalActualIncomeFormatted || '₹0'}
                  diff={summaryData.creditComparison.totals.totalDifferenceFormatted || '₹0'}
                  diffStatus={summaryData.creditComparison.totals.totalStatus || 'On Track'}
                />
                
                {summaryData.creditComparison.comparison && summaryData.creditComparison.comparison.length > 0 && (
                  <ComparisonVisualizer 
                    data={summaryData.creditComparison.comparison} 
                    isDebit={false} 
                  />
                )}
              </>
            )}
          </>
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
    gap: spacing.xs,
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  centerBox: {
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    textAlign: 'center',
  }
});

export default BudgetComparisonScreen;
