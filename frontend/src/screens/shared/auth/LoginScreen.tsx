import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { Button, Input } from '../../../components';
import { Fonts, Spacing, Radius } from '../../../theme';

export const LoginScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('https://mobile.mrbuilder.com/api/v1/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        const role = data.data.user.role;
        if (role === 'contractor') {
          navigation.reset({ index: 0, routes: [{ name: 'ContractorTabs' }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'ConsumerTabs' }] });
        }
      } else {
        Alert.alert('Error', data.error || 'Login failed');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.logoWrap}>
        <Text style={[styles.logo, { color: colors.primary }]}>🏗️</Text>
        <Text style={[styles.logoText, { color: colors.primary }]}>MR.BUILDER</Text>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Log in to continue managing your jobs and tracking your earnings.
      </Text>

      <Input
        label="Email address"
        type="email"
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
      />

      <Input
        label="Password"
        type="password"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
      />

      <Button
        title="Sign in"
        onPress={handleLogin}
        loading={loading}
      />

      <TouchableOpacity onPress={() => Alert.alert('Info', 'Forgot password flow coming soon')} style={styles.forgot}>
        <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.xl, paddingTop: 80, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: Spacing.xxxl },
  logo: { fontSize: 48 },
  logoText: { fontSize: Fonts.sizes.xxl, fontWeight: '700', marginTop: Spacing.sm },
  title: { fontSize: Fonts.sizes.xxl, fontWeight: '700', marginBottom: Spacing.xs },
  subtitle: { fontSize: Fonts.sizes.sm, lineHeight: 20, marginBottom: Spacing.xxl },
  forgot: { alignItems: 'center', marginTop: Spacing.lg },
  forgotText: { fontSize: Fonts.sizes.sm, fontWeight: '600' },
});
