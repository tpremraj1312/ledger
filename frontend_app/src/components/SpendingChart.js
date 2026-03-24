import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';

const SpendingChart = ({ data, title = "Spending Trend" }) => {
  const [chartWidth, setChartWidth] = useState(300); // Default fallback

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No spending trend data available</Text>
      </View>
    );
  }

  // Ensure we don't overcrowd the X-axis labels on mobile
  // Take maximum 6 labels, evenly distributed
  const labels = data.map(item => {
    const d = new Date(item.date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });

  const hidePointsAtIndex = [];
  const maxLabels = 6;
  const skipRate = Math.ceil(labels.length / maxLabels);
  
  const displayLabels = labels.map((label, index) => {
    if (index % skipRate === 0 || index === labels.length - 1) return label;
    // hide point visualization if we want, but chart kit allows hidePointsAtIndex
    // Actually chart-kit's formatXLabel is easier or just passing empty strings
    return '';
  });

  const chartData = {
    labels: displayLabels,
    datasets: [
      {
        data: data.map(item => item.amount),
        color: (opacity = 1) => colors.error, // Red line for expenses
        strokeWidth: 3,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: colors.white,
    backgroundGradientFrom: colors.white,
    backgroundGradientTo: colors.white,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(13, 27, 42, ${opacity * 0.2})`, // TextPrimary with opacity for grid
    labelColor: (opacity = 1) => colors.textSecondary,
    style: {
      borderRadius: borderRadius.md,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: colors.white,
    },
    propsForBackgroundLines: {
      strokeDasharray: '4 4',
      strokeWidth: 1,
      stroke: colors.border,
    }
  };

  return (
    <View 
      style={styles.container}
      onLayout={(e) => setChartWidth(e.nativeEvent.layout.width - spacing.md * 2)}
    >
      <Text style={styles.title}>{title}</Text>
      <LineChart
        data={chartData}
        width={chartWidth}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withVerticalLines={false}
        yAxisLabel="₹"
        yAxisSuffix=""
        yLabelsOffset={10}
        segments={4}
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
  chart: {
    marginVertical: spacing.sm,
    borderRadius: borderRadius.md,
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

export default SpendingChart;
