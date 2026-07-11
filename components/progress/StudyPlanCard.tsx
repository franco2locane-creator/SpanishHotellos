import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

type Props = {
  daysUntilExam: number | null;
  minutesPerDay: number;
  nextActions: string[];
};

function countdownText(days: number | null): string {
  if (days === null) return 'No exam date set';
  if (days < 0) return 'Exam has passed';
  if (days === 0) return 'Exam is today';
  if (days === 1) return '1 day until your exam';
  return `${days} days until your exam`;
}

export default function StudyPlanCard({ daysUntilExam, minutesPerDay, nextActions }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Your Study Plan</Text>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{countdownText(daysUntilExam)}</Text>
        </View>
      </View>
      <View style={styles.minutesRow}>
        <Text style={styles.minutesNum}>{minutesPerDay}</Text>
        <Text style={styles.minutesLabel}>recommended minutes/day</Text>
      </View>
      <Text style={styles.sectionLabel}>Next actions</Text>
      {nextActions.map((action, i) => (
        <View key={i} style={styles.actionRow}>
          <Text style={styles.actionBullet}>•</Text>
          <Text style={styles.actionText}>{action}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm, gap: Spacing.sm,
  },
  cardTitle: { fontSize: Typography.body, fontWeight: Typography.bold, color: Colors.navy },
  row: { flexDirection: 'row' },
  stat: { flex: 1 },
  statVal: { fontSize: Typography.body, fontWeight: Typography.semibold, color: Colors.navy },
  minutesRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  minutesNum: { fontSize: 28, fontWeight: Typography.bold, color: Colors.gold },
  minutesLabel: { fontSize: Typography.caption, color: Colors.textMuted },
  sectionLabel: {
    fontSize: 11, fontWeight: Typography.bold, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4,
  },
  actionRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  actionBullet: { color: Colors.gold, fontWeight: Typography.bold },
  actionText: { flex: 1, fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
});
