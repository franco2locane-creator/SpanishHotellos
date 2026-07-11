import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Animated, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { usePremium } from '@/hooks/usePremium';
import { useGuidedSessionStore } from '@/stores/guidedSessionStore';
import { getStreak, getTodayChecked } from '@/lib/today';
import { scenariosForLevel } from '@/lib/scenarios/catalog';
import { dailySeededPick } from '@/lib/dailySeed';
import { awardDailyPoints, type AwardResult } from '@/lib/api/leaderboard';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

const MILESTONES = [3, 7, 14, 30];
const MILESTONE_COPY: Record<number, string> = {
  3: "3-day streak — you're building a habit.",
  7: 'One full week straight — incredible consistency.',
  14: 'Two weeks straight. This is who you are now.',
  30: "30 days. You're exam-ready and unstoppable.",
};

function tomorrowISO(): string {
  return new Date(Date.now() + 86400000).toISOString().slice(0, 10);
}

export default function SessionCompleteScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isPremium = usePremium();
  const resetGuidedSession = useGuidedSessionStore(s => s.reset);

  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [fullyCompleted, setFullyCompleted] = useState(false);
  const [awardResult, setAwardResult] = useState<AwardResult | null>(null);
  const [awardLoading, setAwardLoading] = useState(false);
  const flameScale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [checked, s] = await Promise.all([getTodayChecked(), getStreak()]);
      const complete = checked.length >= 3;
      setFullyCompleted(complete);
      setStreak(s);
      setLoading(false);
      resetGuidedSession();
      if (complete) {
        Animated.sequence([
          Animated.spring(flameScale, { toValue: 1.2, useNativeDriver: true, speed: 14, bounciness: 14 }),
          Animated.spring(flameScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 8 }),
        ]).start();

        // Points are a nice-to-have on top of the celebration — a failed
        // award call (offline, etc.) should never block the moment itself.
        setAwardLoading(true);
        awardDailyPoints(s)
          .then(setAwardResult)
          .catch(() => {})
          .finally(() => setAwardLoading(false));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator style={{ flex: 1 }} color={Colors.gold} />
      </SafeAreaView>
    );
  }

  if (!fullyCompleted) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.wrap}>
          <Text style={styles.softEmoji}>💪</Text>
          <Text style={styles.softTitle}>Session ended early</Text>
          <Text style={styles.softText}>
            One or more steps were skipped, so today doesn't count toward your streak — only the full session does.
            Come back and finish it whenever you're ready.
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(tabs)' as any)}>
            <Text style={styles.doneBtnText}>Back to Today</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isMilestone = MILESTONES.includes(streak);
  const level = user?.mockLevel ?? 'basic';
  const tomorrowTeaser = isPremium && user
    ? dailySeededPick(scenariosForLevel(level), user.id, 'scenario', tomorrowISO()).title
    : null;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.wrap}>
        <Animated.Text style={[styles.flame, { transform: [{ scale: flameScale }] }]}>🔥</Animated.Text>
        <Text style={styles.dayLabel}>Day {streak} · session complete</Text>

        {isMilestone && (
          <View style={styles.milestoneBadge}>
            <Text style={styles.milestoneText}>{MILESTONE_COPY[streak]}</Text>
          </View>
        )}

        {awardLoading ? (
          <ActivityIndicator size="small" color={Colors.gold} style={{ marginTop: Spacing.xs }} />
        ) : awardResult ? (
          <Text style={styles.pointsText}>
            {awardResult.pointsAwarded > 0
              ? `+${awardResult.pointsAwarded} points · #${awardResult.weeklyRank} this week`
              : `#${awardResult.weeklyRank} this week`}
          </Text>
        ) : null}

        <View style={styles.teaserCard}>
          <Text style={styles.teaserLabel}>Tomorrow</Text>
          <Text style={styles.teaserText}>
            {tomorrowTeaser ? `Practice: ${tomorrowTeaser}` : 'Another focused practice session — see you then.'}
          </Text>
        </View>

        <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(tabs)' as any)}>
          <Text style={styles.doneBtnText}>Back to Today</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.navy },
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  flame: { fontSize: 88 },
  dayLabel: { fontSize: Typography.title, fontWeight: '800', color: '#fff', textAlign: 'center' },
  milestoneBadge: {
    backgroundColor: Colors.gold, borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, marginTop: Spacing.xs,
  },
  milestoneText: { color: '#fff', fontWeight: '700', fontSize: Typography.body, textAlign: 'center' },
  pointsText: { fontSize: Typography.body, fontWeight: '700', color: Colors.gold, marginTop: Spacing.xs },
  teaserCard: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: Radii.lg,
    padding: Spacing.lg, marginTop: Spacing.lg, gap: 4, width: '100%', ...Shadows.sm,
  },
  teaserLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.gold,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  teaserText: { fontSize: Typography.body, color: '#fff', lineHeight: 20 },
  doneBtn: {
    marginTop: Spacing.xl, backgroundColor: Colors.gold, borderRadius: Radii.lg,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.body },
  softEmoji: { fontSize: 56 },
  softTitle: { fontSize: Typography.heading, fontWeight: '700', color: '#fff' },
  softText: { fontSize: Typography.body, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 22 },
});
