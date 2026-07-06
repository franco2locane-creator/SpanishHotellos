import { useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFeedbackStore } from '@/stores/feedbackStore';
import { usePremium } from '@/hooks/usePremium';
import RadarChart from '@/components/feedback/RadarChart';
import CriterionCard from '@/components/feedback/CriterionCard';
import FixCard from '@/components/feedback/FixCard';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { RubricCriterion } from '@/types';

// ── Criterion display metadata ────────────────────────────────────────────────

const CRITERIA: { key: RubricCriterion; label: string; icon: string; color: string }[] = [
  { key: 'fluency',        label: 'Fluency',        icon: '🎙️', color: '#EBF3FB' },
  { key: 'vocabulary',     label: 'Vocabulary',     icon: '📖', color: '#FEF9EC' },
  { key: 'grammar',        label: 'Grammar',        icon: '✏️', color: '#F0FDF4' },
  { key: 'taskCompletion', label: 'Task Completion', icon: '✅', color: '#FDF4FF' },
  { key: 'register',       label: 'Register',       icon: '👔', color: '#FFF7ED' },
];

function scoreLabel(pct: number): string {
  if (pct >= 85) return 'Excellent';
  if (pct >= 70) return 'Good';
  if (pct >= 55) return 'Developing';
  return 'Needs Work';
}

function scoreColor(pct: number): string {
  if (pct >= 85) return '#16A34A';
  if (pct >= 70) return '#CA8A04';
  return '#DC2626';
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function FeedbackScreen() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const router = useRouter();
  const { result, passMark, clear } = useFeedbackStore();
  const isPremium = usePremium();

  // Clear the store when leaving so memory isn't held.
  useEffect(() => () => { clear(); }, []);

  if (!result) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator style={{ flex: 1 }} color={Colors.navy} />
      </SafeAreaView>
    );
  }

  const pct = Math.round((result.totalScore / 20) * 100);
  const label = scoreLabel(pct);
  const color = scoreColor(pct);

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/practice')} hitSlop={12}>
          <Text style={styles.back}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Feedback</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Score ring + label */}
        <View style={styles.scoreBlock}>
          <View style={[styles.scoreRing, { borderColor: color }]}>
            <Text style={[styles.scorePct, { color }]}>{pct}</Text>
            <Text style={styles.scoreOf}>/100</Text>
          </View>
          <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
          {passMark !== null && (
            <View style={[styles.passBadge, { backgroundColor: pct >= passMark ? '#DCFCE7' : '#FEE2E2' }]}>
              <Text style={[styles.passBadgeText, { color: pct >= passMark ? '#15803D' : '#DC2626' }]}>
                {pct >= passMark ? '✓ PASS' : '✗ FAIL'} · Pass mark: {passMark}/100
              </Text>
            </View>
          )}
          <Text style={styles.feedback}>{result.feedback}</Text>
        </View>

        {/* Radar chart */}
        <View style={styles.chartWrap}>
          <RadarChart scores={result.numericScores} />
        </View>

        {/* Per-criterion breakdown */}
        <Text style={styles.sectionTitle}>Breakdown</Text>
        {CRITERIA.map(c => (
          <CriterionCard
            key={c.key}
            label={c.label}
            icon={c.icon}
            detail={result.detail[c.key]}
            color={c.color}
          />
        ))}

        {/* Top 3 fix cards */}
        {result.topThingsFix.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Top 3 Things to Fix</Text>
            {result.topThingsFix.slice(0, 3).map((item, i) => (
              <FixCard key={i} item={item} rank={(i + 1) as 1 | 2 | 3} />
            ))}
          </>
        )}

        {/* Upgrade prompt — shown after mock exam for free users */}
        {passMark !== null && !isPremium && (
          <TouchableOpacity
            style={styles.upgradeCard}
            onPress={() => router.push((`/paywall?score=${pct}`) as any)}
            activeOpacity={0.85}
          >
            <View style={styles.upgradeTextWrap}>
              <Text style={styles.upgradeTitle}>Unlock unlimited practice</Text>
              <Text style={styles.upgradeSub}>
                30+ scenarios · 6 vocab decks · unlimited exams
              </Text>
            </View>
            <Text style={styles.upgradeArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Back to Practice */}
        <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(tabs)/practice')}>
          <Text style={styles.doneBtnText}>Back to Practice</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F5F0' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.navy,
  },
  back: { fontSize: 20, color: '#fff' },
  headerTitle: { fontSize: Typography.body, fontWeight: Typography.semibold, color: '#fff' },
  content: { padding: Spacing.lg, paddingBottom: 60 },
  scoreBlock: { alignItems: 'center', marginBottom: Spacing.xl },
  scoreRing: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 6, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.surface, ...Shadows.md,
    flexDirection: 'row', gap: 2,
  },
  scorePct: { fontSize: 34, fontWeight: Typography.bold },
  scoreOf: { fontSize: 14, color: Colors.textMuted, alignSelf: 'flex-end', marginBottom: 8 },
  scoreLabel: { fontSize: Typography.heading, fontWeight: Typography.bold, marginTop: Spacing.sm },
  passBadge: {
    borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: 6, marginTop: Spacing.sm,
  },
  passBadgeText: { fontSize: Typography.body, fontWeight: '700' },
  feedback: {
    fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center',
    lineHeight: 22, marginTop: Spacing.sm, paddingHorizontal: Spacing.md,
  },
  chartWrap: { alignItems: 'center', marginVertical: Spacing.lg },
  sectionTitle: {
    fontSize: Typography.caption, fontWeight: Typography.bold,
    color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  upgradeCard: {
    marginTop: Spacing.lg, backgroundColor: Colors.gold, borderRadius: Radii.lg,
    padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
  upgradeTextWrap: { flex: 1 },
  upgradeTitle: { fontSize: Typography.body, fontWeight: '700', color: '#fff' },
  upgradeSub: { fontSize: Typography.caption, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  upgradeArrow: { fontSize: 20, color: '#fff', fontWeight: '700' },
  doneBtn: {
    marginTop: Spacing.md, backgroundColor: Colors.navy, borderRadius: Radii.lg,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontWeight: Typography.semibold, fontSize: Typography.body },
});
