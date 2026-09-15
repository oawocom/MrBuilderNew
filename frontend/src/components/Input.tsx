import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, TextInputProps } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Fonts, Radius, Spacing } from '../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  type?: 'text' | 'password' | 'phone' | 'email';
  icon?: React.ReactNode;
}

export const Input = ({ label, error, type = 'text', icon, style, ...props }: InputProps) => {
  const { colors } = useTheme();
  const [showPassword, setShowPassword] = useState(false);

  const keyboardTypes: Record<string, TextInputProps['keyboardType']> = {
    text: 'default',
    password: 'default',
    phone: 'phone-pad',
    email: 'email-address',
  };

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
      <View style={[
        styles.inputWrapper,
        { backgroundColor: colors.inputBg, borderColor: error ? colors.error : colors.inputBorder },
      ]}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <TextInput
          style={[styles.input, { color: colors.text }, style]}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardTypes[type]}
          secureTextEntry={type === 'password' && !showPassword}
          autoCapitalize={type === 'email' ? 'none' : 'sentences'}
          {...props}
        />
        {type === 'password' && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.toggle}>
            <Text style={{ color: colors.textMuted, fontSize: Fonts.sizes.sm }}>
              {showPassword ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.lg },
  label: { fontSize: Fonts.sizes.sm, fontWeight: '500', marginBottom: Spacing.xs },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    height: 48,
    paddingHorizontal: Spacing.md,
  },
  icon: { marginRight: Spacing.sm },
  input: { flex: 1, fontSize: Fonts.sizes.md },
  toggle: { paddingLeft: Spacing.sm },
  error: { fontSize: Fonts.sizes.xs, marginTop: Spacing.xs },
});
