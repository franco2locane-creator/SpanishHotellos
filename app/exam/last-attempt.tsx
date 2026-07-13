import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import {
  getLastMockAttempt, getAssignmentFullFeedback,
  type MockAttemptSummary, type AssignmentFullFeedback,
} from '@/lib/mockLastAttempt';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

const ASSIGNMENT_LABELS: Record<string, string> = {
  personal_presentation: 'Personal Presentation',
  checkin: 'Check-in',
  restaurant: 'Restaurant',
  hotel_presentation: 'Hotel Presentation',
  job_interview: 'Job Interview',
  complaint: 'Complaint',
  saying_no: 'Saying No',
};

type AssignmentDisplay = {
  assignmentType: string;
  score: number | null;
  gatePassed: boolean | null;
  feedback: AssignmentFullFeedback | null;
};

export default function LastMockAttemptScreen() {
  const { mockId } = useLocalSearchParams<{ mockId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<MockAttemptSummary | null>(null);
  const [assignments, setAssignments] = useState<AssignmentDisplay[]>([]);

  useEffect(() => {
    if (!user || !mockId) return;
    let cancelled = false;
    async function load() {
      const result = await getLastMockAttempt(user!.id, mockId!);
      if (cancelled) return;
      setSummary(result);
      if (result) {
        const withFeedback = await Promise.all(result.assignmentResults.map(async a => ({
          assignmentType: a.assignmentType,
          score: a.score,
          gatePassed: a.gatePassed,
          feedback: a.examAttemptId ? await getAssignmentFullFeedback(a.examAttemptId) : null,
        })));
        if (!cancelled) setAssignments(withFeedback);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id, mockId]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/mock-exam' as any)} hitSlop={12}>
          <Text style={styles.back}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Last Attempt</Text>
        <View style={{ width: 20 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={Colors.navy} />
      ) : !summary ? (
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 48 }}>📊</Text>
          <Text style={styles.emptyText}>No completed attempt for this mock yet.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreVal}>{Math.round(summary.combinedScore)}/100</Text>
            <Text style={[styles.passLabel, { color: summary.passed ? Colors.success : Colors.error }]}>
              {summary.passed ? '✓ Passed' : '✗ Did not pass'}
              {!summary.gatePassed ? ' · register gate failed' : ''}
            </Text>
            <Text style={styles.completedAt}>{new Date(summary.completedAt).toLocaleDateString()}</Text>
          </View>

          {assignments.map((a, i) => (
            <View key={i} style={styles.assignmentCard}>
              <View style={styles.assignmentHeader}>
                <Text style={styles.assignmentTitle}>{ASSIGNMENT_LABELS[a.assignmentType] ?? a.assignmentType}</Text>
                <Text style={styles.assignmentScore}>{a.score !== null ? `${a.score}/100` : '—'}</Text>
              </View>
              {a.feedback ? (
                <>
                  <Text style={styles.assignmentFeedback}>{a.feedback.feedback}</Text>
                  {a.feedback.topThingsFix?.slice(0, 2).map((fix, j) => (
                    <Text key={j} style={styles.fixItem}>• {fix.label}</Text>
                  ))}
                </>
              ) : (
                <Text style={styles.assignmentFeedback}>No detailed feedback saved for this assignment.</Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F5F0' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.navy,
  },
  back: { fontSize: 20, color: '#fff' },
  headerTitle: { fontSize: Typography.body, fontWeight: Typography.semibold, color: '#fff' },
  content: { padding: Spacing.lg, paddingBottom: 60, gap: Spacing.md },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  emptyText: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  scoreCard: {
    alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.lg, ...Shadows.sm, gap: 4,
  },
  scoreVal: { fontSize: 36, fontWeight: Typography.bold, color: Colors.navy },
  passLabel: { fontSize: Typography.body, fontWeight: Typography.semibold },
  completedAt: { fontSize: Typography.caption, color: Colors.textMuted },
  assignmentCard: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg,
    ...Shadows.sm, gap: Spacing.xs,
  },
  assignmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assignmentTitle: { fontSize: Typography.body, fontWeight: Typography.bold, color: Colors.navy },
  assignmentScore: { fontSize: Typography.body, fontWeight: Typography.bold, color: Colors.gold },
  assignmentFeedback: { fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  fixItem: { fontSize: Typography.caption, color: Colors.textPrimary, marginTop: 2 },
});
