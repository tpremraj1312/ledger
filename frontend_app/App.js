import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { FinancialProvider } from './src/context/FinancialContext';
import { FamilyProvider } from './src/context/FamilyContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import { colors } from './src/theme';
import { initializeNotifications } from './src/utils/notificationService';

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <FinancialProvider>
          <FamilyProvider>
            <MainNavigator />
          </FamilyProvider>
        </FinancialProvider>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

export default function App() {
  // Initialize notification channels once on app startup
  useEffect(() => {
    initializeNotifications().catch(err =>
      console.warn('[App] Notification setup failed:', err)
    );
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
