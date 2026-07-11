import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, Switch, TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Polyline, Line, Circle, Text as SvgText } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { usePremium } from '@/hooks/usePremium';
import { SCENARIO_CATALOG, DEPT_LABELS } from '@/lib/scenarios/catalog';
import { decksForLevel, loadDeckCards } from '@/lib/vocab/decks';
import { getVocabStats } from '@/lib/db/vocab';
import {
  getStreak, getDaysUntilExam, getStudyPlanData, type StudyPlanData,
  getWeekCompletionDots, getTotalPracticeDays, recordReadinessSnapshot, getReadinessSevenDayDelta,
  type WeekDot,
} from '@/lib/today';
import { progressTabMode } from '@/lib/premiumGating';
import { getCoverageSummary, type CoverageSummary } from '@/lib/progressCoverage';
import { computeReadiness, computeConsistencyScore } from '@/lib/readiness';
import Skeleton from '@/components/Skeleton';
import ReadinessCard from '@/components/progress/ReadinessCard';
import LastMockCard from '@/components/progress/LastMockCard';
import VocabStatsCard from '@/components/progress/VocabStatsCard';
import AssignmentMasteryCard, { type MasteryRow } from '@/components/progress/AssignmentMasteryCard';
import CriterionTrend, { type CriterionKey } from '@/components/progress/CriterionTrend';
import LockedOverlay from '@/components/progress/LockedOverlay';
import DrillRecommendationsCard from '@/components/progress/DrillRecommendationsCard';
import StudyPlanCard from '@/components/progress/StudyPlanCard';
import { ScenarioCoverageCard, VocabCoverageCard, GrammarCoverageCard, MockCoverageCard } from '@/components/progress/CoverageCards';
import ConsistencyStats from '@/components/progress/ConsistencyStats';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { RubricCriterion } from '@/types';

type Attempt = {
  id: string;
  scenario_id: string;
  total_score: number;
  scores: Record<CriterionKey, number>;
  completed_at: string;
};

type MockAttemptRow = {
  id: string;
  mock_id: string;
  combined_score: number;
  passed: boolean;
  gate_passed: boolean;
  assignment_results: { assignmentType: string; score: number | null }[];
  completed_at: string;
};

// ── Sample data for locked previews when the user doesn't have enough real
// attempts yet — shown dimmed behind the lock (not masked, since it's fake). ──

const SAMPLE_ATTEMPTS: Attempt[] = [
  { id: 'sample-1', scenario_id: 'noisy-room-complaint', total_score: 13, scores: { fluency: 13, vocabulary: 12, grammar: 14, pronunciation: 13, content: 13 }, completed_at: '2026-05-01' },
  { id: 'sample-2', scenario_id: 'restaurant-allergy-order', total_score: 15, scores: { fluency: 15, vocabulary: 16, grammar: 15, pronunciation: 14, content: 15 }, completed_at: '2026-05-10' },
  { id: 'sample-3', scenario_id: 'overbooking', total_score: 17, scores: { fluency: 17, vocabulary: 17, grammar: 16, pronunciation: 17, content: 18 }, completed_at: '2026-05-19' },
];
const SAMPLE_MASTERY_ROWS: MasteryRow[] = [
  { type: 'complaint', avgScore: 58, attempts: 2 },
  { type: 'checkin', avgScore: 71, attempts: 3 },
  { type: 'restaurant', avgScore: 84, attempts: 2 },
];
const SAMPLE_DEPT_COUNTS: Record<string, number> = { front_office: 3, fnb: 2, concierge: 1 };
const SAMPLE_CRITERIA: RubricCriterion[] = ['grammar', 'pronunciation', 'vocabulary'];
const SAMPLE_MOCK_HISTORY: MockAttemptRow[] = [
  { id: 'sample-m1', mock_id: 'basic-2', combined_score: 62, passed: true, gate_passed: true, assignment_results: [], completed_at: '2026-05-05' },
  { id: 'sample-m2', mock_id: 'basic-3', combined_score: 71, passed: true, gate_passed: true, assignment_results: [], completed_at: '2026-05-12' },
];

const CRITERION_KEYS: CriterionKey[] = ['fluency', 'vocabulary', 'grammar', 'pronunciation', 'content'];
const CRITERION_LABELS: Record<CriterionKey, string> = {
  fluency: 'Fluency', vocabulary: 'Vocabulary', grammar: 'Grammar',
  pronunciation: 'Pronunciation', content: 'Content',
};

const CHART_W = 280;
const CHART_H = 100;

