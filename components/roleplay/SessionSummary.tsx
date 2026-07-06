import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';
import type { ScenarioObjective } from '@/types';

type Props = {
  scenarioTitle: string;
  objectives: ScenarioObjective[];
  completedIds: Set<string>;
  turnCount: number;
  onDone: () => void;
};

export default function SessionSummary({
  scenarioTitle, objectives, completedIds, turnCount, onDone,
}: Props) {
  const doneCount = objectives.filter(o => completedIds.has(o.id)).length;
  const pct = objectives.length ? Math.round((doneCount / objectives.length) * 100) : 0;
  const emoji = pct === 100 ? '🌟' : pct >= 75 ? '💪' : pct >= 50 ? '📚' : '🔄';

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>Role-play complete</Text>
      <Text style={styles.scenario}>{scenarioTitle}</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{doneCount}/{objectives.length}</Text>
          <Text style={styles.statLabel}>Objectives</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statVal, pct >= 75 && { color: Colors.success }]}>{pct}%</Text>
          <Text style={styles.statLabel}>Task score</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{turnCount}</Text>
          <Text style={styles.statLabel}>Turns</Text>
        </View>
      </View>

      <View style={styles.objList}>
        {objectives.map(obj => {
          const done = completedIds.has(obj.id);
          return (
            <View key={obj.id} style={styles.objRow}>
              <Text style={[styles.objIcon, { color: done ? Colors.success : Colors.textMuted }]}>
                {done ? '✓' : '○'}
              </Text>
              <Text style={[styles.objLabel, !done && styles.objLabelMissed]}>
                {obj.label}
              </Text>
            </View>
          );
        })}
      </View>

      <TouchableOpacity style={styles.btn} onPress={onDone}>
        <Text style={styles.btnText}>Back to scenarios</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.xl, gap: Spacing.lg,
  },
  emoji: { fontSize: 64 },
  title: { fontSize: Typography.heading, fontWeight: Typography.bold, color: Colors.navy },
  scenario: { fontSize: Typography.body, color: Colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: Spacing.xl },
  stat: { alignItems: 'center', gap: 4 },
  statVal: { fontSize: Typography.title, fontWeight: Typography.bold, color: Colors.navy },
  statLabel: { fontSize: Typography.caption, color: Colors.textMuted },
  objList: { alignSelf: 'stretch', gap: Spacing.sm },
  objRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  objIcon: { fontSize: 16, width: 20 },
  objLabel: { fontSize: Typography.body, color: Colors.textPrimary },
  objLabelMissed: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  btn: {
    backgroundColor: Colors.navy, borderRadius: Radii.lg,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  btnText: { color: '#fff', fontWeight: Typography.semibold, fontSize: Typography.body },
});
