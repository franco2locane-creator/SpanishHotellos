import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

const PASS_MARK = 60;

type Breakdown = { performance: number; coverage: number; consistency: number };

type Props = {
  /**
   * 0-100. In simple mode (no `breakdown`, e.g. Today tab) this is the raw
   * average mock score. In composite mode (`breakdown` present, Progress tab)
   * this is the v2 weighted readiness composite — pass null in composite mode
   * while no performance data exists yet (no mock, no graded role-play) so
   * the empty-performance term doesn't drag a misleadingly low number.
   */
  score: number | null;
  /** Change vs. ~7 days ago — composite mode only. */
  delta?: number | null;
  /** Presence of this prop is what switches the card into composite mode. */
  breakdown?: Breakdown;
};

function readinessLabel(avg: number): { label: string; color: string } {
  if (avg >= PASS_MARK + 15) return { label: 'Exam ready', color: '#16A34A' };
  if (avg >= PASS_MARK) return { label: 'On track', color: '#16A34A' };
  if (avg >= PASS_MARK - 15) return { label: 'Close — keep drilling', color: '#CA8A04' };
  return { label: 'Needs focused work', color: '#DC2626' };
}

export default function ReadinessCard({ score, delta, breakdown }: Props) {
  const isComposite = breakdown !== undefined;
  const title = isComposite ? 'Readiness' : 'Mock Average';

  if (score === null) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.emptyText}>
          {isComposite
            ? 'Complete a role-play or mock exam to unlock your readiness score.'
            : 'Complete a mock exam to see your readiness indicator.'}
        </Text>
      </View>
    );
  }

  const { label, color } = readinessLabel(score);
  const pct = Math.min(100, Math.round((score / (PASS_MARK + 25)) * 100));

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>{title}</Text>
        {isComposite && delta != null && delta !== 0 && (
          <Text style={[styles.delta, { color: delta > 0 ? '#16A34A' : '#DC2626' }]}>
            {delta > 0 ? '+' : ''}{delta} this week
          </Text>
        )}
      </View>
      <View style={styles.row}>
        <Text style={[styles.score, { color }]}>{Math.round(score)}</Text>
        <Text style={styles.scoreOf}>/100{isComposite ? '' : ' avg'}</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.markerLine, { left: `${(PASS_MARK / (PASS_MARK + 25)) * 100}%` }]} />
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.label, { color }]}>{label}</Text>
      {isComposite && breakdown ? (
        <Text style={styles.sub}>
          Performance {Math.round(breakdown.performance)} · Coverage {Math.round(breakdown.coverage)} · Consistency {Math.round(breakdown.consistency)}
        </Text>
      ) : (
        <Text style={styles.sub}>Pass mark: {PASS_MARK}/100</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm, gap: Spacing.xs,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: Typography.body, fontWeight: Typography.bold, color: Colors.navy },
  delta: { fontSize: Typography.caption, fontWeight: '700' },
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
