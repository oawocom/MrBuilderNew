import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Fonts, Radius, Spacing } from '../theme';
import { Badge } from './Badge';
import { Button } from './Button';

interface JobCardProps {
  title: string;
  location: string;
  description: string;
  startDate: string;
  endDate: string;
  payment: number;
  category?: string;
  structureDetails?: {
    structureType?: string;
    buildingType?: string;
    sideEnclosure?: string;
    width?: string;
    length?: string;
    height?: string;
  };
  showActions?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onPress?: () => void;
}

export const JobCard = ({
  title, location, description, startDate, endDate,
  payment, category, structureDetails, showActions = true,
  onAccept, onDecline, onPress,
}: JobCardProps) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {category && <Badge label={category} variant="default" />}
      </View>

      <View style={styles.body}>
        <View style={styles.locationRow}>
          <Text style={styles.pin}>📍</Text>
          <Text style={[styles.location, { color: colors.text }]}>{location}</Text>
        </View>

        <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
          {description}
        </Text>

        <View style={[styles.datePayment, { borderColor: colors.border }]}>
          <View>
            <Text style={[styles.label, { color: colors.textMuted }]}>Preferred dates</Text>
            <Text style={[styles.value, { color: colors.text }]}>{startDate} - {endDate}</Text>
          </View>
          <View style={styles.paymentCol}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Payment</Text>
            <Text style={[styles.payment, { color: colors.primary }]}>$ {payment.toLocaleString()}</Text>
          </View>
        </View>

        {structureDetails && (
          <View style={styles.structure}>
            <Text style={[styles.structureTitle, { color: colors.text }]}>🏗 Structure details</Text>
            {structureDetails.structureType && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Structure type</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{structureDetails.structureType}</Text>
              </View>
            )}
            {structureDetails.buildingType && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Building type</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{structureDetails.buildingType}</Text>
              </View>
            )}
            {(structureDetails.width || structureDetails.length || structureDetails.height) && (
              <View style={styles.dimensions}>
                {structureDetails.width && (
                  <View style={[styles.dimBox, { borderColor: colors.border }]}>
                    <Text style={[styles.dimLabel, { color: colors.textMuted }]}>Width</Text>
                    <Text style={[styles.dimValue, { color: colors.text }]}>{structureDetails.width}</Text>
                  </View>
                )}
                {structureDetails.length && (
                  <View style={[styles.dimBox, { borderColor: colors.border }]}>
                    <Text style={[styles.dimLabel, { color: colors.textMuted }]}>Length</Text>
                    <Text style={[styles.dimValue, { color: colors.text }]}>{structureDetails.length}</Text>
                  </View>
                )}
                {structureDetails.height && (
                  <View style={[styles.dimBox, { borderColor: colors.border }]}>
                    <Text style={[styles.dimLabel, { color: colors.textMuted }]}>Height</Text>
                    <Text style={[styles.dimValue, { color: colors.text }]}>{structureDetails.height}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {showActions && (
          <View style={styles.actions}>
            <Button title="✕ Decline" variant="outline" size="md" onPress={onDecline || (() => {})} style={styles.actionBtn} />
            <Button title="✓ Accept" variant="primary" size="md" onPress={onAccept || (() => {})} style={styles.actionBtn} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: 1, marginBottom: Spacing.lg, overflow: 'hidden' },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#FFFFFF', fontSize: Fonts.sizes.md, fontWeight: '700', flex: 1, marginRight: Spacing.sm },
  body: { padding: Spacing.lg },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  pin: { marginRight: Spacing.xs },
  location: { fontSize: Fonts.sizes.sm, fontWeight: '500' },
  desc: { fontSize: Fonts.sizes.sm, lineHeight: 20, marginBottom: Spacing.md },
  datePayment: { flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  label: { fontSize: Fonts.sizes.xs, marginBottom: Spacing.xs },
  value: { fontSize: Fonts.sizes.sm, fontWeight: '500' },
  paymentCol: { alignItems: 'flex-end' },
  payment: { fontSize: Fonts.sizes.lg, fontWeight: '700' },
  structure: { marginBottom: Spacing.md },
  structureTitle: { fontSize: Fonts.sizes.sm, fontWeight: '600', marginBottom: Spacing.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  detailLabel: { fontSize: Fonts.sizes.sm },
  detailValue: { fontSize: Fonts.sizes.sm, fontWeight: '500' },
  dimensions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  dimBox: { flex: 1, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center' },
  dimLabel: { fontSize: Fonts.sizes.xs, marginBottom: Spacing.xs },
  dimValue: { fontSize: Fonts.sizes.md, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: Spacing.md },
  actionBtn: { flex: 1 },
});
