import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { X, Upload, FileText, Camera, FileArchive } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme';

const ScanBillModal = ({ visible, onClose, onScanSubmit }) => {
  const [scanType, setScanType] = useState('bill'); // 'bill' | 'statement'
  const [selectedFile, setSelectedFile] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorText, setErrorText] = useState('');

  const pickImage = async (useCamera = false) => {
    console.log(`[ScanBillModal] pickImage called. useCamera: ${useCamera}`);
    setErrorText('');
    try {
      let result;
      if (useCamera) {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) {
          setErrorText('Camera permission is required.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
      } else {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) {
          setErrorText('Gallery permission is required.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const filename = asset.uri.split('/').pop() || 'scanned_image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        let type = match ? `image/${match[1]}` : `image/jpeg`;
        
        // Normalize jpg to jpeg to prevent backend rejection
        if (type === 'image/jpg') type = 'image/jpeg';

        setSelectedFile({
          uri: asset.uri,
          name: filename,
          type: type,
        });
      }
    } catch (err) {
      console.error(err);
      setErrorText('Failed to pick image.');
    }
  };

  const pickDocument = async () => {
    setErrorText('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/pdf',
        });
      }
    } catch (err) {
      console.error(err);
      setErrorText('Failed to pick document.');
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setErrorText('Please select an image to scan.');
      return;
    }

    try {
      setIsScanning(true);
      setErrorText('');
      await onScanSubmit(selectedFile, scanType);
      
      // Reset on success
      setSelectedFile(null);
      setScanType('bill');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to process bill scan.';
      setErrorText(errorMessage);
    } finally {
      setIsScanning(false);
    }
  };

  const handleClose = () => {
    if (isScanning) return;
    setSelectedFile(null);
    setScanType('bill');
    setErrorText('');
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Scan Document</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} disabled={isScanning}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Upload an image to extract transaction details automatically.
          </Text>

          {!!errorText && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorText}</Text>
            </View>
          )}

          <Text style={styles.label}>DOCUMENT TYPE</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                scanType === 'bill' && styles.toggleActive,
                styles.toggleLeft
              ]}
              onPress={() => setScanType('bill')}
            >
              <Text style={[styles.toggleText, scanType === 'bill' && styles.toggleTextActive]}>Single Bill</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                scanType === 'statement' && styles.toggleActive,
                styles.toggleRight
              ]}
              onPress={() => setScanType('statement')}
            >
              <Text style={[styles.toggleText, scanType === 'statement' && styles.toggleTextActive]}>Bank Statement</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>UPLOAD IMAGE</Text>
          {selectedFile ? (
            <View style={styles.selectedFileBox}>
              <FileText size={24} color={colors.primary} />
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
                <Text style={styles.fileStatus}>Ready to scan</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedFile(null)} disabled={isScanning}>
                <X size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.uploadActions}>
              <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage(false)}>
                <Upload size={20} color={colors.textSecondary} />
                <Text style={styles.uploadText}>Gallery</Text>
              </TouchableOpacity>
              
              {scanType === 'bill' ? (
                <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage(true)}>
                  <Camera size={20} color={colors.textSecondary} />
                  <Text style={styles.uploadText}>Camera</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.uploadBtn} onPress={pickDocument}>
                  <FileArchive size={20} color={colors.textSecondary} />
                  <Text style={styles.uploadText}>PDF File</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, (!selectedFile || isScanning) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!selectedFile || isScanning}
            activeOpacity={0.8}
          >
            {isScanning ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.submitBtnText}>Scan Document</Text>
            )}
          </TouchableOpacity>
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
    padding: spacing.lg,
  },
  content: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  errorBox: {
    backgroundColor: colors.errorLight + '40',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.xs,
  },
  label: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  toggleLeft: {
    borderTopLeftRadius: borderRadius.md,
    borderBottomLeftRadius: borderRadius.md,
    borderRightWidth: 0,
  },
  toggleRight: {
    borderTopRightRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
    borderLeftWidth: 0,
  },
  toggleActive: {
    backgroundColor: colors.primaryLight + '20',
    borderColor: colors.primary,
    borderWidth: 1,
    zIndex: 1,
  },
  toggleText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  toggleTextActive: {
    color: colors.primaryDark,
    fontWeight: fontWeight.bold,
  },
  uploadActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    borderStyle: 'dashed',
  },
  uploadText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  selectedFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  fileInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  fileName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  fileStatus: {
    fontSize: fontSize.xs,
    color: colors.success,
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  submitBtnDisabled: {
    backgroundColor: colors.gray300,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});

export default ScanBillModal;
