import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { usePremium } from '@/hooks/usePremium';
import { drillsForLevel, type DrillMeta } from '@/lib/grammar/drills';
import { getGrammarDrillBest, type GrammarDrillBest } from '@/lib/grammar/progress';
import { formatBestBadge } from '@/lib/formatBest';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

function DrillRow({ d, best, isPremium, onPress, onPaywall }: { d: DrillMeta; best: GrammarDrillBest | undefined; isPremium: boolean; onPress: () => void; onPaywall: () => void }) {
  const locked = !d.isFree && !isPremium;
  return (
    <TouchableOpacity
      style={[styles.row, locked && styles.rowLocked]}
      onPress={locked ? onPaywall : onPress}
      activeOpacity={0.8}
    >
      <View style={styles.rowIcon}>
        <Text style={{ fontSize: 20 }}>✏️</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{d.title}</Text>
        <Text style={styles.rowSub}>{d.titleEs} · {d.questionCount} questions</Text>
        {best && (
          <Text style={styles.bestBadge}>{formatBestBadge(best.bestAccuracy, best.bestCompletionSeconds)}</Text>
        )}
      </View>
      {locked ? (
        <Text style={styles.lockIcon}>🔒</Text>
      ) : d.isFree ? (
        <View style={styles.freeBadge}><Text style={styles.freeBadgeText}>Free</Text></View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function GrammarIndex() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isPremium = usePremium();
  const level = user?.mockLevel ?? 'basic';
  const drills = drillsForLevel(level);
  const [bests, setBests] = useState<Record<string, GrammarDrillBest>>({});

  useEffect(() => {
    if (!user) return;
    async function loadBests() {
      for (const d of drills) {
        if (!d.isFree && !isPremium) continue;
        const best = await getGrammarDrillBest(user!.id, d.id);
        if (best) setBests(prev => ({ ...prev, [d.id]: best }));
      }
    }
    loadBests();
  }, [user?.id, level]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/practice' as any)} hitSlop={12}>
          <Text style={styles.back}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gramática</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Timed conjugation drills built from exam-relevant grammar. Type or speak your answer —
          wrong answers come back later in the same session.
        </Text>
        {drills.map(d => (
          <DrillRow
            key={d.id}
            d={d}
            best={bests[d.id]}
            isPremium={isPremium}
            onPress={() => router.push(`/grammar/${d.id}` as any)}
            onPaywall={() => router.push('/paywall' as any)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.navy,
  },
  back: { fontSize: 20, color: '#fff' },
  headerTitle: { fontSize: Typography.body, fontWeight: Typography.semibold, color: '#fff' },
  content: { padding: Spacing.lg, paddingBottom: 60 },
  intro: { fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: 18, marginBottom: Spacing.lg },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm,
  },
  rowLocked: { opacity: 0.58 },
  rowIcon: {
    width: 40, height: 40, borderRadius: Radii.md, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  rowTitle: { fontSize: Typography.body, fontWeight: Typography.semibold, color: Colors.textPrimary },
  rowSub: { fontSize: Typography.caption, color: Colors.textMuted, marginTop: 2 },
  bestBadge: { fontSize: 11, color: Colors.gold, fontWeight: Typography.semibold, marginTop: 2 },
  lockIcon: { fontSize: 18 },
  freeBadge: { backgroundColor: Colors.gold, borderRadius: Radii.sm, paddingHorizontal: 6, paddingVertical: 2 },
  freeBadgeText: { color: '#fff', fontSize: 10, fontWeight: Typography.bold },
});
