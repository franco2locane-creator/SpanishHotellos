import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Switch,
} from 'react-native';
import Svg, { Polyline, Line, Circle, Text as SvgText } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { SCENARIO_CATALOG, DEPT_LABELS } from '@/lib/scenarios/catalog';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

// ── Types ─────────────────────────────────────────────────────────────────────

type Attempt = {
  id: string;
  scenario_id: string;
  total_score: number;
  scores: { fluency: number; vocabulary: number; grammar: number; taskCompletion: number; register: number };
  completed_at: string;
};

type CriterionKey = 'fluency' | 'vocabulary' | 'grammar' | 'taskCompletion' | 'register';
const CRITERION_KEYS: CriterionKey[] = ['fluency', 'vocabulary', 'grammar', 'taskCompletion', 'register'];
const CRITERION_LABELS: Record<CriterionKey, string> = {
  fluency: 'Fluency', vocabulary: 'Vocabulary', grammar: 'Grammar',
  taskCompletion: 'Task', register: 'Register',
};

// ── Trend chart ───────────────────────────────────────────────────────────────

const CHART_W = 280;
const CHART_H = 100;

function TrendChart({ attempts }: { attempts: Attempt[] }) {
  if (attempts.length < 2) {
    return (
      <View style={styles.chartEmpty}>
        <Text style={styles.chartEmptyText}>Complete 2+ sessions to see your trend</Text>
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
    <Svg width={CHART_W} height={CHART_H + 20}>
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

// ── Average bar ───────────────────────────────────────────────────────────────

function AvgBar({ label, avg }: { label: string; avg: number }) {
  const pct = Math.round((avg / 20) * 100);
  const color = pct >= 75 ? '#16A34A' : pct >= 55 ? '#CA8A04' : '#DC2626';

  return (
    <View style={styles.avgRow}>
      <Text style={styles.avgLabel}>{label}</Text>
      <View style={styles.avgBarBg}>
        <View style={[styles.avgBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.avgPct, { color }]}>{pct}%</Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const { user } = useAuthStore();
  const { devPremiumOverride, setDevPremiumOverride } = usePurchaseStore();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('exam_attempts')
      .select('id, scenario_id, total_score, scores, completed_at')
      .order('completed_at', { ascending: true })
      .limit(20)
      .then(({ data }) => {
        setAttempts((data as Attempt[]) ?? []);
        setLoading(false);
      });
  }, [user?.id]);

  const avgScores = CRITERION_KEYS.reduce<Record<CriterionKey, number>>((acc, k) => {
    const vals = attempts.map(a => a.scores?.[k] ?? 0).filter(v => v > 0);
    acc[k] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    return acc;
  }, {} as Record<CriterionKey, number>);

  const weakest = attempts.length
    ? CRITERION_KEYS.reduce((a, b) => (avgScores[a] <= avgScores[b] ? a : b))
    : null;

  // Department breakdown: group by scenario's department.
  const deptCounts: Record<string, number> = {};
  for (const a of attempts) {
    const dept = SCENARIO_CATALOG.find(s => s.id === a.scenario_id)?.department ?? 'other';
    deptCounts[dept] = (deptCounts[dept] ?? 0) + 1;
  }

  const recentTrend = attempts.slice(-8);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator style={{ flex: 1 }} color={Colors.navy} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Progress</Text>

        {/* Dev-only premium toggle — never shown in production builds */}
        {__DEV__ && (
          <View style={styles.devToggle}>
            <Text style={styles.devToggleText}>🔧 Dev: Simulate Premium</Text>
            <Switch
              value={devPremiumOverride}
              onValueChange={setDevPremiumOverride}
              trackColor={{ true: Colors.gold }}
              thumbColor="#fff"
            />
          </View>
        )}

        {attempts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptyText}>
              Complete a role-play session to see your scores and improvement over time.
            </Text>
          </View>
        ) : (
          <>
            {/* Score trend */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Score Trend</Text>
              <Text style={styles.cardSub}>{attempts.length} session{attempts.length !== 1 ? 's' : ''} completed</Text>
              <View style={styles.chartWrap}>
                <TrendChart attempts={recentTrend} />
              </View>
            </View>

            {/* Per-criterion averages */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Criterion Averages</Text>
              {CRITERION_KEYS.map(k => (
                <AvgBar key={k} label={CRITERION_LABELS[k]} avg={avgScores[k]} />
              ))}
            </View>

            {/* Weakest area */}
            {weakest && (
              <View style={[styles.card, styles.weakCard]}>
                <Text style={styles.weakTitle}>Focus area this week</Text>
                <Text style={styles.weakCriterion}>{CRITERION_LABELS[weakest]}</Text>
                <Text style={styles.weakSub}>
                  Average {Math.round((avgScores[weakest] / 20) * 100)}% — below your other criteria
                </Text>
              </View>
            )}

            {/* Department breakdown */}
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
  avgLabel: { width: 72, fontSize: Typography.caption, color: Colors.textSecondary },
  avgBarBg: { flex: 1, height: 8, backgroundColor: '#EDE9E3', borderRadius: 4, overflow: 'hidden' },
  avgBarFill: { height: '100%', borderRadius: 4 },
  avgPct: { width: 36, fontSize: Typography.caption, fontWeight: Typography.bold, textAlign: 'right' },
  weakCard: { backgroundColor: '#FFF8EC', borderLeftWidth: 4, borderLeftColor: Colors.gold },
  weakTitle: { fontSize: Typography.caption, fontWeight: Typography.bold, color: Colors.gold, textTransform: 'uppercase', letterSpacing: 0.8 },
  weakCriterion: { fontSize: Typography.heading, fontWeight: Typography.bold, color: Colors.navy },
  weakSub: { fontSize: Typography.caption, color: Colors.textSecondary },
  deptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deptLabel: { fontSize: Typography.caption, color: Colors.textSecondary, textTransform: 'capitalize' },
  deptCount: { fontSize: Typography.caption, fontWeight: Typography.bold, color: Colors.navy },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyEmoji: { fontSize: 60 },
  emptyTitle: { fontSize: Typography.heading, fontWeight: Typography.bold, color: Colors.navy },
  emptyText: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  chartEmpty: { alignItems: 'center', paddingVertical: Spacing.lg },
  chartEmptyText: { fontSize: Typography.caption, color: Colors.textMuted, fontStyle: 'italic' },
});
