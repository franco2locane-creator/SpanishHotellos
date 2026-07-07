import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';
import { Haptics } from '@/lib/haptics';
import type { ScenarioObjective } from '@/types';

type Props = {
  objectives: ScenarioObjective[];
  completedIds: Set<string>;
};

export default function ObjectivesChecklist({ objectives, completedIds }: Props) {
  const prevRef = useRef(new Set<string>());
  const doneCount = objectives.filter(o => completedIds.has(o.id)).length;

  useEffect(() => {
    const prev = prevRef.current;
    const newlyDone = [...completedIds].filter(id => !prev.has(id));
    if (newlyDone.length > 0) Haptics.success();
    prevRef.current = new Set(completedIds);
  }, [completedIds]);

  return (
    <View
      style={styles.container}
      accessibilityLabel={`Objectives: ${doneCount} of ${objectives.length} completed`}
    >
      <Text style={styles.header} accessibilityElementsHidden>
        Objectives {doneCount}/{objectives.length}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {objectives.map(obj => {
          const done = completedIds.has(obj.id);
          return (
            <View
              key={obj.id}
              style={[styles.pill, done && styles.pillDone]}
              accessibilityLabel={`${obj.label}: ${done ? 'completed' : 'not yet completed'}`}
            >
              <Text style={styles.pillIcon}>{done ? '✓' : '○'}</Text>
              <Text style={[styles.pillText, done && styles.pillTextDone]} numberOfLines={1}>
                {obj.label}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E3DC',
  },
  header: {
    fontSize: Typography.caption,
    fontWeight: Typography.semibold,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: { gap: Spacing.sm, paddingRight: Spacing.md },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F0EDE8', borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderWidth: 1, borderColor: '#D8D3CC',
  },
  pillDone: { backgroundColor: '#D1FAE5', borderColor: Colors.success },
  pillIcon: { fontSize: 12, color: Colors.textMuted },
  pillText: { fontSize: Typography.caption, color: Colors.textSecondary, maxWidth: 120 },
  pillTextDone: { color: Colors.success, fontWeight: Typography.semibold },
});
