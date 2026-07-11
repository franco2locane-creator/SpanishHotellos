import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

type Props = {
  streak: number;
  sessionsThisWeek: number;
  totalPracticeDays: number;
};

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ConsistencyStats({ streak, sessionsThisWeek, totalPracticeDays }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Consistency</Text>
      <View style={styles.statsRow}>
        <Stat value={streak} label={`Day streak${streak === 1 ? '' : 's'}`} />
        <Stat value={sessionsThisWeek} label="This week" />
        <Stat value={totalPracticeDays} label="Total days" />
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
