import { View, Text, StyleSheet } from 'react-native';
import CoverageBar from './CoverageBar';
import DeckCoverageRow from './DeckCoverageRow';
import { formatBestBadge, formatBestFraction } from '@/lib/formatBest';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { AssignmentTypeCoverage, DeckCoverage, GrammarDrillCoverage, DemoDrillCoverage, MockCoverage } from '@/lib/progressCoverage';

const ASSIGNMENT_TYPE_LABELS: Record<string, string> = {
  checkin: 'Check-in',
  restaurant: 'Restaurant',
  hotel_presentation: 'Hotel Presentation',
  saying_no: 'Saying No',
  complaint: 'Complaint',
  job_interview: 'Job Interview',
};

const DEMO_DRILL_LABELS: Record<string, string> = {
  register: 'Register', vocabulary: 'Vocabulary', grammar: 'Grammar',
  fluency: 'Fluency', pronunciation: 'Pronunciation', content: 'Content',
};

export function ScenarioCoverageCard({ coverage, offLevelCompleted }: { coverage: AssignmentTypeCoverage[]; offLevelCompleted?: number }) {
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
          unit="scenarios"
          locked={c.completed === 0}
        />
      ))}
      {!!offLevelCompleted && (
        <Text style={styles.offLevelNote}>Also practiced (other level): {offLevelCompleted} scenarios</Text>
      )}
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
          offLevel={d.offLevel}
          bestBadge={d.bestFirstTryPct !== null ? formatBestBadge(d.bestFirstTryPct, d.bestCompletionSeconds) : null}
        />
      ))}
    </View>
  );
}

export function GrammarCoverageCard({ coverage }: { coverage: GrammarDrillCoverage[] }) {
  if (coverage.length === 0) return null;
  const onLevel = coverage.filter(d => !d.offLevel);
  const offLevel = coverage.filter(d => d.offLevel);
  const attemptedCount = onLevel.filter(d => d.attempted).length;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Grammar Coverage</Text>
      <CoverageBar label="Drill sets attempted" completed={attemptedCount} total={onLevel.length} unit="drill sets" />
      {onLevel.map(d => (
        <View key={d.drillId} style={styles.grammarRow}>
          <Text style={styles.grammarLabel} numberOfLines={1}>{d.title}</Text>
          <Text style={styles.grammarValue}>
            {d.attempted ? formatBestBadge(d.bestAccuracy ?? 0, d.bestCompletionSeconds) : (d.isFree ? 'Not started' : '🔒')}
          </Text>
        </View>
      ))}
      {offLevel.length > 0 && (
        <>
          <Text style={styles.offLevelNote}>Also practiced (other level):</Text>
          {offLevel.map(d => (
            <View key={d.drillId} style={styles.grammarRow}>
              <Text style={styles.grammarLabel} numberOfLines={1}>{d.title}</Text>
              <Text style={styles.grammarValue}>{formatBestBadge(d.bestAccuracy ?? 0, d.bestCompletionSeconds)}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

export function DemoDrillCoverageCard({ coverage }: { coverage: DemoDrillCoverage[] }) {
  if (coverage.length === 0) return null;
  const attemptedCount = coverage.filter(d => d.attempted).length;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Demo Drills</Text>
      <CoverageBar label="Drills attempted" completed={attemptedCount} total={coverage.length} unit="drills" />
      {coverage.map(d => (
        <View key={d.drillType} style={styles.grammarRow}>
          <Text style={styles.grammarLabel} numberOfLines={1}>{DEMO_DRILL_LABELS[d.drillType] ?? d.drillType}</Text>
          <Text style={styles.grammarValue}>
            {d.attempted ? formatBestFraction(d.bestScore ?? 0, 5, d.bestCompletionSeconds) : 'Not started'}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function MockCoverageCard({ coverage, offLevelCompleted }: { coverage: MockCoverage; offLevelCompleted?: number }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Mock Exam Coverage</Text>
      <CoverageBar label="Mocks attempted" completed={coverage.completed} total={coverage.total} unit="mocks" />
      {!!offLevelCompleted && (
        <Text style={styles.offLevelNote}>Also practiced (other level): {offLevelCompleted} mocks</Text>
      )}
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
  offLevelNote: { fontSize: 11, color: Colors.textMuted, fontStyle: 'italic', marginTop: Spacing.xs },
});
