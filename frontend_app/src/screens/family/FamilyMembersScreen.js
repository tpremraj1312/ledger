import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  TextInput, ActivityIndicator, Alert, Modal 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Users, UserPlus, Shield, UserX, Crown, 
  ShieldCheck, Eye, X, Mail, Check, Clock, Send, ChevronLeft
} from 'lucide-react-native';

import { useFamily } from '../../context/FamilyContext';
import { useAuth } from '../../context/AuthContext';
import { 
  removeMember, updateMemberRole, leaveGroup, dissolveGroup,
  inviteMember, getPendingInvites 
} from '../../services/familyService';

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
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  violet: '#8B5CF6',
  violetLight: '#F3E8FF',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  gray: '#6B7280',
  grayLight: '#F3F4F6',
};

const ROLE_CONFIG = {
  ADMIN: {
    label: 'Admin',
    color: COLORS.violet,
    bg: COLORS.violetLight,
    icon: Crown,
    desc: 'Full control over group, members, and financial records.'
  },
  MEMBER: {
    label: 'Member',
    color: COLORS.blue,
    bg: COLORS.blueLight,
    icon: ShieldCheck,
    desc: 'Can add, edit, and delete transactions. Cannot manage members.'
  },
  VIEWER: {
    label: 'Viewer',
    color: COLORS.gray,
    bg: COLORS.grayLight,
    icon: Eye,
    desc: 'Read-only access to dashboard and transactions.'
  },
};

