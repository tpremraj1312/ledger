import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight } from '../../theme';

const SectionHeader = ({ title, icon: Icon, action, titleColor = colors.textPrimary }) => {
    return (
        <View style={styles.container}>
            <View style={styles.left}>
                {Icon && <Icon size={18} color={colors.primary} style={styles.icon} strokeWidth={2.5} />}
                <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
            </View>
            {action && (
                <View style={styles.actionContainer}>
                    {action}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: spacing.sm,
    },
    title: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.bold,
    },
    actionContainer: {
        justifyContent: 'center',
    }
});

export default SectionHeader;
