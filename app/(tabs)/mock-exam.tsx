import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Purchases from 'react-native-purchases';
import { useAuthStore } from '@/stores/authStore';
import { getMockExamAttemptCount, getStudyPlanData } from '@/lib/today';
import { FORMAT_INFO } from '@/lib/mockExam/content';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { ExamFormat } from '@/types';

function PaywallCard({ onUnlock }: { onUnlock: () => void }) {
  return (
    <View style={styles.paywall}>
      <Text style={styles.paywallEmoji}>🔒</Text>
      <Text style={styles.paywallTitle}>Free limit reached</Text>
      <Text style={styles.paywallText}>
        You have used your 1 free mock exam. Unlock full access for unlimited exams,
        all 30+ scenarios, all vocab decks, and a personalised study plan.
      </Text>
      <TouchableOpacity style={styles.unlockBtn} onPress={onUnlock} activeOpacity={0.85}>
        <Text style={styles.unlockBtnText}>Unlock Full Access — €9.99</Text>
      </TouchableOpacity>
      <Text style={styles.paywallSub}>One-time purchase · No subscription</Text>
    </View>
  );
}

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
  const { user, setPremium } = useAuthStore();
  const [attemptCount, setAttemptCount] = useState<number | null>(null);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const format: ExamFormat = user?.examFormat ?? 'guided_dialogue';
  const freeLimit = !user?.isPremium && (attemptCount ?? 0) >= 1;

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

  async function handleUnlock() {
    setPurchasing(true);
    try {
      const result = await Purchases.purchaseProduct('spanish4hoteleros_full_access');
      if (result.customerInfo.entitlements.active['premium']) {
        setPremium(true);
      }
    } catch (e: any) {
      if (!e.userCancelled) Alert.alert('Purchase failed', e.message ?? 'Please try again.');
    } finally {
      setPurchasing(false);
    }
  }

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
        ) : freeLimit && !purchasing ? (
          <PaywallCard onUnlock={handleUnlock} />
        ) : (
          <>
            <FormatCard format={format} />

            {!user?.isPremium && (
              <View style={styles.freeNotice}>
                <Text style={styles.freeNoticeText}>
                  {attemptCount === 0
                    ? '1 free mock exam included'
                    : `${attemptCount} attempt${attemptCount !== 1 ? 's' : ''} completed`}
                </Text>
              </View>
            )}

            {purchasing ? (
              <ActivityIndicator style={{ marginTop: 40 }} color={Colors.gold} />
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
  examNotes: {
    backgroundColor: '#EEF3F9', borderRadius: Radii.lg, padding: Spacing.lg, gap: Spacing.sm,
  },
  notesTitle: { fontSize: Typography.caption, fontWeight: '700', color: Colors.navy, textTransform: 'uppercase', letterSpacing: 0.8 },
  notesText: { fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: 20 },
  paywall: {
    backgroundColor: Colors.surface, borderRadius: Radii.xl, padding: Spacing.xl,
    ...Shadows.md, marginTop: Spacing.lg, alignItems: 'center', gap: Spacing.md,
  },
  paywallEmoji: { fontSize: 48 },
  paywallTitle: { fontSize: Typography.heading, fontWeight: '700', color: Colors.navy },
  paywallText: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  unlockBtn: {
    backgroundColor: Colors.gold, borderRadius: Radii.lg,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, alignSelf: 'stretch', alignItems: 'center',
  },
  unlockBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.body },
  paywallSub: { fontSize: Typography.caption, color: Colors.textMuted },
});
