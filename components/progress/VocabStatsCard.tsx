import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

type Props = {
  learned: number;
  due: number;
  total: number;
  streak: number;
  /** When true, numeric values render as a lock glyph instead of the real number. */
  masked?: boolean;
};

function Stat({ value, label, color, masked }: { value: number; label: string; color?: string; masked?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statVal, color ? { color } : null]}>{masked ? '🔒' : value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function VocabStatsCard({ learned, due, total, streak, masked }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Vocabulary</Text>
      <View style={styles.statsRow}>
        <Stat value={learned} label="Learned" color="#16A34A" masked={masked} />
        <Stat value={due} label="Due today" color={due > 0 ? Colors.gold : undefined} masked={masked} />
        <Stat value={total} label="Total cards" masked={masked} />
        <Stat value={streak} label={`Day streak${streak === 1 ? '' : 's'}`} color={streak > 0 ? Colors.gold : undefined} masked={masked} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm, gap: Spacing.sm,
  },
  cardTitle: { fontSize: Typography.body, fontWeight: Typography.bold, color: Colors.navy },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', gap: 2 },
  statVal: { fontSize: Typography.heading, fontWeight: Typography.bold, color: Colors.navy },
  statLabel: { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },
});
