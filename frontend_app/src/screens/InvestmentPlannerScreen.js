import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calculator, Target, PiggyBank, TrendingUp, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { BarChart } from 'react-native-chart-kit';
import { BACKEND_URL } from '../api/config';

// Design Tokens (MANDATORY)
const TOKENS = {
  Primary: '#1E6BD6',
  PrimaryLight: '#4C8DF0',
  PrimaryDark: '#154EA1',
  Background: '#FFFFFF',
  Surface: '#F5F7FA',
  TextPrimary: '#0D1B2A',
  TextSecondary: '#44556B',
  Borders: '#E0E6EE',
  Success: '#10b981',
  SuccessLight: '#d1fae5',
  Danger: '#ef4444',
  Warning: '#f59e0b',
  WarningLight: '#fef3c7',
};

const ALLOC_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#94a3b8'
];

const screenWidth = Dimensions.get('window').width;

const fmt = (v) => `₹${Math.round(v).toLocaleString('en-IN')}`;

const InvestmentPlannerScreen = () => {
  const [inputs, setInputs] = useState({
    income: '',
    expenses: '',
    age: '',
    riskPreference: 'moderate',
    investmentAmount: '',
  });
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!inputs.income || !inputs.expenses) {
      Alert.alert('Required Fields', 'Please enter your monthly income and expenses.');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.post(`${BACKEND_URL}/api/investments/ai/planner`, inputs, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlan(response.data);
    } catch (err) {
      Alert.alert('Planner Failed', err.response?.data?.message || 'Failed to generate plan.');
    } finally {
      setLoading(false);
    }
  };

  const allocData = plan
    ? Object.entries(plan.allocation).map(([k, v]) => ({
        name: k.charAt(0).toUpperCase() + k.slice(1),
        value: v,
      }))
    : [];

  const chartData = plan
    ? {
        labels: allocData.map(d => d.name),
        datasets: [{ data: allocData.map(d => d.value) }],
      }
    : null;

  const renderSegmentedControl = () => {
    const options = ['conservative', 'moderate', 'aggressive'];
    return (
      <View style={styles.segmentedContainer}>
        {options.map((opt) => {
          const isActive = inputs.riskPreference === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.segmentButton, isActive && styles.segmentButtonActive]}
              onPress={() => setInputs({ ...inputs, riskPreference: opt })}
            >
              <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header / Input Form Container */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Calculator size={22} color={TOKENS.Primary} />
            <Text style={styles.title}>Smart Investment Planner</Text>
          </View>
          <Text style={styles.subtitle}>
            Enter your financial details to get a personalized, practical investment plan.
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Monthly Income (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="50000"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={inputs.income}
              onChangeText={(val) => setInputs({ ...inputs, income: val })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Monthly Expenses (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="30000"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={inputs.expenses}
              onChangeText={(val) => setInputs({ ...inputs, expenses: val })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              placeholder="30"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={inputs.age}
              onChangeText={(val) => setInputs({ ...inputs, age: val })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Risk Preference</Text>
            {renderSegmentedControl()}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={TOKENS.Background} size="small" />
            ) : (
              <>
                <Target size={18} color={TOKENS.Background} />
                <Text style={styles.primaryButtonText}>Generate Plan</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Results Render */}
        {plan && (
          <View style={styles.resultsContainer}>
            
            {/* Key Metrics Grid */}
            <View style={styles.gridRow}>
              <View style={[styles.gridCard, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.metricLabel}>Monthly Surplus</Text>
                <Text style={[styles.metricValue, { color: plan.monthlySurplus > 0 ? TOKENS.Success : TOKENS.Danger }]}>
                  {fmt(plan.monthlySurplus)}
                </Text>
                <Text style={styles.metricSub}>Savings rate: {plan.savingsRate}%</Text>
              </View>

              <View style={[styles.gridCard, { flex: 1, marginLeft: 8, backgroundColor: TOKENS.PrimaryLight + '20' }]}>
                <Text style={[styles.metricLabel, { color: TOKENS.Primary }]}>Recommended SIP</Text>
                <Text style={[styles.metricValue, { color: TOKENS.Primary }]}>
                  {fmt(plan.recommendedSIP)}
                </Text>
                <Text style={styles.metricSub}>/ month</Text>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={[styles.gridCard, { flex: 1, marginRight: 8, backgroundColor: plan.emergencyPriority ? TOKENS.WarningLight : TOKENS.SuccessLight }]}>
                <Text style={styles.metricLabel}>Emergency Target</Text>
                <Text style={styles.metricValue}>{fmt(plan.emergencyTarget)}</Text>
                <Text style={[styles.metricSub, { color: plan.emergencyPriority ? TOKENS.Warning : TOKENS.Success }]}>
                  {plan.emergencyPriority ? '⚠️ Priority' : '✅ On track'}
                </Text>
              </View>

              <View style={[styles.gridCard, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.metricLabel}>Risk Level</Text>
                <Text style={styles.metricValue}>{plan.riskLevel}</Text>
                <Text style={styles.metricSub}>Age: {plan.age}</Text>
              </View>
            </View>

            {/* Allocation Chart */}
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <PiggyBank size={18} color={TOKENS.Success} />
                <Text style={styles.cardTitle}>Suggested Asset Allocation</Text>
              </View>
              
              <View style={styles.chartContainer}>
                <BarChart
                  data={chartData}
                  width={screenWidth - 64}
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix="%"
                  withInnerLines={false}
                  showBarTops={false}
                  flatColor={true}
                  chartConfig={{
                    backgroundColor: TOKENS.Background,
                    backgroundGradientFrom: TOKENS.Background,
                    backgroundGradientTo: TOKENS.Background,
                    decimalPlaces: 0,
                    color: (opacity = 1) => TOKENS.Primary,
                    labelColor: (opacity = 1) => TOKENS.TextSecondary,
                    barPercentage: 0.6,
                    propsForLabels: { fontSize: 10 }
                  }}
                  style={{ borderRadius: 16 }}
                />
              </View>
            </View>

            {/* Projections */}
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <TrendingUp size={18} color={TOKENS.PrimaryLight} />
                <Text style={styles.cardTitle}>Growth Projections</Text>
              </View>
              <View style={styles.projectionGrid}>
                {plan.projections.map((p) => (
                  <View key={p.years} style={styles.projectionCard}>
                    <Text style={styles.projYears}>{p.years} Years</Text>
                    <Text style={styles.projCorpus}>{fmt(p.corpus)}</Text>
                    <Text style={styles.projReal}>Real: {fmt(p.inflationAdjusted)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Action Steps */}
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <ArrowRight size={18} color={TOKENS.Primary} />
                <Text style={styles.cardTitle}>Action Steps</Text>
              </View>
              <View style={styles.stepsContainer}>
                {plan.steps.map((s, i) => (
                  <View key={i} style={styles.stepRow}>
                    <CheckCircle2 size={18} color={TOKENS.PrimaryLight} style={styles.stepIcon} />
                    <Text style={styles.stepText}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>

          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.Surface,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: TOKENS.Background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: TOKENS.Borders,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: TOKENS.TextPrimary,
    marginLeft: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TOKENS.TextPrimary,
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 13,
    color: TOKENS.TextSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: TOKENS.TextSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: TOKENS.Surface,
    borderWidth: 1,
    borderColor: TOKENS.Borders,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: TOKENS.TextPrimary,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: TOKENS.Surface,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TOKENS.Borders,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: TOKENS.Background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: TOKENS.TextSecondary,
  },
  segmentTextActive: {
    color: TOKENS.Primary,
  },
  primaryButton: {
    backgroundColor: TOKENS.Primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: TOKENS.Background,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultsContainer: {
    marginTop: 8,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  gridCard: {
    backgroundColor: TOKENS.Background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: TOKENS.Borders,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  metricLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: TOKENS.TextSecondary,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: TOKENS.TextPrimary,
    textTransform: 'capitalize',
  },
  metricSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginHorizontal: -8,
  },
  projectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  projectionCard: {
    width: '48%',
    backgroundColor: TOKENS.Surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  projYears: {
    fontSize: 12,
    color: TOKENS.TextSecondary,
    marginBottom: 4,
  },
  projCorpus: {
    fontSize: 16,
    fontWeight: '700',
    color: TOKENS.PrimaryDark,
  },
  projReal: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  stepsContainer: {
    marginTop: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: TOKENS.Surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  stepIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: TOKENS.TextPrimary,
    lineHeight: 20,
  },
});

export default InvestmentPlannerScreen;
