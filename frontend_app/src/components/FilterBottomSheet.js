import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { X, Calendar } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme';
import { formatDateForDisplay, formatDateForInput } from '../utils/formatters';

let DateTimePicker;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

const PREDEFINED_CATEGORIES = [
  'All', 'Groceries', 'Rent', 'Utilities', 'Transport', 'Entertainment',
  'Dining', 'Shopping', 'Health', 'Education', 'Travel', 'Income', 'Other'
];

const FilterBottomSheet = ({ visible, onClose, currentFilters, onApply, categories = PREDEFINED_CATEGORIES }) => {
  const [localFilters, setLocalFilters] = useState({
    period: 'Monthly',
    startDate: '',
    endDate: '',
    category: 'All',
  });

  const [datePickerState, setDatePickerState] = useState({
    show: false,
    mode: 'startDate', // 'startDate' | 'endDate'
  });

  useEffect(() => {
    if (visible) {
      setLocalFilters({
        period: currentFilters.period || 'Monthly',
        startDate: currentFilters.startDate || '',
        endDate: currentFilters.endDate || '',
        category: currentFilters.category || 'All',
      });
    }
  }, [visible, currentFilters]);

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setDatePickerState((prev) => ({ ...prev, show: false }));
    }
    if (!selectedDate || event.type === 'dismissed') return;

    const formatted = formatDateForInput(selectedDate);
    setLocalFilters((prev) => ({
      ...prev,
      [datePickerState.mode]: formatted,
      period: 'Custom',
    }));
  };

  const openPicker = (mode) => {
    setDatePickerState({ show: true, mode });
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    const defaultFilters = { period: 'Monthly', startDate: '', endDate: '', category: 'All' };
    onApply(defaultFilters);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.accent} />

          <View style={styles.header}>
            <Text style={styles.title}>Filter Transactions</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Quick Filters */}
            <Text style={styles.label}>QUICK FILTERS</Text>
            <View style={styles.chipRow}>
              {['All Time', 'This Month', 'Last 7 Days', 'Monthly', 'Yearly'].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.chip, localFilters.period === p && styles.chipActive]}
                  onPress={() => {
                    setLocalFilters((prev) => ({ ...prev, period: p, startDate: '', endDate: '' }));
                  }}
                >
                  <Text style={[styles.chipText, localFilters.period === p && styles.chipTextActive]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Content for Custom Date Range */}
            <Text style={[styles.label, { marginTop: spacing.lg }]}>CUSTOM DATE RANGE</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => openPicker('startDate')}
              >
                <Calendar size={16} color={colors.textSecondary} />
                <Text style={[styles.dateText, !localFilters.startDate && styles.datePlaceholder]}>
                  {localFilters.startDate ? formatDateForDisplay(localFilters.startDate) : 'Start Date'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.toText}>to</Text>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => openPicker('endDate')}
              >
                <Calendar size={16} color={colors.textSecondary} />
                <Text style={[styles.dateText, !localFilters.endDate && styles.datePlaceholder]}>
                  {localFilters.endDate ? formatDateForDisplay(localFilters.endDate) : 'End Date'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Picker Overlay for iOS/Android */}
            {datePickerState.show && Platform.OS !== 'web' && DateTimePicker && (
              <DateTimePicker
                value={localFilters[datePickerState.mode] ? new Date(localFilters[datePickerState.mode]) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
                style={Platform.OS === 'ios' ? styles.iosPicker : undefined}
              />
            )}
            
            {/* Simple Web Fallback for Date Input if testing on Web */}
            {datePickerState.show && Platform.OS === 'web' && (
              <View style={{ alignItems: 'center', marginTop: spacing.md }}>
                <Text style={{ color: colors.warning }}>Date Picker is native-only.</Text>
                <TouchableOpacity 
                   style={styles.iosConfirmBtn}
                   onPress={() => setDatePickerState((prev) => ({ ...prev, show: false }))}
                 >
                   <Text style={styles.iosConfirmText}>Close</Text>
                 </TouchableOpacity>
              </View>
            )}
            
            {/* iOS specific confirm button since spinner is inline */}
            {Platform.OS === 'ios' && datePickerState.show && (
               <TouchableOpacity 
                 style={styles.iosConfirmBtn}
                 onPress={() => setDatePickerState((prev) => ({ ...prev, show: false }))}
               >
                 <Text style={styles.iosConfirmText}>Done</Text>
               </TouchableOpacity>
            )}

            {/* Category Selector */}
            <Text style={[styles.label, { marginTop: spacing.xl }]}>CATEGORY</Text>
            <View style={styles.chipRow}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, localFilters.category === cat && styles.chipActive]}
                  onPress={() => setLocalFilters((prev) => ({ ...prev, category: cat }))}
                >
                  <Text style={[styles.chipText, localFilters.category === cat && styles.chipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ height: spacing['3xl'] }} />
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
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
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? spacing['3xl'] : spacing.xl,
    maxHeight: '90%',
  },
  accent: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray300,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  scroll: {
    paddingBottom: spacing.xl,
  },
  label: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  chipTextActive: {
    color: colors.primaryDark,
    fontWeight: fontWeight.bold,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  dateText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  datePlaceholder: {
    color: colors.gray400,
  },
  toText: {
    marginHorizontal: spacing.md,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  iosPicker: {
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  iosConfirmBtn: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  iosConfirmText: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.md,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  applyBtn: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  applyText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});

export default FilterBottomSheet;
