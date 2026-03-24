import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, ActivityIndicator, Alert, Dimensions, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Gauge, Plus, X, Copy, Trash2, Save, AlertTriangle,
  ChevronLeft, ChevronRight, Target, Wallet, CheckCircle2, Activity
} from 'lucide-react-native';


import { useFamily } from '../../context/FamilyContext';
import { 
  getFamilyBudgetUsage, upsertFamilyBudget, copyPreviousFamilyBudget 
} from '../../services/familyService';

const { width } = Dimensions.get('window');

// --- Design Tokens ---
const COLORS = {
  primary: '#1E6BD6',
  primaryLight: '#4C8DF0',
  primaryDark: '#154EA1',
  background: '#FFFFFF',
  surface: '#F5F7FA',
  textPrimary: '#0D1B2A',
  textSecondary: '#44556B',
  border: '#E0E6EE',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  indigo: '#6366F1',
  indigoLight: '#EEF2FF',
  emerald: '#10B981',
  emeraldLight: '#ECFDF5',
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
})}`;

export default function FamilyBudgetScreen({ navigation }) {
  const { group, isAdmin, refreshFamilyFinancialData, hasGroup } = useFamily();
  const now = new Date();
  
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [year, setYear] = useState(now.getUTCFullYear());
  const [budgetData, setBudgetData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState('');
  
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatAmount, setNewCatAmount] = useState('');

  const loadBudget = useCallback(async () => {
    if (!hasGroup) return;
    setLoading(true);
    setError('');
    try {
      const data = await getFamilyBudgetUsage(month, year);
      setBudgetData(data);
      setCategories(data.budget?.categories || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load budget data');
    } finally { setLoading(false); }
  }, [hasGroup, month, year]);

  useEffect(() => { loadBudget(); }, [loadBudget]);

  const handleSave = async () => {
    setSaving(true); 
    setError('');
    try {
      await upsertFamilyBudget({ month, year, categories });
      await loadBudget();
      await refreshFamilyFinancialData();
      Alert.alert('Success', 'Budget saved successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save budget.');
    } finally { setSaving(false); }
  };

  const handleCopyPrev = async () => {
    setCopying(true); 
    setError('');
    try {
      await copyPreviousFamilyBudget(month, year);
      await loadBudget();
      Alert.alert('Success', 'Copied previous month budget');
    } catch (err) {
      setError(err.response?.data?.message || 'No previous month budget found.');
    } finally { setCopying(false); }
  };

  const addCategory = () => {
    if (!newCatName.trim() || !newCatAmount) return;
    setCategories(prev => [...prev, { 
      name: newCatName.trim(), 
      allocatedAmount: parseFloat(newCatAmount) || 0 
    }]);
    setNewCatName('');
    setNewCatAmount('');
    setAddingCat(false);
  };

  const removeCategory = (idx) => {
    setCategories(prev => prev.filter((_, i) => i !== idx));
  };

  const updateCategoryAmount = (idx, amount) => {
    setCategories(prev => prev.map((c, i) => i === idx ? { 
      ...c, 
      allocatedAmount: parseFloat(amount) || 0 
    } : c));
  };

  const totalAllocated = useMemo(() => categories.reduce((s, c) => s + (c.allocatedAmount || 0), 0), [categories]);
  const totalSpent = useMemo(() => (budgetData?.categoryUsage || []).reduce((s, c) => s + c.spent, 0), [budgetData]);

  const changeMonth = (dir) => {
    if (dir === 'prev') {
      if (month === 1) { setMonth(12); setYear(y => y - 1); }
      else { setMonth(m => m - 1); }
    } else {
      if (month === 12) { setMonth(1); setYear(y => y + 1); }
      else { setMonth(m => m + 1); }
    }
  };

  if (!hasGroup) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noGroupContainer}>
          <Gauge size={64} color={COLORS.textSecondary} />
          <Text style={styles.noGroupTitle}>No Family Group</Text>
          <Text style={styles.noGroupSub}>Create or join a family group to manage shared budgets.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderCategory = ({ item, index }) => {
    const usage = (budgetData?.categoryUsage || []).find(u => u.name === item.name);
    const spent = usage?.spent || 0;
    const progress = item.allocatedAmount > 0 ? (spent / item.allocatedAmount) * 100 : 0;
    
    return (
      <View style={styles.categoryCard}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryInfo}>
            <View style={styles.categoryIconBox}>
              <Text style={styles.categoryIconText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.categoryName}>{item.name}</Text>
              <Text style={styles.categorySpent}>{formatCurrency(spent)} spent</Text>
            </View>
          </View>

          {isAdmin ? (
            <View style={styles.categoryInputContainer}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                style={styles.categoryInput}
                value={item.allocatedAmount.toString()}
                onChangeText={text => updateCategoryAmount(index, text)}
                keyboardType="numeric"
                selectTextOnFocus
              />
              <TouchableOpacity onPress={() => removeCategory(index)} style={styles.removeIcon}>
                <Trash2 size={16} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.categoryAllocated}>{formatCurrency(item.allocatedAmount)}</Text>
          )}
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>Usage</Text>
            <Text style={[styles.progressValue, progress > 100 && { color: COLORS.danger }]}>
              {progress.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${Math.min(progress, 100)}%` },
                progress > 100 ? { backgroundColor: COLORS.danger } : 
                progress > 80 ? { backgroundColor: COLORS.warning } : 
                { backgroundColor: COLORS.emerald }
              ]} 
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Family Budget</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Month Selector */}
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => changeMonth('prev')} style={styles.monthNav}>
            <ChevronLeft size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <View style={styles.monthDisplay}>
            <Text style={styles.monthText}>{MONTHS[month - 1]}</Text>
            <Text style={styles.yearText}>{year}</Text>
          </View>
          <TouchableOpacity onPress={() => changeMonth('next')} style={styles.monthNav}>
            <ChevronRight size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerAll}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={styles.errorBox}>
              <AlertTriangle size={18} color={COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Budget Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Budget</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalAllocated)}</Text>
            
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summarySubLabel}>Spent</Text>
                <Text style={styles.summarySubValue}>{formatCurrency(totalSpent)}</Text>
              </View>
              <View style={styles.alignRight}>
                <Text style={styles.summarySubLabel}>Remaining</Text>
                <Text style={[styles.summarySubValue, (totalAllocated - totalSpent) < 0 && { color: COLORS.danger }]}>
                  {formatCurrency(totalAllocated - totalSpent)}
                </Text>
              </View>
            </View>

            <View style={styles.mainProgressBg}>
              <View 
                style={[
                  styles.mainProgressFill, 
                  { width: `${Math.min((totalSpent / (totalAllocated || 1)) * 100, 100)}%` },
                  totalSpent > totalAllocated && { backgroundColor: COLORS.danger }
                ]} 
              />
            </View>
          </View>

          {/* Member Spending Breakdown */}
          {budgetData?.memberBreakdown?.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Target size={16} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Member Spending</Text>
              </View>
              {budgetData.memberBreakdown.map((m, i) => (
                <View key={i} style={styles.memberItem}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>{(m.name || 'U').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.memberContent}>
                    <View style={styles.memberInfoRow}>
                      <Text style={styles.memberName}>{m.name}</Text>
                      <Text style={styles.memberSpent}>{formatCurrency(m.totalSpent)}</Text>
                    </View>
                    <View style={styles.memberProgressBg}>
                      <View 
                        style={[
                          styles.memberProgressFill, 
                          { width: `${(m.totalSpent / (totalSpent || 1)) * 100}%` }
                        ]} 
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Categories List */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Wallet size={16} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Categories</Text>
              {isAdmin && (
                <TouchableOpacity onPress={() => setAddingCat(true)} style={styles.headerAddBtn}>
                  <Plus size={14} color={COLORS.primary} />
                  <Text style={styles.headerAddBtnText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>

            {addingCat && (
              <View style={styles.addCategoryBox}>
                <View style={styles.addInputs}>
                  <TextInput
                    style={styles.addInput}
                    placeholder="Name"
                    value={newCatName}
                    onChangeText={setNewCatName}
                  />
                  <TextInput
                    style={[styles.addInput, { width: 100 }]}
                    placeholder="Amount"
                    value={newCatAmount}
                    onChangeText={setNewCatAmount}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.addActions}>
                  <TouchableOpacity onPress={addCategory} style={styles.addConfirm}>
                    <CheckCircle2 size={24} color={COLORS.success} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setAddingCat(false)} style={styles.addCancel}>
                    <X size={24} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {categories.length === 0 && !addingCat ? (
              <View style={styles.emptyBox}>
                <Wallet size={32} color={COLORS.textSecondary} opacity={0.3} />
                <Text style={styles.emptyText}>No categories defined yet</Text>
              </View>
            ) : (
              categories.map((cat, idx) => renderCategory({ item: cat, index: idx }))
            )}
          </View>

          {/* Admin Actions Footer */}
          {isAdmin && (
            <View style={styles.adminFooter}>
              <TouchableOpacity 
                style={[styles.adminBtn, copying && styles.disabledBtn]} 
                onPress={handleCopyPrev}
                disabled={copying}
              >
                {copying ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Copy size={18} color={COLORS.primary} />}
                <Text style={styles.adminBtnText}>Copy Previous</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveBtn, saving && styles.disabledBtn]} 
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Save size={18} color="#fff" />}
                <Text style={styles.saveBtnText}>Save Budget</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  centerAll: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerPlaceholder: {
    width: 32,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  monthNav: {
    padding: 10,
  },
  monthDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 180,
  },
  monthText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  yearText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  noGroupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noGroupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  noGroupSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger + '10',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    flex: 1,
  },
  // Summary Card
  summaryCard: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summarySubLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  summarySubValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  mainProgressBg: {
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  mainProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  headerAddBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Member Items
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.indigoLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    color: COLORS.indigo,
    fontWeight: '700',
    fontSize: 15,
  },
  memberContent: {
    flex: 1,
  },
  memberInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  memberSpent: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  memberProgressBg: {
    height: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  memberProgressFill: {
    height: '100%',
    backgroundColor: COLORS.indigo,
    borderRadius: 2,
  },
  // Category Cards
  categoryCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIconText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  categorySpent: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  categoryInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
  },
  currencyPrefix: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 4,
  },
  categoryInput: {
    width: 60,
    height: 40,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  removeIcon: {
    padding: 8,
    marginLeft: 4,
  },
  categoryAllocated: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  progressSection: {
    paddingTop: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  // Add Category Box
  addCategoryBox: {
    backgroundColor: COLORS.indigoLight,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  addInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.primaryLight + '30',
  },
  addActions: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 8,
  },
  addConfirm: { padding: 4 },
  addCancel: { padding: 4 },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  // Admin Footer
  adminFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  adminBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 8,
  },
  adminBtnText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: 14,
    gap: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  disabledBtn: {
    opacity: 0.5,
  }
});
