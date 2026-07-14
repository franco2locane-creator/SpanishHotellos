import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

export type MockAttemptRow = {
  id: string;
  mock_id: string;
  combined_score: number;
  passed: boolean;
  gate_passed: boolean;
  assignment_results: { assignmentType: string; score: number | null }[];
  completed_at: string;
};

type Props = {
  mocks: MockAttemptRow[];
  masked?: boolean;
  onViewFeedback?: (mockId: string) => void;
};

export default function MockHistoryList({ mocks, masked, onViewFeedback }: Props) {
  if (mocks.length === 0) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Mock History</Text>
      {mocks.map(m => (
        <View key={m.id} style={styles.row}>
          <Text style={styles.id}>{m.mock_id}</Text>
          <Text style={styles.date}>{m.completed_at.slice(0, 10)}</Text>
          <Text style={[styles.score, m.passed ? styles.pass : styles.fail]}>
            {masked ? '🔒' : `${Math.round(m.combined_score)}/100`}
          </Text>
          {!masked && onViewFeedback && (
            <TouchableOpacity onPress={() => onViewFeedback(m.mock_id)} hitSlop={8}>
              <Text style={styles.link}>Feedback →</Text>
            </TouchableOpacity>
          )}
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  id: { flex: 1, fontSize: Typography.caption, color: Colors.textSecondary, fontWeight: Typography.medium },
  date: { fontSize: Typography.caption, color: Colors.textMuted, marginRight: Spacing.sm },
  score: { fontSize: Typography.caption, fontWeight: Typography.bold },
  pass: { color: '#16A34A' },
  fail: { color: Colors.error },
  link: { fontSize: 11, color: Colors.info, fontWeight: Typography.medium, marginLeft: Spacing.sm },
});
