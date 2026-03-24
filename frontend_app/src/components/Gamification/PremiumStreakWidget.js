import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Flame, Check } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../theme';

const PremiumStreakWidget = ({ profile }) => {
    const streak = profile?.currentStreak || 0;
    const history = profile?.streakHistory || [];

    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
            date: d,
            dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
            dayNum: d.getDate(),
            fullDate: d.toISOString().split('T')[0]
        };
    });

    const checkStatus = (dateStr) => {
        return history.some(h => {
            if (!h.date) return false;
            return new Date(h.date).toISOString().split('T')[0] === dateStr;
        });
    };

    const isTodayActive = checkStatus(new Date().toISOString().split('T')[0]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <View style={styles.headerTitleRow}>
                        <View style={[styles.iconBox, isTodayActive ? styles.iconBoxActive : styles.iconBoxInactive]}>
                            <Flame size={18} color={isTodayActive ? '#EA580C' : colors.gray400} fill={isTodayActive ? '#EA580C' : 'transparent'} />
                        </View>
                        <Text style={styles.titleLabel}>DAILY STREAK</Text>
                    </View>
                    <View style={styles.streakValueRow}>
                        <Text style={styles.streakNumber}>{streak}</Text>
                        <Text style={styles.streakUnit}>days</Text>
                    </View>
                </View>

                {isTodayActive && (
                    <View style={styles.activeTodayBadge}>
                        <Check size={14} color="#047857" strokeWidth={3} />
                        <Text style={styles.activeTodayText}>Active Today</Text>
                    </View>
                )}
            </View>

            <View style={styles.daysContainer}>
                {days.map((day, i) => {
                    const active = checkStatus(day.fullDate);
                    const isToday = i === 6;

                    let circleStyle = styles.dayCircleInactive;
                    let textStyle = styles.dayNumTextInactive;

                    if (active) {
                        circleStyle = styles.dayCircleActive;
                        textStyle = styles.dayNumTextActive;
                    } else if (isToday) {
                        circleStyle = styles.dayCircleToday;
                        textStyle = styles.dayNumTextToday;
                    }

                    return (
                        <View key={i} style={styles.dayCol}>
                            <View style={[styles.dayCircle, circleStyle]}>
                                {active ? (
                                    <Check size={16} color={colors.white} strokeWidth={3} />
                                ) : (
                                    <Text style={[styles.dayNumText, textStyle]}>{day.dayNum}</Text>
                                )}
                            </View>
                            <Text style={[styles.dayNameText, isToday ? styles.dayNameTextToday : styles.dayNameTextNormal]}>
                                {day.dayName}
                            </Text>
                        </View>
                    );
                })}
            </View>
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
        alignItems: 'flex-start',
        marginBottom: spacing.xl,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xs,
    },
    iconBox: {
        padding: 6,
        borderRadius: borderRadius.md,
    },
    iconBoxActive: {
        backgroundColor: '#ffedd5',
    },
    iconBoxInactive: {
        backgroundColor: colors.gray100,
    },
    titleLabel: {
        fontSize: 10,
        fontWeight: fontWeight.bold,
        color: colors.gray500,
        letterSpacing: 0.5,
    },
    streakValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: spacing.xs,
    },
    streakNumber: {
        fontSize: 40,
        fontWeight: '900',
        color: colors.textPrimary,
    },
    streakUnit: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.medium,
        color: colors.gray500,
    },
    activeTodayBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        backgroundColor: '#ecfdf5',
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: '#a7f3d0',
    },
    activeTodayText: {
        fontSize: 10,
        fontWeight: fontWeight.bold,
        color: '#047857',
    },
    daysContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: 'auto',
    },
    dayCol: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    dayCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayCircleActive: {
        backgroundColor: '#F97316',
        ...shadows.sm,
        ...(Platform.OS === 'web' 
            ? { boxShadow: '0px 1px 2px rgba(249, 115, 22, 0.4)' }
            : { shadowColor: '#F97316' }
        ),
    },
    dayCircleToday: {
        backgroundColor: colors.gray50,
        borderWidth: 2,
        borderColor: colors.gray200,
        borderStyle: 'dashed',
    },
    dayCircleInactive: {
        backgroundColor: colors.gray50,
    },
    dayNumText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
    },
    dayNumTextActive: {
        color: colors.white,
    },
    dayNumTextToday: {
        color: colors.gray500,
    },
    dayNumTextInactive: {
        color: colors.gray400,
    },
    dayNameText: {
        fontSize: 10,
        fontWeight: fontWeight.medium,
    },
    dayNameTextToday: {
        color: '#EA580C',
    },
    dayNameTextNormal: {
        color: colors.gray500,
    },
});

export default PremiumStreakWidget;
