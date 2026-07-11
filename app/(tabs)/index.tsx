import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { usePremium, usePreviewPremiumActive } from '@/hooks/usePremium';
import {
  getDaysUntilExam, isFinalWeek, getStreak, getWeekCompletionDots,
  getTodayChecked, getStudyPlanData, type StudyPlanData, type WeekDot,
} from '@/lib/today';
import { dailySeededPick } from '@/lib/dailySeed';
import { FREE_LIMITS, isFinalWeekModeActive } from '@/lib/premiumGating';
import { useGuidedSessionStore } from '@/stores/guidedSessionStore';
import { scenariosForLevel, type ScenarioMeta } from '@/lib/scenarios/catalog';
import { decksForLevel, loadDeckCards } from '@/lib/vocab/decks';
import { getDueCount } from '@/lib/db/vocab';
import ReadinessCard from '@/components/progress/ReadinessCard';
import LeaderboardCard from '@/components/today/LeaderboardCard';
import Skeleton from '@/components/Skeleton';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { Department, RubricCriterion } from '@/types';

const MILESTONES = [3, 7, 14, 30];
const DAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const ALL_CRITERIA: RubricCriterion[] = ['fluency', 'vocabulary', 'grammar', 'pronunciation', 'content'];

/** Candidate scenarios for today's pick — biased toward the weaker half of
 *  departments the student has actually practised, falling back to the full
 *  level-appropriate list for a new student with no history yet. */
function buildScenarioPool(scenarios: ScenarioMeta[], rankedWeakDepts: Department[]): ScenarioMeta[] {
  if (rankedWeakDepts.length === 0) return scenarios;
  const weakHalf = rankedWeakDepts.slice(0, Math.max(1, Math.ceil(rankedWeakDepts.length / 2)));
  const pool = scenarios.filter(s => weakHalf.includes(s.department));
  return pool.length > 0 ? pool : scenarios;
}

