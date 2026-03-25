import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions, PanResponder
} from 'react-native';
import { X, ExternalLink, Lightbulb, TrendingUp, Info } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme';
import { useNavigation } from '@react-navigation/native';

import { formatCurrency } from '../../utils/formatters';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const InvestNowModal = ({ visible, onClose, recommendation }) => {
  const navigation = useNavigation();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const panResponder = useRef(
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
          closeModal();
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
    if (visible && recommendation) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    }
  }, [visible, recommendation, translateY]);

  const closeModal = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      translateY.setValue(SCREEN_HEIGHT);
    });
  };

  const handleRedirect = () => {
    closeModal();
    const section = recommendation?.sectionKey || '';
    if (['80C', '80CCD_1B', '80E', '80G'].includes(section)) {
      navigation.navigate('Investments');
    } else if (['80D_self', '80D_parents', '24b'].includes(section)) {
      navigation.navigate('MainTabs', { screen: 'Expenses' });
    } else {
      navigation.navigate('Investments');
    }
  };

  const getGuidance = () => {
    if (!recommendation) return { title: '', desc: '', bullets: [] };
    const sec = recommendation.sectionKey;
    if (sec === '80C') {
      return {
        title: 'Section 80C Investments',
        desc: 'You can claim up to ₹1,50,000 per financial year by investing in highly regulated, tax-saving instruments.',
        bullets: ['Public Provident Fund (PPF)', 'Equity Linked Savings Scheme (ELSS)', 'Tax-Saver Fixed Deposits (5 Years)', 'Life Insurance Premiums', 'Employee Provident Fund (EPF)']
      };
    }
    if (sec === '80CCD_1B') {
      return {
        title: 'National Pension System (NPS)',
        desc: 'An additional exclusive deduction of ₹50,000 over and above the 80C limit for retirement planning.',
        bullets: ['NPS Tier I Account (Mandatory locking)', 'Long-term equity & debt blend', 'Highly efficient for tax brackets >20%']
      };
    }
    if (sec === '80D_self' || sec === '80D_parents') {
      return {
        title: 'Health Insurance (Section 80D)',
        desc: 'Deductions on premiums paid for medical insurance for yourself, spouse, children, and parents.',
        bullets: ['Up to ₹25,000 for self/family', 'Additional ₹25,000 for parents (₹50k if senior citizens)', 'Includes Preventive Health Checkups (₹5,000 limit)']
      };
    }
    if (sec === '24b') {
      return {
        title: 'Home Loan Interest',
        desc: 'If you have purchased a home, the interest component of your EMI is eligible for deduction.',
        bullets: ['Up to ₹2,00,000 for self-occupied property', 'Must be completed within 5 years of loan taken']
      };
    }
    return {
      title: 'Tax Saving Opportunity',
      desc: recommendation.instrument || 'Explore avenues to optimize this category.',
      bullets: ['Check Ledger\'s Investment suite for top performing options.', 'Log your expenditures directly in the Expenses tracker.']
    };
  };

  const guide = getGuidance();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="none" onRequestClose={closeModal}>
      <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={closeModal}>
        <Animated.View 
          style={[styles.sheet, { transform: [{ translateY }] }]} 
          {...panResponder.panHandlers}
        >
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.dragHandleContainer}>
              <View style={styles.dragHandle} />
            </View>

            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Lightbulb size={24} color={colors.primary} />
              </View>
              <Text style={styles.title}>Investment Guide</Text>
              <Text style={styles.subtitle}>Sec {recommendation?.sectionKey}</Text>
              
              <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <View style={styles.utilizationCard}>
                <View style={styles.utilRow}>
                  <Text style={styles.utilLabel}>Annual Limit</Text>
                  <Text style={styles.utilValue}>{formatCurrency(recommendation?.maxLimit || 150000)}</Text>
                </View>
                <View style={[styles.utilRow, { marginTop: 4 }]}>
                  <Text style={styles.utilLabel}>Remaining to Save</Text>
                  <Text style={[styles.utilValue, { color: colors.primary }]}>{formatCurrency(recommendation?.actionDetails?.maxInvestable || 0)}</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: `${Math.max(0, Math.min(100, (1 - (recommendation?.actionDetails?.maxInvestable / recommendation?.maxLimit)) * 100))}%` 
                      }
                    ]} 
                  />
                </View>
              </View>

              <Text style={styles.guideTitle}>{guide.title}</Text>
              <Text style={styles.guideDesc}>{guide.desc}</Text>

              <View style={styles.expertTipsBox}>
                <Text style={styles.bulletHeader}>Expert Pocket CA Tips:</Text>
                {guide.bullets.map((b, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <TrendingUp size={12} color={colors.primary} style={{ marginTop: 4, marginRight: 8 }} />
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.infoBox}>
                <Info size={14} color={colors.primary} />
                <Text style={styles.infoText}>Record your transactions in Ledger to automatically apply them to this calculation.</Text>
              </View>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleRedirect}
                activeOpacity={0.8}
              >
                <TrendingUp size={18} color={colors.white} />
                <Text style={styles.actionBtnText}>
                  Invest Now
                </Text>
                <ExternalLink size={16} color={colors.white} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 27, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Dimensions.get('window').height * 0.05,
    ...shadows.lg,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray300,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    position: 'relative',
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.bold,
    marginTop: 2,
  },
  closeBtn: {
    position: 'absolute',
    top: 0,
    right: spacing.xl,
    padding: 6,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
  },
  utilizationCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  utilRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  utilLabel: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  utilValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  content: {
    padding: spacing.xl,
    paddingTop: spacing.md,
  },
  guideTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  guideDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  expertTipsBox: {
    backgroundColor: '#EEF4FF',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D0E2FF',
  },
  bulletHeader: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.primaryDark,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E6',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFECC2',
  },
  infoText: {
    fontSize: 11,
    color: '#855E00',
    fontWeight: fontWeight.medium,
    lineHeight: 16,
    flex: 1,
  },
  actionBtn: {
    backgroundColor: colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: borderRadius.md,
    ...shadows.sm,
    gap: 12,
  },
  actionBtnText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});

export default InvestNowModal;
