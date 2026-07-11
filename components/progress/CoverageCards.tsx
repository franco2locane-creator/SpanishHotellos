import { View, Text, StyleSheet } from 'react-native';
import CoverageBar from './CoverageBar';
import DeckCoverageRow from './DeckCoverageRow';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { AssignmentTypeCoverage, DeckCoverage, GrammarDrillCoverage, MockCoverage } from '@/lib/progressCoverage';

const ASSIGNMENT_TYPE_LABELS: Record<string, string> = {
  checkin: 'Check-in',
  restaurant: 'Restaurant',
  hotel_presentation: 'Hotel Presentation',
  saying_no: 'Saying No',
  complaint: 'Complaint',
  job_interview: 'Job Interview',
};

export function ScenarioCoverageCard({ coverage }: { coverage: AssignmentTypeCoverage[] }) {
  if (coverage.length === 0) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Scenario Coverage</Text>
      {coverage.map(c => (
        <CoverageBar
          key={c.type}
          label={ASSIGNMENT_TYPE_LABELS[c.type] ?? c.type}
          completed={c.completed}
          total={c.total}
          locked={c.completed === 0}
        />
      ))}
    </View>
  );
}

export function VocabCoverageCard({ coverage }: { coverage: DeckCoverage[] }) {
  if (coverage.length === 0) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Vocabulary Coverage</Text>
      {coverage.map(d => (
        <DeckCoverageRow
          key={d.deckId}
          title={d.title}
          seen={d.seen}
          learned={d.learned}
          mastered={d.mastered}
          total={d.total}
          locked={!d.isFree && d.seen === 0 && d.learned === 0}
        />
      ))}
    </View>
  );
}

export function GrammarCoverageCard({ coverage }: { coverage: GrammarDrillCoverage[] }) {
  if (coverage.length === 0) return null;
  const attemptedCount = coverage.filter(d => d.attempted).length;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Grammar Coverage</Text>
      <CoverageBar label="Drill sets attempted" completed={attemptedCount} total={coverage.length} />
      {coverage.map(d => (
        <View key={d.drillId} style={styles.grammarRow}>
          <Text style={styles.grammarLabel} numberOfLines={1}>{d.title}</Text>
          <Text style={styles.grammarValue}>
            {d.attempted ? `${Math.round(d.bestAccuracy ?? 0)}% best` : (d.isFree ? 'Not started' : '🔒')}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function MockCoverageCard({ coverage }: { coverage: MockCoverage }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Mock Exam Coverage</Text>
      <CoverageBar label="Mocks attempted" completed={coverage.completed} total={coverage.total} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm, gap: Spacing.xs,
  },
  cardTitle: { fontSize: Typography.body, fontWeight: Typography.bold, color: Colors.navy, marginBottom: Spacing.xs },
  grammarRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 3,
  },
  grammarLabel: { flex: 1, fontSize: Typography.caption, color: Colors.textSecondary, marginRight: Spacing.sm },
  grammarValue: { fontSize: Typography.caption, fontWeight: '700', color: Colors.navy },
});
