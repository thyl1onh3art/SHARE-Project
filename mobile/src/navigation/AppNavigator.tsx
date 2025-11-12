import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import LoadingOverlay from '../components/LoadingOverlay';
import { useAuth } from '../context/AuthContext';
import DashboardScreen from '../screens/DashboardScreen';
import FinancialRecordsScreen from '../screens/FinancialRecordsScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SharedAccountsScreen from '../screens/SharedAccountsScreen';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type AppTabParamList = {
  Dashboard: undefined;
  Financial: undefined;
  SharedAccounts: undefined;
  Settings: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

const AuthNavigator = () => (
  <AuthStack.Navigator>
    <AuthStack.Screen
      name="Login"
      component={LoginScreen}
      options={{ headerShown: false }}
    />
    <AuthStack.Screen
      name="Register"
      component={RegisterScreen}
      options={{ title: 'Create Account' }}
    />
  </AuthStack.Navigator>
);

const AppTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: '#4f46e5',
      tabBarInactiveTintColor: '#9ca3af',
      tabBarIcon: ({ color, size }) => {
        const iconName = (() => {
          switch (route.name) {
            case 'Dashboard':
              return 'home';
            case 'Financial':
              return 'cash';
            case 'SharedAccounts':
              return 'people';
            case 'Settings':
            default:
              return 'settings';
          }
        })();

        return <Ionicons name={iconName as any} size={size} color={color} />;
      }
    })}
  >
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ title: 'Overview' }}
    />
    <Tab.Screen
      name="Financial"
      component={FinancialRecordsScreen}
      options={{ title: 'Finances' }}
    />
    <Tab.Screen
      name="SharedAccounts"
      component={SharedAccountsScreen}
      options={{ title: 'Shared' }}
    />
    <Tab.Screen
      name="Settings"
      component={SettingsScreen}
      options={{ title: 'Settings' }}
    />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingOverlay message="Checking your session..." />;
  }

  return (
    <NavigationContainer>
      {user ? <AppTabs /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator;
