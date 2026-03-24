import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Plus, Trash2, X, Filter, ChevronDown } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axios';
import MetricCard from '../components/MetricCard';
import { BudgetScreenSkeleton } from '../components/SkeletonLoader';
import { formatCurrency } from '../utils/formatters';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme';

const PREDEFINED_CATEGORIES = [
  'Medicine', 'Groceries', 'Rent', 'Utilities', 'Transport', 'Entertainment',
  'Salary', 'Freelance', 'Investments', 'Education', 'Dining', 'Travel',
  'Insurance', 'Savings', 'Clothing', 'Electronics', 'Health', 'Fitness',
];

const PERIODS = ['Weekly', 'Monthly', 'Quarterly', 'Yearly'];

const BudgetScreen = () => {
  const [budgets, setBudgets] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBudget, setNewBudget] = useState({ category: '', amount: '', period: 'Monthly', type: 'expense' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState({
    type: 'all',
    period: 'all',
    category: 'all',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchBudgets = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setErrorMessage('Please log in to view budgets.');
        setIsLoading(false);
        return;
      }
      const res = await api.get('/api/budgets');
      setBudgets(res.data || []);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to fetch budgets.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBudget = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      setErrorMessage('Please log in to add a budget.');
      return;
    }
    if (!newBudget.category.trim() || !newBudget.amount || parseFloat(newBudget.amount) <= 0) {
      setErrorMessage('Please enter a valid category and a positive amount.');
      return;
    }

    try {
      await api.post('/api/budgets', {
        ...newBudget,
        amount: parseFloat(newBudget.amount),
        category: newBudget.category.trim(),
      });
      await fetchBudgets();
      setIsModalOpen(false);
      setNewBudget({ category: '', amount: '', period: 'Monthly', type: 'expense' });
      setSearchQuery('');
      setErrorMessage('');
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to add budget.');
    }
  };

  const handleDeleteBudget = async (id) => {
    Alert.alert('Delete Budget', 'Are you sure you want to delete this budget?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/budgets/${id}`);
            fetchBudgets();
            setErrorMessage('');
          } catch (err) {
            setErrorMessage(err.response?.data?.message || 'Failed to delete budget.');
          }
        },
      },
    ]);
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  // Filter budgets — same logic as web
  const filteredBudgets = budgets.filter((b) => {
    return (
      (filter.type === 'all' || b.type === filter.type) &&
      (filter.period === 'all' || b.period === filter.period) &&
      (filter.category === 'all' || b.category === filter.category)
    );
  });

  const expenseBudgets = filteredBudgets.filter((b) => b.type === 'expense');
  const incomeBudgets = filteredBudgets.filter((b) => b.type === 'income');

  // Category suggestions
  const usedCategories = [...new Set(budgets.map((b) => b.category))];
  const availableCategories = PREDEFINED_CATEGORIES.filter((cat) => !usedCategories.includes(cat));
  const filteredSuggestions = searchQuery
    ? availableCategories.filter((cat) => cat.toLowerCase().includes(searchQuery.toLowerCase()))
    : availableCategories;

  // Key metrics — same as web
  const totalExpenses = expenseBudgets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
  const totalIncome = incomeBudgets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
  const netBalance = totalIncome - totalExpenses;

  const renderBudgetItem = ({ item }) => (
    <View style={styles.budgetItem}>
      <View style={styles.budgetLeft}>
        <View style={[styles.typeDot, { backgroundColor: item.type === 'expense' ? colors.error : colors.success }]} />
        <View style={styles.budgetInfo}>
          <Text style={styles.budgetCategory}>{item.category}</Text>
          <Text style={styles.budgetMeta}>{item.period} • {new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>
      <View style={styles.budgetRight}>
        <Text style={[styles.budgetAmount, { color: item.type === 'expense' ? colors.error : colors.success }]}>
          {formatCurrency(item.amount)}
        </Text>
        <TouchableOpacity
          onPress={() => handleDeleteBudget(item._id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Trash2 size={16} color={colors.gray400} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading && budgets.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <BudgetScreenSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchBudgets}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Financial Overview</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsModalOpen(true)}
            activeOpacity={0.8}
          >
            <Plus size={18} color={colors.white} />
            <Text style={styles.addButtonText}>Add Budget</Text>
          </TouchableOpacity>
        </View>

        {/* Error */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity onPress={() => setErrorMessage('')}>
              <X size={14} color={colors.error} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Metrics */}
        <View style={styles.metricsRow}>
          <MetricCard title="Expenses" value={formatCurrency(totalExpenses)} />
          <View style={{ width: spacing.md }} />
          <MetricCard title="Income" value={formatCurrency(totalIncome)} />
        </View>
        <View style={[styles.metricsRow, { marginTop: spacing.md }]}>
          <MetricCard
            title="Net Balance"
            value={formatCurrency(netBalance)}
            change={netBalance >= 0 ? 'Positive' : 'Negative'}
            positive={netBalance >= 0}
          />
          <View style={{ width: spacing.md }} />
          <MetricCard title="Categories" value={String(usedCategories.length)} />
        </View>

        {/* Expense Budgets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expense Budgets</Text>
          {expenseBudgets.length > 0 ? (
            expenseBudgets.map((item) => (
              <View key={item._id}>{renderBudgetItem({ item })}</View>
            ))
          ) : (
            <Text style={styles.emptyText}>No expense budgets yet.</Text>
          )}
        </View>

        {/* Income Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Income Goals</Text>
          {incomeBudgets.length > 0 ? (
            incomeBudgets.map((item) => (
              <View key={item._id}>{renderBudgetItem({ item })}</View>
            ))
          ) : (
            <Text style={styles.emptyText}>No income goals yet.</Text>
          )}
        </View>

        <View style={{ height: spacing['2xl'] }} />
      </ScrollView>

      {/* Add Budget Modal */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalAccent} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add New Budget</Text>
                <Text style={styles.modalSubtitle}>Set spending limits for any category</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsModalOpen(false);
                  setSearchQuery('');
                  setNewBudget({ category: '', amount: '', period: 'Monthly', type: 'expense' });
                }}
                style={styles.closeButton}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {errorMessage ? (
              <View style={[styles.errorBox, { marginHorizontal: 0, marginTop: 0 }]}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Category */}
              <Text style={styles.fieldLabel}>CATEGORY</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Search or enter category"
                placeholderTextColor={colors.gray400}
                value={newBudget.category}
                onChangeText={(text) => {
                  setNewBudget({ ...newBudget, category: text });
                  setSearchQuery(text);
                  setShowSuggestions(true);
                }}
              />
              {showSuggestions && searchQuery && filteredSuggestions.length > 0 && (
                <View style={styles.suggestionsBox}>
                  {filteredSuggestions.slice(0, 5).map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setNewBudget({ ...newBudget, category: cat });
                        setSearchQuery('');
                        setShowSuggestions(false);
                      }}
                    >
                      <Text style={styles.suggestionText}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Amount */}
              <Text style={[styles.fieldLabel, { marginTop: spacing.base }]}>BUDGET AMOUNT</Text>
              <View style={styles.amountWrapper}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={[styles.modalInput, styles.amountInput]}
                  placeholder="0.00"
                  placeholderTextColor={colors.gray400}
                  value={newBudget.amount}
                  onChangeText={(text) => setNewBudget({ ...newBudget, amount: text })}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Type */}
              <Text style={[styles.fieldLabel, { marginTop: spacing.base }]}>BUDGET TYPE</Text>
              <View style={styles.typeRow}>
                {['expense', 'income'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      newBudget.type === type && styles.typeButtonActive,
                    ]}
                    onPress={() => setNewBudget({ ...newBudget, type })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        newBudget.type === type && styles.typeButtonTextActive,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Period */}
              <Text style={[styles.fieldLabel, { marginTop: spacing.base }]}>RESET PERIOD</Text>
              <View style={styles.periodRow}>
                {PERIODS.map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodChip,
                      newBudget.period === period && styles.periodChipActive,
                    ]}
                    onPress={() => setNewBudget({ ...newBudget, period })}
                  >
                    <Text
                      style={[
                        styles.periodChipText,
                        newBudget.period === period && styles.periodChipTextActive,
                      ]}
                    >
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddBudget}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>Save Budget</Text>
              </TouchableOpacity>

              <Text style={styles.modalNote}>
                Budget resets automatically at the start of each period
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.base,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  addButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  errorBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.base,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  budgetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  budgetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  budgetInfo: {
    flex: 1,
  },
  budgetCategory: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  budgetMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  budgetRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  budgetAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    maxHeight: '90%',
  },
  modalAccent: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray300,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.7,
    marginBottom: spacing.sm,
  },
  modalInput: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  suggestionsBox: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    ...shadows.md,
  },
  suggestionItem: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  suggestionText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  amountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyPrefix: {
    position: 'absolute',
    left: spacing.base,
    zIndex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray400,
  },
  amountInput: {
    flex: 1,
    paddingLeft: spacing['2xl'],
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  typeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  typeButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  typeButtonTextActive: {
    color: colors.primaryDark,
    fontWeight: fontWeight.semibold,
  },
  periodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  periodChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  periodChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  periodChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  periodChipTextActive: {
    color: colors.primaryDark,
    fontWeight: fontWeight.semibold,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.base,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  modalNote: {
    textAlign: 'center',
    color: colors.gray400,
    fontSize: fontSize.xs,
    marginTop: spacing.base,
    marginBottom: spacing.lg,
  },
});

export default BudgetScreen;
