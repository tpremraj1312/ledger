import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  LayoutAnimation, Platform, UIManager, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, FileText, Wallet, Shield, CheckCircle2,
  ExternalLink, ChevronDown, ChevronUp, Info, HelpCircle
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme';
import Header from '../components/ui/Header';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STEPS = [
  {
    id: 1,
    title: 'Choose Your ITR Form',
    icon: FileText,
    color: '#1E6BD6',
    bg: '#EFF6FF',
    explanation: 'The Income Tax Department has different return forms based on your income type and amount.',
    examples: [
      'ITR-1 (Sahaj): Salaried individuals with income up to ₹50L from salary, one house property, and other sources',
      'ITR-2: Individuals with capital gains, multiple house properties, or foreign assets',
      'ITR-3: Individuals with income from business or profession',
      'ITR-4 (Sugam): Individuals opting for presumptive taxation under Section 44AD/44ADA',
    ],
    whyMatters: 'Filing with the wrong ITR form can lead to a defective return notice from the IT department, requiring re-filing.',
  },
  {
    id: 2,
    title: 'Enter Income Details',
    icon: Wallet,
    color: '#059669',
    bg: '#ECFDF5',
    explanation: 'Report all sources of income accurately — salary, freelance, rental, interest, capital gains, and more.',
    examples: [
      'Salary income: Use Form 16 from your employer',
      'Interest income: Bank statements and Form 26AS',
      'Rental income: Rent agreements and receipts',
      'Capital gains: Broker statements for stocks/mutual funds',
    ],
    whyMatters: 'Under-reporting income can lead to penalties up to 200% of the tax evaded. AIS (Annual Information Statement) now tracks most transactions.',
  },
  {
    id: 3,
    title: 'Add Deductions & Exemptions',
    icon: Shield,
    color: '#D97706',
    bg: '#FFFBEB',
    explanation: 'Claim all eligible deductions to reduce your taxable income. This is where most tax savings happen.',
    examples: [
      'Section 80C: ELSS, PPF, EPF, LIC, tuition fees (up to ₹1.5L)',
      'Section 80D: Health insurance premiums (₹25K-₹1L)',
      'Section 24(b): Home loan interest (up to ₹2L)',
      'Section 80E: Education loan interest (no limit)',
      'HRA Exemption: House Rent Allowance under Section 10(13A)',
    ],
    whyMatters: 'Missing deductions means overpaying taxes. Many salaried individuals miss NPS (80CCD), health check-ups, and education loans.',
  },
  {
    id: 4,
    title: 'Verify Tax Summary',
    icon: CheckCircle2,
    color: '#7C3AED',
    bg: '#F5F3FF',
    explanation: 'Cross-check your computed tax with Form 26AS and AIS. Verify TDS credits, advance tax, and self-assessment tax.',
    examples: [
      'Match TDS deducted with Form 26AS entries',
      'Verify advance tax challan details',
      'Check AIS for any unreported transactions',
      'Review computed tax liability before submission',
    ],
    whyMatters: 'Mismatches between claimed TDS and actual TDS deducted will flag your return for processing issues and delay refunds.',
  },
  {
    id: 5,
    title: 'File Your Return',
    icon: ExternalLink,
    color: '#E11D48',
    bg: '#FFF1F2',
    explanation: 'Submit your return on the Income Tax e-Filing portal. After filing, verify it within 30 days using Aadhaar OTP, net banking, or physical mail.',
    examples: [
      'Login to incometax.gov.in with PAN',
      'Select the correct assessment year',
      'Upload or fill the form online',
      'e-Verify using Aadhaar OTP (fastest method)',
    ],
    whyMatters: 'An unverified return is treated as "not filed." You have 30 days from filing to complete verification, or the return becomes invalid.',
  },
];

const StepCard = ({ step, stepNumber, isLast }) => {
  const [expanded, setExpanded] = useState(false);
  const Icon = step.icon;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={styles.stepWrapper}>
      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        <View style={[styles.stepNumber, { backgroundColor: step.bg }]}>
          <Text style={[styles.stepNumberText, { color: step.color }]}>{stepNumber}</Text>
        </View>
        {!isLast && <View style={styles.stepLine} />}
      </View>

      {/* Step content */}
      <TouchableOpacity style={styles.stepCard} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.stepHeader}>
          <View style={[styles.stepIcon, { backgroundColor: step.bg }]}>
            <Icon size={16} color={step.color} />
          </View>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <View style={{ flex: 1 }} />
          {expanded
            ? <ChevronUp size={16} color={colors.gray400} />
            : <ChevronDown size={16} color={colors.gray400} />
          }
        </View>

        <Text style={styles.stepExplanation}>{step.explanation}</Text>

        {expanded && (
          <View style={styles.stepExpanded}>
            {/* Examples */}
            <View style={styles.examplesBox}>
              <Text style={styles.examplesTitle}>Examples</Text>
              {step.examples.map((ex, i) => (
                <View key={i} style={styles.exampleRow}>
                  <Text style={styles.exampleDot}>•</Text>
                  <Text style={styles.exampleText}>{ex}</Text>
                </View>
              ))}
            </View>

            {/* Why it matters */}
            <View style={styles.whyBox}>
              <View style={styles.whyHeader}>
                <HelpCircle size={12} color="#D97706" />
                <Text style={styles.whyTitle}>Why This Matters</Text>
              </View>
              <Text style={styles.whyText}>{step.whyMatters}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const ITRGuideScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Header
        title="ITR Filing Guide"
        subtitle="Step-by-step instructions"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Intro */}
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Info size={16} color={colors.primary} />
          </View>
          <Text style={styles.introText}>
            Follow these 5 steps to file your Income Tax Return accurately. Tap each step to see detailed examples and tips.
          </Text>
        </View>

        {/* Steps */}
        {STEPS.map((step, index) => (
          <StepCard
            key={step.id}
            step={step}
            stepNumber={index + 1}
            isLast={index === STEPS.length - 1}
          />
        ))}

        {/* CTA */}
        <TouchableOpacity
          style={styles.fileCta}
          onPress={() => Linking.openURL('https://www.incometax.gov.in/')}
          activeOpacity={0.8}
        >
          <ExternalLink size={16} color={colors.white} />
          <Text style={styles.fileCtaText}>Go to Income Tax Portal</Text>
        </TouchableOpacity>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            This is a general guide. For complex cases (business income, NRI status, etc.), please consult a qualified Chartered Accountant.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  introCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'flex-start',
  },
  introIcon: {
    marginTop: 2,
  },
  introText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: '#1E40AF',
    lineHeight: 18,
    fontWeight: fontWeight.medium,
  },

  // Step layout
  stepWrapper: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  stepIndicator: {
    alignItems: 'center',
    width: 32,
    marginRight: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  stepLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  stepCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    ...shadows.sm,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  stepIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  stepExplanation: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  stepExpanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  examplesBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: 10,
  },
  examplesTitle: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  exampleRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  exampleDot: {
    color: colors.textSecondary,
    marginTop: -1,
  },
  exampleText: {
    flex: 1,
    fontSize: 11,
    color: colors.textPrimary,
    lineHeight: 16,
  },
  whyBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  whyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  whyTitle: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#D97706',
    textTransform: 'uppercase',
  },
  whyText: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
  },

  // CTA
  fileCta: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    ...shadows.md,
  },
  fileCtaText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },

  // Disclaimer
  disclaimer: {
    backgroundColor: '#FFFBEB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  disclaimerText: {
    fontSize: 10,
    color: '#92400E',
    lineHeight: 15,
    textAlign: 'center',
  },
});

export default ITRGuideScreen;