export default function FamilyMembersScreen({ navigation }) {
  const { group, members, isAdmin, currentUserMember, refreshGroup, hasGroup } = useFamily();
  const { refreshUser } = useAuth();

  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const fetchPending = useCallback(async () => {
    try {
      const invites = await getPendingInvites();
      setPendingInvites(invites);
    } catch (err) {}
  }, []);

  useEffect(() => {
    if (hasGroup) fetchPending();
  }, [hasGroup, fetchPending]);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    try {
      await inviteMember(email.trim());
      Alert.alert('Success', `Invitation sent to ${email}`);
      setEmail('');
      fetchPending();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    setLoading(true);
    try {
      await updateMemberRole(memberId, newRole);
      await refreshGroup();
      setRoleModalVisible(false);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (memberId, username) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${username} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await removeMember(memberId);
              await refreshGroup();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to remove member');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this family group?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Leave', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await leaveGroup();
              await refreshUser();
              navigation.navigate('Home');
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to leave group');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDissolve = () => {
    Alert.alert(
      'Dissolve Group',
      'WARNING: This will permanently delete the group and ALL associated data (transactions, budgets, logs). This cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Dissolve', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await dissolveGroup();
              await refreshUser();
              navigation.navigate('Home');
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to dissolve group');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const currentUserId = currentUserMember?.user?._id || currentUserMember?.user;
  const sortedMembers = [...(members || [])].sort((a, b) => {
    if (a.role === 'ADMIN') return -1;
    if (b.role === 'ADMIN') return 1;
    return 0;
  });

  const renderMember = ({ item, index }) => {
    const config = ROLE_CONFIG[item.role] || ROLE_CONFIG.VIEWER;
    const RoleIcon = config.icon;
    const memberId = item.user?._id || item.user;
    const isSelf = memberId?.toString() === currentUserId?.toString();

    return (
      <View style={styles.memberCard}>
        <View style={styles.memberHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(item.user?.username || 'U').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.memberInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.memberName}>{item.user?.username || 'Unknown'}</Text>
              {isSelf && <View style={styles.selfBadge}><Text style={styles.selfBadgeText}>You</Text></View>}
            </View>
            <Text style={styles.memberEmail}>{item.user?.email}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: config.bg }]}>
            <RoleIcon size={12} color={config.color} />
            <Text style={[styles.roleLabel, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>

        {isAdmin && !isSelf && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => { setSelectedMember(item); setRoleModalVisible(true); }}
            >
              <Shield size={14} color={COLORS.textSecondary} />
              <Text style={styles.actionButtonText}>Change Role</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.removeButton]}
              onPress={() => handleRemove(memberId, item.user?.username)}
            >
              <UserX size={14} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Invite Section */}
      {isAdmin && (
        <View style={styles.inviteSection}>
          <Text style={styles.sectionTitle}>Invite New Member</Text>
          <View style={styles.inviteInputRow}>
            <View style={styles.inputWrapper}>
              <Mail size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <TouchableOpacity 
              style={[styles.sendButton, !email.trim() && styles.disabledButton]}
              onPress={handleInvite}
              disabled={inviting || !email.trim()}
            >
              {inviting ? <ActivityIndicator size="small" color="#fff" /> : <Send size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.sectionTitle}>Pending Invitations ({pendingInvites.length})</Text>
          {pendingInvites.map((inv, idx) => (
            <View key={idx} style={styles.pendingCard}>
              <View style={styles.pendingInfo}>
                <Text style={styles.pendingEmail}>{inv.email}</Text>
                <View style={styles.expiryRow}>
                  <Clock size={12} color={COLORS.warning} />
                  <Text style={styles.expiryText}>
                    Expires {new Date(inv.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
              </View>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>Invited</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Group Members</Text>
    </View>
  );

  const ListFooter = () => (
    <View style={styles.footer}>
      <Text style={styles.sectionTitle}>Danger Zone</Text>
      <View style={styles.dangerZone}>
        <TouchableOpacity style={styles.dangerButton} onPress={handleLeave}>
          <Text style={styles.dangerButtonText}>Leave Family Group</Text>
        </TouchableOpacity>
        {isAdmin && (
          <TouchableOpacity style={[styles.dangerButton, styles.dissolveButton]} onPress={handleDissolve}>
            <Text style={styles.dissolveButtonText}>Dissolve Group</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Members</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <FlatList
        data={sortedMembers}
        renderItem={renderMember}
        keyExtractor={item => (item.user?._id || item.user || Math.random().toString())}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Role Selection Modal */}
      <Modal
        visible={roleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Role</Text>
              <TouchableOpacity onPress={() => setRoleModalVisible(false)}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Select a new role for {selectedMember?.user?.username}</Text>

            {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
              <TouchableOpacity 
                key={role}
                style={[
                  styles.roleOption,
                  selectedMember?.role === role && styles.activeRoleOption
                ]}
                onPress={() => handleRoleChange(selectedMember.user?._id || selectedMember.user, role)}
                disabled={loading}
              >
                <View style={[styles.roleIconBox, { backgroundColor: cfg.bg }]}>
                  <cfg.icon size={20} color={cfg.color} />
                </View>
                <View style={styles.roleTextContainer}>
                  <Text style={styles.roleOptionLabel}>{cfg.label}</Text>
                  <Text style={styles.roleOptionDesc}>{cfg.desc}</Text>
                </View>
                {selectedMember?.role === role && <Check size={20} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.globalLoader}>
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerPlaceholder: {
    width: 32,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Member Card
  memberCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 18,
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  selfBadge: {
    backgroundColor: COLORS.primaryLight + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  selfBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  removeButton: {
    flex: 0,
    width: 40,
  },
  // Invite Section
  inviteSection: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  inviteInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  // Pending Section
  pendingSection: {
    marginBottom: 16,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  pendingInfo: {
    flex: 1,
  },
  pendingEmail: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  expiryText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  pendingBadge: {
    backgroundColor: COLORS.warning + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingBadgeText: {
    color: COLORS.warning,
    fontSize: 11,
    fontWeight: '600',
  },
  // Footer
  footer: {
    marginTop: 24,
  },
  dangerZone: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dangerButton: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginBottom: 12,
  },
  dangerButtonText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  dissolveButton: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger,
    marginBottom: 0,
  },
  dissolveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  activeRoleOption: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '05',
  },
  roleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  roleOptionDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  globalLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  }
});
