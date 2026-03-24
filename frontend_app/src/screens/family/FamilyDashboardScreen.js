import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Users, DollarSign, PieChart as PieIcon, Activity, UserPlus, ChevronRight, Target, Gauge, Bell, TrendingUp, TrendingDown 
} from 'lucide-react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';

import { useFamily } from '../../context/FamilyContext';
import { useAuth } from '../../context/AuthContext';
import { createFamilyGroup, getAuditLog } from '../../services/familyService';

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
  success: '#10B981',
  danger: '#EF4444',
  chartPalette: ['#1E6BD6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
};

const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
})}`;

const ACTION_LABELS = {
  GROUP_CREATED: 'Group created',
  MEMBER_INVITED: 'Member invited',
  MEMBER_JOINED: 'Member joined',
  MEMBER_REMOVED: 'Member removed',
  MEMBER_LEFT: 'Member left',
  ROLE_CHANGED: 'Role changed',
  GROUP_DISSOLVED: 'Group dissolved',
  TRANSACTION_ADDED: 'Transaction added',
  TRANSACTION_EDITED: 'Transaction edited',
  TRANSACTION_DELETED: 'Transaction deleted',
  BUDGET_UPDATED: 'Budget updated',
};

// --- Sub-components ---

const StatCard = ({ icon: Icon, label, value, color }) => (
  <View style={styles.statCard}>
    <View style={styles.statCardHeader}>
      <View style={[styles.statIconWrapper, { backgroundColor: `${color}15` }]}>
        <Icon size={18} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
    <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
  </View>
);

const MemberInsightCard = ({ member, totalExpense }) => {
  const percent = totalExpense ? ((member.totalSpent / totalExpense) * 100) : 0;
  
  return (
    <View style={styles.memberCard}>
      <View style={styles.memberCardRow}>
        <View style={styles.memberAvatar}>
          <Text style={styles.memberAvatarText}>{(member.name || 'U').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={styles.memberSpent}>{formatCurrency(member.totalSpent)} spent</Text>
        </View>
      </View>
      
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>Share of expenses</Text>
        <Text style={styles.progressValue}>{percent.toFixed(1)}%</Text>
      </View>
      
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${Math.min(percent, 100)}%` }]} />
      </View>
    </View>
  );
};

