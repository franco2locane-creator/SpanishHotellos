import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, Switch, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { usePremium } from '@/hooks/usePremium';
import { DEPT_LABELS, scenariosForLevel } from '@/lib/scenarios/catalog';
import { decksForLevel, loadDeckCards } from '@/lib/vocab/decks';
import { drillsForLevel } from '@/lib/grammar/drills';
import { getVocabStats } from '@/lib/db/vocab';
import {
  getStreak, getDaysUntilExam, getStudyPlanData, type StudyPlanData,
  getWeekCompletionDots, getTotalPracticeDays, recordReadinessSnapshot, getReadinessSevenDayDelta,
  type WeekDot,
} from '@/lib/today';
import { examCountdownLabel } from '@/lib/examDate';
import { progressTabMode } from '@/lib/premiumGating';
import { getCoverageSummary, getScenarioActivity, type CoverageSummary, type ScenarioActivity } from '@/lib/progressCoverage';
import { computeReadiness, computeConsistencyScore } from '@/lib/readiness';
import { getRecommendation, getWeakestAreas } from '@/lib/progressRecommendation';
import { trendDirection, trendSentence } from '@/lib/trend';
import { useViewScenarioFeedback } from '@/hooks/useViewScenarioFeedback';
import Skeleton from '@/components/Skeleton';
import ReadinessCard from '@/components/progress/ReadinessCard';
import DoThisNextCard from '@/components/progress/DoThisNextCard';
import WeakestAreasCard from '@/components/progress/WeakestAreasCard';
import LockedOverlay from '@/components/progress/LockedOverlay';
import DrillRecommendationsCard from '@/components/progress/DrillRecommendationsCard';
import StudyPlanCard from '@/components/progress/StudyPlanCard';
import CourseMaterialSection from '@/components/progress/CourseMaterialSection';
import type { MockAttemptRow } from '@/components/progress/MockHistoryList';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';
import type { RubricCriterion } from '@/types';

type Attempt = {
  id: string;
  scenario_id: string;
  total_score: number;
  scores: Record<RubricCriterion, number>;
  completed_at: string;
};

const SAMPLE_CRITERIA: RubricCriterion[] = ['grammar', 'pronunciation', 'vocabulary'];

const CRITERION_KEYS: RubricCriterion[] = ['fluency', 'vocabulary', 'grammar', 'pronunciation', 'content'];
const CRITERION_LABELS: Record<RubricCriterion, string> = {
  fluency: 'Fluency', vocabulary: 'Vocabulary', grammar: 'Grammar',
  pronunciation: 'Pronunciation', content: 'Content',
};

function ProgressSkeleton() {
  return (
    <View style={{ padding: Spacing.lg, gap: Spacing.md }}>
      <Skeleton width={100} height={22} borderRadius={6} />
      {[120, 160, 100].map((h, i) => (
        <Skeleton key={i} width="100%" height={h} borderRadius={12} />
      ))}
    </View>
  );
}

