import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Fonts, Spacing } from '../theme';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  rightIcon?: React.ReactNode;
  onRight?: () => void;
}

export const Header = ({ title, onBack, rightIcon, onRight }: HeaderProps) => {
  const { colors, mode } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={[styles.backText, { color: colors.text }]}>‹</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        {rightIcon && onRight ? (
          <TouchableOpacity onPress={onRight} style={styles.rightBtn}>
            {rightIcon}
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { width: 32, height: 32, justifyContent: 'center' },
  backText: { fontSize: 28, fontWeight: '300' },
  title: { fontSize: Fonts.sizes.xl, fontWeight: '700', flex: 1, textAlign: 'center' },
  rightBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  placeholder: { width: 32 },
});