/** Candidate drill criteria for today's pick — the weakest 3 of 5. */
function buildCriterionPool(rankedCriteria: RubricCriterion[]): RubricCriterion[] {
  return rankedCriteria.length > 0 ? rankedCriteria.slice(0, 3) : ALL_CRITERIA;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function daysLabel(days: number | null): string {
  if (days === null) return 'No exam date set — tap ⚙️ to add one';
  if (days < 0) return 'Exam has passed — great work getting through it';
  if (days === 0) return "Exam is today — you're ready";
  if (days === 1) return 'Exam is tomorrow — trust your prep';
  return `${days} days until your exam`;
}

function TodaySkeleton() {
  return (
    <View style={skStyles.wrap}>
      <Skeleton width={140} height={14} borderRadius={6} style={{ marginBottom: 6 }} />
      <Skeleton width={80} height={22} borderRadius={6} style={{ marginBottom: Spacing.lg }} />
      <Skeleton width="100%" height={52} borderRadius={12} style={{ marginBottom: Spacing.md }} />
      <Skeleton width={160} height={12} borderRadius={6} style={{ marginBottom: Spacing.sm }} />
      {[0, 1, 2].map(i => (
        <Skeleton key={i} width="100%" height={64} borderRadius={12} style={{ marginBottom: Spacing.sm }} />
      ))}
    </View>
  );
}
const skStyles = StyleSheet.create({ wrap: { padding: Spacing.lg } });

export default function TodayScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isPremium = usePremium();
  const previewPremiumActive = usePreviewPremiumActive();
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [weekDots, setWeekDots] = useState<WeekDot[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [planData, setPlanData] = useState<StudyPlanData | null>(null);
  const [bestDeckId, setBestDeckId] = useState('front-office-basics');
  const [avgMockScore, setAvgMockScore] = useState<number | null>(null);

  const days = getDaysUntilExam(user?.examDate);
  // finalWeekEligible is pure date math; finalWeekActive additionally requires
  // premium — the failed-scenario re-run / calmer-tone experience is a premium
  // feature, so free users within 7 days of their exam get a locked nudge instead.
  const finalWeekEligible = isFinalWeek(user?.examDate);
  const finalWeekActive = isFinalWeekModeActive(isPremium, user?.examDate);
  const level = user?.mockLevel ?? 'basic';
  const decks = decksForLevel(level);
  const scenarios = scenariosForLevel(level);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [s, dots, ch, plan, { data: mockData }] = await Promise.all([
        getStreak(),
        getWeekCompletionDots(),
        getTodayChecked(),
        getStudyPlanData(user!.id, level),
        supabase
          .from('mock_attempts')
          .select('combined_score')
          .eq('user_id', user!.id)
          .order('completed_at', { ascending: false })
          .limit(3),
      ]);
      setStreak(s);
      setWeekDots(dots);
      setChecked(ch);
      setPlanData(plan);
      setAvgMockScore(
        mockData && mockData.length
          ? mockData.reduce((sum: number, m: { combined_score: number }) => sum + m.combined_score, 0) / mockData.length
          : null
      );

      // Best deck = the one with the most cards due, so the guided session's
      // vocab step opens on whatever actually needs review today.
      let bestDeck = decks.find(d => d.isFree)?.id ?? decks[0]?.id ?? 'front-office-basics';
      let bestCount = 0;
      for (const deck of decks) {
        if (!deck.isFree && !isPremium) continue;
        const ids = loadDeckCards(deck.id).map(c => c.id);
        const n = await getDueCount(user!.id, ids);
        if (n > bestCount) { bestCount = n; bestDeck = deck.id; }
      }
      setBestDeckId(bestDeck);
      setLoading(false);
    }
    load();
  }, [user?.id, level]);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <TodaySkeleton />
      </SafeAreaView>
    );
  }

  // Premium: today's session is picked fresh each calendar day, seeded by
  // date + user so it's stable all day but different tomorrow, biased toward
  // whichever departments/criteria are actually weak. Free: always the single
  // weakest pick, same every day — the daily-refresh CTA below explains why.
  const todayISO = new Date().toISOString().slice(0, 10);
  const dailyScenario = isPremium && !finalWeekActive
    ? dailySeededPick(buildScenarioPool(scenarios, planData?.rankedWeakDepts ?? []), user!.id, 'scenario', todayISO)
    : null;
  const dailyCriterion = isPremium && !finalWeekActive
    ? dailySeededPick(buildCriterionPool(planData?.rankedCriteria ?? []), user!.id, 'drill', todayISO)
    : null;

  const scenarioId = finalWeekActive
    ? (planData?.lowestScenarioId ?? planData?.weakestScenarioId ?? scenarios[0]?.id)
    : (dailyScenario?.id ?? planData?.weakestScenarioId ?? scenarios[0]?.id);
  const scenario = scenarios.find(s => s.id === scenarioId) ?? scenarios[0];
  // Free tier only ever unlocks the free demo drill type (see canAccessDemoDrill
  // in lib/premiumGating.ts) — pin the tile to it rather than a weakest-criterion
  // pick that could resolve to a type the user can't actually open.
  const criterion = !isPremium
    ? FREE_LIMITS.grammarDemoDrillType
    : finalWeekActive
      ? (planData?.weakestCriterion ?? 'content')
      : (dailyCriterion ?? planData?.weakestCriterion ?? 'content');

  const tilesChecked = new Set(checked);
  const allChecked = tilesChecked.size >= 3;
  const isMilestone = MILESTONES.includes(streak);

  // Tomorrow's teaser for the hero card's done-state — same daily-seeded
  // pick premium already uses for today, one day ahead.
  const tomorrowISO = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const tomorrowTeaser = isPremium && user
    ? dailySeededPick(scenarios, user.id, 'scenario', tomorrowISO).title
    : null;

  function handleStart() {
    useGuidedSessionStore.getState().start({
      deckId: bestDeckId,
      scenarioId: scenario.id,
      drillType: criterion,
    });
    router.push(`/vocab/${bestDeckId}?guided=1` as any);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.heading}>Today</Text>
          </View>
          <View style={styles.headerRight}>
            {previewPremiumActive && (
              <View style={styles.previewBadge} accessibilityLabel="Preview build — premium forced on">
                <Text style={styles.previewBadgeText}>PREVIEW PREMIUM</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => router.push('/settings' as any)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Text style={styles.gearIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Streak identity — always rendered (even at 0) for both free and
            premium; was previously gated behind streak > 0, which hid it
            for exactly the accounts most likely to be checked: fresh
            installs and anyone who missed a day. Dim at 0 to invite the
            first session rather than showing a bare "0". */}
        <View
          style={[styles.streakHeadline, streak === 0 && styles.streakHeadlineDim, isMilestone && styles.streakHeadlineMilestone]}
          accessibilityLabel={streak > 0 ? `${streak} day streak` : 'No streak yet — complete a session to start one'}
        >
          <Text style={styles.streakHeadlineFire}>🔥</Text>
          <Text style={styles.streakHeadlineNum}>{streak}</Text>
          <Text style={styles.streakHeadlineLabel}>{streak > 0 ? 'day streak' : 'start your streak today'}</Text>
        </View>

        {/* 7-day dot row */}
        <View style={styles.dotRow}>
          {weekDots.map((d, i) => (
            <View key={d.dateISO} style={styles.dotCol}>
              <Text style={styles.dotInitial}>{DAY_INITIALS[i]}</Text>
              <View style={[styles.dot, d.completed && styles.dotFilled, d.isToday && styles.dotToday]} />
            </View>
          ))}
        </View>

        {/* Leaderboard — the daily social hook, free for both tiers */}
        <LeaderboardCard />

        {/* Exam countdown + readiness */}
        <View
          style={[styles.countdownBar, finalWeekActive && styles.countdownFinalWeek]}
          accessibilityLabel={daysLabel(days)}
        >
          <Text style={styles.countdownText}>{daysLabel(days)}</Text>
          {finalWeekActive && <Text style={styles.finalWeekLabel}>Final week</Text>}
        </View>
        <ReadinessCard avgMockScore={avgMockScore} />

        {finalWeekActive && (
          <View style={styles.calmCard}>
            <Text style={styles.calmTitle}>You're more ready than you think.</Text>
            <Text style={styles.calmText}>
              Focus on your weakest areas, run through the scenarios that felt hard,
              and trust everything you've already built. You've got this.
            </Text>
          </View>
        )}

        {finalWeekEligible && !finalWeekActive && (
          <TouchableOpacity
            style={styles.finalWeekLockCard}
            onPress={() => router.push('/paywall' as any)}
            accessibilityRole="button"
            accessibilityLabel="Unlock Final Week Mode with Premium"
          >
            <Text style={styles.finalWeekLockTitle}>🔒 Final Week Mode</Text>
            <Text style={styles.finalWeekLockText}>
              Unlock focused review of your weakest areas in the days before your exam with Premium.
            </Text>
          </TouchableOpacity>
        )}

        {/* Hero session card — the whole point of the tab */}
        {allChecked ? (
          <View style={styles.heroCardDone}>
            <Text style={styles.heroDoneEmoji}>🎉</Text>
            <Text style={styles.heroDoneTitle}>Today's session complete</Text>
            <View style={styles.heroTeaserCard}>
              <Text style={styles.heroTeaserLabel}>Tomorrow</Text>
              <Text style={styles.heroTeaserText}>
                {tomorrowTeaser ? `Practice: ${tomorrowTeaser}` : 'Another focused practice session — see you then.'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>{finalWeekActive ? 'Final week re-run' : "Today's session"}</Text>
            <Text style={styles.heroSubtitle}>15 min · vocab · role-play · drill</Text>

            {!finalWeekActive && (
              isPremium ? (
                <View style={styles.refreshBadge} accessibilityLabel="Refreshed for today">
                  <Text style={styles.refreshBadgeText}>🔄 Fresh today</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.refreshLockBadge}
                  onPress={() => router.push('/paywall' as any)}
                  accessibilityRole="button"
                  accessibilityLabel="Unlock daily refreshed exercises with Premium"
                >
                  <Text style={styles.refreshLockText}>🔒 Fresh exercises every day with Premium</Text>
                </TouchableOpacity>
              )
            )}

            <TouchableOpacity
              style={styles.startBtn}
              onPress={handleStart}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Start today's session"
            >
              <Text style={styles.startBtnText}>▶  START</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F5F0' },
  content: { padding: Spacing.lg, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  greeting: { fontSize: Typography.caption, color: Colors.textMuted },
  heading: { fontSize: Typography.title, fontWeight: '700', color: Colors.navy },
  gearIcon: { fontSize: 22, opacity: 0.6 },
  previewBadge: {
    backgroundColor: '#7C3AED', borderRadius: Radii.sm,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  previewBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  streakHeadline: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8,
    backgroundColor: '#FFF8EC', borderRadius: Radii.lg,
    paddingVertical: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm,
  },
  streakHeadlineDim: { backgroundColor: '#F3F1EC', opacity: 0.7 },
  streakHeadlineMilestone: { backgroundColor: Colors.gold },
  streakHeadlineFire: { fontSize: 34 },
  streakHeadlineNum: { fontSize: 36, fontWeight: '800', color: Colors.gold },
  streakHeadlineLabel: { fontSize: Typography.body, fontWeight: '700', color: Colors.textSecondary },
  dotRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: Spacing.md, paddingHorizontal: Spacing.sm,
  },
  dotCol: { alignItems: 'center', gap: 4 },
  dotInitial: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },
  dot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EDE9E3', borderWidth: 1, borderColor: '#E0DAD0',
  },
  dotFilled: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  dotToday: { borderWidth: 2, borderColor: Colors.navy },
  heroCard: {
    backgroundColor: Colors.navy, borderRadius: Radii.xl, padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm, ...Shadows.md,
  },
  heroTitle: { fontSize: Typography.title, fontWeight: '800', color: '#fff', textAlign: 'center' },
  heroSubtitle: { fontSize: Typography.caption, color: 'rgba(255,255,255,0.7)', marginBottom: Spacing.xs },
  startBtn: {
    backgroundColor: Colors.gold, borderRadius: Radii.full,
    paddingHorizontal: Spacing.xxl ?? 48, paddingVertical: Spacing.md,
    marginTop: Spacing.sm, minWidth: 180, alignItems: 'center', ...Shadows.md,
  },
  startBtnText: { color: '#fff', fontWeight: '800', fontSize: Typography.bodyLarge ?? Typography.title, letterSpacing: 1 },
  heroCardDone: {
    backgroundColor: '#F0FDF4', borderRadius: Radii.xl, padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm,
    borderWidth: 1, borderColor: '#BBF0CE',
  },
  heroDoneEmoji: { fontSize: 48 },
  heroDoneTitle: { fontSize: Typography.heading, fontWeight: '800', color: '#15803D', textAlign: 'center' },
  heroTeaserCard: {
    backgroundColor: '#fff', borderRadius: Radii.lg, padding: Spacing.md,
    marginTop: Spacing.sm, gap: 2, width: '100%',
  },
  heroTeaserLabel: {
    fontSize: 10, fontWeight: '700', color: Colors.gold,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  heroTeaserText: { fontSize: Typography.body, color: Colors.navy, fontWeight: '600' },
  finalWeekLockCard: {
    backgroundColor: '#FFF8EC', borderRadius: Radii.lg, padding: Spacing.md,
    marginBottom: Spacing.md, gap: 4, borderWidth: 1, borderColor: '#F0E4C8',
  },
  finalWeekLockTitle: { fontSize: Typography.body, fontWeight: '700', color: Colors.gold },
  finalWeekLockText: { fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  countdownBar: {
    backgroundColor: Colors.navy, borderRadius: Radii.lg, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  countdownFinalWeek: { backgroundColor: '#7C3AED' },
  countdownText: { fontSize: Typography.body, fontWeight: '600', color: '#fff' },
  finalWeekLabel: {
    fontSize: 10, fontWeight: '700', color: '#fff', textTransform: 'uppercase',
    letterSpacing: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  calmCard: {
    backgroundColor: '#EDE9FF', borderRadius: Radii.lg, padding: Spacing.md,
    marginBottom: Spacing.md, gap: 4,
  },
  calmTitle: { fontSize: Typography.body, fontWeight: '700', color: '#5B21B6' },
  calmText: { fontSize: Typography.caption, color: '#6D28D9', lineHeight: 18 },
  refreshBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radii.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
  },
  refreshBadgeText: { fontSize: 10, fontWeight: '700', color: '#86EFAC' },
  refreshLockBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Radii.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  refreshLockText: { fontSize: 10, fontWeight: '700', color: Colors.gold },
});
