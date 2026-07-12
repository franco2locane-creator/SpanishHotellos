import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { WeakAreaItem } from '@/lib/progressRecommendation';

export default function WeakestAreasCard({ items }: { items: WeakAreaItem[] }) {
  const router = useRouter();
  if (items.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Weakest Areas</Text>
      {items.map((item, i) => (
        <TouchableOpacity
          key={`${item.label}-${i}`}
          style={[styles.row, i === items.length - 1 && styles.rowLast]}
          onPress={() => router.push(item.route as any)}
          accessibilityRole="button"
          accessibilityLabel={`${item.label}: ${item.detail}`}
        >
          <View style={styles.textCol}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.detail}>{item.detail}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm,
  },
  cardTitle: { fontSize: Typography.body, fontWeight: Typography.bold, color: Colors.navy, marginBottom: Spacing.xs },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#EDE9E3',
  },
  rowLast: { borderBottomWidth: 0 },
  textCol: { flex: 1 },
  label: { fontSize: Typography.body, fontWeight: Typography.semibold, color: Colors.navy },
  detail: { fontSize: Typography.caption, color: Colors.textMuted, marginTop: 1 },
  chevron: { fontSize: Typography.heading, color: Colors.textMuted },
});
