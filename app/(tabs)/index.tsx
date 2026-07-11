import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { usePremium } from '@/hooks/usePremium';
import {
  getDaysUntilExam, isFinalWeek, getStreak,
  getTodayChecked, toggleTile, getStudyPlanData, type StudyPlanData,
} from '@/lib/today';
import { dailySeededPick } from '@/lib/dailySeed';
import { FREE_LIMITS, isFinalWeekModeActive } from '@/lib/premiumGating';
import { scenariosForLevel, type ScenarioMeta } from '@/lib/scenarios/catalog';
import { decksForLevel, loadDeckCards } from '@/lib/vocab/decks';
import { getDueCount } from '@/lib/db/vocab';
import StudyTile from '@/components/today/StudyTile';
import Skeleton from '@/components/Skeleton';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';
import type { Department, RubricCriterion } from '@/types';

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

const CRITERION_LABELS: Record<string, string> = {
  fluency: 'Fluency', vocabulary: 'Vocabulary', grammar: 'Grammar',
  pronunciation: 'Pronunciation', content: 'Content',
};
const DRILL_SUBTITLES: Record<string, string> = {
  fluency:       '5 rapid-response prompts',
  vocabulary:    '5 hospitality vocabulary fill-ins',
  grammar:       '5 verb conjugation challenges',
  pronunciation: '5 tricky-sound pronunciation drills',
  content:       '5 service scenario completions',
};

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
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [checked, setChecked] = useState<string[]>([]);
  const [planData, setPlanData] = useState<StudyPlanData | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [bestDeckId, setBestDeckId] = useState('front-office-basics');
  const streakScale = useRef(new Animated.Value(1)).current;

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
      const [s, ch, plan] = await Promise.all([
        getStreak(),
        getTodayChecked(),
        getStudyPlanData(user!.id, level),
      ]);
      setStreak(s);
      setChecked(ch);
      setPlanData(plan);

      let totalDue = 0;
      let bestDeck = decks.find(d => d.isFree)?.id ?? decks[0]?.id ?? 'front-office-basics';
      let bestCount = 0;
      for (const deck of decks) {
        if (!deck.isFree && !isPremium) continue;
        const ids = loadDeckCards(deck.id).map(c => c.id);
        const n = await getDueCount(user!.id, ids);
        totalDue += n;
        if (n > bestCount) { bestCount = n; bestDeck = deck.id; }
      }
      setDueCount(totalDue);
      setBestDeckId(bestDeck);
      setLoading(false);
    }
    load();
  }, [user?.id, level]);

  const handleCheck = useCallback(async (id: string) => {
    const next = await toggleTile(id);
    setChecked(next);
    const s = await getStreak();
    setStreak(prev => {
      if (s > prev) {
        Animated.sequence([
          Animated.spring(streakScale, { toValue: 1.3, useNativeDriver: true, speed: 20, bounciness: 12 }),
          Animated.spring(streakScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 }),
        ]).start();
      }
      return s;
    });
  }, [streakScale]);

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

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.heading}>Today</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/settings' as any)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Text style={styles.gearIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Streak headline — shown for both free and premium, subtle bounce on increment */}
        {streak > 0 && (
          <Animated.View
            style={[styles.streakHeadline, { transform: [{ scale: streakScale }] }]}
            accessibilityLabel={`${streak} day streak`}
          >
            <Text style={styles.streakHeadlineFire}>🔥</Text>
            <Text style={styles.streakHeadlineNum}>{streak}</Text>
            <Text style={styles.streakHeadlineLabel}>day streak</Text>
          </Animated.View>
        )}

        {/* Exam countdown */}
        <View
          style={[styles.countdownBar, finalWeekActive && styles.countdownFinalWeek]}
          accessibilityLabel={daysLabel(days)}
        >
          <Text style={styles.countdownText}>{daysLabel(days)}</Text>
          {finalWeekActive && <Text style={styles.finalWeekLabel}>Final week</Text>}
        </View>

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

        <View style={styles.sessionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {allChecked ? "Today's session complete ✓" : "Your daily session · 15 min"}
          </Text>
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
        </View>

        <StudyTile
          id="vocab"
          icon="📖"
          title={dueCount > 0 ? `Review ${dueCount} due card${dueCount !== 1 ? 's' : ''}` : 'Vocab — all caught up'}
          subtitle={dueCount > 0 ? 'Spaced-repetition review' : 'No cards due today — check back tomorrow'}
          checked={tilesChecked.has('vocab')}
          accent={Colors.gold}
          onPress={() => router.push(`/vocab/${bestDeckId}` as any)}
          onCheck={() => handleCheck('vocab')}
        />

        <StudyTile
          id="scenario"
          icon="🗣️"
          title={finalWeekActive ? `Retry: ${scenario.title}` : `Practice: ${scenario.title}`}
          subtitle={finalWeekActive
            ? 'Your lowest-scoring scenario — nail it before the exam'
            : `Targeted at your weakest area: ${scenario.department.replace('_', ' ')}`}
          checked={tilesChecked.has('scenario')}
          accent={Colors.navy}
          onPress={() => router.push(`/roleplay/${scenario.id}` as any)}
          onCheck={() => handleCheck('scenario')}
        />

        <StudyTile
          id="drill"
          icon="🎯"
          title={`Drill: ${CRITERION_LABELS[criterion]}`}
          subtitle={DRILL_SUBTITLES[criterion] ?? '5 rapid micro-exercises'}
          checked={tilesChecked.has('drill')}
          accent="#7C3AED"
          onPress={() => router.push(`/drill/${criterion}` as any)}
          onCheck={() => handleCheck('drill')}
        />

        {allChecked && (
          <View style={styles.doneCard} accessibilityLiveRegion="polite">
            <Text style={styles.doneTitle}>Session done — great work! 🎉</Text>
            <Text style={styles.doneText}>
              Rest up. Come back tomorrow to keep the streak alive.
            </Text>
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
  greeting: { fontSize: Typography.caption, color: Colors.textMuted },
  heading: { fontSize: Typography.title, fontWeight: '700', color: Colors.navy },
  gearIcon: { fontSize: 22, opacity: 0.6 },
  streakHeadline: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6,
    backgroundColor: '#FFF8EC', borderRadius: Radii.lg,
    paddingVertical: Spacing.sm, marginBottom: Spacing.md,
  },
  streakHeadlineFire: { fontSize: 26 },
  streakHeadlineNum: { fontSize: 28, fontWeight: '800', color: Colors.gold },
  streakHeadlineLabel: { fontSize: Typography.caption, fontWeight: '600', color: Colors.textSecondary },
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
  sessionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.sm, gap: Spacing.sm, flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: Typography.caption, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  refreshBadge: {
    backgroundColor: '#F0FDF4', borderRadius: Radii.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
  },
  refreshBadgeText: { fontSize: 10, fontWeight: '700', color: '#16A34A' },
  refreshLockBadge: {
    backgroundColor: '#FFF8EC', borderRadius: Radii.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: '#F0E4C8',
  },
  refreshLockText: { fontSize: 10, fontWeight: '700', color: Colors.gold },
  doneCard: {
    backgroundColor: '#F0FDF4', borderRadius: Radii.lg, padding: Spacing.md,
    marginTop: Spacing.sm, gap: 4, borderLeftWidth: 3, borderLeftColor: '#16A34A',
  },
  doneTitle: { fontSize: Typography.body, fontWeight: '700', color: '#15803D' },
  doneText: { fontSize: Typography.caption, color: '#16A34A' },
});
