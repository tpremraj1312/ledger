import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Gamepad2, Zap, ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, fontSize, fontWeight, shadows, borderRadius } from '../theme';

import HeroLevelCard from '../components/Gamification/HeroLevelCard';
import QuestBoard from '../components/Gamification/QuestBoard';
import BadgeVault from '../components/Gamification/BadgeVault';
import WellnessMeter from '../components/Gamification/WellnessMeter';
import PremiumStreakWidget from '../components/Gamification/PremiumStreakWidget';
import FinancialGoals from '../components/Gamification/FinancialGoals';
import ActivityFeed from '../components/Gamification/ActivityFeed';
import { GamificationScreenSkeleton } from '../components/SkeletonLoader';
import { useGamificationStore } from '../store/useGamificationStore';

const GamificationScreen = ({ navigation }) => {
    const { isAuthenticated } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const setProfile = useGamificationStore(state => state.setProfile);
    const globalXp = useGamificationStore(state => state.xp);
    const globalLevel = useGamificationStore(state => state.level);
    const globalBadges = useGamificationStore(state => state.badges);

    const fetchDashboard = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            const res = await api.get('/api/gamification/dashboard');
            
            if (res.data.profile) {
                setProfile(res.data.profile);
            }
            setData(res.data);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [setProfile]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchDashboard();
        }
    }, [isAuthenticated, fetchDashboard]);

    const handleMissionAction = async (id, status) => {
        try {
            await api.patch(`/api/gamification/missions/${id}`, { status });
            fetchDashboard(true);
        } catch (err) {
            console.error(err);
        }
    };

    const handleGenerateMissions = async () => {
        try {
            await api.post('/api/gamification/missions/generate', {});
            fetchDashboard(true);
        } catch (err) {
            console.error(err);
        }
    };

    const handleClaimQuest = async (id) => {
        try {
            const res = await api.post(`/api/gamification/quests/${id}/complete`, {});
            // Backend returns { mission, xpResult: { profile, awarded, capped } }
            if (res.data.xpResult) {
                useGamificationStore.getState().processResults({
                    xpGained: res.data.xpResult.awarded,
                    profile: res.data.xpResult.profile
                });
            }
            fetchDashboard(true);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateGoal = async (goalData) => {
        try {
            const res = await api.post('/api/gamification/goals', goalData);
            // goals API returns the goal, might not have xpResult
            fetchDashboard(true);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteGoal = async (id) => {
        try {
            await api.delete(`/api/gamification/goals/${id}`);
            fetchDashboard(true);
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft color={colors.textPrimary} size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Finance Quest</Text>
                    <View style={{ width: 40 }} />
                </View>
                <GamificationScreenSkeleton />
            </SafeAreaView>
        );
    }

    const baseProfile = data?.profile || {};
    const profile = { 
        ...baseProfile, 
        xp: globalXp > 0 ? globalXp : baseProfile.xp, 
        level: globalLevel > 1 ? globalLevel : baseProfile.level, 
        badges: globalBadges && globalBadges.length > 0 ? globalBadges : baseProfile.badges 
    };

    const {
        missions = [],
        wellness,
        todayXP,
        allBadges = [],
        goals = [],
        activity = []
    } = data || {};

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft color={colors.textPrimary} size={24} />
                </TouchableOpacity>
                <View style={styles.headerTitleRow}>
                    <View style={styles.titleIconBox}>
                        <Gamepad2 size={20} color={colors.white} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Finance Quest</Text>
                        <Text style={styles.headerSubtitle}>Master your discipline</Text>
                    </View>
                </View>
                <View style={styles.xpBox}>
                    <Zap size={14} color="#F59E0B" fill="#F59E0B" />
                    <Text style={styles.xpText}>{todayXP?.earned || 0}</Text>
                </View>
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboard(true)} colors={[colors.primary]} />}
            >
                {!data && (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={{ marginTop: 10, color: colors.textSecondary }}>Loading dashboard details...</Text>
                    </View>
                )}

                <HeroLevelCard profile={profile} />
                <PremiumStreakWidget profile={profile} />
                
                {data && (
                    <>
                <QuestBoard 
                    missions={missions}
                    onAction={handleMissionAction}
                    onGenerate={handleGenerateMissions}
                    onClaim={handleClaimQuest}
                />

                <FinancialGoals 
                    goals={goals} 
                    onCreate={handleCreateGoal} 
                    onDelete={handleDeleteGoal} 
                />

                <BadgeVault badges={profile.badges || []} allBadges={allBadges} />
                
                <WellnessMeter wellness={wellness} />

                <ActivityFeed activity={activity} />
                    </>
                )}

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backBtn: {
        padding: spacing.xs,
        marginLeft: -spacing.xs,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    titleIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.textPrimary,
    },
    headerSubtitle: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    xpBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        ...shadows.sm,
    },
    xpText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.bold,
        color: colors.textPrimary,
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: spacing.xl * 2,
    },
});

export default GamificationScreen;
