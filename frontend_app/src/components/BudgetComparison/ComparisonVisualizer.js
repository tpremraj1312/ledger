import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

const screenWidth = Dimensions.get('window').width;

const ComparisonVisualizer = ({ data, isDebit }) => {
  const [chartType, setChartType] = useState('Bar'); // Bar, Line, Donut

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data available for the selected period.</Text>
      </View>
    );
  }

  // Format data for chart-kit
  const labels = data.map(d => d.category.length > 8 ? d.category.substring(0, 8) + '..' : d.category);
  const targetData = data.map(d => isDebit ? d.BudgetedExpense : d.IncomeGoal);
  const actualData = data.map(d => isDebit ? d.ActualExpense : d.ActualIncome);

  const targetColor = colors.primary;
  const actualColor = isDebit ? colors.error : colors.success;
  const targetLabel = isDebit ? 'Budgeted' : 'Goal';
  const actualLabel = isDebit ? 'Actual' : 'Actual';

  // For pie/donut
  const pieData = data.map((d, index) => ({
    name: d.category,
    actual: isDebit ? d.ActualExpense : d.ActualIncome,
    color: [colors.primary, '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', colors.error][index % 6],
    legendFontColor: colors.textSecondary,
    legendFontSize: 11
  })).filter(d => d.actual > 0);

  const renderContent = () => {
    switch (chartType) {
      case 'Line':
        return (
          <LineChart
            data={{
              labels,
              datasets: [
                { data: targetData, color: () => targetColor, strokeWidth: 2 },
                { data: actualData, color: () => actualColor, strokeWidth: 2 }
              ],
              legend: [targetLabel, actualLabel]
            }}
            width={screenWidth - spacing.xl * 2}
            height={220}
            chartConfig={{
              backgroundColor: colors.white,
              backgroundGradientFrom: colors.white,
              backgroundGradientTo: colors.white,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity * 0.1})`,
              labelColor: (opacity = 1) => colors.textSecondary,
              propsForDots: { r: '4', strokeWidth: '2' },
              propsForBackgroundLines: { strokeDasharray: '4', stroke: colors.border }
            }}
            bezier
            style={styles.chart}
            withVerticalLines={false}
          />
        );
      case 'Donut':
        if (pieData.length === 0) {
           return <Text style={[styles.emptyText, {textAlign: 'center', marginTop: 40}]}>No actual values to display in Donut.</Text>;
        }
        return (
          <PieChart
            data={pieData}
            width={screenWidth - spacing.xl * 2}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor={"actual"}
            backgroundColor={"transparent"}
            paddingLeft={"15"}
            absolute
          />
        );
      case 'Bar':
      default:
        // Build a sleek custom horizontal grouped bar chart
        const maxVal = Math.max(...targetData, ...actualData, 1);
        return (
          <View style={styles.barChartContainer}>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: targetColor }]} />
                <Text style={styles.legendText}>{targetLabel}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: actualColor }]} />
                <Text style={styles.legendText}>{actualLabel}</Text>
              </View>
            </View>

            {data.map((item, index) => {
              const target = isDebit ? item.BudgetedExpense : item.IncomeGoal;
              const actual = isDebit ? item.ActualExpense : item.ActualIncome;
              const targetPct = (target / maxVal) * 100;
              const actualPct = (actual / maxVal) * 100;

              return (
                <View key={index} style={styles.barRow}>
                  <View style={styles.barLabelContainer}>
                    <Text style={styles.barLabel} numberOfLines={1}>{item.category}</Text>
                  </View>
                  <View style={styles.barBarsContainer}>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${targetPct}%`, backgroundColor: targetColor, top: 0, height: 8 }]} />
                      <View style={[styles.barFill, { width: `${actualPct}%`, backgroundColor: actualColor, top: 10, height: 8 }]} />
                    </View>
                  </View>
                  <View style={styles.barValuesContainer}>
                    <Text style={[styles.barValueText, { color: targetColor }]}>{formatCurrency(target)}</Text>
                    <Text style={[styles.barValueText, { color: actualColor }]}>{formatCurrency(actual)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Category Breakdown</Text>
        <View style={styles.typeSelector}>
          {['Bar', 'Line', 'Donut'].map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.typeBtn, chartType === type && styles.typeBtnActive]}
              onPress={() => setChartType(type)}
            >
              <Text style={[styles.typeBtnText, chartType === type && styles.typeBtnTextActive]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 2,
  },
  typeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  typeBtnActive: {
    backgroundColor: colors.white,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  typeBtnText: {
    fontSize: 10,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  typeBtnTextActive: {
    color: colors.textPrimary,
    fontWeight: fontWeight.bold,
  },
  chart: {
    borderRadius: borderRadius.lg,
    marginVertical: spacing.md,
  },
  barChartContainer: {
    marginTop: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  barLabelContainer: {
    width: 60,
    marginRight: spacing.sm,
  },
  barLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  barBarsContainer: {
    flex: 1,
    height: 18,
    justifyContent: 'center',
  },
  barTrack: {
    flex: 1,
    position: 'relative',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    borderRadius: 4,
  },
  barValuesContainer: {
    width: 65,
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  barValueText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
  }
});

export default ComparisonVisualizer;
