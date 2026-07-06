import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

// ── Types ─────────────────────────────────────────────────────────────────────

type Params = {
  level: string;
  justification: string;
  examDate: string;
};

type LevelMeta = {
  label: string;
  tagline: string;
  minutesPerDay: number;
  color: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const LEVEL_META: Record<string, LevelMeta> = {
  A2: { label: 'A2 — Elementary', tagline: 'Building the foundations.', minutesPerDay: 20, color: '#2471A3' },
  B1: { label: 'B1 — Intermediate', tagline: 'Getting comfortable.', minutesPerDay: 15, color: '#2D7A4F' },
  B2: { label: 'B2 — Upper-Intermediate', tagline: 'Approaching fluency.', minutesPerDay: 12, color: '#B97D2A' },
  C1: { label: 'C1 — Advanced', tagline: 'Nearly exam-ready.', minutesPerDay: 10, color: Colors.navy },
};

function weeksUntil(isoDate: string): number {
  if (!isoDate) return 6;
  const ms = Date.parse(isoDate) - Date.now();
  return Math.max(1, Math.round(ms / (7 * 24 * 60 * 60 * 1000)));
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function Result() {
  const router = useRouter();
  const { setOnboardingComplete } = useAuthStore();
  const { level, justification, examDate } = useLocalSearchParams<Params>();

  const meta = LEVEL_META[level] ?? LEVEL_META.B1;
  const weeks = weeksUntil(examDate ?? '');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.step}>Step 3 of 3 — Your result</Text>

        {/* Level badge */}
        <View style={[styles.badge, { borderColor: meta.color }]}>
          <Text style={[styles.badgeLevel, { color: meta.color }]}>{level}</Text>
          <Text style={styles.badgeLabel}>{meta.label}</Text>
          <Text style={styles.badgeTagline}>{meta.tagline}</Text>
        </View>

        {/* Justification */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What the examiner noted</Text>
          <Text style={styles.cardBody}>{justification}</Text>
        </View>

        {/* Study plan */}
        <View style={[styles.card, styles.planCard]}>
          <Text style={styles.cardTitle}>Your study plan</Text>
          <View style={styles.planRow}>
            <View style={styles.planStat}>
              <Text style={styles.statNum}>{weeks}</Text>
              <Text style={styles.statLabel}>{weeks === 1 ? 'week' : 'weeks'} until exam</Text>
            </View>
            <View style={styles.planDivider} />
            <View style={styles.planStat}>
              <Text style={styles.statNum}>{meta.minutesPerDay}</Text>
              <Text style={styles.statLabel}>minutes per day</Text>
            </View>
          </View>
          <Text style={styles.planHint}>
            Daily role-plays + vocab review will get you exam-ready in time.
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => { setOnboardingComplete(); router.replace('/(tabs)'); }}
        >
          <Text style={styles.ctaText}>Start practising</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  step: { fontSize: Typography.caption, color: Colors.gold, fontWeight: Typography.semibold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.lg },
  badge: {
    alignItems: 'center',
    borderWidth: 3,
    borderRadius: Radii.xl,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    ...Shadows.md,
  },
  badgeLevel: { fontSize: 72, fontWeight: Typography.bold, lineHeight: 80 },
  badgeLabel: { fontSize: Typography.subtitle, fontWeight: Typography.semibold, color: Colors.textPrimary, marginTop: Spacing.xs },
  badgeTagline: { fontSize: Typography.body, color: Colors.textSecondary, marginTop: Spacing.xs },
  card: { backgroundColor: Colors.surface, borderRadius: Radii.md, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm },
  planCard: { backgroundColor: Colors.navy },
  cardTitle: { fontSize: Typography.caption, fontWeight: Typography.semibold, color: Colors.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardBody: { fontSize: Typography.body, color: Colors.textPrimary, lineHeight: 24 },
  planRow: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md },
  planStat: { flex: 1, alignItems: 'center' },
  planDivider: { width: 1, height: 48, backgroundColor: 'rgba(255,255,255,0.2)' },
  statNum: { fontSize: Typography.display, fontWeight: Typography.bold, color: Colors.gold },
  statLabel: { fontSize: Typography.caption, color: Colors.textOnDark, opacity: 0.8, textAlign: 'center', marginTop: Spacing.xs },
  planHint: { fontSize: Typography.body, color: Colors.textOnDark, opacity: 0.75, lineHeight: 22 },
  ctaBtn: { backgroundColor: Colors.gold, borderRadius: Radii.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  ctaText: { color: Colors.textOnGold, fontSize: Typography.bodyLarge, fontWeight: Typography.bold },
});
