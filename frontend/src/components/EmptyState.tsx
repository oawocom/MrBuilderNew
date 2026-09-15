import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Fonts, Spacing } from '../theme';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({ title, description, icon, actionLabel, onAction }: EmptyStateProps) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {description && <Text style={[styles.desc, { color: colors.textSecondary }]}>{description}</Text>}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} size="md" style={styles.btn} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxxl },
  icon: { marginBottom: Spacing.xl },
  title: { fontSize: Fonts.sizes.lg, fontWeight: '600', textAlign: 'center', marginBottom: Spacing.sm },
  desc: { fontSize: Fonts.sizes.sm, textAlign: 'center', lineHeight: 20 },
  btn: { marginTop: Spacing.xl },
});
