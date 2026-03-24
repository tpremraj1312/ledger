/**
 * RiskAlertModal — In-App Alert for High-Risk Transactions
 * 
 * Triggered when riskScore >= userThreshold.
 * Shows: risk reason, amount, merchant, category.
 * Actions: "Mark Safe" and "View Details".
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Platform,
} from 'react-native';
import { AlertTriangle, Shield, Eye, X } from 'lucide-react-native';
import { getRiskColor, getRiskBgColor } from '../../utils/riskEngine';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../theme';

const formatCurrency = (amount) =>
  `₹${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

const RiskAlertModal = ({
  visible,
  transaction,
  onDismiss,
  onMarkSafe,
  onViewDetails,
  vibrationEnabled = true,
}) => {
  if (!transaction) return null;

  const {
    merchant, amount, category, riskScore, riskLevel, riskReasons, smsHash,
  } = transaction;

  const riskColor = getRiskColor(riskLevel);
  const riskBg = getRiskBgColor(riskLevel);

  // Vibrate on mount if enabled
  React.useEffect(() => {
    if (visible && vibrationEnabled && Platform.OS !== 'web') {
      Vibration.vibrate([0, 200, 100, 200]); // Pattern: pause, vibrate, pause, vibrate
    }
  }, [visible, vibrationEnabled]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onDismiss} activeOpacity={0.7}>
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Alert Icon */}
          <View style={[styles.iconCircle, { backgroundColor: riskBg }]}>
            <AlertTriangle size={32} color={riskColor} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Risk Alert</Text>
          <Text style={styles.subtitle}>
            A suspicious transaction was detected
          </Text>

          {/* Transaction Details */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Merchant</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{merchant}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={[styles.detailValue, { color: colors.error }]}>
                {formatCurrency(amount)}
              </Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>{category}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Risk Score</Text>
              <View style={[styles.scoreBadge, { backgroundColor: riskBg }]}>
                <Text style={[styles.scoreText, { color: riskColor }]}>{riskScore}/100</Text>
              </View>
            </View>
          </View>

          {/* Risk Reasons */}
          {riskReasons && riskReasons.length > 0 && (
            <View style={[styles.reasonsBox, { backgroundColor: riskBg }]}>
              {riskReasons.map((reason, i) => (
                <Text key={i} style={[styles.reasonText, { color: riskColor }]}>
                  ⚠ {reason}
                </Text>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.safeButton}
              onPress={() => {
                onMarkSafe?.(smsHash);
                onDismiss?.();
              }}
              activeOpacity={0.7}
            >
              <Shield size={16} color={colors.success} />
              <Text style={styles.safeButtonText}>Mark Safe</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => {
                onViewDetails?.(transaction);
                onDismiss?.();
              }}
              activeOpacity={0.7}
            >
              <Eye size={16} color={colors.white} />
              <Text style={styles.viewButtonText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  container: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.lg,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.base,
    right: spacing.base,
    padding: spacing.xs,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.base,
    marginTop: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    fontWeight: '400',
  },
  detailsCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  detailDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  scoreBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  scoreText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  reasonsBox: {
    width: '100%',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  reasonText: {
    fontSize: fontSize.sm,
    fontWeight: '400',
    marginBottom: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.md,
  },
  safeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  safeButtonText: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.success,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    gap: spacing.xs,
  },
  viewButtonText: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.white,
  },
});

export default React.memo(RiskAlertModal);
