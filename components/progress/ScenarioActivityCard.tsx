import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { formatBestBadge } from '@/lib/formatBest';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { ScenarioActivity } from '@/lib/progressCoverage';
import type { ScenarioMeta } from '@/lib/scenarios/catalog';

type Props = {
  activity: ScenarioActivity[];
  scenarios: ScenarioMeta[];
  onViewFeedback: (scenarioId: string) => void;
};

/** Per-scenario best score + "View feedback" link for every completed
 *  scenario — the detail behind ScenarioCoverageCard's aggregate bars.
 *  Reuses getScenarioBest/getLastScenarioAttempt (lib/scenarioBest.ts),
 *  not forked logic. */
export default function ScenarioActivityCard({ activity, scenarios, onViewFeedback }: Props) {
  const attempted = activity.filter(a => a.best !== null);
  if (attempted.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Scenario Activity</Text>
      {attempted.map(a => {
        const meta = scenarios.find(s => s.id === a.scenarioId);
        if (!meta || !a.best) return null;
        return (
          <View key={a.scenarioId} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>{meta.title}</Text>
              <Text style={styles.bestBadge}>{formatBestBadge((a.best.score / 20) * 100, a.best.completionSeconds)}</Text>
            </View>
            <TouchableOpacity onPress={() => onViewFeedback(a.scenarioId)} hitSlop={8}>
              <Text style={styles.link}>Last feedback →</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm, gap: Spacing.xs,
  },
  cardTitle: { fontSize: Typography.body, fontWeight: Typography.bold, color: Colors.navy, marginBottom: Spacing.xs },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 4,
  },
  title: { fontSize: Typography.caption, color: Colors.textSecondary, fontWeight: Typography.medium },
  bestBadge: { fontSize: 11, color: Colors.gold, fontWeight: '700', marginTop: 1 },
  link: { fontSize: Typography.caption, color: Colors.info, fontWeight: Typography.medium },
});
