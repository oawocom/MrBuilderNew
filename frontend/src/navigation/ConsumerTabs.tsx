import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Fonts } from '../theme';
import { ConsumerMainScreen } from '../screens/consumer/main/MainScreen';
import { RequestsScreen } from '../screens/consumer/requests/RequestsScreen';
import { MrCareScreen } from '../screens/consumer/mrcare/MrCareScreen';
import { InvoicesScreen } from '../screens/consumer/invoices/InvoicesScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();

const TabIcon = ({ label, focused, color }: { label: string; focused: boolean; color: string }) => (
  <Text style={{ fontSize: focused ? 22 : 20, color }}>{label}</Text>
);

export const ConsumerTabs = () => {
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
      <Tab.Screen name="Main" component={ConsumerMainScreen} options={{ tabBarIcon: ({ focused, color }) => <TabIcon label="🏠" focused={focused} color={color} /> }} />
      <Tab.Screen name="Requests" component={RequestsScreen} options={{ tabBarIcon: ({ focused, color }) => <TabIcon label="📋" focused={focused} color={color} /> }} />
      <Tab.Screen name="MrCare" component={MrCareScreen} options={{ tabBarIcon: ({ focused, color }) => <TabIcon label="🔧" focused={focused} color={color} /> }} />
      <Tab.Screen name="Invoices" component={InvoicesScreen} options={{ tabBarIcon: ({ focused, color }) => <TabIcon label="📄" focused={focused} color={color} /> }} />
      <Tab.Screen name="More" component={ProfileScreen} options={{ tabBarIcon: ({ focused, color }) => <TabIcon label="⚙️" focused={focused} color={color} /> }} />
    </Tab.Navigator>
  );
};
