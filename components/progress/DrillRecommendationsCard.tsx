import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { RubricCriterion } from '@/types';

const CRITERION_LABELS: Record<RubricCriterion, string> = {
  fluency: 'Fluency', vocabulary: 'Vocabulary', grammar: 'Grammar',
  pronunciation: 'Pronunciation', content: 'Content',
};

type Props = {
  /** Weakest-first, already limited to the top 3 by the caller. */
  criteria: RubricCriterion[];
  onSelect: (criterion: RubricCriterion) => void;
};

export default function DrillRecommendationsCard({ criteria, onSelect }: Props) {
  if (criteria.length === 0) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Top Drill Recommendations</Text>
      <Text style={styles.cardSub}>Your weakest areas, ranked — a few minutes on each moves the needle fastest.</Text>
      {criteria.map((c, i) => (
        <TouchableOpacity
          key={c}
          style={styles.row}
          onPress={() => onSelect(c)}
          accessibilityRole="button"
          accessibilityLabel={`Practice ${CRITERION_LABELS[c]} drill`}
        >
          <View style={styles.rank}><Text style={styles.rankText}>{i + 1}</Text></View>
          <Text style={styles.label}>{CRITERION_LABELS[c]}</Text>
          <Text style={styles.cta}>Practice →</Text>
        </TouchableOpacity>
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
  cardSub: { fontSize: Typography.caption, color: Colors.textMuted, lineHeight: 18 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  rank: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  rankText: { color: '#fff', fontSize: 11, fontWeight: Typography.bold },
  label: { flex: 1, fontSize: Typography.body, color: Colors.navy, fontWeight: Typography.medium },
  cta: { fontSize: Typography.caption, color: Colors.gold, fontWeight: Typography.bold },
});
