import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, ActivityIndicator, PanResponder, Animated, Dimensions
} from 'react-native';
import { X, TrendingUp } from 'lucide-react-native';

import Slider from '@react-native-community/slider';

import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme';
import { formatCurrency } from '../../utils/formatters';
import { simulateInvestment } from '../../services/taxService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SimulatorModal = ({ visible, onClose, recommendation, currentTax }) => {
  const [investmentAmount, setInvestmentAmount] = useState(0);
  const [simulatedData, setSimulatedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const translateY = React.useRef(new Animated.Value(0)).current;

  // Pan responder for swipe-to-dismiss
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onClose();
            translateY.setValue(0);
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      setInvestmentAmount(0);
      setSimulatedData(null);
      translateY.setValue(0);
    }
  }, [visible]);

  useEffect(() => {
    const triggerSimulation = async () => {
      if (investmentAmount <= 0) {
        setSimulatedData(null);
        return;
      }
      setLoading(true);
      try {
        const sectionKey = recommendation?.sectionKey || recommendation?.section;
        const result = await simulateInvestment({ [sectionKey]: investmentAmount });
        setSimulatedData(result);
      } catch (error) {
        console.error('Simulation failed', error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(triggerSimulation, 500);
    return () => clearTimeout(timer);
  }, [investmentAmount, recommendation]);

  if (!recommendation) return null;

  const maxLimit = recommendation.actionDetails?.maxInvestable || recommendation.maxInvestable || 150000;
  const newTax = simulatedData ? simulatedData.simulatedTax : currentTax;
  const netSaved = simulatedData ? simulatedData.netTaxSaved : 0;
  const insight = simulatedData?.insight || "Calculating potential savings...";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[styles.content, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity activeOpacity={1}>
            {/* Drag Handle */}
            <View style={styles.dragHandleContainer}>
              <View style={styles.dragHandle} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Tax Simulator</Text>
                <Text style={styles.subtitle}>{recommendation.instrument}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false} bounces={false}>
              {/* Slider Section */}
              <View style={styles.section}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Hypothetical Investment</Text>
                  <Text style={styles.amountText}>{formatCurrency(investmentAmount)}</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={maxLimit}
                  step={1000}
                  value={investmentAmount}
                  onValueChange={setInvestmentAmount}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.primary}
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.limitText}>₹0</Text>
                  <Text style={styles.limitText}>Max: {formatCurrency(maxLimit)}</Text>
                </View>
              </View>

              {/* Results */}
              <View style={styles.resultsCard}>
                {loading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                )}

                <View style={styles.comparisonRow}>
                  <View style={styles.taxBox}>
                    <Text style={styles.taxLabel}>CURRENT TAX</Text>
                    <Text style={styles.taxValue}>{formatCurrency(currentTax)}</Text>
                  </View>
                  <View style={styles.arrowContainer}>
                    <Text style={styles.arrowText}>→</Text>
                  </View>
                  <View style={styles.taxBox}>
                    <Text style={[styles.taxLabel, { color: colors.primary }]}>NEW TAX</Text>
                    <Text style={[styles.taxValue, { color: colors.primary }]}>
                      {formatCurrency(newTax)}
                    </Text>
                  </View>
                </View>

                <View style={styles.savingsBanner}>
                  <View style={styles.savingsRowMain}>
                    <View style={styles.savingsIcon}>
                      <TrendingUp size={14} color={colors.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.savingsLabel}>Net Tax Saved</Text>
                      <Text style={styles.savingsValue}>{formatCurrency(netSaved)}</Text>
                    </View>
                  </View>

                  {/* Smart Analysis Delta */}
                  {simulatedData && (simulatedData.oldRegimeSaving > 0 || simulatedData.newRegimeSaving > 0) && (
                    <View style={styles.deltaContainer}>
                      {simulatedData.oldRegimeSaving > 0 && (
                        <View style={styles.deltaItem}>
                          <Text style={styles.deltaLabel}>Old Regime Saving</Text>
                          <View style={styles.deltaValueRow}>
                            <Text style={styles.deltaValue}>+{formatCurrency(simulatedData.oldRegimeSaving)}</Text>
                          </View>
                        </View>
                      )}
                      {simulatedData.newRegimeSaving > 0 && (
                        <View style={styles.deltaItem}>
                          <Text style={styles.deltaLabel}>New Regime Saving</Text>
                          <View style={styles.deltaValueRow}>
                            <Text style={styles.deltaValue}>+{formatCurrency(simulatedData.newRegimeSaving)}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>

              {/* Pocket CA Insight */}
              <View style={styles.insightBox}>
                <View style={styles.insightHeader}>
                  <TrendingUp size={12} color={colors.primary} />
                  <Text style={styles.insightLabel}>SMART ANALYSIS</Text>
                </View>
                <Text style={styles.insightText}>{insight}</Text>
              </View>

              {/* Disclaimer */}
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  This is a simulation based on your current income and expense patterns. Actual savings may vary.
                </Text>
              </View>
            </ScrollView>

            {/* Done Button */}
            <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: '82%',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray300,
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
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  section: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  amountText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  limitText: {
    fontSize: 10,
    color: colors.gray400,
    fontWeight: fontWeight.semibold,
  },
  resultsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    position: 'relative',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245, 247, 250, 0.75)',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  taxBox: {
    alignItems: 'center',
    flex: 1,
  },
  arrowContainer: {
    paddingHorizontal: 8,
  },
  arrowText: {
    fontSize: fontSize.md,
    color: colors.gray400,
  },
  taxLabel: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.gray400,
    letterSpacing: 1,
    marginBottom: 4,
  },
  taxValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  savingsBanner: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  savingsRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savingsIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.success + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  savingsLabel: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  savingsValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  deltaContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    gap: spacing.md,
  },
  deltaItem: {
    flex: 1,
  },
  deltaLabel: {
    fontSize: 8,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  deltaValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deltaValue: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  insightBox: {
    backgroundColor: '#EEF4FF',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#D0E2FF',
    marginBottom: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  insightLabel: {
    fontSize: 9,
    fontWeight: fontWeight.black,
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  insightText: {
    fontSize: 11,
    color: colors.textPrimary,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  infoBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 15,
    textAlign: 'center',
  },
  doneBtn: {
    backgroundColor: colors.textPrimary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  doneBtnText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
});

export default SimulatorModal;
