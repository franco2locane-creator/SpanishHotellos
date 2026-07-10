import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

const TYPE_LABELS: Record<string, string> = {
  personal_presentation: 'Presentación personal',
  checkin: 'Check-in',
  restaurant: 'Restaurante',
  hotel_presentation: 'Presentación del hotel',
  job_interview: 'Entrevista de trabajo',
  complaint: 'Gestión de queja',
  saying_no: 'Denegación educada',
};

export type AssignmentResultRow = { assignmentType: string; score: number | null };

type Props = {
  mockId: string;
  combinedScore: number;
  passed: boolean;
  gatePassed: boolean;
  completedAt: string;
  assignmentResults: AssignmentResultRow[];
};

export default function LastMockCard({ mockId, combinedScore, passed, gatePassed, completedAt, assignmentResults }: Props) {
  const graded = assignmentResults.filter((a): a is { assignmentType: string; score: number } => a.score !== null);
  const weakest = graded.length
    ? graded.reduce((a, b) => (a.score <= b.score ? a : b))
    : null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Last Mock Exam</Text>
      <View style={styles.row}>
        <Text style={styles.mockId}>{mockId}</Text>
        <Text style={styles.date}>{completedAt.slice(0, 10)}</Text>
      </View>
      <View style={styles.scoreRow}>
        <Text style={[styles.score, passed ? styles.pass : styles.fail]}>{Math.round(combinedScore)}/100</Text>
        <View style={[styles.badge, passed ? styles.badgePass : styles.badgeFail]}>
          <Text style={styles.badgeText}>{passed ? 'PASS' : 'FAIL'}</Text>
        </View>
      </View>
      {!gatePassed && (
        <Text style={styles.gateNote}>⚠ Capped at 10/100 by the hospitality register gate</Text>
      )}
      {weakest && (
        <Text style={styles.weakest}>
          Weakest assignment: {TYPE_LABELS[weakest.assignmentType] ?? weakest.assignmentType} ({Math.round(weakest.score * 1)}/100)
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm, gap: 4,
  },
  cardTitle: { fontSize: Typography.body, fontWeight: Typography.bold, color: Colors.navy },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  mockId: { fontSize: Typography.caption, color: Colors.textSecondary, fontWeight: Typography.medium },
  date: { fontSize: Typography.caption, color: Colors.textMuted },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  score: { fontSize: 28, fontWeight: Typography.bold },
  pass: { color: '#16A34A' },
  fail: { color: Colors.error },
  badge: { borderRadius: Radii.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  badgePass: { backgroundColor: '#2D7A4F' },
  badgeFail: { backgroundColor: Colors.error },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: Typography.bold, letterSpacing: 1 },
  gateNote: { fontSize: Typography.caption, color: Colors.error },
  weakest: { fontSize: Typography.caption, color: Colors.textSecondary, marginTop: 2 },
});
