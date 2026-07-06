import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { usePremium } from '@/hooks/usePremium';
import { getMockExamAttemptCount, getStudyPlanData } from '@/lib/today';
import { FORMAT_INFO } from '@/lib/mockExam/content';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { ExamFormat } from '@/types';

function FormatCard({ format }: { format: ExamFormat }) {
  const info = FORMAT_INFO[format];
  return (
    <View style={styles.formatCard}>
      <View style={styles.formatHeader}>
        <Text style={styles.formatIcon}>{info.icon}</Text>
        <View>
          <Text style={styles.formatLabel}>{info.label}</Text>
          <Text style={styles.formatDuration}>{info.duration}</Text>
        </View>
      </View>
      <View style={styles.rulesList}>
        {info.rules.map((r, i) => (
          <Text key={i} style={styles.ruleItem}>• {r}</Text>
        ))}
      </View>
    </View>
  );
}

export default function MockExamScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isPremium = usePremium();
  const [attemptCount, setAttemptCount] = useState<number | null>(null);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const format: ExamFormat = user?.examFormat ?? 'guided_dialogue';
  const freeLimit = !isPremium && (attemptCount ?? 0) >= 1;

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getMockExamAttemptCount(user.id),
      getStudyPlanData(user.id),
    ]).then(([count, plan]) => {
      setAttemptCount(count);
      setScenarioId(plan.weakestScenarioId);
      setLoading(false);
    });
  }, [user?.id]);

  function startExam() {
    const params: Record<string, string> = { format };
    if (format === 'guided_dialogue' && scenarioId) params.scenarioId = scenarioId;
    const query = new URLSearchParams(params).toString();
    router.push(('/exam/session?' + query) as any);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Mock Exam</Text>
        <Text style={styles.sub}>Simulated real exam conditions — no hints, no retries.</Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 60 }} color={Colors.navy} />
        ) : (
          <>
            <FormatCard format={format} />

            {!isPremium && (
              <View style={styles.freeNotice}>
                <Text style={styles.freeNoticeText}>
                  {attemptCount === 0
                    ? '1 free mock exam included'
                    : `${attemptCount} attempt${attemptCount !== 1 ? 's' : ''} completed`}
                </Text>
              </View>
            )}

            {freeLimit ? (
              <TouchableOpacity
                style={styles.unlockBtn}
                onPress={() => router.push('/paywall' as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.unlockBtnText}>🔒  Unlock Unlimited Exams</Text>
                <Text style={styles.unlockBtnSub}>€9.99 one-time · See what you get</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.startBtn} onPress={startExam} activeOpacity={0.85}>
                <Text style={styles.startBtnText}>Start Exam</Text>
              </TouchableOpacity>
            )}

            <View style={styles.examNotes}>
              <Text style={styles.notesTitle}>Exam conditions</Text>
              <Text style={styles.notesText}>
                {'• No pause — the clock runs once you start\n'}
                {'• Your transcript is hidden while speaking\n'}
                {'• AI grades on 5 criteria: fluency, vocab, grammar, task, register\n'}
                {'• PASS / FAIL estimate shown (threshold: 60/100)'}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F5F0' },
  content: { padding: Spacing.lg, paddingBottom: 60 },
  heading: { fontSize: Typography.title, fontWeight: '700', color: Colors.navy, marginBottom: 4 },
  sub: { fontSize: Typography.body, color: Colors.textSecondary, marginBottom: Spacing.lg },
  formatCard: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg,
    marginBottom: Spacing.md, ...Shadows.sm, gap: Spacing.md,
  },
  formatHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  formatIcon: { fontSize: 36 },
  formatLabel: { fontSize: Typography.body, fontWeight: '700', color: Colors.navy },
  formatDuration: { fontSize: Typography.caption, color: Colors.gold, fontWeight: '600' },
  rulesList: { gap: 4 },
  ruleItem: { fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  freeNotice: {
    backgroundColor: '#FFF8EC', borderRadius: Radii.md,
    padding: Spacing.sm, marginBottom: Spacing.md, alignItems: 'center',
  },
  freeNoticeText: { fontSize: Typography.caption, color: Colors.gold, fontWeight: '600' },
  startBtn: {
    backgroundColor: Colors.navy, borderRadius: Radii.lg,
    paddingVertical: Spacing.md, alignItems: 'center', marginBottom: Spacing.lg,
  },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.body },
  unlockBtn: {
    backgroundColor: Colors.gold, borderRadius: Radii.lg,
    paddingVertical: Spacing.md, alignItems: 'center', marginBottom: Spacing.lg, gap: 4,
  },
  unlockBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.body },
  unlockBtnSub: { color: 'rgba(255,255,255,0.8)', fontSize: Typography.caption },
  examNotes: {
    backgroundColor: '#EEF3F9', borderRadius: Radii.lg, padding: Spacing.lg, gap: Spacing.sm,
  },
  notesTitle: { fontSize: Typography.caption, fontWeight: '700', color: Colors.navy, textTransform: 'uppercase', letterSpacing: 0.8 },
  notesText: { fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: 20 },
});
