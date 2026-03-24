import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight } from '../../theme';
import ActionButton from './ActionButton';

const EmptyState = ({ icon: Icon, title, subtitle, actionLabel, onAction }) => {
    return (
        <View style={styles.container}>
            {Icon && (
                <View style={styles.iconContainer}>
                    <Icon size={48} color={colors.textSecondary} strokeWidth={1.5} />
                </View>
            )}
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            {actionLabel && onAction && (
                <ActionButton 
                    label={actionLabel} 
                    onPress={onAction} 
                    style={styles.actionBtn}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        minHeight: 240,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    title: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: spacing.lg,
    },
    actionBtn: {
        minWidth: 160,
    }
});

export default EmptyState;
