import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

const PASS_MARK = 60;

type Props = {
  /** Average combined score (0–100) across recent mock exams, or null if none completed yet. */
  avgMockScore: number | null;
};

function readinessLabel(avg: number): { label: string; color: string } {
  if (avg >= PASS_MARK + 15) return { label: 'Exam ready', color: '#16A34A' };
  if (avg >= PASS_MARK) return { label: 'On track', color: '#16A34A' };
  if (avg >= PASS_MARK - 15) return { label: 'Close — keep drilling', color: '#CA8A04' };
  return { label: 'Needs focused work', color: '#DC2626' };
}

export default function ReadinessCard({ avgMockScore }: Props) {
  if (avgMockScore === null) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Exam Readiness</Text>
        <Text style={styles.emptyText}>Complete a mock exam to see your readiness indicator.</Text>
      </View>
    );
  }

  const { label, color } = readinessLabel(avgMockScore);
  const pct = Math.min(100, Math.round((avgMockScore / (PASS_MARK + 25)) * 100));

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Exam Readiness</Text>
      <View style={styles.row}>
        <Text style={[styles.score, { color }]}>{Math.round(avgMockScore)}</Text>
        <Text style={styles.scoreOf}>/100 avg</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.markerLine, { left: `${(PASS_MARK / (PASS_MARK + 25)) * 100}%` }]} />
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.label, { color }]}>{label}</Text>
      <Text style={styles.sub}>Pass mark: {PASS_MARK}/100</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm, gap: Spacing.xs,
  },
  cardTitle: { fontSize: Typography.body, fontWeight: Typography.bold, color: Colors.navy },
  emptyText: { fontSize: Typography.caption, color: Colors.textMuted, fontStyle: 'italic', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 },
  score: { fontSize: 40, fontWeight: Typography.bold },
  scoreOf: { fontSize: Typography.caption, color: Colors.textMuted },
  barBg: { height: 10, backgroundColor: '#EDE9E3', borderRadius: 5, overflow: 'hidden', marginTop: 4 },
  barFill: { height: '100%', borderRadius: 5 },
  markerLine: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: Colors.navy, zIndex: 1 },
  label: { fontSize: Typography.body, fontWeight: Typography.semibold, marginTop: 4 },
  sub: { fontSize: Typography.caption, color: Colors.textMuted },
});
