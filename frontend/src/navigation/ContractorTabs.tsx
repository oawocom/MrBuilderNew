import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Fonts } from '../theme';
import { ContractorHomeScreen } from '../screens/contractor/home/HomeScreen';
import { ContractorHistoryScreen } from '../screens/contractor/history/HistoryScreen';
import { MessagesScreen } from '../screens/shared/MessagesScreen';
import { MrSupplyScreen } from '../screens/contractor/mrsupply/MrSupplyScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();

const TabIcon = ({ label, focused, color }: { label: string; focused: boolean; color: string }) => (
  <Text style={{ fontSize: focused ? 22 : 20, color }}>{label}</Text>
);

export const ContractorTabs = () => {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.tabBarBorder, height: 85, paddingBottom: 25, paddingTop: 8 },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: { fontSize: Fonts.sizes.xs, fontWeight: '500' },
      }}
    >
      <Tab.Screen name="Home" component={ContractorHomeScreen} options={{ tabBarIcon: ({ focused, color }) => <TabIcon label="🏠" focused={focused} color={color} /> }} />
      <Tab.Screen name="History" component={ContractorHistoryScreen} options={{ tabBarIcon: ({ focused, color }) => <TabIcon label="📋" focused={focused} color={color} /> }} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ tabBarIcon: ({ focused, color }) => <TabIcon label="💬" focused={focused} color={color} /> }} />
      <Tab.Screen name="MrSupply" component={MrSupplyScreen} options={{ tabBarIcon: ({ focused, color }) => <TabIcon label="🛒" focused={focused} color={color} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ focused, color }) => <TabIcon label="👤" focused={focused} color={color} /> }} />
    </Tab.Navigator>
  );
};
