import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Brain, ChevronRight, CheckCircle2, Circle } from 'lucide-react-native';

const COLORS = {
  primary: '#1E6BD6',
  success: '#10B981',
  textSecondary: '#44556B',
  border: '#E0E6EE',
  surface: '#F5F7FA',
};

export default function PlanStepper({ steps, currentStep, isComplete }) {
  if (!steps || steps.length === 0) return null;
  const flatSteps = steps.flat();
  if (flatSteps.length <= 1) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Brain size={14} color={COLORS.primary} />
        <Text style={styles.headerLabel}>PLAN</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {flatSteps.map((step, i) => {
          const isDone = isComplete || i < currentStep;
          const isActive = !isComplete && i === currentStep;
          
          return (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight size={10} color="#CBD5E1" style={styles.chevron} />}
              <View style={[
                styles.stepBadge,
                isDone && styles.stepDone,
                isActive && styles.stepActive
              ]}>
                {isDone ? (
                  <CheckCircle2 size={10} color={COLORS.success} />
                ) : (
                  <Circle size={8} color={isActive ? COLORS.primary : "#94A3B8"} fill={isActive ? COLORS.primary : "transparent"} />
                )}
                <Text style={[
                  styles.stepText,
                  isDone && styles.stepTextDone,
                  isActive && styles.stepTextActive
                ]}>
                  {step.label || step.name}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingRight: 10,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  scrollContent: {
    alignItems: 'center',
  },
  chevron: {
    marginHorizontal: 4,
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'transparent',
    gap: 4,
  },
  stepDone: {
    backgroundColor: COLORS.success + '10',
  },
  stepActive: {
    backgroundColor: COLORS.primary + '10',
  },
  stepText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },
  stepTextDone: {
    color: COLORS.success,
  },
  stepTextActive: {
    color: COLORS.primary,
  },
});
