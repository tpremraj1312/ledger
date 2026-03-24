import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme';
import { formatCurrency, formatDateForDisplay } from '../utils/formatters';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PREDEFINED_CATEGORIES = [
  'Groceries', 'Rent', 'Utilities', 'Transport', 'Entertainment',
  'Dining', 'Shopping', 'Health', 'Education', 'Travel', 'Income', 'Other'
];

const UnknownTransactionModal = ({ visible, onClose, transactions, onUpdateCategory }) => {
  const [localTx, setLocalTx] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    if (visible && transactions) {
      setLocalTx(transactions);
    }
  }, [visible, transactions]);

  const handleSelectCategory = async (txId, category) => {
    setUpdatingId(txId);
    await onUpdateCategory(txId, category);
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLocalTx(prev => prev.filter(t => t._id !== txId));
    setUpdatingId(null);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Uncategorized Items</Text>
              <Text style={styles.subtitle}>
                {localTx.length} {localTx.length === 1 ? 'item needs' : 'items need'} your attention
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {localTx.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.successCircle}>
                <Check size={32} color={colors.success} />
              </View>
              <Text style={styles.emptyText}>All transactions categorized!</Text>
              <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
                <Text style={styles.doneBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {localTx.map((tx) => (
                <View key={tx._id} style={styles.card}>
                  <View style={styles.txHeader}>
                    <View style={styles.txInfo}>
                      <Text style={styles.txDesc} numberOfLines={1}>
                        {tx.description || 'Unknown Item'}
                      </Text>
                      <Text style={styles.txDate}>{formatDateForDisplay(tx.date)}</Text>
                    </View>
                    <Text style={[
                      styles.txAmount,
                      tx.type === 'credit' ? styles.textCredit : styles.textDebit
                    ]}>
                      {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </Text>
                  </View>

                  <Text style={styles.selectLabel}>Select a category:</Text>
                  
                  {updatingId === tx._id ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.loadingText}>Updating...</Text>
                    </View>
                  ) : (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chipScroll}
                    >
                      {PREDEFINED_CATEGORIES.map(cat => (
                        <TouchableOpacity
                          key={cat}
                          style={styles.chip}
                          onPress={() => handleSelectCategory(tx._id, cat)}
                        >
                          <Text style={styles.chipText}>{cat}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              ))}
              <View style={{ height: spacing.xl }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    height: '85%',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
  },
  scrollContent: {
    paddingBottom: spacing['3xl'],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  txDesc: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  txDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  txAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  textCredit: {
    color: colors.success,
  },
  textDebit: {
    color: colors.error,
  },
  selectLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  chipScroll: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight + '15',
    borderWidth: 1,
    borderColor: colors.primaryLight + '30',
  },
  chipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.primaryDark,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: '20%',
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  doneBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  doneBtnText: {
    color: colors.white,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.base,
  },
});

export default UnknownTransactionModal;
