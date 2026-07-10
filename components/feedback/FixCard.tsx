import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';
import type { FixItem } from '@/lib/api/grade';

const DRILL_ICONS: Record<FixItem['drillType'], string> = {
  register:      '👔',
  vocabulary:    '📖',
  grammar:       '✏️',
  fluency:       '🎙️',
  pronunciation: '🗣️',
  content:       '✅',
};

type Props = {
  item: FixItem;
  rank: 1 | 2 | 3;
};

export default function FixCard({ item, rank }: Props) {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{item.label}</Text>
        <View style={styles.typeRow}>
          <Text style={styles.typeIcon}>{DRILL_ICONS[item.drillType]}</Text>
          <Text style={styles.typeLabel}>{item.drillType}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.drillBtn}
        onPress={() => router.push(`/drill/${item.drillType}` as any)}
        activeOpacity={0.8}
      >
        <Text style={styles.drillBtnText}>Drill this</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: { color: '#fff', fontWeight: Typography.bold, fontSize: Typography.caption },
  label: { fontSize: Typography.caption, color: Colors.textPrimary, lineHeight: 18, marginBottom: 4 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  typeIcon: { fontSize: 12 },
  typeLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'capitalize' },
  drillBtn: {
    backgroundColor: Colors.navy,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  drillBtnText: { color: '#fff', fontSize: Typography.caption, fontWeight: Typography.semibold },
});
