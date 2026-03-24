// Design System — Ledger Fintech Mobile App
// Light theme, blue primary palette, flat & crisp
import { Platform } from 'react-native';

export const colors = {
  primary: '#1E6BD6',
  primaryLight: '#4C8DF0',
  primaryDark: '#154EA1',
  background: '#FFFFFF',
  surface: '#F5F7FA',
  textPrimary: '#0D1B2A',
  textSecondary: '#44556B',
  border: '#E0E6EE',
  error: '#DC2626',
  errorLight: '#FEF2F2',
  success: '#16A34A',
  successLight: '#F0FDF4',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  overlay: 'rgba(0, 0, 0, 0.4)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
};

export const fontSize = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
};

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

export const borderRadius = {
  sm: 6,
  base: 10,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const shadows = Platform.OS === 'web' ? {
  sm: { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)' },
  base: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.08)' },
  md: { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)' },
  lg: { boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.12)' },
} : {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};
