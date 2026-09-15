import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Fonts } from '../theme';

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
}

export const Avatar = ({ uri, name, size = 44 }: AvatarProps) => {
  const { colors } = useTheme();
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} />;
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary }]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: { resizeMode: 'cover' },
  fallback: { justifyContent: 'center', alignItems: 'center' },
  initials: { color: '#FFFFFF', fontWeight: '700' },
});
