import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();
import axios from 'axios';
import { Eye, EyeOff, Mail, Lock, User, Wallet } from 'lucide-react-native';
import { BACKEND_URL } from '../api/config';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme';

const SignupScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
    setSuccessMessage('');
  };

  const validateForm = () => {
    const { username, email, password, confirmPassword } = formData;
    if (!username || !email || !password || !confirmPassword) {
      setError('All fields are required.');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError('Password must be at least 8 characters long and include uppercase, lowercase, a number, and a special character.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError('');
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/auth/signup`,
        {
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }
      );

      setSuccessMessage(response.data.message || 'Signup successful! Redirecting to login...');

      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const redirectUri = Linking.createURL('/login');
      const authUrl = `${BACKEND_URL}/api/auth/google?redirectUri=${encodeURIComponent(redirectUri)}`;
      
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      
      if (result.type === 'success' && result.url) {
        const parsedUrl = Linking.parse(result.url);
        if (parsedUrl.queryParams?.token) {
          await login(parsedUrl.queryParams.token);
        } else {
          setError('Failed to extract login token from Google Auth.');
        }
      }
    } catch (err) {
      console.error('Google OAuth error:', err);
      setError('An error occurred during Google Signup.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Wallet size={32} color={colors.white} />
          </View>
          <Text style={styles.appName}>Ledger</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.description}>Start managing your finances today</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {/* Username */}
          <View style={styles.inputWrapper}>
            <User size={18} color={colors.gray400} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={colors.gray400}
              value={formData.username}
              onChangeText={(text) => handleChange('username', text)}
              autoCapitalize="none"
            />
          </View>

          {/* Email */}
          <View style={styles.inputWrapper}>
            <Mail size={18} color={colors.gray400} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.gray400}
              value={formData.email}
              onChangeText={(text) => handleChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          {/* Password */}
          <View style={styles.inputWrapper}>
            <Lock size={18} color={colors.gray400} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password (8+ chars, Complex)"
              placeholderTextColor={colors.gray400}
              value={formData.password}
              onChangeText={(text) => handleChange('password', text)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {showPassword ? (
                <EyeOff size={18} color={colors.gray400} />
              ) : (
                <Eye size={18} color={colors.gray400} />
              )}
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputWrapper}>
            <Lock size={18} color={colors.gray400} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Confirm Password"
              placeholderTextColor={colors.gray400}
              value={formData.confirmPassword}
              onChangeText={(text) => handleChange('confirmPassword', text)}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {showConfirmPassword ? (
                <EyeOff size={18} color={colors.gray400} />
              ) : (
                <Eye size={18} color={colors.gray400} />
              )}
            </TouchableOpacity>
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignup}
            activeOpacity={0.8}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleButtonText}>Sign Up with Google</Text>
          </TouchableOpacity>

          {/* Link */}
          <View style={styles.linksSection}>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkBold}>Log In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['2xl'],
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  appName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extrabold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  errorBox: {
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
  },
  successBox: {
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  successText: {
    color: colors.success,
    fontSize: fontSize.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
    height: 52,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    height: '100%',
  },
  eyeButton: {
    padding: spacing.xs,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.gray400,
    fontSize: fontSize.sm,
    marginHorizontal: spacing.md,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
  },
  googleIcon: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginRight: spacing.sm,
  },
  googleButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  linksSection: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  linkText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  linkBold: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});

export default SignupScreen;
