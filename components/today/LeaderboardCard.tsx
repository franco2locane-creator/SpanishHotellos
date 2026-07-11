import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { getMyLeaderboardStanding, type LeaderboardStanding } from '@/lib/leaderboard';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

export default function LeaderboardCard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [standing, setStanding] = useState<LeaderboardStanding | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyLeaderboardStanding(user.id)
      .then(s => { if (!cancelled) setStanding(s); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  if (loading) return null; // avoid a flash of placeholder copy before we know

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push('/leaderboard' as any)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Open the leaderboard"
    >
      <Text style={styles.icon}>🏆</Text>
      <Text style={styles.text} numberOfLines={1}>
        {standing
          ? `#${standing.rank} at ${standing.school} this week`
          : 'Join the leaderboard — see how you rank'}
      </Text>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    marginBottom: Spacing.md, ...Shadows.sm,
  },
  icon: { fontSize: 20 },
  text: { flex: 1, fontSize: Typography.caption, fontWeight: '600', color: Colors.navy },
  arrow: { fontSize: 16, color: Colors.gold, fontWeight: '700' },
});
