import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  Plus,
  Trash2,
  X,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Pause,
  Play,
  Loader2,
  Filter,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useFinancial } from '../context/FinancialContext';
import OverviewCard from '../components/OverviewCard';
import { ExpensesScreenSkeleton } from '../components/SkeletonLoader';
import FilterBottomSheet from '../components/FilterBottomSheet';
import SpendingChart from '../components/SpendingChart';
import CategoryChart from '../components/CategoryChart';
import { formatCurrency, formatDateForDisplay, formatDateForInput } from '../utils/formatters';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme';

const ExpensesScreen = () => {
  const { data, loading: isLoading, error, totals, refreshData, filters, updateFilters } = useFinancial();

  // State — matching web ExpensesView exactly
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isManualTxModalOpen, setIsManualTxModalOpen] = useState(false);
  const [manualTxData, setManualTxData] = useState({
    type: 'debit',
    amount: '',
    category: '',
    date: formatDateForInput(new Date()),
    description: '',
  });
  const [modalError, setModalError] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [expandedTransactions, setExpandedTransactions] = useState({});
  const [pagination, setPagination] = useState({ currentPage: 1, limit: 10, totalPages: 1 });
  const [paginatedTransactions, setPaginatedTransactions] = useState([]);
  const [isPaginating, setIsPaginating] = useState(false);

  // Recurring state
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [recurringList, setRecurringList] = useState([]);
  const [isAddingRecurring, setIsAddingRecurring] = useState(false);
  const [newRecurringData, setNewRecurringData] = useState({
    amount: '',
    category: '',
    frequency: 'monthly',
    description: '',
    isEssential: true,
  });

  // Derived data
  const allTransactions = data?.transactions || [];

  // Categories
  const categories = useMemo(() => {
    const allCategories = new Set(['All']);
    allTransactions.forEach((tx) => {
      if (tx.source === 'billscan' && tx.categories) {
        tx.categories.forEach((cat) => allCategories.add(cat.category));
      } else {
        allCategories.add(tx.category);
      }
    });
    return Array.from(allCategories);
  }, [allTransactions]);

  // Server Pagination
  const fetchTransactions = useCallback(async (page = 1) => {
    try {
      setIsPaginating(true);
      const params = {
        page,
        limit: pagination.limit,
        startDate: filters.startDate,
        endDate: filters.endDate,
      };
      const res = await api.get('/api/transactions', { params });
      setPaginatedTransactions(res.data.transactions || []);
      setPagination(prev => ({ 
        ...prev, 
        currentPage: res.data.pagination.currentPage, 
        totalPages: res.data.pagination.totalPages || 1
      }));
    } catch (err) {
      console.error('Failed to fetch paginated transactions', err);
    } finally {
      setIsPaginating(false);
    }
  }, [filters, pagination.limit]);

  useEffect(() => {
    fetchTransactions(pagination.currentPage);
  }, [fetchTransactions, pagination.currentPage]);

  // Handlers — exact same logic as web
  const handleManualSubmit = async () => {
    setModalError('');
    setIsSubmittingManual(true);

    const { type, amount, category, date } = manualTxData;
    if (!type || !amount || !category || !date || parseFloat(amount) <= 0) {
      setModalError('Please fill all required fields with a valid positive amount.');
      setIsSubmittingManual(false);
      return;
    }

    const token = await AsyncStorage.getItem('token');
    if (!token) {
      setModalError('Authentication error. Please log in again.');
      setIsSubmittingManual(false);
      return;
    }

    const payload = {
      type,
      amount: parseFloat(amount),
      category,
      date,
      description: manualTxData.description,
      source: 'manual',
    };

    try {
      await api.post('/api/transactions', payload);
      setIsManualTxModalOpen(false);
      setManualTxData({
        type: 'debit',
        amount: '',
        category: '',
        date: formatDateForInput(new Date()),
        description: '',
      });
      fetchTransactions(1);
      await refreshData();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to record transaction.';
      setModalError(errorMessage);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handleDeleteTransaction = async (id) => {
    Alert.alert('Delete Transaction', 'Are you sure you want to delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/transactions/${id}`);
            fetchTransactions(pagination.currentPage);
            await refreshData();
          } catch (err) {
            console.error('Failed to delete transaction', err);
          }
        },
      },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All',
      'Are you sure you want to delete ALL transactions? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/api/transactions/all/delete');
              fetchTransactions(1);
              await refreshData();
            } catch (err) {
              console.error('Failed to delete all transactions', err);
            }
          },
        },
      ]
    );
  };

  const toggleTransaction = (txId) => {
    setExpandedTransactions((prev) => ({
      ...prev,
      [txId]: !prev[txId],
    }));
  };

  // Recurring handlers
  const fetchRecurringExpenses = async () => {
    try {
      const response = await api.get('/api/recurring');
      setRecurringList(response.data);
    } catch (err) {
      console.error('Failed to fetch recurring expenses', err);
    }
  };

  const handleAddRecurring = async () => {
    try {
      await api.post('/api/recurring', newRecurringData);
      setNewRecurringData({ amount: '', category: '', frequency: 'monthly', description: '', isEssential: true });
      setIsAddingRecurring(false);
      fetchRecurringExpenses();
      refreshData();
    } catch (err) {
      console.error('Failed to add recurring expense', err);
    }
  };

  const handleDeleteRecurring = async (id) => {
    Alert.alert('Delete Recurring', 'Delete this recurring payment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/recurring/${id}`);
            fetchRecurringExpenses();
            refreshData();
          } catch (err) {
            console.error('Failed to delete recurring expense', err);
          }
        },
      },
    ]);
  };

  const toggleRecurringStatus = async (item) => {
    const newStatus = item.status === 'active' ? 'paused' : 'active';
    try {
      await api.put(`/api/recurring/${item._id}`, { status: newStatus });
      fetchRecurringExpenses();
      refreshData();
    } catch (err) {
      console.error('Failed to update recurring status', err);
    }
  };

  useEffect(() => {
    if (isRecurringModalOpen) {
      fetchRecurringExpenses();
    }
  }, [isRecurringModalOpen]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, currentPage: newPage }));
    }
  };

  // Loading
  if (isLoading && data === null) {
    return (
      <SafeAreaView style={styles.container}>
        <ExpensesScreenSkeleton />
      </SafeAreaView>
    );
  }

  // Error
  if (error && !isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertTriangle size={48} color={colors.error} />
          <Text style={styles.errorTextBig}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
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
            onRefresh={refreshData}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Financial Analysis</Text>
            <Text style={styles.headerSubtitle}>Expense tracking & recurring management</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setIsFilterVisible(true)}
              activeOpacity={0.8}
            >
              <Filter size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setIsManualTxModalOpen(true)}
              activeOpacity={0.8}
            >
              <Plus size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryRow}>
            <OverviewCard
              label="Total Income"
              value={formatCurrency(totals.income)}
              icon={TrendingUp}
              iconColor={colors.success}
              bgColor={colors.white}
            />
            <View style={{ width: spacing.md }} />
            <OverviewCard
              label="Total Expenses"
              value={formatCurrency(totals.expenses)}
              icon={TrendingDown}
              iconColor={colors.error}
              bgColor={colors.white}
            />
          </View>
          <View style={[styles.summaryRow, { marginTop: spacing.md }]}>
            <OverviewCard
              label="Net Savings"
              value={formatCurrency(totals.savings)}
              icon={CheckCircle2}
              iconColor={colors.primary}
              bgColor={colors.white}
            />
            <View style={{ width: spacing.md }} />
            <OverviewCard
              label="Non-Essential"
              value={formatCurrency(totals.nonEssential)}
              icon={AlertTriangle}
              iconColor={colors.warning}
              bgColor={colors.white}
            />
          </View>
        </View>

        {/* Recurring Payments Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recurring</Text>
            <TouchableOpacity onPress={() => setIsRecurringModalOpen(true)}>
              <Text style={styles.manageLink}>Manage</Text>
            </TouchableOpacity>
          </View>
          {data?.upcomingRecurring?.length > 0 ? (
            data.upcomingRecurring.map((item) => (
              <View key={item._id} style={styles.recurringItem}>
                <View>
                  <Text style={styles.recurringCategory}>{item.category}</Text>
                  <Text style={styles.recurringMeta}>
                    {item.frequency} • {formatDateForDisplay(item.nextOccurrence)}
                  </Text>
                </View>
                <Text style={styles.recurringAmount}>-{formatCurrency(item.amount)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyRecurring}>
              <Clock size={28} color={colors.gray300} />
              <Text style={styles.emptyRecurringText}>No upcoming recurring payments</Text>
            </View>
          )}
        </View>

        {/* Charts Section */}
        <View style={styles.section}>
          <SpendingChart data={data?.trendData || []} title="Expenses Over Time" />
          <CategoryChart data={data?.categoryBreakdown || []} title="Expense Distribution" />
        </View>

        {/* Transaction List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              {isPaginating && <ActivityIndicator size="small" color={colors.primary} />}
              <Text style={styles.pageInfo}>
                Page {pagination.currentPage} of {pagination.totalPages}
              </Text>
            </View>
          </View>

          {paginatedTransactions.length > 0 ? (
            <>
              {paginatedTransactions.map((tx) => (
                <TouchableOpacity
                  key={tx._id}
                  activeOpacity={0.7}
                  onPress={() => tx.source === 'billscan' && toggleTransaction(tx._id)}
                >
                  <View style={styles.txCard}>
                    <View style={styles.txRow}>
                      <View style={styles.txLeft}>
                        <View style={[styles.txDot, { backgroundColor: tx.type === 'credit' ? colors.success : colors.error }]} />
                        <View style={styles.txInfo}>
                          <View style={styles.txCategoryRow}>
                            <Text style={styles.txCategory}>{tx.category}</Text>
                            {tx.source === 'billscan' && (
                              expandedTransactions[tx._id]
                                ? <ChevronUp size={14} color={colors.gray400} />
                                : <ChevronDown size={14} color={colors.gray400} />
                            )}
                          </View>
                          <Text style={styles.txDesc} numberOfLines={1}>{tx.description || '—'}</Text>
                          <View style={styles.txMeta}>
                            <Text style={styles.txDate}>{formatDateForDisplay(tx.date)}</Text>
                            {tx.source && (
                              <View style={[styles.txBadge, tx.source === 'manual' ? styles.badgeManual : styles.badgeScan]}>
                                <Text style={[styles.txBadgeText, tx.source === 'manual' ? styles.badgeManualText : styles.badgeScanText]}>
                                  {tx.source === 'manual' ? 'Manual' : 'Scanned'}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                      <View style={styles.txRight}>
                        <Text style={[styles.txAmount, tx.type === 'credit' ? styles.amountCredit : styles.amountDebit]}>
                          {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleDeleteTransaction(tx._id)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Trash2 size={14} color={colors.gray400} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Expanded categories */}
                    {tx.source === 'billscan' && expandedTransactions[tx._id] && tx.categories && (
                      <View style={styles.expandedSection}>
                        <Text style={styles.expandedTitle}>Categories:</Text>
                        {tx.categories.map((cat, index) => (
                          <View key={index} style={styles.expandedItem}>
                            <Text style={styles.expandedCat}>
                              {cat.category}: {formatCurrency(cat.categoryTotal)}
                            </Text>
                            {cat.isNonEssential && (
                              <Text style={styles.nonEssentialBadge}>(Non-Essential)</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              {/* Pagination + Clear */}
              <View style={styles.paginationRow}>
                <TouchableOpacity onPress={handleClearAll}>
                  <View style={styles.clearButton}>
                    <Trash2 size={14} color={colors.error} />
                    <Text style={styles.clearButtonText}>Clear History</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.pagination}>
                  <TouchableOpacity
                    style={[styles.pageButton, pagination.currentPage <= 1 && styles.pageButtonDisabled]}
                    onPress={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage <= 1}
                  >
                    <Text style={styles.pageButtonText}>‹</Text>
                  </TouchableOpacity>
                  <Text style={styles.pageText}>
                    {pagination.currentPage} / {pagination.totalPages}
                  </Text>
                  <TouchableOpacity
                    style={[styles.pageButton, pagination.currentPage >= pagination.totalPages && styles.pageButtonDisabled]}
                    onPress={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage >= pagination.totalPages}
                  >
                    <Text style={styles.pageButtonText}>›</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No records found for this period.</Text>
            </View>
          )}
        </View>

        <View style={{ height: spacing['2xl'] }} />
      </ScrollView>

      <FilterBottomSheet
        visible={isFilterVisible}
        onClose={() => setIsFilterVisible(false)}
        currentFilters={filters}
        onApply={(newFilters) => updateFilters(newFilters)}
      />

      {/* Add Expense Modal */}
      <Modal
        visible={isManualTxModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsManualTxModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalAccent} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add Expense</Text>
                <Text style={styles.modalSubtitle}>Record a past transaction</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsManualTxModalOpen(false)}
                style={styles.closeButton}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {modalError ? (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>{modalError}</Text>
              </View>
            ) : null}

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Type Toggle */}
              <Text style={styles.fieldLabel}>TYPE</Text>
              <View style={styles.typeRow}>
                {['debit', 'credit'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeBtn, manualTxData.type === type && styles.typeBtnActive]}
                    onPress={() => {
                      setManualTxData((prev) => ({ ...prev, type }));
                      setModalError('');
                    }}
                  >
                    <Text style={[styles.typeBtnText, manualTxData.type === type && styles.typeBtnTextActive]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount */}
              <Text style={[styles.fieldLabel, { marginTop: spacing.base }]}>AMOUNT</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter amount"
                placeholderTextColor={colors.gray400}
                value={manualTxData.amount}
                onChangeText={(text) => {
                  setManualTxData((prev) => ({ ...prev, amount: text }));
                  setModalError('');
                }}
                keyboardType="decimal-pad"
              />

              {/* Category */}
              <Text style={[styles.fieldLabel, { marginTop: spacing.base }]}>CATEGORY</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Groceries, Salary"
                placeholderTextColor={colors.gray400}
                value={manualTxData.category}
                onChangeText={(text) => {
                  setManualTxData((prev) => ({ ...prev, category: text }));
                  setModalError('');
                }}
              />

              {/* Date */}
              <Text style={[styles.fieldLabel, { marginTop: spacing.base }]}>DATE</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.gray400}
                value={manualTxData.date}
                onChangeText={(text) => {
                  setManualTxData((prev) => ({ ...prev, date: text }));
                  setModalError('');
                }}
              />

              {/* Description */}
              <Text style={[styles.fieldLabel, { marginTop: spacing.base }]}>DESCRIPTION (OPTIONAL)</Text>
              <TextInput
                style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Add a note about the transaction"
                placeholderTextColor={colors.gray400}
                value={manualTxData.description}
                onChangeText={(text) => setManualTxData((prev) => ({ ...prev, description: text }))}
                multiline
              />

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitButton, isSubmittingManual && styles.disabledButton]}
                onPress={handleManualSubmit}
                disabled={isSubmittingManual}
                activeOpacity={0.8}
              >
                {isSubmittingManual ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Add Expense</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Recurring Modal */}
      <Modal
        visible={isRecurringModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsRecurringModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalAccent} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Recurring Payments</Text>
                <Text style={styles.modalSubtitle}>Manage your automated transactions</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsRecurringModalOpen(false)}
                style={styles.closeButton}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Add Recurring */}
              {!isAddingRecurring ? (
                <TouchableOpacity
                  style={styles.addRecurringButton}
                  onPress={() => setIsAddingRecurring(true)}
                >
                  <Plus size={18} color={colors.textSecondary} />
                  <Text style={styles.addRecurringText}>Add New Recurring Payment</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.addRecurringForm}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Category"
                    placeholderTextColor={colors.gray400}
                    value={newRecurringData.category}
                    onChangeText={(text) => setNewRecurringData((p) => ({ ...p, category: text }))}
                  />
                  <TextInput
                    style={[styles.modalInput, { marginTop: spacing.sm }]}
                    placeholder="Amount"
                    placeholderTextColor={colors.gray400}
                    value={newRecurringData.amount}
                    onChangeText={(text) => setNewRecurringData((p) => ({ ...p, amount: text }))}
                    keyboardType="decimal-pad"
                  />
                  <View style={[styles.typeRow, { marginTop: spacing.sm }]}>
                    {['daily', 'weekly', 'monthly', 'yearly'].map((freq) => (
                      <TouchableOpacity
                        key={freq}
                        style={[
                          styles.freqChip,
                          newRecurringData.frequency === freq && styles.freqChipActive,
                        ]}
                        onPress={() => setNewRecurringData((p) => ({ ...p, frequency: freq }))}
                      >
                        <Text style={[
                          styles.freqChipText,
                          newRecurringData.frequency === freq && styles.freqChipTextActive,
                        ]}>
                          {freq.charAt(0).toUpperCase() + freq.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.formActions}>
                    <TouchableOpacity onPress={() => setIsAddingRecurring(false)}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveRecurringBtn} onPress={handleAddRecurring}>
                      <Text style={styles.saveRecurringText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* List */}
              <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Active Subscriptions</Text>
              {recurringList.length > 0 ? (
                recurringList.map((item) => (
                  <View key={item._id} style={styles.recurringListItem}>
                    <View style={styles.recurringListLeft}>
                      <Text style={styles.recurringListCategory}>{item.category}</Text>
                      <Text style={styles.recurringListMeta}>
                        {item.frequency} • Next: {formatDateForDisplay(item.nextOccurrence)}
                      </Text>
                    </View>
                    <View style={styles.recurringListRight}>
                      <View style={styles.recurringAmountCol}>
                        <Text style={styles.recurringListAmount}>{formatCurrency(item.amount)}</Text>
                        <Text style={[styles.essentialBadge, { color: item.isEssential ? colors.success : colors.warning }]}>
                          {item.isEssential ? 'ESSENTIAL' : 'LIFESTYLE'}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => toggleRecurringStatus(item)} style={styles.recurringAction}>
                        {item.status === 'active'
                          ? <Pause size={16} color={colors.gray400} />
                          : <Play size={16} color={colors.warning} />
                        }
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteRecurring(item._id)} style={styles.recurringAction}>
                        <Trash2 size={16} color={colors.gray400} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyRecurring}>
                  <Clock size={32} color={colors.gray300} />
                  <Text style={styles.emptyRecurringText}>No recurring payments set up yet</Text>
                </View>
              )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.gray400,
    fontWeight: fontWeight.medium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorTextBig: {
    color: colors.error,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
    marginTop: spacing.base,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
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
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  summaryGrid: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  manageLink: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  pageInfo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  recurringItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recurringCategory: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  recurringMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  recurringAmount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  emptyRecurring: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyRecurringText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  // Transaction card
  txCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  txDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  txInfo: {
    flex: 1,
  },
  txCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  txCategory: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  txDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  txMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  txDate: {
    fontSize: fontSize.xs,
    color: colors.gray400,
  },
  txBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeManual: {
    backgroundColor: colors.primary + '15',
  },
  badgeScan: {
    backgroundColor: '#8B5CF6' + '15',
  },
  txBadgeText: {
    fontSize: 9,
    fontWeight: fontWeight.semibold,
  },
  badgeManualText: {
    color: colors.primary,
  },
  badgeScanText: {
    color: '#8B5CF6',
  },
  txRight: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  txAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  amountCredit: {
    color: colors.success,
  },
  amountDebit: {
    color: colors.error,
  },
  expandedSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  expandedTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  expandedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    paddingLeft: spacing.base,
  },
  expandedCat: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  nonEssentialBadge: {
    fontSize: fontSize.xs,
    color: colors.warning,
    marginLeft: spacing.xs,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.base,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  clearButtonText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: fontWeight.medium,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pageButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageButtonDisabled: {
    opacity: 0.4,
  },
  pageButtonText: {
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  pageText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  emptyState: {
    paddingVertical: spacing['3xl'],
    alignItems: 'center',
  },
  emptyStateText: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    fontStyle: 'italic',
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
  modalErrorBox: {
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  modalErrorText: {
    color: colors.error,
    fontSize: fontSize.sm,
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
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  typeBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    minWidth: 60,
  },
  typeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  typeBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  typeBtnTextActive: {
    color: colors.primaryDark,
    fontWeight: fontWeight.semibold,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.base,
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  // Recurring modal styles
  addRecurringButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.gray200,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  addRecurringText: {
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  addRecurringForm: {
    backgroundColor: colors.primary + '08',
    padding: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  freqChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  freqChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  freqChipText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  freqChipTextActive: {
    color: colors.primaryDark,
    fontWeight: fontWeight.semibold,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.base,
    marginTop: spacing.base,
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
  },
  saveRecurringBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  saveRecurringText: {
    color: colors.white,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
  },
  recurringListItem: {
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
  recurringListLeft: {
    flex: 1,
  },
  recurringListCategory: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  recurringListMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  recurringListRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  recurringAmountCol: {
    alignItems: 'flex-end',
  },
  recurringListAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  essentialBadge: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    marginTop: 2,
  },
  recurringAction: {
    padding: spacing.xs,
  },
});

export default ExpensesScreen;
