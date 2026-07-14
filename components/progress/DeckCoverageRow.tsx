import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '@/lib/theme';

type Props = {
  title: string;
  seen: number;
  learned: number;
  mastered: number;
  total: number;
  locked?: boolean;
  bestBadge?: string | null;
  offLevel?: boolean;
};

export default function DeckCoverageRow({ title, seen, learned, mastered, total, locked, bestBadge, offLevel }: Props) {
  const pct = total > 0 ? Math.min(100, Math.round((learned / total) * 100)) : 0;
  return (
    <View style={styles.row} accessibilityLabel={`${title}: ${learned} of ${total} cards learned`}>
      <View style={styles.labelRow}>
        <Text style={styles.label} numberOfLines={1}>
          {title}{offLevel ? <Text style={styles.offLevelTag}>  · other level</Text> : null}
        </Text>
        <Text style={styles.frac}>{learned}/{total} cards learned{locked ? ' 🔒' : ''}</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
      {!locked && (
        <Text style={styles.detail}>{seen} seen · {learned} learned · {mastered} mastered</Text>
      )}
      {!locked && bestBadge && <Text style={styles.bestBadge}>{bestBadge}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 4, marginBottom: Spacing.sm },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { flex: 1, fontSize: Typography.caption, color: Colors.textSecondary, marginRight: Spacing.sm },
  frac: { fontSize: Typography.caption, fontWeight: '700', color: Colors.navy },
  barBg: { height: 8, backgroundColor: '#EDE9E3', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: Colors.gold },
  detail: { fontSize: 11, color: Colors.textMuted },
  bestBadge: { fontSize: 11, color: Colors.gold, fontWeight: '700', marginTop: 1 },
  offLevelTag: { fontSize: 10, color: Colors.textMuted, fontStyle: 'italic', fontWeight: '400' },
});
