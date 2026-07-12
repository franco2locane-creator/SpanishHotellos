import { View, StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/lib/theme';

export type DotState = 'pending' | 'current' | 'correct' | 'retried';

const DOT_COLOR: Record<DotState, string> = {
  pending: '#E8E3DC',
  current: Colors.navy,
  correct: Colors.success,
  retried: Colors.gold,
};

/** One dot per original queue card (not per attempt) — updates to
 *  correct/retried only once a card is fully cleared. */
export default function SessionDots({ results }: { results: DotState[] }) {
  return (
    <View style={styles.row} accessibilityLabel="Session progress">
      {results.map((r, i) => (
        <View
          key={i}
          style={[styles.dot, { backgroundColor: DOT_COLOR[r] }, r === 'current' && styles.dotCurrent]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', gap: 5, flexWrap: 'wrap',
    justifyContent: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotCurrent: { width: 10, height: 10, borderRadius: 5 },
});
