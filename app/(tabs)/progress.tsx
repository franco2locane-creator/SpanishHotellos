import { useCallback, useState } from 'react';
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
import { getStreak } from '@/lib/today';
import Skeleton from '@/components/Skeleton';
import ReadinessCard from '@/components/progress/ReadinessCard';
import LastMockCard from '@/components/progress/LastMockCard';
import VocabStatsCard from '@/components/progress/VocabStatsCard';
import AssignmentMasteryCard, { type MasteryRow } from '@/components/progress/AssignmentMasteryCard';
import CriterionTrend, { type CriterionKey } from '@/components/progress/CriterionTrend';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

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

const CRITERION_KEYS: CriterionKey[] = ['fluency', 'vocabulary', 'grammar', 'pronunciation', 'content'];
const CRITERION_LABELS: Record<CriterionKey, string> = {
  fluency: 'Fluency', vocabulary: 'Vocabulary', grammar: 'Grammar',
  pronunciation: 'Pronunciation', content: 'Content',
};

const CHART_W = 280;
const CHART_H = 100;

function TrendChart({ attempts }: { attempts: Attempt[] }) {
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
        {attempts[0].completed_at.slice(5, 10)}
      </SvgText>
      <SvgText x={CHART_W} y={CHART_H + 16} fontSize={9} fill={Colors.textMuted} textAnchor="end">
        {attempts[attempts.length - 1].completed_at.slice(5, 10)}
      </SvgText>
    </Svg>
  );
}

function AvgBar({ label, avg }: { label: string; avg: number }) {
  const pct = Math.round((avg / 20) * 100);
  const color = pct >= 75 ? '#16A34A' : pct >= 55 ? '#CA8A04' : '#DC2626';

  return (
    <View style={styles.avgRow} accessibilityLabel={`${label}: ${pct}%`}>
      <Text style={styles.avgLabel}>{label}</Text>
      <View style={styles.avgBarBg}>
        <View style={[styles.avgBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.avgPct, { color }]}>{pct}%</Text>
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
  const [loading, setLoading] = useState(true);

  // Refetch every time this tab gains focus — a just-graded session or vocab
  // review must never show stale numbers.
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let cancelled = false;

      async function load() {
        const level = user!.mockLevel ?? 'basic';
        const decks = decksForLevel(level).filter(d => d.isFree || isPremium);
        const allCardIds = decks.flatMap(d => loadDeckCards(d.id).map(c => c.id));

        const [{ data: attemptData }, { data: mockData }, vStats, s] = await Promise.all([
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
        ]);

        if (cancelled) return;
        setAttempts((attemptData as Attempt[]) ?? []);
        setMockAttempts((mockData as MockAttemptRow[]) ?? []);
        setVocabStats(vStats);
        setStreak(s);
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

  // Readiness = average combined_score of the last 3 mocks, if any.
  const recentMocks = mockAttempts.slice(0, 3);
  const avgMockScore = recentMocks.length
    ? recentMocks.reduce((s, m) => s + m.combined_score, 0) / recentMocks.length
    : null;

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

        <ReadinessCard avgMockScore={avgMockScore} />
        <VocabStatsCard {...vocabStats} streak={streak} />

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

        <AssignmentMasteryCard rows={masteryRows} />

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F5F0' },
  content: { padding: Spacing.lg, paddingBottom: 60 },
  heading: { fontSize: Typography.title, fontWeight: Typography.bold, color: Colors.navy, marginBottom: Spacing.sm },
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
