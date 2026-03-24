import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  TextInput, ActivityIndicator, Alert, Modal, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  DollarSign, Plus, Edit3, Trash2, X, Filter, 
  Calendar, TrendingUp, TrendingDown, Clock, 
  AlertCircle, Activity, ChevronLeft, ChevronRight, Check
} from 'lucide-react-native';

import { useFamily } from '../../context/FamilyContext';
import { 
  getFamilyTransactions, addFamilyTransaction,
  editFamilyTransaction, deleteFamilyTransaction 
} from '../../services/familyService';

// --- Design Tokens ---
const COLORS = {
  primary: '#1E6BD6',
  primaryLight: '#4C8DF0',
  surface: '#F5F7FA',
  background: '#FFFFFF',
  textPrimary: '#0D1B2A',
  textSecondary: '#44556B',
  border: '#E0E6EE',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
};

const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
})}`;

const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric'
});

export default function FamilyExpensesScreen({ navigation }) {
  const { group, isAdmin, isMember, refreshFamilyFinancialData, members, hasGroup } = useFamily();
  
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  
  const [formData, setFormData] = useState({ 
    type: 'debit', amount: '', category: '', date: new Date().toISOString().split('T')[0], description: '' 
  });
  const [submitting, setSubmitting] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    memberId: '', category: '', type: 'all'
  });

  const loadTransactions = useCallback(async () => {
    if (!hasGroup) return;
    setLoading(true);
    try {
      const apiFilters = {};
      if (filters.memberId) apiFilters.memberId = filters.memberId;
      if (filters.category) apiFilters.category = filters.category;
      if (filters.type !== 'all') apiFilters.type = filters.type;

      const data = await getFamilyTransactions(apiFilters);
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [hasGroup, filters]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const stats = useMemo(() => {
    const debit = transactions.filter(t => t.type === 'debit');
    const credit = transactions.filter(t => t.type === 'credit');
    const totalExpense = debit.reduce((s, t) => s + t.amount, 0);
    const totalIncome = credit.reduce((s, t) => s + t.amount, 0);
    return {
      totalExpense,
      totalIncome,
      count: transactions.length
    };
  }, [transactions]);

  const handleSubmit = async () => {
    if (!formData.amount || !formData.category) return;
    setSubmitting(true);
    try {
      if (editingTx) {
        await editFamilyTransaction(editingTx._id, formData);
      } else {
        await addFamilyTransaction(formData);
      }
      setModalOpen(false);
      await loadTransactions();
      await refreshFamilyFinancialData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save transaction.');
    } finally { setSubmitting(false); }
  };

  const handleDelete = (txId) => {
    Alert.alert('Delete', 'Delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteFamilyTransaction(txId);
          await loadTransactions();
          await refreshFamilyFinancialData();
        } catch (err) {
          Alert.alert('Error', 'Failed to delete.');
        }
      }}
    ]);
  };

  const openAdd = () => {
    setEditingTx(null);
    setFormData({ type: 'debit', amount: '', category: '', date: new Date().toISOString().split('T')[0], description: '' });
    setModalOpen(true);
  };

  const openEdit = (tx) => {
    setEditingTx(tx);
    setFormData({
      type: tx.type,
      amount: tx.amount.toString(),
      category: tx.category,
      date: tx.date.split('T')[0],
      description: tx.description || ''
    });
    setModalOpen(true);
  };

  const renderTransaction = ({ item }) => (
    <View style={styles.txCard}>
      <View style={styles.txMain}>
        <View style={[styles.txIcon, { backgroundColor: item.type === 'debit' ? COLORS.danger + '10' : COLORS.success + '10' }]}>
          {item.type === 'debit' ? <TrendingDown size={18} color={COLORS.danger} /> : <TrendingUp size={18} color={COLORS.success} />}
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txCategory}>{item.name || item.category}</Text>
          <View style={styles.txMeta}>
            <Text style={styles.txMember}>{(item.spentBy?.username || 'User')}</Text>
            <Text style={styles.txDot}>•</Text>
            <Text style={styles.txDate}>{formatDate(item.date)}</Text>
          </View>
        </View>
        <View style={styles.txRight}>
          <Text style={[styles.txAmount, { color: item.type === 'debit' ? COLORS.danger : COLORS.success }]}>
            {item.type === 'debit' ? '-' : '+'}{formatCurrency(item.amount)}
          </Text>
          {(isAdmin || isMember) && (
            <View style={styles.txActions}>
              <TouchableOpacity onPress={() => openEdit(item)} style={styles.txActionBtn}>
                <Edit3 size={14} color={COLORS.textSecondary} />
              </TouchableOpacity>
              {isAdmin && (
                <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.txActionBtn}>
                  <Trash2 size={14} color={COLORS.danger} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
      {item.description ? <Text style={styles.txDesc}>{item.description}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Family Expenses</Text>
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={[styles.filterBtn, showFilters && styles.filterBtnActive]}>
          <Filter size={20} color={showFilters ? '#fff' : COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Exp</Text>
          <Text style={[styles.statValue, { color: COLORS.danger }]}>{formatCurrency(stats.totalExpense)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Inc</Text>
          <Text style={[styles.statValue, { color: COLORS.success }]}>{formatCurrency(stats.totalIncome)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Count</Text>
          <Text style={styles.statValue}>{stats.count}</Text>
        </View>
      </View>

      {showFilters && (
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity 
              style={[styles.filterChip, filters.type === 'all' && styles.filterChipActive]}
              onPress={() => setFilters({...filters, type: 'all'})}
            >
              <Text style={[styles.filterChipText, filters.type === 'all' && styles.filterChipTextActive]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterChip, filters.type === 'debit' && styles.filterChipActive]}
              onPress={() => setFilters({...filters, type: 'debit'})}
            >
              <Text style={[styles.filterChipText, filters.type === 'debit' && styles.filterChipTextActive]}>Debit</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterChip, filters.type === 'credit' && styles.filterChipActive]}
              onPress={() => setFilters({...filters, type: 'credit'})}
            >
              <Text style={[styles.filterChipText, filters.type === 'credit' && styles.filterChipTextActive]}>Credit</Text>
            </TouchableOpacity>
            {members.map(m => (
              <TouchableOpacity 
                key={m.user?._id || m.user}
                style={[styles.filterChip, filters.memberId === (m.user?._id || m.user) && styles.filterChipActive]}
                onPress={() => setFilters({...filters, memberId: filters.memberId === (m.user?._id || m.user) ? '' : (m.user?._id || m.user)})}
              >
                <Text style={[styles.filterChipText, filters.memberId === (m.user?._id || m.user) && styles.filterChipTextActive]}>
                  {m.user?.username || 'Member'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading ? <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} /> : (
            <View style={styles.emptyBox}>
              <DollarSign size={48} color={COLORS.textSecondary} opacity={0.2} />
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          )
        }
      />

      {(isAdmin || isMember) && (
        <TouchableOpacity style={styles.fab} onPress={openAdd}>
          <Plus size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingTx ? 'Edit Transaction' : 'Add Transaction'}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <X size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.typeToggle}>
              <TouchableOpacity 
                style={[styles.typeBtn, formData.type === 'debit' && styles.typeBtnDebit]}
                onPress={() => setFormData({...formData, type: 'debit'})}
              >
                <Text style={[styles.typeBtnText, formData.type === 'debit' && styles.typeBtnTextActive]}>Debit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.typeBtn, formData.type === 'credit' && styles.typeBtnCredit]}
                onPress={() => setFormData({...formData, type: 'credit'})}
              >
                <Text style={[styles.typeBtnText, formData.type === 'credit' && styles.typeBtnTextActive]}>Credit</Text>
              </TouchableOpacity>
            </View>

            <TextInput 
              style={styles.modalInput} 
              placeholder="Amount (₹)" 
              keyboardType="numeric"
              value={formData.amount}
              onChangeText={text => setFormData({...formData, amount: text})}
            />
            <TextInput 
              style={styles.modalInput} 
              placeholder="Category (e.g. Food)" 
              value={formData.category}
              onChangeText={text => setFormData({...formData, category: text})}
            />
            <TextInput 
              style={styles.modalInput} 
              placeholder="Date (YYYY-MM-DD)" 
              value={formData.date}
              onChangeText={text => setFormData({...formData, date: text})}
            />
            <TextInput 
              style={[styles.modalInput, { height: 80 }]} 
              placeholder="Description (optional)" 
              multiline
              value={formData.description}
              onChangeText={text => setFormData({...formData, description: text})}
            />

            <TouchableOpacity 
              style={[styles.submitBtn, submitting && { opacity: 0.5 }]} 
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Check size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>Save Transaction</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    padding: 16, backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border 
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  filterBtn: { padding: 8, borderRadius: 8 },
  filterBtnActive: { backgroundColor: COLORS.textPrimary },
  
  statsBar: { 
    flexDirection: 'row', backgroundColor: COLORS.background, padding: 12, 
    borderBottomWidth: 1, borderBottomColor: COLORS.border, justifyContent: 'space-around'
  },
  statBox: { alignItems: 'center' },
  statLabel: { fontSize: 10, color: COLORS.textSecondary, textTransform: 'uppercase' },
  statValue: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  statDivider: { width: 1, height: '60%', backgroundColor: COLORS.border, alignSelf: 'center' },

  filterBar: { backgroundColor: COLORS.background, paddingBottom: 12 },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  filterChipTextActive: { color: '#fff' },

  listContent: { padding: 16, paddingBottom: 80 },
  txCard: { backgroundColor: COLORS.background, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  txMain: { flexDirection: 'row', alignItems: 'center' },
  txIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txInfo: { flex: 1 },
  txCategory: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  txMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  txMember: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  txDot: { fontSize: 12, color: COLORS.textSecondary, marginHorizontal: 4 },
  txDate: { fontSize: 11, color: COLORS.textSecondary },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  txActions: { flexDirection: 'row', gap: 8 },
  txActionBtn: { padding: 4 },
  txDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.surface },

  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  emptyBox: { paddingTop: 60, alignItems: 'center' },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  typeToggle: { flexDirection: 'row', backgroundColor: COLORS.surface, pading: 4, borderRadius: 12, marginBottom: 16 },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  typeBtnDebit: { backgroundColor: COLORS.danger + '20' },
  typeBtnCredit: { backgroundColor: COLORS.success + '20' },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  typeBtnTextActive: { color: COLORS.textPrimary },
  modalInput: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: 14, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});
