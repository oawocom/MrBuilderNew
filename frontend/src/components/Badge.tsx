import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Fonts, Radius, Spacing } from '../theme';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'default' | 'primary';
}

export const Badge = ({ label, variant = 'default' }: BadgeProps) => {
  const { colors } = useTheme();

  const bgColors = {
    success: '#DCFCE7',
    warning: '#FEF3C7',
    error: '#FEE2E2',
    primary: '#FFF7ED',
    default: colors.surface,
  };

  const textColorMap = {
    success: '#16A34A',
    warning: '#D97706',
    error: '#DC2626',
    primary: '#EA580C',
    default: colors.textSecondary,
  };

  return (
    <View style={[styles.badge, { backgroundColor: bgColors[variant] }]}>
      <Text style={[styles.text, { color: textColorMap[variant] }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.sm },
  text: { fontSize: Fonts.sizes.xs, fontWeight: '600' },
});
