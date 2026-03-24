import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 80; // Adjusted for chat bubble padding

const COLORS = {
  primary: '#1E6BD6',
  background: '#FFFFFF',
  textSecondary: '#44556B',
  border: '#E0E6EE',
  chartPalette: ['#1E6BD6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
};

const formatCurrency = (value) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${Math.round(value)}`;
};

const SingleChart = ({ chartData }) => {
  if (!chartData || !chartData.data || chartData.data.length === 0) return null;
  const { type, data, xKey, yKey, nameKey, valueKey, title, colors = COLORS.chartPalette } = chartData;

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(30, 107, 214, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(68, 85, 107, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: "4", strokeWidth: "2", stroke: COLORS.primary },
    formatYLabel: (y) => formatCurrency(parseFloat(y)),
  };

  const renderChart = () => {
    switch (type) {
      case 'bar':
        const barLabels = data.map(d => d[xKey]);
        const barValues = data.map(d => Object.keys(d).filter(k => k !== xKey).map(k => d[k])).flat();
        return (
          <BarChart
            data={{ labels: barLabels, datasets: [{ data: barValues }] }}
            width={CHART_WIDTH}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            verticalLabelRotation={30}
            fromZero
          />
        );
      case 'line':
      case 'area':
        return (
          <LineChart
            data={{
              labels: data.map(d => d[xKey]),
              datasets: [{ data: data.map(d => d[yKey]) }]
            }}
            width={CHART_WIDTH}
            height={220}
            chartConfig={{...chartConfig, fillShadowGradient: type === 'area' ? COLORS.primary : 'transparent', fillShadowGradientOpacity: 0.2}}
            bezier
            style={styles.chart}
          />
        );
      case 'pie':
        const pieData = data.map((d, i) => ({
          name: d[nameKey || 'name'],
          population: d[valueKey || 'value'],
          color: colors[i % colors.length],
          legendFontColor: COLORS.textSecondary,
          legendFontSize: 10,
        }));
        return (
          <PieChart
            data={pieData}
            width={CHART_WIDTH}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="0"
            style={styles.chart}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.chartContainer}>
      {title && <Text style={styles.chartTitle}>{title}</Text>}
      {renderChart()}
    </View>
  );
};

export default function ChartCarousel({ charts }) {
  const [activeIndex, setActiveIndex] = useState(0);
  if (!charts || charts.length === 0) return null;

  if (charts.length === 1) return <SingleChart chartData={charts[0]} />;

  return (
    <View style={styles.carouselContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {charts.map((chart, i) => (
          <TouchableOpacity 
            key={i} 
            onPress={() => setActiveIndex(i)}
            style={[styles.tab, activeIndex === i && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeIndex === i && styles.activeTabText]}>
              {chart.title || `Chart ${i + 1}`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <SingleChart chartData={charts[activeIndex]} />
    </View>
  );
}

const styles = StyleSheet.create({
  carouselContainer: {
    marginVertical: 8,
  },
  tabBar: {
    marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  activeTab: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  chartContainer: {
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});
