import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';
import type { HospitalityGateResult } from '@/types';

type Props = {
  gate: HospitalityGateResult;
};

export default function HospitalityGateCard({ gate }: Props) {
  if (!gate.applicable) {
    return (
      <View style={[styles.card, styles.na]}>
        <Text style={styles.title}>Hospitality register — not applicable</Text>
        <Text style={styles.note}>Personal presentation is graded with tú, not usted.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, gate.passed ? styles.pass : styles.fail]}>
      <View style={styles.header}>
        <Text style={styles.icon}>{gate.passed ? '✓' : '✗'}</Text>
        <Text style={styles.title}>
          Hospitality register {gate.passed ? 'passed' : 'failed'}
        </Text>
      </View>
      <Text style={styles.note}>{gate.note}</Text>
      {gate.tuForms.length > 0 && (
        <View style={styles.tuBlock}>
          <Text style={styles.tuTitle}>Tú-forms detected ({gate.tuForms.length}):</Text>
          {gate.tuForms.map((f, i) => (
            <Text key={i} style={styles.tuItem}>• {f}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.xs, borderLeftWidth: 3 },
  pass: { backgroundColor: '#F0FDF4', borderLeftColor: '#16A34A' },
  fail: { backgroundColor: '#FEF2F2', borderLeftColor: Colors.error },
  na: { backgroundColor: Colors.surfaceAlt, borderLeftColor: Colors.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { fontSize: 16, fontWeight: Typography.bold },
  title: { fontSize: Typography.body, fontWeight: Typography.semibold, color: Colors.navy },
  note: { fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  tuBlock: { marginTop: 4, gap: 2 },
  tuTitle: { fontSize: Typography.caption, fontWeight: Typography.semibold, color: '#DC2626' },
  tuItem: { fontSize: Typography.caption, color: '#DC2626' },
});
