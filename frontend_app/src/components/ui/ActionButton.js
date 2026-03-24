import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';

const ActionButton = ({ 
    label, 
    onPress, 
    variant = 'primary', // 'primary' | 'secondary' | 'danger'
    loading = false,
    disabled = false,
    icon: Icon,
    style,
    textStyle
}) => {
    const getBgColor = () => {
        if (disabled && variant !== 'secondary') return colors.gray300;
        if (variant === 'primary') return colors.primary;
        if (variant === 'danger') return colors.errorLight;
        return colors.surface;
    };

    const getTextColor = () => {
        if (disabled && variant !== 'secondary') return colors.white;
        if (variant === 'primary') return colors.white;
        if (variant === 'danger') return colors.error;
        return colors.textPrimary;
    };

    const getBorderColor = () => {
        if (variant === 'danger') return colors.error;
        if (variant === 'secondary') return colors.border;
        return 'transparent';
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                { 
                    backgroundColor: getBgColor(),
                    borderWidth: variant === 'secondary' || variant === 'danger' ? 1 : 0,
                    borderColor: getBorderColor(),
                    opacity: disabled && variant === 'secondary' ? 0.5 : 1
                },
                style
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator size="small" color={getTextColor()} />
            ) : (
                <>
                    {Icon && <Icon size={18} color={getTextColor()} style={{ marginRight: spacing.sm }} />}
                    <Text style={[
                        styles.label, 
                        { color: getTextColor() },
                        textStyle
                    ]}>
                        {label}
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
    },
    label: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.bold,
    }
});

export default ActionButton;
