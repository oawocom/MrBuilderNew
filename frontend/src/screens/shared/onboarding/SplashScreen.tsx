import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { Fonts } from '../../../theme';

export const SplashScreen = ({ navigation }: any) => {
  const { colors } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={styles.emoji}>🏗️</Text>
      <Text style={[styles.logo, { color: colors.primary }]}>MR.BUILDER</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 64, marginBottom: 16 },
  logo: { fontSize: Fonts.sizes.title, fontWeight: '700' },
});
