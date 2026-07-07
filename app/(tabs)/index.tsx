import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import {
  getDaysUntilExam, isFinalWeek, getStreak,
  getTodayChecked, toggleTile, getStudyPlanData, type StudyPlanData,
} from '@/lib/today';
import { SCENARIO_CATALOG } from '@/lib/scenarios/catalog';
import { DECK_CATALOG, loadDeckCards } from '@/lib/vocab/decks';
import { getDueCount } from '@/lib/db/vocab';
import StudyTile from '@/components/today/StudyTile';
import Skeleton from '@/components/Skeleton';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';

const CRITERION_LABELS: Record<string, string> = {
  fluency: 'Fluency', vocabulary: 'Vocabulary', grammar: 'Grammar',
  taskCompletion: 'Task Completion', register: 'Register',
};
const DRILL_SUBTITLES: Record<string, string> = {
  fluency:        '5 rapid-response prompts',
  vocabulary:     '5 hospitality vocabulary fill-ins',
  grammar:        '5 verb conjugation challenges',
  taskCompletion: '5 service scenario completions',
  register:       '5 usted-transformation prompts',
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
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [checked, setChecked] = useState<string[]>([]);
  const [planData, setPlanData] = useState<StudyPlanData | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [bestDeckId, setBestDeckId] = useState('front-office-basics');

  const days = getDaysUntilExam(user?.examDate);
  const finalWeek = isFinalWeek(user?.examDate);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [s, ch, plan] = await Promise.all([
        getStreak(),
        getTodayChecked(),
        getStudyPlanData(user!.id),
      ]);
      setStreak(s);
      setChecked(ch);
      setPlanData(plan);

      let totalDue = 0;
      let bestDeck = 'front-office-basics';
      let bestCount = 0;
      for (const deck of DECK_CATALOG) {
        if (!deck.isFree && !user!.isPremium) continue;
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
  }, [user?.id]);

  const handleCheck = useCallback(async (id: string) => {
    const next = await toggleTile(id);
    setChecked(next);
    const s = await getStreak();
    setStreak(s);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <TodaySkeleton />
      </SafeAreaView>
    );
  }

  const scenarioId = finalWeek
    ? (planData?.lowestScenarioId ?? planData?.weakestScenarioId ?? SCENARIO_CATALOG[0].id)
    : (planData?.weakestScenarioId ?? SCENARIO_CATALOG[0].id);
  const scenario = SCENARIO_CATALOG.find(s => s.id === scenarioId) ?? SCENARIO_CATALOG[0];
  const criterion = planData?.weakestCriterion ?? 'register';

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
          <View style={styles.headerRight}>
            {streak > 0 && (
              <View style={styles.streakBadge} accessibilityLabel={`${streak} day streak`}>
                <Text style={styles.streakFire}>🔥</Text>
                <Text style={styles.streakNum}>{streak}</Text>
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

        {/* Exam countdown */}
        <View
          style={[styles.countdownBar, finalWeek && styles.countdownFinalWeek]}
          accessibilityLabel={daysLabel(days)}
        >
          <Text style={styles.countdownText}>{daysLabel(days)}</Text>
          {finalWeek && <Text style={styles.finalWeekLabel}>Final week</Text>}
        </View>

        {finalWeek && (
          <View style={styles.calmCard}>
            <Text style={styles.calmTitle}>You're more ready than you think.</Text>
            <Text style={styles.calmText}>
              Focus on your weakest areas, run through the scenarios that felt hard,
              and trust everything you've already built. You've got this.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>
          {allChecked ? "Today's session complete ✓" : "Today's 15-minute session"}
        </Text>

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
          title={finalWeek ? `Retry: ${scenario.title}` : `Practice: ${scenario.title}`}
          subtitle={finalWeek
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  greeting: { fontSize: Typography.caption, color: Colors.textMuted },
  heading: { fontSize: Typography.title, fontWeight: '700', color: Colors.navy },
  gearIcon: { fontSize: 22, opacity: 0.6 },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF8EC', borderRadius: Radii.lg,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
  },
  streakFire: { fontSize: 18 },
  streakNum: { fontSize: Typography.body, fontWeight: '700', color: Colors.gold },
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
  sectionTitle: {
    fontSize: Typography.caption, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm,
  },
  doneCard: {
    backgroundColor: '#F0FDF4', borderRadius: Radii.lg, padding: Spacing.md,
    marginTop: Spacing.sm, gap: 4, borderLeftWidth: 3, borderLeftColor: '#16A34A',
  },
  doneTitle: { fontSize: Typography.body, fontWeight: '700', color: '#15803D' },
  doneText: { fontSize: Typography.caption, color: '#16A34A' },
});
