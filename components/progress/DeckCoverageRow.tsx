import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '@/lib/theme';

type Props = {
  title: string;
  seen: number;
  learned: number;
  mastered: number;
  total: number;
  locked?: boolean;
};

export default function DeckCoverageRow({ title, seen, learned, mastered, total, locked }: Props) {
  const pct = total > 0 ? Math.min(100, Math.round((learned / total) * 100)) : 0;
  return (
    <View style={styles.row} accessibilityLabel={`${title}: ${learned} of ${total} learned`}>
      <View style={styles.labelRow}>
        <Text style={styles.label} numberOfLines={1}>{title}</Text>
        <Text style={styles.frac}>{learned}/{total}{locked ? ' 🔒' : ''}</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
      {!locked && (
        <Text style={styles.detail}>{seen} seen · {learned} learned · {mastered} mastered</Text>
      )}
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
});
