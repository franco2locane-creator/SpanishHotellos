import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { usePremium } from '@/hooks/usePremium';
import { scenariosForLevel, DEPT_LABELS, MOOD_ICONS, type ScenarioMeta } from '@/lib/scenarios/catalog';
import { decksForLevel, DEPARTMENT_LABELS, loadDeckCards, type DeckMeta } from '@/lib/vocab/decks';
import { drillsForLevel } from '@/lib/grammar/drills';
import { getDueCount } from '@/lib/db/vocab';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

// ── Difficulty dots ───────────────────────────────────────────────────────────

function DifficultyDots({ level }: { level: 1 | 2 | 3 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {([1, 2, 3] as const).map(n => (
        <View key={n} style={[styles.dot, n <= level && styles.dotFilled]} />
      ))}
    </View>
  );
}

// ── Scenario card ─────────────────────────────────────────────────────────────

function ScenarioCard({ s, isPremium, onPress, onPaywall }: { s: ScenarioMeta; isPremium: boolean; onPress: () => void; onPaywall: () => void }) {
  const locked = !s.isFree && !isPremium;
  const moodKey = s.personaPreview.split(' · ')[2]?.split(' ')[0] ?? 'neutral';

  return (
    <TouchableOpacity
      style={[styles.scenarioCard, locked && styles.lockedCard]}
      onPress={locked ? onPaywall : onPress}
      activeOpacity={0.8}
    >
      <View style={styles.row}>
        <Text style={styles.scenarioTitle} numberOfLines={1}>{s.title}</Text>
        {locked
          ? <Text style={styles.lockIcon}>🔒</Text>
          : s.isFree
          ? <View style={styles.freeBadge}><Text style={styles.freeBadgeText}>Free</Text></View>
          : null}
      </View>
      <Text style={styles.scenarioDesc} numberOfLines={2}>{s.description}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.deptLabel}>{DEPT_LABELS[s.department] ?? s.department}</Text>
        <Text style={styles.sep}>·</Text>
        <DifficultyDots level={s.difficulty} />
        <Text style={styles.sep}>·</Text>
        <Text style={styles.personaText} numberOfLines={1}>
          {MOOD_ICONS[moodKey]} {s.personaPreview}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Deck row ──────────────────────────────────────────────────────────────────

const DEPT_COLORS: Record<string, string> = {
  front_office: '#EBF3FB', fnb: '#FEF9EC', housekeeping: '#F0FDF4',
  concierge: '#FDF4FF', events: '#FFF7ED', management: '#F1F5F9',
};
const DEPT_ICONS: Record<string, string> = {
  front_office: '🏨', fnb: '🍽️', housekeeping: '🛏️',
  concierge: '🗝️', events: '🎊', management: '📋',
};

function DeckRow({ d, dueCount, isPremium, onPress, onPaywall }: { d: DeckMeta; dueCount: number | null; isPremium: boolean; onPress: () => void; onPaywall: () => void }) {
  const locked = !d.isFree && !isPremium;
  return (
    <TouchableOpacity
      style={[styles.deckRow, locked && styles.lockedCard]}
      onPress={locked ? onPaywall : onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.deckIcon, { backgroundColor: DEPT_COLORS[d.department] ?? '#F0EDE8' }]}>
        <Text style={{ fontSize: 20 }}>{DEPT_ICONS[d.department] ?? '📚'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.deckTitle}>{d.title}</Text>
        <Text style={styles.deckDept}>{DEPARTMENT_LABELS[d.department]}</Text>
      </View>
      {locked ? <Text style={styles.lockIcon}>🔒</Text>
        : dueCount === null ? <ActivityIndicator size="small" color={Colors.textMuted} />
        : dueCount > 0 ? (
          <View style={styles.dueBadge}><Text style={styles.dueText}>{dueCount}</Text></View>
        ) : <Text style={{ fontSize: 18, color: Colors.success }}>✓</Text>}
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PracticeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isPremium = usePremium();
  const [dueCounts, setDueCounts] = useState<Record<string, number | null>>({});

  const level = user?.mockLevel ?? 'basic';
  const scenarios = scenariosForLevel(level);
  const decks = decksForLevel(level);
  const drills = drillsForLevel(level);
  const freeDrillCount = drills.filter(d => d.isFree).length;

  useEffect(() => {
    if (!user) return;
    async function loadCounts() {
      for (const deck of decks) {
        if (!deck.isFree && !isPremium) continue;
        const ids = loadDeckCards(deck.id).map(c => c.id);
        const count = await getDueCount(user!.id, ids);
        setDueCounts(prev => ({ ...prev, [deck.id]: count }));
      }
    }
    loadCounts();
  }, [user?.id, level]);

  const totalDue = Object.values(dueCounts).reduce<number>((s, n) => s + (n ?? 0), 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.heading}>Practice</Text>
      </View>

      {/* Role-play scenarios */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Role-Play Scenarios</Text>
      </View>
      {scenarios.map(s => (
        <ScenarioCard
          key={s.id}
          s={s}
          isPremium={isPremium}
          onPress={() => router.push(`/roleplay/${s.id}` as any)}
          onPaywall={() => router.push('/paywall' as any)}
        />
      ))}

      {/* Grammar drills */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Gramática</Text>
      </View>
      <TouchableOpacity
        style={styles.grammarCard}
        onPress={() => router.push('/grammar' as any)}
        activeOpacity={0.8}
      >
        <View style={styles.grammarIcon}><Text style={{ fontSize: 20 }}>✏️</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.grammarTitle}>Timed conjugation drills</Text>
          <Text style={styles.grammarSub}>
            {drills.length} drill sets · {isPremium ? 'all unlocked' : `${freeDrillCount} free`}
          </Text>
        </View>
        <Text style={styles.grammarArrow}>→</Text>
      </TouchableOpacity>

      {/* Vocabulary decks */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Vocabulary{totalDue > 0 ? ` · ${totalDue} due today` : ''}
        </Text>
      </View>
      {decks.map(d => (
        <DeckRow
          key={d.id}
          d={d}
          dueCount={dueCounts[d.id] ?? (d.isFree || isPremium ? null : -1)}
          isPremium={isPremium}
          onPress={() => router.push(`/vocab/${d.id}` as any)}
          onPaywall={() => router.push('/paywall' as any)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F5F0' },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.sm },
  heading: { fontSize: Typography.title, fontWeight: Typography.bold, color: Colors.navy },
  sectionHeader: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  sectionTitle: { fontSize: Typography.caption, fontWeight: Typography.bold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lockedCard: { opacity: 0.58 },
  // Scenario
  scenarioCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.md, gap: Spacing.xs, ...Shadows.sm,
  },
  scenarioTitle: { fontSize: Typography.body, fontWeight: Typography.bold, color: Colors.navy, flex: 1 },
  scenarioDesc: { fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  deptLabel: { fontSize: Typography.caption, color: Colors.info, fontWeight: Typography.semibold },
  sep: { color: Colors.textMuted, fontSize: Typography.caption },
  personaText: { fontSize: Typography.caption, color: Colors.textSecondary, flexShrink: 1 },
  freeBadge: { backgroundColor: Colors.gold, borderRadius: Radii.sm, paddingHorizontal: 6, paddingVertical: 2 },
  freeBadgeText: { color: '#fff', fontSize: 10, fontWeight: Typography.bold },
  lockIcon: { fontSize: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0D8CE' },
  dotFilled: { backgroundColor: Colors.gold },
  // Deck
  deckRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.md, ...Shadows.sm,
  },
  deckIcon: { width: 44, height: 44, borderRadius: Radii.md, justifyContent: 'center', alignItems: 'center' },
  deckTitle: { fontSize: Typography.body, fontWeight: Typography.semibold, color: Colors.textPrimary },
  deckDept: { fontSize: Typography.caption, color: Colors.textMuted },
  dueBadge: { backgroundColor: Colors.gold, borderRadius: 10, minWidth: 22, paddingHorizontal: 5, paddingVertical: 2, alignItems: 'center' },
  dueText: { color: '#fff', fontSize: 11, fontWeight: Typography.bold },
  // Grammar
  grammarCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.md, ...Shadows.sm,
  },
  grammarIcon: { width: 44, height: 44, borderRadius: Radii.md, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  grammarTitle: { fontSize: Typography.body, fontWeight: Typography.semibold, color: Colors.textPrimary },
  grammarSub: { fontSize: Typography.caption, color: Colors.textMuted, marginTop: 2 },
  grammarArrow: { fontSize: 18, color: Colors.textMuted },
});