export default function ProgressScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { devPremiumOverride, setDevPremiumOverride } = usePurchaseStore();
  const isPremium = usePremium();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [mockAttempts, setMockAttempts] = useState<MockAttemptRow[]>([]);
  const [vocabStats, setVocabStats] = useState({ learned: 0, due: 0, total: 0 });
  const [streak, setStreak] = useState(0);
  const [studyPlan, setStudyPlan] = useState<StudyPlanData | null>(null);
  const [coverage, setCoverage] = useState<CoverageSummary | null>(null);
  const [weekDots, setWeekDots] = useState<WeekDot[]>([]);
  const [totalPracticeDays, setTotalPracticeDays] = useState(0);
  const [readinessDelta, setReadinessDelta] = useState<number | null>(null);
  const [scenarioActivity, setScenarioActivity] = useState<ScenarioActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const lastFetchedAtRef = useRef(0);
  const isWeb = Platform.OS === 'web';
  const viewLastScenarioFeedback = useViewScenarioFeedback();

  const isFull = progressTabMode(isPremium) === 'full';

  // Refetch every time this tab gains focus — a just-graded session, vocab
  // review, grammar drill, or guided-session completion must never show
  // stale numbers. Debounced: a real post-exercise return is always
  // seconds-to-minutes later, so skipping a refetch within 3s of the last
  // one only ever catches back-to-back accidental refocuses, never a
  // legitimate refresh.
  const REFETCH_DEBOUNCE_MS = 3000;
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      if (Date.now() - lastFetchedAtRef.current < REFETCH_DEBOUNCE_MS) return;
      let cancelled = false;
      lastFetchedAtRef.current = Date.now();

      async function load() {
        const level = user!.mockLevel ?? 'basic';
        const decks = decksForLevel(level).filter(d => d.isFree || isPremium);
        const allCardIds = decks.flatMap(d => loadDeckCards(d.id).map(c => c.id));

        const [
          { data: attemptData }, { data: mockData }, vStats, s, plan,
          coverageSummary, dots, totalDays,
        ] = await Promise.all([
          supabase
            .from('exam_attempts')
            .select('id, scenario_id, total_score, scores, completed_at')
            .eq('user_id', user!.id)
            .order('completed_at', { ascending: true })
            .limit(20),
          supabase
            .from('mock_attempts')
            .select('id, mock_id, combined_score, passed, gate_passed, assignment_results, completed_at')
            .eq('user_id', user!.id)
            .order('completed_at', { ascending: false })
            .limit(10),
          getVocabStats(user!.id, allCardIds),
          getStreak(),
          getStudyPlanData(user!.id, level),
          getCoverageSummary(user!.id, level, isPremium),
          getWeekCompletionDots(),
          getTotalPracticeDays(),
        ]);

        if (cancelled) return;
        setAttempts((attemptData as Attempt[]) ?? []);
        setMockAttempts((mockData as MockAttemptRow[]) ?? []);
        setVocabStats(vStats);
        setStreak(s);
        setStudyPlan(plan);
        setCoverage(coverageSummary);
        setWeekDots(dots);
        setTotalPracticeDays(totalDays);
        setLoading(false);

        // Per-scenario best scores, one batch behind coverage since it needs
        // coverage's completedScenarioIds first.
        const activity = await getScenarioActivity(user!.id, coverageSummary.completedScenarioIds);
        if (!cancelled) setScenarioActivity(activity);
      }
      load();

      return () => { cancelled = true; };
    }, [user?.id, user?.mockLevel, isPremium])
  );

  const avgScores = CRITERION_KEYS.reduce<Record<RubricCriterion, number>>((acc, k) => {
    const vals = attempts.map(a => a.scores?.[k] ?? 0).filter(v => v > 0);
    acc[k] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    return acc;
  }, {} as Record<RubricCriterion, number>);

  const criterionSeries = attempts.slice(-8).map(a => a.scores);

  // Readiness (Performance component) = average combined_score of the last 3 mocks, if any.
  const recentMocks = mockAttempts.slice(0, 3);
  const avgMockScore = recentMocks.length
    ? recentMocks.reduce((s, m) => s + m.combined_score, 0) / recentMocks.length
    : null;

  // ── Readiness v2: weighted composite of Performance / Coverage / Consistency ─
  // (lib/readiness.ts documents the 50/30/20 weights). Performance falls back to
  // recent role-play scores when no mock exists yet; the composite itself is
  // withheld (cold-start) until there's at least SOME graded evidence —
  // ReadinessCard renders its own unlock-guidance copy in that case.
  const hasPerformanceData = avgMockScore !== null || attempts.length > 0;
  const performanceScore = avgMockScore ?? (
    attempts.length ? (attempts.reduce((s, a) => s + a.total_score, 0) / attempts.length) * 5 : 0
  );
  const sessionsThisWeek = weekDots.filter(d => d.completed).length;
  const consistencyScore = computeConsistencyScore(sessionsThisWeek, streak);
  const compositeScore = (hasPerformanceData && coverage)
    ? computeReadiness(performanceScore, coverage.overallPct, consistencyScore)
    : null;

  // One-line trend sentence under ReadinessCard — needs at least 6 chronological
  // total_score points (trendDirection's default 3-value window compared twice).
  const scoreTrend = attempts.length >= 6 ? trendDirection(attempts.map(a => a.total_score)) : null;

  // Record today's composite once it's known, and fetch the 7-day-ago delta.
  useEffect(() => {
    if (compositeScore === null) { setReadinessDelta(null); return; }
    let cancelled = false;
    (async () => {
      const delta = await getReadinessSevenDayDelta(compositeScore);
      if (!cancelled) setReadinessDelta(delta);
      await recordReadinessSnapshot(compositeScore);
    })();
    return () => { cancelled = true; };
  }, [compositeScore]);

  const lastMock = mockAttempts[0] ?? null;

  // ── FULL-only derived data: adaptive study plan + drill recommendations ────
  const daysUntilExam = getDaysUntilExam(user?.examDate);
  const minutesPerDay = Math.max(
    10,
    (daysUntilExam !== null && daysUntilExam <= 7 ? 25 : daysUntilExam !== null && daysUntilExam <= 14 ? 20 : 15)
      - (avgMockScore !== null && avgMockScore >= 80 ? 5 : 0)
  );
  const nextActions: string[] = [];
  if (mockAttempts.length === 0) nextActions.push('Complete your first mock exam to set a baseline score.');
  if (studyPlan?.weakestDept) {
    nextActions.push(`Practice more ${DEPT_LABELS[studyPlan.weakestDept] ?? studyPlan.weakestDept.replace('_', ' ')} scenarios.`);
  }
  if (studyPlan?.weakestCriterion) {
    nextActions.push(`Review your ${CRITERION_LABELS[studyPlan.weakestCriterion]} drills.`);
  }
  if (nextActions.length === 0) nextActions.push('Keep up your daily practice streak.');
  const drillCriteria = (studyPlan?.rankedCriteria ?? []).slice(0, 3);

  // ── "Do This Next" + "Weakest Areas" — top-of-tab hierarchy ────────────────
  const level = user?.mockLevel ?? 'basic';
  const recommendation = coverage
    ? getRecommendation({
        coverage,
        studyPlan,
        scenarios: scenariosForLevel(level),
        decks: decksForLevel(level),
        drills: drillsForLevel(level),
        isPremium,
      })
    : null;
  const weakestAreas = coverage
    ? getWeakestAreas({
        coverage,
        isFull,
        avgScores: attempts.length ? avgScores : undefined,
        criterionSeries: attempts.length ? criterionSeries : undefined,
      })
    : [];

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ProgressSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Progress</Text>

        {__DEV__ && (
          <View style={styles.devToggle}>
            <Text style={styles.devToggleText}>🔧 Dev: Simulate Premium</Text>
            <Switch
              value={devPremiumOverride}
              onValueChange={setDevPremiumOverride}
              trackColor={{ true: Colors.gold }}
              thumbColor="#fff"
              accessibilityLabel="Toggle premium simulation"
            />
          </View>
        )}

        <ReadinessCard
          score={compositeScore}
          delta={readinessDelta}
          breakdown={{ performance: performanceScore, coverage: coverage?.overallPct ?? 0, consistency: consistencyScore }}
        />
        {scoreTrend && <Text style={styles.trendLine}>{trendSentence(scoreTrend)}</Text>}
        <Text style={styles.countdown}>{examCountdownLabel(daysUntilExam)}</Text>

        {/* Nothing else competes with Readiness at this level — Do This Next
            and Weakest Areas are the tab's next two priorities, everything
            else is detail behind a tap. */}
        <DoThisNextCard recommendation={recommendation} />
        <WeakestAreasCard items={weakestAreas} />

        {isFull ? (
          <>
            <StudyPlanCard daysUntilExam={daysUntilExam} minutesPerDay={minutesPerDay} nextActions={nextActions} />
            <DrillRecommendationsCard criteria={drillCriteria} onSelect={c => router.push(`/drill/${c}` as any)} />
          </>
        ) : (
          <>
            <LockedOverlay ctaLabel="Unlock your adaptive study plan" onUnlock={() => router.push('/paywall' as any)}>
              <StudyPlanCard daysUntilExam={daysUntilExam} minutesPerDay={minutesPerDay} nextActions={nextActions} />
            </LockedOverlay>

            <LockedOverlay ctaLabel="Unlock personalized drill recommendations" onUnlock={() => router.push('/paywall' as any)}>
              <DrillRecommendationsCard
                criteria={drillCriteria.length ? drillCriteria : SAMPLE_CRITERIA}
                onSelect={() => router.push('/paywall' as any)}
              />
            </LockedOverlay>
          </>
        )}

        {coverage && (
          <CourseMaterialSection
            coverage={coverage}
            scenarioActivity={scenarioActivity}
            scenarios={scenariosForLevel(level)}
            onViewScenarioFeedback={scenarioId => user && viewLastScenarioFeedback(user.id, scenarioId)}
            vocabDueCount={vocabStats.due}
            lastMock={lastMock}
            mockAttempts={mockAttempts}
            onViewMockFeedback={mockId => router.push(`/exam/last-attempt?mockId=${mockId}` as any)}
            isFull={isFull}
            onUnlockPaywall={() => router.push('/paywall' as any)}
            isWeb={isWeb}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F5F0' },
  content: { padding: Spacing.lg, paddingBottom: 60 },
  heading: { fontSize: Typography.title, fontWeight: Typography.bold, color: Colors.navy, marginBottom: Spacing.sm },
  trendLine: {
    fontSize: Typography.caption, color: Colors.textSecondary, textAlign: 'center',
    marginTop: -Spacing.xs, marginBottom: Spacing.sm,
  },
  countdown: {
    fontSize: Typography.caption, color: Colors.textMuted, textAlign: 'center',
    marginBottom: Spacing.md,
  },
  devToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF3CD', borderRadius: Radii.md, padding: Spacing.sm,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: '#FBBF24',
  },
  devToggleText: { fontSize: Typography.caption, fontWeight: '600', color: '#92400E' },
});
