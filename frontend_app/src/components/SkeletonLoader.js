import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';

const SkeletonBlock = ({ width, height, style }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width || '100%',
          height: height || 16,
          backgroundColor: colors.gray200,
          borderRadius: borderRadius.sm,
          opacity,
        },
        style,
      ]}
    />
  );
};

const SkeletonCard = () => (
  <View style={styles.card}>
    <SkeletonBlock width={80} height={12} />
    <SkeletonBlock width={120} height={20} style={{ marginTop: spacing.sm }} />
  </View>
);

const SkeletonTransaction = () => (
  <View style={styles.transaction}>
    <View style={styles.transactionLeft}>
      <SkeletonBlock width={8} height={8} style={{ borderRadius: 4 }} />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <SkeletonBlock width="60%" height={14} />
        <SkeletonBlock width="80%" height={10} style={{ marginTop: spacing.xs }} />
        <SkeletonBlock width="30%" height={8} style={{ marginTop: spacing.xs }} />
      </View>
    </View>
    <SkeletonBlock width={70} height={16} />
  </View>
);

const HomeScreenSkeleton = () => (
  <View style={styles.container}>
    {/* Quick Actions */}
    <View style={styles.quickActions}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <SkeletonBlock key={i} width={76} height={76} style={{ borderRadius: borderRadius.lg, marginRight: spacing.md }} />
      ))}
    </View>

    {/* Overview Cards */}
    <View style={styles.cardRow}>
      <SkeletonCard />
      <SkeletonCard />
    </View>
    <View style={styles.cardRow}>
      <SkeletonCard />
      <SkeletonCard />
    </View>

    {/* Transactions */}
    <SkeletonBlock width={140} height={18} style={{ marginTop: spacing.xl, marginBottom: spacing.base }} />
    {[1, 2, 3, 4, 5].map((i) => (
      <SkeletonTransaction key={i} />
    ))}
  </View>
);

const BudgetScreenSkeleton = () => (
  <View style={styles.container}>
    <View style={styles.cardRow}>
      <SkeletonCard />
      <SkeletonCard />
    </View>
    <View style={styles.cardRow}>
      <SkeletonCard />
      <SkeletonCard />
    </View>
    <SkeletonBlock width={140} height={18} style={{ marginTop: spacing.xl, marginBottom: spacing.base }} />
    {[1, 2, 3, 4, 5].map((i) => (
      <SkeletonBlock key={i} width="100%" height={80} style={{ borderRadius: borderRadius.lg, marginBottom: spacing.md }} />
    ))}
  </View>
);

const ExpensesScreenSkeleton = () => (
  <View style={styles.container}>
    <View style={styles.cardRow}>
      <SkeletonCard />
      <SkeletonCard />
    </View>
    <View style={styles.cardRow}>
      <SkeletonCard />
      <SkeletonCard />
    </View>
    <SkeletonBlock width="100%" height={150} style={{ borderRadius: borderRadius.lg, marginTop: spacing.lg, marginBottom: spacing.xl }} />
    <SkeletonBlock width={140} height={18} style={{ marginBottom: spacing.base }} />
    {[1, 2, 3, 4, 5].map((i) => (
      <SkeletonTransaction key={i} />
    ))}
  </View>
);

const GamificationScreenSkeleton = () => (
  <View style={styles.container}>
    <SkeletonBlock width="100%" height={120} style={{ borderRadius: borderRadius.xl, marginBottom: spacing.xl }} />
    <SkeletonBlock width="100%" height={80} style={{ borderRadius: borderRadius.xl, marginBottom: spacing.xl }} />
    <SkeletonBlock width="100%" height={200} style={{ borderRadius: borderRadius.xl, marginBottom: spacing.xl }} />
  </View>
);

const InvestmentScreenSkeleton = () => (
  <View style={styles.container}>
    {/* Header Skeleton */}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl }}>
      <SkeletonBlock width={120} height={20} />
      <SkeletonBlock width={40} height={40} style={{ borderRadius: borderRadius.md }} />
    </View>

    {/* Summary Pill Skeleton */}
    <SkeletonBlock width="100%" height={80} style={{ borderRadius: borderRadius.xl, marginBottom: spacing.lg }} />

    {/* Content Area Skeleton */}
    <View style={styles.cardRow}>
      <SkeletonCard />
      <SkeletonCard />
    </View>
    <SkeletonBlock width="100%" height={200} style={{ borderRadius: borderRadius.xl, marginTop: spacing.md }} />
  </View>
);

const TaxOptimizerScreenSkeleton = () => (
  <View style={styles.container}>
    {/* Header Skeleton */}
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl, gap: spacing.md }}>
      <SkeletonBlock width={40} height={40} style={{ borderRadius: borderRadius.md }} />
      <View>
        <SkeletonBlock width={150} height={18} />
        <SkeletonBlock width={100} height={10} style={{ marginTop: spacing.xs }} />
      </View>
    </View>

    {/* Hero Section Skeleton */}
    <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
      <SkeletonBlock width={140} height={140} style={{ borderRadius: 70 }} />
      <SkeletonBlock width="100%" height={120} style={{ borderRadius: borderRadius.lg, marginTop: spacing.lg }} />
    </View>

    {/* Stats Grid Skeleton */}
    <View style={styles.cardRow}>
      <SkeletonCard />
      <SkeletonCard />
    </View>

    {/* Section Skeleton */}
    <SkeletonBlock width={160} height={18} style={{ marginTop: spacing.lg, marginBottom: spacing.base }} />
    <SkeletonBlock width="100%" height={220} style={{ borderRadius: borderRadius.lg }} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: spacing.base,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  cardRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transaction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
});

export { 
  SkeletonBlock, 
  SkeletonCard, 
  SkeletonTransaction, 
  BudgetScreenSkeleton, 
  ExpensesScreenSkeleton, 
  GamificationScreenSkeleton, 
  InvestmentScreenSkeleton,
  TaxOptimizerScreenSkeleton
};
export default HomeScreenSkeleton;
