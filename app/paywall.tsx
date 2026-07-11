import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { usePremium } from '@/hooks/usePremium';
import { purchasePremium, restorePurchasesFlow, mirrorPremiumToDb } from '@/lib/purchases';
import { getCatalogSummary } from '@/lib/premiumGating';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

// ── Feature comparison data ───────────────────────────────────────────────────
// Every number here is derived from the real content catalog at runtime — never
// hand-typed — so this can't drift out of sync with what premium actually unlocks.

function buildFeatureLists() {
  const { scenarioCount, freeScenarioCount, deckCount, mockCount, grammarDrillSetCount } = getCatalogSummary();

  const freeFeatures = [
    `${freeScenarioCount} role-play scenarios`,
    '1 vocab deck (Front Office)',
    '1 mock exam attempt',
  ];

  const premiumFeatures = [
    `All ${scenarioCount} role-play scenarios`,
    `All ${deckCount} vocabulary decks`,
    `All ${mockCount} mock exams — unlimited attempts`,
    `All ${grammarDrillSetCount} grammar drills`,
    'Your daily 15-minute practice session',
    'Final-week mode',
    'Full progress analytics',
  ];

  return { freeFeatures, premiumFeatures };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FeatureRow({ text, checked }: { text: string; checked: boolean }) {
  return (
    <View style={styles.featureRow}>
      <Text style={[styles.featureTick, { color: checked ? Colors.gold : Colors.textMuted }]}>
        {checked ? '✓' : '✗'}
      </Text>
      <Text style={[styles.featureText, !checked && styles.featureTextMuted]}>{text}</Text>
    </View>
  );
}

// ── Celebration overlay ───────────────────────────────────────────────────────

function CelebrationOverlay({ onDismiss }: { onDismiss: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    const t = setTimeout(onDismiss, 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={[styles.celebration, { opacity }]}>
      <Text style={styles.celebEmoji}>🎉</Text>
      <Text style={styles.celebTitle}>You're premium!</Text>
      <Text style={styles.celebSub}>All content is now unlocked. ¡Buena suerte!</Text>
    </Animated.View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const router = useRouter();
  const { score } = useLocalSearchParams<{ score?: string }>();
  const { user, setPremium } = useAuthStore();
  const { purchaseStatus, errorMessage, setPurchaseStatus, resetStatus } = usePurchaseStore();
  const isPremium = usePremium();
  const [restoring, setRestoring] = useState(false);
  const { freeFeatures, premiumFeatures } = buildFeatureLists();

  const scoreNum = score ? parseInt(score, 10) : null;
  const isLoading = purchaseStatus === 'loading';

  // If the user is already premium, dismiss immediately
  useEffect(() => {
    if (isPremium) router.canGoBack() ? router.back() : router.replace('/(tabs)' as any);
  }, [isPremium]);

  // Reset purchase status on unmount so stale state doesn't persist
  useEffect(() => () => { resetStatus(); }, []);

  function handleSuccess() {
    setPremium(true);
    if (user?.id) mirrorPremiumToDb(user.id);
    setPurchaseStatus('success');
  }

  async function handlePurchase() {
    setPurchaseStatus('loading');
    const result = await purchasePremium();
    if (result.outcome === 'success') {
      handleSuccess();
    } else if (result.outcome === 'cancelled') {
      resetStatus(); // silent
    } else {
      setPurchaseStatus(result.outcome, result.errorMessage);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    const result = await restorePurchasesFlow();
    setRestoring(false);
    if (result.outcome === 'success') {
      handleSuccess();
    } else {
      setPurchaseStatus('error', result.errorMessage);
    }
  }

  if (purchaseStatus === 'success') {
    return <CelebrationOverlay onDismiss={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} hitSlop={12} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Score context — shown when navigating from mock exam feedback */}
        {scoreNum !== null && (
          <View style={styles.scoreBanner}>
            <Text style={styles.scoreBannerLabel}>Your mock exam result</Text>
            <Text style={styles.scoreBannerScore}>{scoreNum}/100</Text>
            <Text style={styles.scoreBannerText}>
              {scoreNum >= 60
                ? 'You passed — now build on that with unlimited practice.'
                : 'Keep practising — each session sharpens your Spanish.'}
            </Text>
          </View>
        )}

        {/* Headline */}
        <Text style={styles.headline}>Unlock Spanish4Hoteleros</Text>
        <Text style={styles.subheadline}>
          Everything you need to pass your hospitality Spanish oral exam.
        </Text>

        {/* Feature comparison */}
        <View style={styles.comparisonRow}>
          {/* Free column */}
          <View style={[styles.column, styles.columnFree]}>
            <Text style={styles.columnTitle}>Free</Text>
            {freeFeatures.map(f => <FeatureRow key={f} text={f} checked={false} />)}
          </View>

          {/* Premium column */}
          <View style={[styles.column, styles.columnPremium]}>
            <View style={styles.premiumBadge}><Text style={styles.premiumBadgeText}>Premium</Text></View>
            {premiumFeatures.map(f => <FeatureRow key={f} text={f} checked />)}
          </View>
        </View>

        {/* Error / pending banners */}
        {purchaseStatus === 'error' && errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}
        {purchaseStatus === 'pending' && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingText}>
              Purchase pending — you will be notified once it is approved.
              No action needed right now.
            </Text>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, isLoading && styles.ctaBtnDisabled]}
          onPress={handlePurchase}
          activeOpacity={0.85}
          disabled={isLoading || restoring}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.ctaBtnText}>Unlock Full Access</Text>
              <Text style={styles.ctaPrice}>€9.99 one-time</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.ctaNote}>One-time purchase · No subscription · Works offline</Text>

        {/* Restore */}
        <TouchableOpacity
          onPress={handleRestore}
          disabled={isLoading || restoring}
          style={styles.restoreBtn}
          hitSlop={12}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={Colors.textMuted} />
          ) : (
            <Text style={styles.restoreText}>Restore previous purchase</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.legalNote}>
          Payment charged to your App Store account at confirmation. Non-consumable purchase — buy once, use on all your devices.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F5F0' },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, alignItems: 'flex-end' },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 20, color: Colors.textSecondary },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 60 },

  scoreBanner: {
    backgroundColor: Colors.navy, borderRadius: Radii.lg, padding: Spacing.lg,
    alignItems: 'center', marginBottom: Spacing.lg, gap: 4,
  },
  scoreBannerLabel: { fontSize: Typography.caption, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 },
  scoreBannerScore: { fontSize: Typography.display + 8, fontWeight: '700', color: Colors.gold, lineHeight: 48 },
  scoreBannerText: { fontSize: Typography.body, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20 },

  headline: { fontSize: Typography.heading, fontWeight: '700', color: Colors.navy, textAlign: 'center', marginBottom: 6 },
  subheadline: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },

  comparisonRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  column: { flex: 1, borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.sm },
  columnFree: { backgroundColor: Colors.surface, ...Shadows.sm },
  columnPremium: { backgroundColor: Colors.navy },
  columnTitle: { fontSize: Typography.caption, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  premiumBadge: { backgroundColor: Colors.gold, borderRadius: Radii.sm, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  premiumBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },

  featureRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  featureTick: { fontSize: 13, fontWeight: '700', width: 16, marginTop: 1 },
  featureText: { flex: 1, fontSize: Typography.caption, color: '#fff', lineHeight: 18 },
  featureTextMuted: { color: Colors.textSecondary },

  errorBanner: { backgroundColor: '#FEE2E2', borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.md },
  errorText: { fontSize: Typography.caption, color: '#DC2626', lineHeight: 18 },
  pendingBanner: { backgroundColor: '#FFF8EC', borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.gold },
  pendingText: { fontSize: Typography.caption, color: Colors.warning, lineHeight: 18 },

  ctaBtn: {
    backgroundColor: Colors.gold, borderRadius: Radii.lg,
    paddingVertical: Spacing.md, alignItems: 'center',
    marginBottom: Spacing.sm, ...Shadows.md, minHeight: 54, justifyContent: 'center',
  },
  ctaBtnDisabled: { opacity: 0.6 },
  ctaBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.bodyLarge },
  ctaPrice: { color: 'rgba(255,255,255,0.85)', fontSize: Typography.caption, marginTop: 2 },
  ctaNote: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginBottom: Spacing.lg },

  restoreBtn: { alignSelf: 'center', paddingVertical: Spacing.sm, marginBottom: Spacing.lg },
  restoreText: { fontSize: Typography.caption, color: Colors.navy, textDecorationLine: 'underline' },

  legalNote: { fontSize: 10, color: Colors.textMuted, textAlign: 'center', lineHeight: 14 },

  // Celebration overlay
  celebration: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#15803D',
    justifyContent: 'center', alignItems: 'center', gap: Spacing.md,
  },
  celebEmoji: { fontSize: 72 },
  celebTitle: { fontSize: Typography.heading, fontWeight: '700', color: '#fff' },
  celebSub: { fontSize: Typography.body, color: 'rgba(255,255,255,0.85)', textAlign: 'center', paddingHorizontal: Spacing.xl },
});
