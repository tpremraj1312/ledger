import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  ScrollView, ActivityIndicator 
} from 'react-native';
import { X, Calculator, ArrowRight, TrendingUp } from 'lucide-react-native';

// Try to import Slider, fallback if not available
let Slider;
try {
  Slider = require('@react-native-community/slider').default;
} catch (e) {
  Slider = ({ style }) => <View style={[style, { height: 40, backgroundColor: '#eee', borderRadius: 4, justifyContent: 'center', alignItems: 'center' }]}><Text style={{fontSize: 10, color: '#999'}}>Slider (Update required: npx expo install @react-native-community/slider)</Text></View>;
}
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme';
import { formatCurrency } from '../../utils/formatters';
import { simulateInvestment } from '../../services/taxService';

const SimulatorModal = ({ visible, onClose, recommendation, currentTax }) => {
  const [investmentAmount, setInvestmentAmount] = useState(0);
  const [simulatedData, setSimulatedData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setInvestmentAmount(0);
      setSimulatedData(null);
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Tax Simulator</Text>
              <Text style={styles.subtitle}>{recommendation.instrument}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
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
                <ArrowRight size={16} color={colors.gray400} />
                <View style={styles.taxBox}>
                  <Text style={[styles.taxLabel, { color: colors.primary }]}>NEW TAX</Text>
                  <Text style={[styles.taxValue, { color: colors.primary }]}>
                    {formatCurrency(newTax)}
                  </Text>
                </View>
              </View>

              <View style={styles.savingsBanner}>
                <View style={styles.savingsIcon}>
                  <TrendingUp size={16} color={colors.success} />
                </View>
                <View>
                  <Text style={styles.savingsLabel}>Net Tax Saved</Text>
                  <Text style={styles.savingsValue}>{formatCurrency(netSaved)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                This is a simulation based on your current income and expense patterns. Actual savings may vary.
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: 34,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
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
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  body: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  amountText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
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
    fontWeight: fontWeight.bold,
  },
  resultsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
    position: 'relative',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245, 247, 250, 0.7)',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  taxBox: {
    alignItems: 'center',
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  savingsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.success + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  infoBox: {
    backgroundColor: '#FFF8E6',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FFECC2',
  },
  infoText: {
    fontSize: 11,
    color: '#855E00',
    lineHeight: 16,
    textAlign: 'center',
  },
  doneBtn: {
    backgroundColor: colors.textPrimary,
    margin: spacing.lg,
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
