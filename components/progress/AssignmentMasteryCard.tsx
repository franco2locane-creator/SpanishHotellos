import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

const TYPE_LABELS: Record<string, string> = {
  personal_presentation: 'Personal Presentation',
  checkin: 'Check-in',
  restaurant: 'Restaurant',
  hotel_presentation: 'Hotel Presentation',
  job_interview: 'Job Interview',
  complaint: 'Complaint',
  saying_no: 'Saying No',
};

export type MasteryRow = { type: string; avgScore: number; attempts: number };

function MasteryBar({ row }: { row: MasteryRow }) {
  const color = row.avgScore >= 75 ? '#16A34A' : row.avgScore >= 55 ? '#CA8A04' : '#DC2626';
  return (
    <View style={styles.row}>
      <Text style={styles.label} numberOfLines={1}>{TYPE_LABELS[row.type] ?? row.type}</Text>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${row.avgScore}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.pct, { color }]}>{Math.round(row.avgScore)}%</Text>
    </View>
  );
}

export default function AssignmentMasteryCard({ rows }: { rows: MasteryRow[] }) {
  if (rows.length === 0) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Mastery by Assignment Type</Text>
      {rows.map(r => <MasteryBar key={r.type} row={r} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm, gap: Spacing.sm,
  },
  cardTitle: { fontSize: Typography.body, fontWeight: Typography.bold, color: Colors.navy },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  label: { width: 118, fontSize: Typography.caption, color: Colors.textSecondary },
  barBg: { flex: 1, height: 8, backgroundColor: '#EDE9E3', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  pct: { width: 40, fontSize: Typography.caption, fontWeight: Typography.bold, textAlign: 'right' },
});
