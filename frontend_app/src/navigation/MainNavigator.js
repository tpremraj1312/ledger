import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet } from 'react-native';
import { Home, Gauge, Banknote, Settings, Brain } from 'lucide-react-native';
import { colors, fontSize, fontWeight } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import BudgetScreen from '../screens/BudgetScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import GamificationScreen from '../screens/GamificationScreen';
import InvestmentScreen from '../screens/InvestmentScreen';
import BudgetComparisonScreen from '../screens/BudgetComparisonScreen';
import AIAnalysisScreen from '../screens/AIAnalysisScreen';
import FamilyDashboardScreen from '../screens/family/FamilyDashboardScreen';
import FamilyMembersScreen from '../screens/family/FamilyMembersScreen';
import FamilyBudgetScreen from '../screens/family/FamilyBudgetScreen';
import FamilyExpensesScreen from '../screens/family/FamilyExpensesScreen';
import NotificationsScreen from '../screens/family/NotificationsScreen';
import AgentChatScreen from '../screens/agent/AgentChatScreen';
import TaxOptimizerScreen from '../screens/TaxOptimizerScreen';
import SMSParserScreen from '../screens/SMSParserScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const iconSize = 22;
          const iconColor = focused ? colors.primary : colors.gray400;

          switch (route.name) {
            case 'Home':
              return <Home size={iconSize} color={iconColor} />;
            case 'Budget':
              return <Gauge size={iconSize} color={iconColor} />;
            case 'Expenses':
              return <Banknote size={iconSize} color={iconColor} />;
            case 'Settings':
              return <Settings size={iconSize} color={iconColor} />;
            default:
              return null;
          }
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray400,
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.semibold,
          marginTop: -2,
        },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Budget" component={BudgetScreen} />
      <Tab.Screen 
        name="Agent" 
        component={AgentChatScreen} 
        options={{
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#1E6BD6', // Primary token
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: -24, // Float above the bar
              borderWidth: 4,
              borderColor: '#FFFFFF', // Creates the cutout effect
              shadowColor: '#1E6BD6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 5,
            }}>
              <Brain size={26} color="#FFFFFF" />
            </View>
          ),
        }}
      />
      <Tab.Screen name="Expenses" component={ExpensesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

const MainNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Placeholder" component={PlaceholderScreen} />
      <Stack.Screen name="Gamification" component={GamificationScreen} />
      <Stack.Screen name="Investments" component={InvestmentScreen} />
      <Stack.Screen name="BudgetComparison" component={BudgetComparisonScreen} />
      <Stack.Screen name="AIAnalysis" component={AIAnalysisScreen} />
      <Stack.Screen name="FamilyDashboard" component={FamilyDashboardScreen} />
      <Stack.Screen name="FamilyMembers" component={FamilyMembersScreen} />
      <Stack.Screen name="FamilyBudget" component={FamilyBudgetScreen} />
      <Stack.Screen name="FamilyExpenses" component={FamilyExpensesScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="AgentChat" component={AgentChatScreen} />
      <Stack.Screen name="TaxOptimizer" component={TaxOptimizerScreen} />
      <Stack.Screen name="SMSParser" component={SMSParserScreen} />
    </Stack.Navigator>
  );
};

export default MainNavigator;
