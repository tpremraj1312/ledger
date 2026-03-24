import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Dimensions } from 'react-native';
import { Sparkles, X } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../theme';

const { width } = Dimensions.get('window');
const BADGE_SIZE = (width - spacing.xl * 2 - spacing.md * 3 - spacing.lg * 2) / 4;

const RARITY_STYLES = {
    common: { bg: colors.gray100, border: colors.gray200, labelBg: colors.gray200, labelText: colors.gray700 },
    rare: { bg: '#eff6ff', border: '#bfdbfe', labelBg: '#dbeafe', labelText: '#1d4ed8' },
    epic: { bg: colors.primaryLight + '20', border: colors.primaryLight + '50', labelBg: colors.primaryLight + '40', labelText: colors.primaryDark },
    legendary: { bg: '#fffbeb', border: '#fde68a', labelBg: '#fef3c7', labelText: '#b45309' },
};

const BadgeVault = ({ badges = [], allBadges = [] }) => {
    const [selected, setSelected] = useState(null);

    const catalog = allBadges.map(def => {
        const found = badges.find(b => b.id === def.id);
        return {
            ...def,
            unlocked: !!found,
            unlockedAt: found?.unlockedAt,
            isNew: found?.isNew
        };
    });

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Sparkles size={20} color="#F59E0B" />
                    <Text style={styles.title}>Badge Vault</Text>
                </View>
                <Text style={styles.subtitle}>
                    {badges.length} / {catalog.length} unlocked
                </Text>
            </View>

            <View style={styles.grid}>
                {catalog.map((badge) => {
                    const styleClass = badge.unlocked ? RARITY_STYLES[badge.rarity] || RARITY_STYLES.common : {};
                    
                    return (
                        <TouchableOpacity
                            key={badge.id}
                            style={[
                                styles.badgeWrapper,
                                badge.unlocked ? { backgroundColor: styleClass.bg, borderColor: styleClass.border } : styles.lockedBadge
                            ]}
                            onPress={() => setSelected(badge)}
                        >
                            <Text style={styles.badgeIcon}>{badge.unlocked ? badge.icon : '🔒'}</Text>

                            {badge.unlocked && badge.isNew && (
                                <View style={styles.newDot} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <Modal visible={!!selected} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
                    {selected && (
                        <View style={styles.modalContent}>
                            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                                <X size={20} color={colors.textSecondary} />
                            </TouchableOpacity>

                            <View style={styles.modalIconWrapper}>
                                <Text style={styles.modalIcon}>{selected.unlocked ? selected.icon : '🔒'}</Text>
                            </View>

                            <Text style={styles.modalName}>{selected.name}</Text>

                            <View style={[styles.rarityBadge, { backgroundColor: RARITY_STYLES[selected.rarity]?.labelBg || colors.gray200 }]}>
                                <Text style={[styles.rarityText, { color: RARITY_STYLES[selected.rarity]?.labelText || colors.gray700 }]}>
                                    {selected.rarity || 'Common'}
                                </Text>
                            </View>

                            <Text style={styles.modalDesc}>{selected.description}</Text>

                            {selected.unlocked ? (
                                <Text style={styles.unlockedDate}>
                                    Unlocked on {new Date(selected.unlockedAt).toLocaleDateString()}
                                </Text>
                            ) : (
                                <View style={styles.lockedHint}>
                                    <Text style={styles.lockedHintText}>🔒 Keep going to unlock this badge</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.sm,
        marginBottom: spacing.xl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    title: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.textPrimary,
    },
    subtitle: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    badgeWrapper: {
        width: BADGE_SIZE,
        height: BADGE_SIZE,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    lockedBadge: {
        backgroundColor: colors.gray50,
        borderColor: colors.gray200,
        borderStyle: 'dashed',
    },
    badgeIcon: {
        fontSize: 32,
    },
    newDot: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 14,
        height: 14,
        backgroundColor: '#EF4444',
        borderRadius: 7,
        borderWidth: 2,
        borderColor: colors.white,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    modalContent: {
        width: '100%',
        backgroundColor: colors.white,
        borderRadius: borderRadius['2xl'],
        padding: spacing['2xl'],
        alignItems: 'center',
        ...shadows.xl,
    },
    closeBtn: {
        position: 'absolute',
        top: spacing.lg,
        right: spacing.lg,
        padding: spacing.sm,
        backgroundColor: colors.gray100,
        borderRadius: borderRadius.full,
    },
    modalIconWrapper: {
        width: 100,
        height: 100,
        borderRadius: borderRadius.xl,
        backgroundColor: colors.gray50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    modalIcon: {
        fontSize: 56,
    },
    modalName: {
        fontSize: fontSize['2xl'],
        fontWeight: fontWeight.bold,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    rarityBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
        marginBottom: spacing.lg,
    },
    rarityText: {
        fontSize: 10,
        fontWeight: fontWeight.bold,
        textTransform: 'uppercase',
    },
    modalDesc: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    unlockedDate: {
        fontSize: fontSize.sm,
        color: colors.gray500,
    },
    lockedHint: {
        backgroundColor: '#fffbeb',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
    },
    lockedHintText: {
        color: '#b45309',
        fontWeight: fontWeight.medium,
        fontSize: fontSize.sm,
    },
});

export default BadgeVault;