export default function FamilyDashboardScreen({ navigation }) {
  const {
    group, loading, hasGroup, familyFinancialData,
    refreshGroup, isAdmin, members
  } = useFamily();
  const { refreshUser } = useAuth();

  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    if (hasGroup) {
      setAuditLoading(true);
      getAuditLog(1)
        .then(data => setAuditLogs(data.logs || []))
        .catch(() => {})
        .finally(() => setAuditLoading(false));
    }
  }, [hasGroup]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) { setError('Please enter a group name.'); return; }
    setCreating(true); 
    setError('');
    try {
      await createFamilyGroup(newGroupName.trim());
      await refreshUser();
      await refreshGroup();
      setNewGroupName('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create group.');
    } finally {
      setCreating(false);
    }
  };

  const fd = familyFinancialData;

  const trendData = useMemo(() => {
    if (!fd?.trendData || fd.trendData.length === 0) return null;
    let data = fd.trendData.map(t => t.amount);
    let labels = fd.trendData.map(t => new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
    
    // LineChart crashes if only 1 data point exists
    if (data.length === 1) {
      data = [data[0], data[0]];
      labels = ['', labels[0]];
    }
    
    return { labels, datasets: [{ data }] };
  }, [fd?.trendData]);

  const memberPieData = useMemo(() => {
    if (!fd?.memberBreakdown) return [];
    // PieChart crashes if total population is 0
    const validData = fd.memberBreakdown.filter(m => m.totalSpent && m.totalSpent > 0);
    return validData.map((m, index) => ({
      name: m.name,
      population: m.totalSpent,
      color: COLORS.chartPalette[index % COLORS.chartPalette.length],
      legendFontColor: COLORS.textSecondary,
      legendFontSize: 12
    }));
  }, [fd]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerAll]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // --- View: No Group ---
  if (!hasGroup) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noGroupContainer}>
          <View style={styles.iconCircle}>
            <Users size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.noGroupTitle}>Create a Family Group</Text>
          <Text style={styles.noGroupSub}>
            Track shared expenses, set budgets, and manage finances together with your family.
          </Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Family group name"
            placeholderTextColor="#9CA3AF"
            value={newGroupName}
            onChangeText={(text) => { setNewGroupName(text); setError(''); }}
          />

          <TouchableOpacity 
            style={[styles.primaryButton, creating && styles.disabledButton]} 
            onPress={handleCreateGroup}
            disabled={creating}
            activeOpacity={0.8}
          >
            {creating ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.primaryButtonText}>Create Group</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- View: Active Group ---
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header section */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIcon}>
              <Users size={24} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.groupName}>{group?.name}</Text>
              <View style={styles.memberStatusRow}>
                <Activity size={12} color={COLORS.primary} />
                <Text style={styles.memberStatusText}>
                  {members?.length || 0} member{(members?.length || 0) !== 1 ? 's' : ''} · Active
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('FamilyExpenses')}
            >
              <DollarSign size={16} color={COLORS.primaryDark} />
              <Text style={styles.secondaryButtonText}>Manage Expenses</Text>
            </TouchableOpacity>

            {isAdmin && (
              <>
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={() => navigation.navigate('FamilyBudget')}
                >
                  <Gauge size={18} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={() => navigation.navigate('FamilyMembers')}
                >
                  <UserPlus size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Bell size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard icon={TrendingUp} label="Total Income" value={formatCurrency(fd?.totalIncome)} color={COLORS.success} />
          <StatCard icon={TrendingDown} label="Total Expenses" value={formatCurrency(fd?.totalExpense)} color={COLORS.danger} />
          <StatCard icon={DollarSign} label="Net Savings" value={formatCurrency(fd?.netSavings)} color={COLORS.primary} />
          <StatCard icon={Target} label="Members" value={members?.length || 0} color="#8B5CF6" />
        </View>

        {/* Charts Section */}
        {trendData && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Activity size={16} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Spending Trend</Text>
            </View>
            <LineChart
              data={trendData}
              width={width - 48} // Padding from screen and card wrapper
              height={220}
              chartConfig={{
                backgroundColor: COLORS.background,
                backgroundGradientFrom: COLORS.background,
                backgroundGradientTo: COLORS.background,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(30, 107, 214, ${opacity})`,
                labelColor: () => COLORS.textSecondary,
                style: { borderRadius: 12 },
                propsForDots: { r: "4", strokeWidth: "2", stroke: COLORS.primary }
              }}
              bezier
              style={{ marginVertical: 8, borderRadius: 12 }}
            />
          </View>
        )}

        {/* Member Spending Chart */}
        {memberPieData.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <PieIcon size={16} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Member Spending</Text>
            </View>
            <PieChart
              data={memberPieData}
              width={width - 48}
              height={180}
              chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
              accessor={"population"}
              backgroundColor={"transparent"}
              paddingLeft={"15"}
              absolute
            />
          </View>
        )}

        {/* Member Insights Component */}
        {fd?.memberBreakdown?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Member Insights</Text>
            {fd.memberBreakdown.map((m, i) => (
              <MemberInsightCard key={i} member={m} totalExpense={fd.totalExpense} />
            ))}
          </View>
        )}

        {/* Activity Feed */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Activity size={16} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Recent Activity</Text>
          </View>
          
          {auditLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 24 }} />
          ) : auditLogs.length === 0 ? (
            <Text style={styles.emptyText}>No activity yet</Text>
          ) : (
            auditLogs.slice(0, 5).map((log, i) => (
              <View key={i} style={styles.activityItem}>
                <View style={styles.activityAvatar}>
                  <Text style={styles.activityAvatarText}>
                    {(log.userId?.username || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.activityContent}>
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityAction}>{ACTION_LABELS[log.action] || log.action}</Text>
                    <Text style={styles.activityDate}>
                      {new Date(log.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                  <Text style={styles.activityDetails} numberOfLines={1}>{log.details}</Text>
                </View>
              </View>
            ))
          )}

          <TouchableOpacity style={styles.viewAllButton} onPress={() => navigation.navigate('FamilyExpenses')}>
            <Text style={styles.viewAllText}>View All Transactions</Text>
            <ChevronRight size={14} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  centerAll: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // No Group Styles
  noGroupContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  noGroupTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  noGroupSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  errorBox: {
    width: '100%',
    backgroundColor: COLORS.danger + '10',
    borderColor: COLORS.danger + '30',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    textAlign: 'center',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Dashboard Styles
  header: {
    marginBottom: 24,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    padding: 12,
    backgroundColor: COLORS.primaryLight + '20',
    borderRadius: 12,
    marginRight: 12,
  },
  groupName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  memberStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  memberStatusText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  iconButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    borderRadius: 12,
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconWrapper: {
    padding: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  
  // Generic Card
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  
  // Section Structure
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
    marginLeft: 4,
  },
  
  // Member Insight Card
  memberCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  memberCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  memberSpent: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },

  // Activity Feed
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    paddingVertical: 20,
    fontSize: 14,
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  activityAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityAction: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  activityDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  activityDetails: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  viewAllButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginRight: 4,
  }
});
