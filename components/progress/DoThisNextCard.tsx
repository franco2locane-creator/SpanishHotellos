import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { Recommendation } from '@/lib/progressRecommendation';

const KIND_ICON: Record<Recommendation['kind'], string> = {
  scenario: '🎭',
  vocab: '📇',
  grammar: '📝',
  drill: '🎯',
};

export default function DoThisNextCard({ recommendation }: { recommendation: Recommendation | null }) {
  const router = useRouter();
  if (!recommendation) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>DO THIS NEXT</Text>
      <View style={styles.row}>
        <Text style={styles.icon}>{KIND_ICON[recommendation.kind]}</Text>
        <View style={styles.textCol}>
          <Text style={styles.title}>{recommendation.title}</Text>
          <Text style={styles.subtitle}>{recommendation.subtitle}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => router.push(recommendation.route as any)}
        accessibilityRole="button"
        accessibilityLabel={`Start: ${recommendation.title}`}
      >
        <Text style={styles.btnText}>Start →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.navy, borderRadius: Radii.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm, gap: Spacing.sm,
  },
  eyebrow: {
    fontSize: 11, fontWeight: '700', color: Colors.gold,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  icon: { fontSize: 28 },
  textCol: { flex: 1 },
  title: { fontSize: Typography.heading, fontWeight: Typography.bold, color: '#fff' },
  subtitle: { fontSize: Typography.caption, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  btn: {
    backgroundColor: Colors.gold, borderRadius: Radii.md,
    paddingVertical: Spacing.sm, alignItems: 'center', marginTop: Spacing.xs,
  },
  btnText: { color: '#fff', fontWeight: Typography.bold, fontSize: Typography.body },
});
