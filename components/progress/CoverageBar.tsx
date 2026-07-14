import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';

type Props = {
  label: string;
  completed: number;
  total: number;
  /** Unit name appended to the fraction, e.g. "scenarios" -> "3/6 scenarios" —
   *  every coverage figure in the tab must name what it's counting, never a
   *  bare "x/y". */
  unit: string;
  /** Shows a 🔒 suffix — used when this row is stuck at 0 because the
   *  content itself is premium-only, an honest paywall nudge rather than
   *  a hidden number (the count itself is always real). */
  locked?: boolean;
};

export default function CoverageBar({ label, completed, total, unit, locked }: Props) {
  const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  return (
    <View style={styles.row} accessibilityLabel={`${label}: ${completed} of ${total} ${unit}`}>
      <View style={styles.labelRow}>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        <Text style={styles.frac}>{completed}/{total} {unit}{locked && completed === 0 ? ' 🔒' : ''}</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 4, marginBottom: Spacing.sm },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { flex: 1, fontSize: Typography.caption, color: Colors.textSecondary, marginRight: Spacing.sm },
  frac: { fontSize: Typography.caption, fontWeight: '700', color: Colors.navy },
  barBg: { height: 8, backgroundColor: '#EDE9E3', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: Colors.gold },
});
