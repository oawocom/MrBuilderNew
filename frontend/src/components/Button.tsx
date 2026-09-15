import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Fonts, Radius, Spacing } from '../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const Button = ({
  title, onPress, variant = 'primary', size = 'lg',
  loading = false, disabled = false, icon, style,
}: ButtonProps) => {
  const { colors } = useTheme();

  const bgColors = {
    primary: colors.primary,
    outline: 'transparent',
    danger: colors.error,
    ghost: 'transparent',
  };

  const textColors = {
    primary: '#FFFFFF',
    outline: colors.primary,
    danger: '#FFFFFF',
    ghost: colors.primary,
  };

  const heights = { sm: 36, md: 44, lg: 52 };
  const fontSizes = { sm: Fonts.sizes.sm, md: Fonts.sizes.md, lg: Fonts.sizes.md };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          backgroundColor: bgColors[variant],
          height: heights[size],
          borderColor: variant === 'outline' ? colors.primary : 'transparent',
          borderWidth: variant === 'outline' ? 1.5 : 0,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColors[variant]} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: textColors[variant], fontSize: fontSizes[size], marginLeft: icon ? Spacing.sm : 0 }]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  text: {
    fontWeight: '600',
  },
});
