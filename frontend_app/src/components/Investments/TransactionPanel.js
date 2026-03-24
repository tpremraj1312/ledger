import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, TextInput, FlatList, Modal,
    StyleSheet, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { ArrowDownCircle, ArrowUpCircle, Search, X, Loader, ChevronDown } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme';
import { fmt, buyInvestment, sellInvestment, searchInvestments, fetchTxnHistory, fetchQuote } from '../../services/investmentService';

// ── Live Price Preview ───────────────────────────────────────
const LivePricePreview = ({ symbol, assetType }) => {
    const [quote, setQuote] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!symbol) { setQuote(null); return; }
        setLoading(true);
        fetchQuote(symbol, assetType || 'Stock')
            .then(q => setQuote(q))
            .catch(() => setQuote(null))
            .finally(() => setLoading(false));
    }, [symbol, assetType]);

    if (!symbol) return null;
    if (loading) return (
        <View style={styles.liveRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.liveText}>Fetching live price...</Text>
        </View>
    );
    if (!quote?.price) return null;
    const up = (quote.changePercent || 0) >= 0;
    return (
        <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.livePrice}>₹{quote.price.toFixed(2)}</Text>
            <Text style={[styles.liveChange, { color: up ? colors.success : colors.error }]}>
                {up ? '+' : ''}{(quote.changePercent || 0).toFixed(2)}%
            </Text>
            <Text style={styles.liveLabel}>Live</Text>
        </View>
    );
};

