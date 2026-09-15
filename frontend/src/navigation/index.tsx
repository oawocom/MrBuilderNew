import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SplashScreen } from '../screens/shared/onboarding/SplashScreen';
import { WalkthroughScreen } from '../screens/shared/onboarding/WalkthroughScreen';
import { LoginScreen } from '../screens/shared/auth/LoginScreen';
import { SignupScreen } from '../screens/shared/auth/SignupScreen';
import { ContractorTabs } from './ContractorTabs';
import { ConsumerTabs } from './ConsumerTabs';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Walkthrough" component={WalkthroughScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="ContractorTabs" component={ContractorTabs} />
        <Stack.Screen name="ConsumerTabs" component={ConsumerTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
