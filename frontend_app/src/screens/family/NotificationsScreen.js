import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Switch, ActivityIndicator, Alert, RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Bell, Settings, RefreshCw, Check, X, 
  Calendar, ChevronLeft, Info, AlertCircle, Users
} from 'lucide-react-native';
import axios from '../../api/axios'; // Using the configured axios instance
import { acceptInvite, declineInvite } from '../../services/familyService';

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
  warning: '#F59E0B',
};

export default function NotificationsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('list');
  const [notifications, setNotifications] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const response = await axios.get('/api/notifications');
      setNotifications(response.data);
    } catch (err) {
      setError('Failed to fetch notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await axios.get('/api/users/me');
      setNotificationsEnabled(response.data.notificationsEnabled);
    } catch (err) {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchSettings();
  }, [fetchNotifications, fetchSettings]);

  const toggleNotifications = async () => {
    const newVal = !notificationsEnabled;
    setNotificationsEnabled(newVal); // Optimistic update
    try {
      await axios.patch('/api/notifications/toggle', {});
    } catch (err) {
      setNotificationsEnabled(!newVal); // Rollback
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const handleAcceptInvite = async (inviteId) => {
    setLoading(true);
    try {
      await acceptInvite(inviteId);
      Alert.alert('Success', 'Successfully joined the family group!');
      fetchNotifications(true);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to accept invitation.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineInvite = async (inviteId) => {
    setLoading(true);
    try {
      await declineInvite(inviteId);
      Alert.alert('Declined', 'Invitation declined.');
      fetchNotifications(true);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to decline invitation.');
    } finally {
      setLoading(false);
    }
  };

  const renderNotification = ({ item }) => {
    const isInvite = item.type === 'FAMILY_INVITE' && !item.read;
    const isWarning = item.type === 'BUDGET_EXCEEDED';

    return (
      <View style={[
        styles.notificationCard,
        !item.read && styles.unreadCard,
        isInvite && styles.inviteCard
      ]}>
        <View style={styles.notifHeader}>
          <View style={[
            styles.notifIcon,
            isInvite ? { backgroundColor: COLORS.primaryLight + '20' } : 
            isWarning ? { backgroundColor: COLORS.danger + '10' } : 
            { backgroundColor: COLORS.surface }
          ]}>
            {isInvite ? <Users size={18} color={COLORS.primary} /> : 
             isWarning ? <AlertCircle size={18} color={COLORS.danger} /> :
             <Info size={18} color={COLORS.textSecondary} />}
          </View>
          <View style={styles.notifContent}>
            <Text style={styles.notifMessage}>{item.message}</Text>
            <Text style={styles.notifDate}>
              {new Date(item.createdAt).toLocaleString('en-IN', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
              })}
            </Text>
          </View>
        </View>

        {isInvite && item.invite && (
          <View style={styles.inviteActions}>
            <TouchableOpacity 
              style={[styles.inviteBtn, styles.acceptBtn]}
              onPress={() => handleAcceptInvite(item.invite)}
            >
              <Check size={16} color="#fff" />
              <Text style={styles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.inviteBtn, styles.declineBtn]}
              onPress={() => handleDeclineInvite(item.invite)}
            >
              <X size={16} color={COLORS.textSecondary} />
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'list' && styles.activeTab]}
          onPress={() => setActiveTab('list')}
        >
          <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>Inbox</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>Settings</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'list' ? (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(true)} color={COLORS.primary} />
          }
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.emptyContainer}>
                <Bell size={48} color={COLORS.textSecondary} opacity={0.2} />
                <Text style={styles.emptyText}>No notifications yet</Text>
              </View>
            )
          }
        />
      ) : (
        <ScrollView style={styles.settingsContent}>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Budget Alerts</Text>
                <Text style={styles.settingDesc}>Notify me when family spending exceeds budget limits</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                thumbColor={notificationsEnabled ? COLORS.primary : '#f4f3f4'}
              />
            </View>
          </View>
        </ScrollView>
      )}

      {loading && (
        <View style={styles.centerAll}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  headerPlaceholder: { width: 32 },
  
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
  },

  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  notificationCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unreadCard: {
    borderColor: COLORS.primaryLight + '40',
    backgroundColor: COLORS.primaryLight + '05',
  },
  inviteCard: {
    borderColor: COLORS.primaryLight,
  },
  notifHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifContent: {
    flex: 1,
  },
  notifMessage: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
    fontWeight: '500',
  },
  notifDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  inviteActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  inviteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  acceptBtn: {
    backgroundColor: COLORS.success,
  },
  acceptBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  declineBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  declineBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },

  settingsContent: {
    padding: 16,
  },
  settingsCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    paddingRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  settingDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  emptyContainer: {
    paddingTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  centerAll: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
  }
});