// ── Searchable Select ────────────────────────────────────────
const SearchableSelect = ({ type, onSelect }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const typeMap = { 'Stock': 'stock', 'Mutual Fund': 'mutualfund', 'Crypto': 'crypto', 'ETF': 'stock', 'Gold': 'stock' };

    useEffect(() => {
        const t = setTimeout(async () => {
            if (query.length < 2) { setResults([]); return; }
            setLoading(true);
            try {
                const r = await searchInvestments(query, typeMap[type] || 'stock');
                setResults(Array.isArray(r) ? r : []);
            } catch { setResults([]); }
            finally { setLoading(false); }
        }, 500);
        return () => clearTimeout(t);
    }, [query, type]);

    return (
        <View>
            <View style={styles.searchBox}>
                <Search size={14} color={colors.textSecondary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={`Search ${type}...`}
                    placeholderTextColor={colors.textSecondary}
                    value={query}
                    onChangeText={setQuery}
                />
                {loading && <ActivityIndicator size="small" color={colors.primary} />}
            </View>
            {results.length > 0 && (
                <View style={styles.dropdown}>
                    {results.slice(0, 8).map((item, i) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.dropdownItem}
                            onPress={() => { onSelect(item); setQuery(item.name || item.symbol); setResults([]); }}
                        >
                            <Text style={styles.dropdownName}>{item.name || item.symbol}</Text>
                            <Text style={styles.dropdownSub}>{item.symbol || item.schemeCode}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

// ── Main Panel ───────────────────────────────────────────────
const TransactionPanel = ({ onTransactionComplete, holdings }) => {
    const [modal, setModal] = useState(null); // 'buy' | 'sell' | null
    const [form, setForm] = useState({ assetType: 'Stock', name: '', symbol: '', quantity: '', price: '', fees: '', txnDate: '', notes: '' });
    const [sellSym, setSellSym] = useState('');
    const [sellDropdownVisible, setSellDropdownVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [histLoad, setHistLoad] = useState(false);

    useEffect(() => { loadHistory(); }, []);

    const loadHistory = async () => {
        setHistLoad(true);
        try { const data = await fetchTxnHistory({ limit: 30 }); setHistory(data.transactions || []); }
        catch { }
        finally { setHistLoad(false); }
    };

    const resetForm = () => setForm({ assetType: 'Stock', name: '', symbol: '', quantity: '', price: '', fees: '', txnDate: '', notes: '' });

    const handleBuy = async () => {
        setLoading(true);
        try {
            await buyInvestment({ ...form, fees: Number(form.fees) || 0 });
            setModal(null);
            resetForm();
            onTransactionComplete();
            loadHistory();
        } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Buy failed'); }
        finally { setLoading(false); }
    };

    const handleSell = async () => {
        const h = holdings?.find(x => x.symbol === sellSym);
        setLoading(true);
        try {
            await sellInvestment({ ...form, symbol: sellSym, name: h?.name || form.name, assetType: h?.assetType || form.assetType, fees: Number(form.fees) || 0 });
            setModal(null);
            resetForm();
            setSellSym('');
            onTransactionComplete();
            loadHistory();
        } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Sell failed'); }
        finally { setLoading(false); }
    };

    const qty = Number(form.quantity) || 0;
    const price = Number(form.price) || 0;
    const fees = Number(form.fees) || 0;
    const totalCost = qty * price + fees;
    const sellHolding = holdings?.find(x => x.symbol === sellSym);

    const ASSET_TYPES = ['Stock', 'Mutual Fund', 'Crypto', 'Gold', 'ETF', 'FD', 'Bond'];

    const renderTxn = ({ item: txn, index: i }) => (
        <View style={styles.txnItem}>
            <View style={styles.txnLeft}>
                <View style={[styles.txnIcon, { backgroundColor: txn.txnType === 'BUY' ? '#F0FDF4' : '#FEF2F2' }]}>
                    {txn.txnType === 'BUY'
                        ? <ArrowDownCircle size={16} color={colors.success} />
                        : <ArrowUpCircle size={16} color={colors.error} />}
                </View>
                <View>
                    <Text style={styles.txnName}>{txn.name}</Text>
                    <Text style={styles.txnSub}>{txn.symbol} · {new Date(txn.txnDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</Text>
                </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.txnAmount, { color: txn.txnType === 'BUY' ? colors.success : colors.error }]}>
                    {txn.txnType === 'BUY' ? '-' : '+'}{fmt(txn.totalAmount)}
                </Text>
                <Text style={styles.txnSub}>{txn.quantity} × {fmt(txn.price)}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Action Buttons */}
            <View style={styles.actionRow}>
                <TouchableOpacity style={styles.buyBtn} onPress={() => setModal('buy')}>
                    <ArrowDownCircle size={16} color={colors.white} />
                    <Text style={styles.buyBtnText}>Buy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sellBtn} onPress={() => setModal('sell')}>
                    <ArrowUpCircle size={16} color={colors.error} />
                    <Text style={styles.sellBtnText}>Sell</Text>
                </TouchableOpacity>
            </View>

            {/* History */}
            <View style={styles.historyCard}>
                <View style={styles.historyHeader}>
                    <Text style={styles.historyTitle}>Transaction History</Text>
                    <Text style={styles.historyCount}>{history.length} transactions</Text>
                </View>
                {histLoad ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 40 }} />
                ) : !history.length ? (
                    <Text style={styles.noTxn}>No transactions yet</Text>
                ) : (
                    <FlatList data={history} renderItem={renderTxn} keyExtractor={(t, i) => t._id || String(i)} scrollEnabled={false} />
                )}
            </View>

            {/* Buy Modal */}
            <Modal visible={modal === 'buy'} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>
                        <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
                            <View style={styles.modalHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <ArrowDownCircle size={20} color={colors.success} />
                                    <Text style={styles.modalTitle}>Buy Investment</Text>
                                </View>
                                <TouchableOpacity onPress={() => setModal(null)}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
                            </View>

                            <Text style={styles.label}>Asset Type</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                    {ASSET_TYPES.map(t => (
                                        <TouchableOpacity key={t} onPress={() => setForm({ ...form, assetType: t, name: '', symbol: '' })}
                                            style={[styles.typeChip, form.assetType === t && styles.typeChipActive]}>
                                            <Text style={[styles.typeChipText, form.assetType === t && styles.typeChipTextActive]}>{t}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>

                            <Text style={styles.label}>Search Investment</Text>
                            <SearchableSelect type={form.assetType} onSelect={item => setForm({ ...form, name: item.name, symbol: item.symbol || item.schemeCode })} />
                            {form.symbol && <LivePricePreview symbol={form.symbol} assetType={form.assetType} />}
                            {form.name && !form.symbol && <Text style={styles.selectedText}>✓ {form.name}</Text>}

                            <View style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Quantity</Text>
                                    <TextInput style={styles.input} keyboardType="numeric" value={form.quantity} onChangeText={v => setForm({ ...form, quantity: v })} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Buy Price (₹)</Text>
                                    <TextInput style={styles.input} keyboardType="numeric" value={form.price} onChangeText={v => setForm({ ...form, price: v })} />
                                </View>
                            </View>
                            <View style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Fees (₹)</Text>
                                    <TextInput style={styles.input} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textSecondary} value={form.fees} onChangeText={v => setForm({ ...form, fees: v })} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Date (optional)</Text>
                                    <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} value={form.txnDate} onChangeText={v => setForm({ ...form, txnDate: v })} />
                                </View>
                            </View>

                            {qty > 0 && price > 0 && (
                                <View style={styles.previewCard}>
                                    <Text style={styles.previewLabel}>Total Investment</Text>
                                    <Text style={styles.previewValue}>{fmt(totalCost)}</Text>
                                    <Text style={styles.previewSub}>{qty} × ₹{price.toFixed(2)}{fees > 0 ? ` + ₹${fees} fees` : ''}</Text>
                                </View>
                            )}

                            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.success }]} onPress={handleBuy} disabled={loading}>
                                {loading ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.submitBtnText}>Add to Portfolio</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Sell Modal */}
            <Modal visible={modal === 'sell'} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>
                        <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
                            <View style={styles.modalHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <ArrowUpCircle size={20} color={colors.error} />
                                    <Text style={styles.modalTitle}>Sell Investment</Text>
                                </View>
                                <TouchableOpacity onPress={() => setModal(null)}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
                            </View>

                            <Text style={styles.label}>Select Holding</Text>
                            <TouchableOpacity 
                                style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }]} 
                                onPress={() => setSellDropdownVisible(true)}
                                activeOpacity={0.7}
                            >
                                <Text style={{ color: sellSym ? colors.textPrimary : colors.textSecondary, fontSize: fontSize.sm }}>
                                    {sellHolding ? `${sellHolding.name} (${sellHolding.symbol})` : 'Select an asset to sell...'}
                                </Text>
                                <ChevronDown size={18} color={colors.textSecondary} />
                            </TouchableOpacity>

                            {/* Sell Dropdown Modal */}
                            <Modal visible={sellDropdownVisible} transparent animationType="fade">
                                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSellDropdownVisible(false)}>
                                    <View style={styles.dropdownMenu}>
                                        <View style={styles.dropdownHeader}>
                                            <Text style={styles.dropdownTitle}>Select Holding</Text>
                                            <TouchableOpacity onPress={() => setSellDropdownVisible(false)}>
                                                <X size={20} color={colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                        <ScrollView style={{ maxHeight: 300 }}>
                                            {(holdings || []).length === 0 ? (
                                                <Text style={{ padding: spacing.md, textAlign: 'center', color: colors.textSecondary }}>No holdings to sell</Text>
                                            ) : (
                                                holdings.map(h => (
                                                    <TouchableOpacity
                                                        key={h.symbol}
                                                        style={[styles.dropdownItem, sellSym === h.symbol && styles.dropdownItemActive]}
                                                        onPress={() => { setSellSym(h.symbol); setSellDropdownVisible(false); }}
                                                    >
                                                        <Text style={[styles.dropdownItemText, sellSym === h.symbol && styles.dropdownItemTextActive]}>
                                                            {h.name} ({h.symbol})
                                                        </Text>
                                                        <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                                                            {h.quantity} units
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))
                                            )}
                                        </ScrollView>
                                    </View>
                                </TouchableOpacity>
                            </Modal>

                            {sellSym && <LivePricePreview symbol={sellSym} assetType={sellHolding?.assetType} />}

                            <View style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Quantity</Text>
                                    <TextInput style={styles.input} keyboardType="numeric" value={form.quantity} onChangeText={v => setForm({ ...form, quantity: v })} placeholder={sellHolding ? `Max: ${sellHolding.quantity}` : ''} placeholderTextColor={colors.textSecondary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Sell Price (₹)</Text>
                                    <TextInput style={styles.input} keyboardType="numeric" value={form.price} onChangeText={v => setForm({ ...form, price: v })} />
                                </View>
                            </View>
                            <View style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Fees (₹)</Text>
                                    <TextInput style={styles.input} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textSecondary} value={form.fees} onChangeText={v => setForm({ ...form, fees: v })} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Date (optional)</Text>
                                    <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} value={form.txnDate} onChangeText={v => setForm({ ...form, txnDate: v })} />
                                </View>
                            </View>

                            {qty > 0 && price > 0 && sellHolding && (
                                <View style={[styles.previewCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                                    <Text style={[styles.previewLabel, { color: colors.error }]}>Sale Proceeds</Text>
                                    <Text style={styles.previewValue}>{fmt(qty * price - fees)}</Text>
                                    <Text style={styles.previewSub}>Cost: {fmt(qty * sellHolding.avgCostBasis)} | P&L: {fmt(qty * price - fees - qty * sellHolding.avgCostBasis)}</Text>
                                </View>
                            )}

                            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.error }]} onPress={handleSell} disabled={loading || !sellSym}>
                                {loading ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.submitBtnText}>Sell</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    actionRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
    buyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: colors.success, borderRadius: borderRadius.lg },
    buyBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.white },
    sellBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: '#FEF2F2', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: '#FECACA' },
    sellBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.error },
    historyCard: { marginHorizontal: spacing.md, backgroundColor: colors.white, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.surface },
    historyTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
    historyCount: { fontSize: 10, color: colors.textSecondary },
    noTxn: { textAlign: 'center', paddingVertical: 40, color: colors.textSecondary },
    txnItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surface },
    txnLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    txnIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    txnName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
    txnSub: { fontSize: 10, color: colors.textSecondary, marginTop: 1 },
    txnAmount: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
    modalContainer: { maxHeight: '90%' },
    modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
    modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
    label: { fontSize: 11, fontWeight: fontWeight.semibold, color: colors.textSecondary, marginBottom: 4, marginTop: 8 },
    input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: fontSize.sm, color: colors.textPrimary },
    row: { flexDirection: 'row', gap: spacing.sm },
    typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    typeChipActive: { backgroundColor: '#EBF2FC', borderColor: colors.primary },
    typeChipText: { fontSize: 12, fontWeight: fontWeight.semibold, color: colors.textSecondary },
    typeChipTextActive: { color: colors.primary },
    searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 10 },
    searchInput: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary, padding: 0 },
    dropdown: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, marginTop: 4, maxHeight: 200 },
    dropdownItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surface },
    dropdownName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
    dropdownSub: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
    dropdownMenu: { width: '85%', backgroundColor: colors.white, borderRadius: borderRadius.xl, overflow: 'hidden', ...shadows.lg },
    dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.gray50, borderBottomWidth: 1, borderBottomColor: colors.border },
    dropdownTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
    dropdownItemActive: { backgroundColor: colors.primaryLight + '10' },
    dropdownItemText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textPrimary },
    dropdownItemTextActive: { color: colors.primary, fontWeight: fontWeight.bold },
    selectedText: { fontSize: 11, color: colors.success, marginTop: 4 },
    liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 8, marginTop: 6, borderWidth: 1, borderColor: colors.border },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
    livePrice: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textPrimary },
    liveChange: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    liveText: { fontSize: 10, color: colors.textSecondary },
    liveLabel: { fontSize: 9, color: colors.textSecondary },
    previewCard: { backgroundColor: '#EBF2FC', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: '#BFDBFE', padding: spacing.md, alignItems: 'center', marginTop: 12 },
    previewLabel: { fontSize: 10, fontWeight: fontWeight.semibold, color: colors.primary },
    previewValue: { fontSize: 22, fontWeight: fontWeight.bold, color: colors.textPrimary, marginVertical: 4 },
    previewSub: { fontSize: 10, color: colors.textSecondary },
    submitBtn: { paddingVertical: 14, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md, marginBottom: 20 },
    submitBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.white },
});

export default TransactionPanel;
