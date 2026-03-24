import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';

const CHART_COLORS = [
  colors.primary,     // Blue
  '#10B981',          // Emerald
  '#F59E0B',          // Amber
  '#EF4444',          // Red
  '#8B5CF6',          // Violet
  '#ec4899',          // Pink
  '#06b6d4',          // Cyan
  colors.textSecondary,
];

const CategoryChart = ({ data, title = "Category Distribution" }) => {
  const [chartWidth, setChartWidth] = useState(300); // Default fallback

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No category distribution data available</Text>
      </View>
    );
  }

  // Format data for PieChart
  // The data prop should be an array: [{ name: 'Food', value: 100 }, ...]
  const chartData = data.map((item, index) => ({
    name: item.name || item.category,
    population: item.value || item.amount || 0,
    color: CHART_COLORS[index % CHART_COLORS.length],
    legendFontColor: colors.textSecondary,
    legendFontSize: 12,
  })).sort((a, b) => b.population - a.population);

  // Take top 5, group rest as "Other" to keep pie clean on mobile
  let displayData = chartData;
  if (chartData.length > 5) {
    const top5 = chartData.slice(0, 5);
    const otherSum = chartData.slice(5).reduce((sum, item) => sum + item.population, 0);
    if (otherSum > 0) {
      top5.push({
        name: 'Other',
        population: otherSum,
        color: CHART_COLORS[5],
        legendFontColor: colors.textSecondary,
        legendFontSize: 12,
      });
    }
    displayData = top5;
  }

  const chartConfig = {
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  };

  return (
    <View 
      style={styles.container}
      onLayout={(e) => setChartWidth(e.nativeEvent.layout.width - spacing.md * 2)}
    >
      <Text style={styles.title}>{title}</Text>
      <PieChart
        data={displayData}
        width={chartWidth}
        height={200}
        chartConfig={chartConfig}
        accessor={"population"}
        backgroundColor={"transparent"}
        paddingLeft={"15"}
        center={[10, 0]}
        absolute={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: '500', // Removed bold
    color: colors.textPrimary,
    marginBottom: spacing.base,
    paddingHorizontal: spacing.sm,
  },
  emptyContainer: {
    height: 200,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
});

export default CategoryChart;