function TrendChart({ attempts, masked }: { attempts: Attempt[]; masked?: boolean }) {
  if (attempts.length < 2) {
    return (
      <View style={styles.chartEmpty}>
        <Text style={styles.chartEmptyText}>Complete 2 or more sessions to see your trend</Text>
      </View>
    );
  }

  const scores = attempts.map(a => (a.total_score / 20) * 100);
  const minS = Math.min(...scores);
  const maxS = Math.max(...scores, minS + 10);
  const range = maxS - minS || 20;

  const pts = scores
    .map((s, i) => {
      const x = (i / (scores.length - 1)) * CHART_W;
      const y = CHART_H - ((s - minS) / range) * (CHART_H - 10) - 5;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Svg width={CHART_W} height={CHART_H + 20} accessibilityLabel="Score trend chart">
      <Line x1={0} y1={CHART_H} x2={CHART_W} y2={CHART_H} stroke="#E8E3DC" strokeWidth={1} />
      <Polyline points={pts} fill="none" stroke={Colors.gold} strokeWidth={2.5} />
      {scores.map((s, i) => {
        const x = (i / (scores.length - 1)) * CHART_W;
        const y = CHART_H - ((s - minS) / range) * (CHART_H - 10) - 5;
        return <Circle key={i} cx={x} cy={y} r={4} fill={Colors.gold} />;
      })}
      <SvgText x={0} y={CHART_H + 16} fontSize={9} fill={Colors.textMuted}>
        {masked ? '🔒' : attempts[0].completed_at.slice(5, 10)}
      </SvgText>
      <SvgText x={CHART_W} y={CHART_H + 16} fontSize={9} fill={Colors.textMuted} textAnchor="end">
        {masked ? '🔒' : attempts[attempts.length - 1].completed_at.slice(5, 10)}
      </SvgText>
    </Svg>
  );
}

function AvgBar({ label, avg, masked }: { label: string; avg: number; masked?: boolean }) {
  const pct = Math.round((avg / 20) * 100);
  const color = pct >= 75 ? '#16A34A' : pct >= 55 ? '#CA8A04' : '#DC2626';

  return (
    <View style={styles.avgRow} accessibilityLabel={`${label}: ${pct}%`}>
      <Text style={styles.avgLabel}>{label}</Text>
      <View style={styles.avgBarBg}>
        <View style={[styles.avgBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.avgPct, { color }]}>{masked ? '🔒' : `${pct}%`}</Text>
    </View>
  );
}

function MockHistoryList({ mocks, masked }: { mocks: MockAttemptRow[]; masked?: boolean }) {
  if (mocks.length === 0) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Mock History</Text>
      {mocks.map(m => (
        <View key={m.id} style={styles.mockHistoryRow}>
          <Text style={styles.mockHistoryId}>{m.mock_id}</Text>
          <Text style={styles.mockHistoryDate}>{m.completed_at.slice(0, 10)}</Text>
          <Text style={[styles.mockHistoryScore, m.passed ? styles.mockHistoryPass : styles.mockHistoryFail]}>
            {masked ? '🔒' : `${Math.round(m.combined_score)}/100`}
          </Text>
        </View>
      ))}
    </View>
  );
}

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
  const [loading, setLoading] = useState(true);

  const isFull = progressTabMode(isPremium) === 'full';

  // Refetch every time this tab gains focus — a just-graded session, vocab
  // review, grammar drill, or guided-session completion must never show
  // stale numbers.
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let cancelled = false;

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
      }
      load();

      return () => { cancelled = true; };
    }, [user?.id, user?.mockLevel, isPremium])
  );

  const avgScores = CRITERION_KEYS.reduce<Record<CriterionKey, number>>((acc, k) => {
    const vals = attempts.map(a => a.scores?.[k] ?? 0).filter(v => v > 0);
    acc[k] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    return acc;
  }, {} as Record<CriterionKey, number>);

  const sampleAvgScores = CRITERION_KEYS.reduce<Record<CriterionKey, number>>((acc, k) => {
    const vals = SAMPLE_ATTEMPTS.map(a => a.scores[k]);
    acc[k] = vals.reduce((s, v) => s + v, 0) / vals.length;
    return acc;
  }, {} as Record<CriterionKey, number>);

  const weakest = attempts.length
    ? CRITERION_KEYS.reduce((a, b) => (avgScores[a] <= avgScores[b] ? a : b))
    : null;

  const deptCounts: Record<string, number> = {};
  for (const a of attempts) {
    const dept = SCENARIO_CATALOG.find(s => s.id === a.scenario_id)?.department ?? 'other';
    deptCounts[dept] = (deptCounts[dept] ?? 0) + 1;
  }

  const recentTrend = attempts.slice(-8);
  const criterionSeries = attempts.slice(-8).map(a => a.scores);

  // Readiness (Performance component) = average combined_score of the last 3 mocks, if any.
  const recentMocks = mockAttempts.slice(0, 3);
  const avgMockScore = recentMocks.length
    ? recentMocks.reduce((s, m) => s + m.combined_score, 0) / recentMocks.length
    : null;

  // ── Readiness v2: weighted composite of Performance / Coverage / Consistency ─
  // (lib/readiness.ts documents the 50/30/20 weights). Performance falls back to
  // recent role-play scores when no mock exists yet; the composite itself is
  // withheld (cold-start) until there's at least SOME graded evidence, per your
  // amendment — Coverage/Consistency render regardless.
  const hasPerformanceData = avgMockScore !== null || attempts.length > 0;
  const performanceScore = avgMockScore ?? (
    attempts.length ? (attempts.reduce((s, a) => s + a.total_score, 0) / attempts.length) * 5 : 0
  );
  const sessionsThisWeek = weekDots.filter(d => d.completed).length;
  const consistencyScore = computeConsistencyScore(sessionsThisWeek, streak);
  const compositeScore = (hasPerformanceData && coverage)
    ? computeReadiness(performanceScore, coverage.overallPct, consistencyScore)
    : null;

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

  // Mastery by assignment type, aggregated across all mock attempts.
  const masteryAcc: Record<string, { sum: number; count: number }> = {};
  for (const m of mockAttempts) {
    for (const a of m.assignment_results) {
      if (a.score === null) continue;
      const acc = (masteryAcc[a.assignmentType] ??= { sum: 0, count: 0 });
      acc.sum += a.score;
      acc.count += 1;
    }
  }
  const masteryRows: MasteryRow[] = Object.entries(masteryAcc)
    .map(([type, { sum, count }]) => ({ type, avgScore: sum / count, attempts: count }))
    .sort((a, b) => a.avgScore - b.avgScore);

  const lastMock = mockAttempts[0] ?? null;
  const hasAnyData = attempts.length > 0 || mockAttempts.length > 0;

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

        {lastMock && (
          <LastMockCard
            mockId={lastMock.mock_id}
            combinedScore={lastMock.combined_score}
            passed={lastMock.passed}
            gatePassed={lastMock.gate_passed}
            completedAt={lastMock.completed_at}
            assignmentResults={lastMock.assignment_results}
          />
        )}

        {/* Coverage — unlocked for both tiers: tracking your own coverage is
            engagement, not analytics. */}
        <Text style={styles.sectionLabel}>Coverage</Text>
        {coverage && (
          <>
            <ScenarioCoverageCard coverage={coverage.scenarios} />
            <VocabCoverageCard coverage={coverage.vocab} />
            <GrammarCoverageCard coverage={coverage.grammar} />
            <MockCoverageCard coverage={coverage.mocks} />
          </>
        )}

        {/* Consistency — also unlocked for both tiers. */}
        <Text style={styles.sectionLabel}>Consistency</Text>
        <ConsistencyStats streak={streak} sessionsThisWeek={sessionsThisWeek} totalPracticeDays={totalPracticeDays} />

        <Text style={styles.sectionLabel}>Performance</Text>
        {isFull ? (
          <>
            <VocabStatsCard {...vocabStats} streak={streak} />
            <StudyPlanCard daysUntilExam={daysUntilExam} minutesPerDay={minutesPerDay} nextActions={nextActions} />
            <DrillRecommendationsCard criteria={drillCriteria} onSelect={c => router.push(`/drill/${c}` as any)} />
            <AssignmentMasteryCard rows={masteryRows} />
            <MockHistoryList mocks={mockAttempts} />

            {!hasAnyData ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📊</Text>
                <Text style={styles.emptyTitle}>Your first session is the hardest</Text>
                <Text style={styles.emptyText}>
                  Complete a role-play or mock exam and your scores will appear here.
                  No pressure — this is practice.
                </Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => router.push('/(tabs)/practice' as any)}
                  accessibilityRole="button"
                  accessibilityLabel="Start practising — go to Practice tab"
                >
                  <Text style={styles.emptyBtnText}>Start practising</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Score Trend</Text>
                  <Text style={styles.cardSub}>{attempts.length} session{attempts.length !== 1 ? 's' : ''} completed</Text>
                  <View style={styles.chartWrap}>
                    <TrendChart attempts={recentTrend} />
                  </View>
                </View>

                <CriterionTrend series={criterionSeries} />

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Criterion Averages</Text>
                  {CRITERION_KEYS.map(k => (
                    <AvgBar key={k} label={CRITERION_LABELS[k]} avg={avgScores[k]} />
                  ))}
                </View>

                {weakest && (
                  <View style={[styles.card, styles.weakCard]}>
                    <Text style={styles.weakTitle}>Focus area this week</Text>
                    <Text style={styles.weakCriterion}>{CRITERION_LABELS[weakest]}</Text>
                    <Text style={styles.weakSub}>
                      Your average here is {Math.round((avgScores[weakest] / 20) * 100)}% — a few targeted drills will move this quickly.
                    </Text>
                  </View>
                )}

                {Object.keys(deptCounts).length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Scenarios Practiced</Text>
                    {Object.entries(deptCounts).map(([dept, count]) => (
                      <View key={dept} style={styles.deptRow}>
                        <Text style={styles.deptLabel}>{DEPT_LABELS[dept as keyof typeof DEPT_LABELS] ?? dept.replace('_', ' ')}</Text>
                        <Text style={styles.deptCount}>{count}×</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <LockedOverlay ctaLabel="Unlock your full vocabulary analytics" onUnlock={() => router.push('/paywall' as any)}>
              <VocabStatsCard {...vocabStats} streak={streak} masked />
            </LockedOverlay>

            <LockedOverlay ctaLabel="Unlock your adaptive study plan" onUnlock={() => router.push('/paywall' as any)}>
              <StudyPlanCard daysUntilExam={daysUntilExam} minutesPerDay={minutesPerDay} nextActions={nextActions} />
            </LockedOverlay>

            <LockedOverlay ctaLabel="Unlock personalized drill recommendations" onUnlock={() => router.push('/paywall' as any)}>
              <DrillRecommendationsCard
                criteria={drillCriteria.length ? drillCriteria : SAMPLE_CRITERIA}
                onSelect={() => router.push('/paywall' as any)}
              />
            </LockedOverlay>

            <LockedOverlay
              ctaLabel={lastMock ? 'Unlock the full analysis of your last exam' : 'Unlock your full mastery breakdown'}
              onUnlock={() => router.push('/paywall' as any)}
              isSample={masteryRows.length === 0}
            >
              <AssignmentMasteryCard
                rows={masteryRows.length ? masteryRows : SAMPLE_MASTERY_ROWS}
                masked={masteryRows.length > 0}
              />
            </LockedOverlay>

            <LockedOverlay
              ctaLabel="Unlock your full mock exam history"
              onUnlock={() => router.push('/paywall' as any)}
              isSample={mockAttempts.length === 0}
            >
              <MockHistoryList
                mocks={mockAttempts.length ? mockAttempts : SAMPLE_MOCK_HISTORY}
                masked={mockAttempts.length > 0}
              />
            </LockedOverlay>

            <LockedOverlay
              ctaLabel={attempts.length >= 2 ? 'Unlock the full analysis of your last exam' : 'Unlock your full score trend'}
              onUnlock={() => router.push('/paywall' as any)}
              isSample={attempts.length < 2}
            >
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Score Trend</Text>
                <Text style={styles.cardSub}>
                  {attempts.length >= 2 ? `${attempts.length} sessions completed` : 'Example trend'}
                </Text>
                <View style={styles.chartWrap}>
                  <TrendChart attempts={attempts.length >= 2 ? recentTrend : SAMPLE_ATTEMPTS} masked={attempts.length >= 2} />
                </View>
              </View>
            </LockedOverlay>

            <LockedOverlay
              ctaLabel="Unlock your per-criterion trends"
              onUnlock={() => router.push('/paywall' as any)}
              isSample={attempts.length < 2}
            >
              <CriterionTrend
                series={attempts.length >= 2 ? criterionSeries : SAMPLE_ATTEMPTS.map(a => a.scores)}
                masked={attempts.length >= 2}
              />
            </LockedOverlay>

            <LockedOverlay
              ctaLabel="Unlock your criterion averages"
              onUnlock={() => router.push('/paywall' as any)}
              isSample={attempts.length === 0}
            >
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Criterion Averages</Text>
                {CRITERION_KEYS.map(k => (
                  <AvgBar
                    key={k}
                    label={CRITERION_LABELS[k]}
                    avg={attempts.length > 0 ? avgScores[k] : sampleAvgScores[k]}
                    masked={attempts.length > 0}
                  />
                ))}
              </View>
            </LockedOverlay>

            <LockedOverlay
              ctaLabel="Unlock your personalized focus area"
              onUnlock={() => router.push('/paywall' as any)}
              isSample={!weakest}
            >
              <View style={[styles.card, styles.weakCard]}>
                <Text style={styles.weakTitle}>Focus area this week</Text>
                <Text style={styles.weakCriterion}>{CRITERION_LABELS[weakest ?? 'grammar']}</Text>
                <Text style={styles.weakSub}>
                  {weakest
                    ? 'Your average here is 🔒 — a few targeted drills will move this quickly.'
                    : 'Your average here is 58% — a few targeted drills will move this quickly.'}
                </Text>
              </View>
            </LockedOverlay>

            <LockedOverlay
              ctaLabel="Unlock your full practice breakdown"
              onUnlock={() => router.push('/paywall' as any)}
              isSample={Object.keys(deptCounts).length === 0}
            >
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Scenarios Practiced</Text>
                {Object.entries(Object.keys(deptCounts).length > 0 ? deptCounts : SAMPLE_DEPT_COUNTS).map(([dept, count]) => (
                  <View key={dept} style={styles.deptRow}>
                    <Text style={styles.deptLabel}>{DEPT_LABELS[dept as keyof typeof DEPT_LABELS] ?? dept.replace('_', ' ')}</Text>
                    <Text style={styles.deptCount}>{Object.keys(deptCounts).length > 0 ? '🔒' : `${count}×`}</Text>
                  </View>
                ))}
              </View>
            </LockedOverlay>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F5F0' },
  content: { padding: Spacing.lg, paddingBottom: 60 },
  heading: { fontSize: Typography.title, fontWeight: Typography.bold, color: Colors.navy, marginBottom: Spacing.sm },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
    marginTop: Spacing.sm, marginBottom: Spacing.xs,
  },
  devToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF3CD', borderRadius: Radii.md, padding: Spacing.sm,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: '#FBBF24',
  },
  devToggleText: { fontSize: Typography.caption, fontWeight: '600', color: '#92400E' },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm, gap: Spacing.sm,
  },
  cardTitle: { fontSize: Typography.body, fontWeight: Typography.bold, color: Colors.navy },
  mockHistoryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 4,
  },
  mockHistoryId: { flex: 1, fontSize: Typography.caption, color: Colors.textSecondary, fontWeight: Typography.medium },
  mockHistoryDate: { fontSize: Typography.caption, color: Colors.textMuted, marginRight: Spacing.sm },
  mockHistoryScore: { fontSize: Typography.caption, fontWeight: Typography.bold },
  mockHistoryPass: { color: '#16A34A' },
  mockHistoryFail: { color: Colors.error },
  cardSub: { fontSize: Typography.caption, color: Colors.textMuted },
  chartWrap: { alignItems: 'center', marginTop: Spacing.sm },
  avgRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avgLabel: { width: 90, fontSize: Typography.caption, color: Colors.textSecondary },
  avgBarBg: { flex: 1, height: 8, backgroundColor: '#EDE9E3', borderRadius: 4, overflow: 'hidden' },
  avgBarFill: { height: '100%', borderRadius: 4 },
  avgPct: { width: 36, fontSize: Typography.caption, fontWeight: Typography.bold, textAlign: 'right' },
  weakCard: { backgroundColor: '#FFF8EC', borderLeftWidth: 4, borderLeftColor: Colors.gold },
  weakTitle: { fontSize: Typography.caption, fontWeight: Typography.bold, color: Colors.gold, textTransform: 'uppercase', letterSpacing: 0.8 },
  weakCriterion: { fontSize: Typography.heading, fontWeight: Typography.bold, color: Colors.navy },
  weakSub: { fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  deptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deptLabel: { fontSize: Typography.caption, color: Colors.textSecondary },
  deptCount: { fontSize: Typography.caption, fontWeight: Typography.bold, color: Colors.navy },
  emptyState: { alignItems: 'center', paddingTop: 32, gap: Spacing.md },
  emptyEmoji: { fontSize: 60 },
  emptyTitle: { fontSize: Typography.heading, fontWeight: Typography.bold, color: Colors.navy, textAlign: 'center' },
  emptyText: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: Spacing.md },
  emptyBtn: {
    backgroundColor: Colors.navy, borderRadius: Radii.lg,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, marginTop: Spacing.sm,
  },
  emptyBtnText: { color: '#fff', fontWeight: Typography.semibold, fontSize: Typography.body },
  chartEmpty: { alignItems: 'center', paddingVertical: Spacing.lg },
  chartEmptyText: { fontSize: Typography.caption, color: Colors.textMuted, fontStyle: 'italic' },
});
