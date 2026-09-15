import React from 'react';
import { View, Text, StyleSheet, Modal as RNModal, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Fonts, Radius, Spacing } from '../theme';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal = ({ visible, onClose, title, children }: ModalProps) => {
  const { colors } = useTheme();

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={[styles.overlay, { backgroundColor: colors.overlay }]} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.content, { backgroundColor: colors.card }]}>
          {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
          {children}
        </TouchableOpacity>
      </TouchableOpacity>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  content: { width: '100%', borderRadius: Radius.lg, padding: Spacing.xl },
  title: { fontSize: Fonts.sizes.lg, fontWeight: '700', marginBottom: Spacing.lg, textAlign: 'center' },
});
