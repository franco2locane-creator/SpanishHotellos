import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { usePremium } from '@/hooks/usePremium';
import { useMockExamStore } from '@/stores/mockExamStore';
import { getMockList } from '@/lib/mockExam/loader';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { MockExamData, MockLevel } from '@/types';

const ASSIGNMENT_ICONS: Record<string, string> = {
  personal_presentation: '🎤',
  checkin: '🏨',
  restaurant: '🍽️',
  hotel_presentation: '🏛️',
  job_interview: '💼',
  complaint: '😤',
  saying_no: '🚫',
};

function MockCard({ mock, onStart, locked }: { mock: MockExamData; onStart: () => void; locked: boolean }) {
  const types = mock.assignments.map(a => ASSIGNMENT_ICONS[a.type] ?? '📋').join(' ');
  const levelLabel = mock.level === 'basic' ? 'Basic' : 'Intermediate';

  return (
    <TouchableOpacity
      style={[styles.mockCard, locked && styles.mockCardLocked]}
      onPress={onStart}
      activeOpacity={0.8}
      disabled={false}
    >
      <View style={styles.mockCardTop}>
        <View style={styles.mockMeta}>
          <Text style={styles.mockTitle}>{levelLabel} Mock {mock.number}</Text>
          <Text style={styles.mockSub}>{mock.assignments.length} assignments · {mock.source === 'transcribed' ? 'From your exam pack' : 'Practice exam'}</Text>
        </View>
        {locked ? (
          <Text style={styles.lockIcon}>🔒</Text>
        ) : (
          <Text style={styles.playIcon}>▶</Text>
        )}
      </View>
      <Text style={styles.mockTypes}>{types}</Text>
    </TouchableOpacity>
  );
}

export default function MockExamScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isPremium = usePremium();
  const { startExam } = useMockExamStore();
  const [mocks, setMocks] = useState<MockExamData[]>([]);
  const [loading, setLoading] = useState(true);

  const level: MockLevel = user?.mockLevel ?? 'basic';

  useEffect(() => {
    const list = getMockList(level, isPremium);
    setMocks(list);
    setLoading(false);
  }, [level, isPremium]);

  function handleStart(mock: MockExamData) {
    const isFirstMock = mock.number === 1;
    const isFreeAllowed = isFirstMock || isPremium;

    if (!isFreeAllowed) {
      router.push('/paywall' as any);
      return;
    }

    startExam(mock);
    router.push(`/exam/prep?mockId=${mock.id}&assignmentIdx=0` as any);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.heading}>Mock Exams</Text>
            <Text style={styles.sub}>Real exam conditions — no hints, no retries.</Text>
          </View>
          <View style={[styles.levelBadge, level === 'intermediate' && styles.levelBadgeInt]}>
            <Text style={styles.levelBadgeText}>{level === 'basic' ? 'Basic' : 'Intermediate'}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 60 }} color={Colors.navy} />
        ) : (
          <>
            {!isPremium && (
              <View style={styles.freeNotice}>
                <Text style={styles.freeNoticeText}>
                  Free plan: Mock {level === 'basic' ? 'Basic' : 'Intermediate'} 1 included.{' '}
                  Upgrade to unlock all {mocks.length > 1 ? mocks.length : 10} exams.
                </Text>
              </View>
            )}

            {mocks.map((mock) => {
              const locked = !isPremium && mock.number !== 1;
              return (
                <MockCard
                  key={mock.id}
                  mock={mock}
                  locked={locked}
                  onStart={() => handleStart(mock)}
                />
              );
            })}

            {!isPremium && (
              <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/paywall' as any)} activeOpacity={0.85}>
                <Text style={styles.upgradeBtnText}>🔒  Unlock All Exams — €9.99</Text>
              </TouchableOpacity>
            )}

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>How mock exams work</Text>
              <Text style={styles.infoText}>
                {'• 2-min prep time with reference card\n'}
                {'• 5-word keyword notepad allowed\n'}
                {'• Role-play with AI guest — usted required\n'}
                {'• Graded on 5 criteria: fluency, vocab, grammar, task, register\n'}
                {'• Pass mark: 60/100'}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 60 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.lg },
  heading: { fontSize: Typography.title, fontWeight: Typography.bold, color: Colors.navy, marginBottom: 2 },
  sub: { fontSize: Typography.body, color: Colors.textSecondary },
  levelBadge: {
    backgroundColor: Colors.navy, borderRadius: Radii.full,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
  },
  levelBadgeInt: { backgroundColor: Colors.gold },
  levelBadgeText: { color: '#fff', fontWeight: Typography.bold, fontSize: Typography.caption },
  freeNotice: { backgroundColor: '#FFF8EC', borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.md },
  freeNoticeText: { fontSize: Typography.caption, color: Colors.gold, lineHeight: 18 },
  mockCard: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg,
    marginBottom: Spacing.md, ...Shadows.sm, gap: Spacing.sm,
  },
  mockCardLocked: { opacity: 0.65 },
  mockCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mockMeta: { flex: 1 },
  mockTitle: { fontSize: Typography.body, fontWeight: Typography.bold, color: Colors.navy },
  mockSub: { fontSize: Typography.caption, color: Colors.textMuted, marginTop: 2 },
  lockIcon: { fontSize: 20 },
  playIcon: { fontSize: 18, color: Colors.navy, fontWeight: Typography.bold },
  mockTypes: { fontSize: 22, letterSpacing: 4 },
  upgradeBtn: {
    backgroundColor: Colors.gold, borderRadius: Radii.lg, paddingVertical: Spacing.md,
    alignItems: 'center', marginBottom: Spacing.lg, marginTop: Spacing.sm,
  },
  upgradeBtnText: { color: '#fff', fontWeight: Typography.bold, fontSize: Typography.body },
  infoBox: { backgroundColor: '#EEF3F9', borderRadius: Radii.lg, padding: Spacing.lg },
  infoTitle: {
    fontSize: Typography.caption, fontWeight: Typography.bold, color: Colors.navy,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm,
  },
  infoText: { fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: 20 },
});
