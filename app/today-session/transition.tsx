import { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGuidedSessionStore, GUIDED_STEP_ORDER, type GuidedStepId, type GuidedStepParams } from '@/stores/guidedSessionStore';
import { Colors, Spacing, Typography } from '@/lib/theme';

const STEP_ROUTE: Record<GuidedStepId, (p: GuidedStepParams) => string> = {
  vocab: p => `/vocab/${p.deckId}?guided=1`,
  scenario: p => `/roleplay/${p.scenarioId}?guided=1`,
  drill: p => `/drill/${p.drillType}?guided=1`,
};

const ENCOURAGEMENT: Record<GuidedStepId, string> = {
  vocab: "Let's warm up",
  scenario: 'Nice pace — time to talk',
  drill: 'Almost there — last one',
};

const AUTO_ADVANCE_MS = 1200;

export default function TransitionScreen() {
  const { next } = useLocalSearchParams<{ next: GuidedStepId }>();
  const router = useRouter();
  const params = useGuidedSessionStore(s => s.params);
  const currentIndex = useGuidedSessionStore(s => s.currentIndex);

  function goNext() {
    if (!next || !STEP_ROUTE[next]) {
      router.replace('/(tabs)' as any);
      return;
    }
    router.replace(STEP_ROUTE[next](params) as any);
  }

  useEffect(() => {
    const t = setTimeout(goNext, AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next]);

  const stepLabel = `Step ${currentIndex + 1} of ${GUIDED_STEP_ORDER.length}`;

  return (
    <SafeAreaView style={styles.screen}>
      <TouchableOpacity
        style={styles.wrap}
        activeOpacity={0.9}
        onPress={goNext}
        accessibilityRole="button"
        accessibilityLabel="Continue to the next step"
      >
        <Text style={styles.step}>{stepLabel}</Text>
        <Text style={styles.encouragement}>{next ? ENCOURAGEMENT[next] : 'Nice pace'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.navy },
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  step: { fontSize: Typography.caption, fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1.5 },
  encouragement: { fontSize: Typography.title, fontWeight: '800', color: '#fff', textAlign: 'center' },
});
