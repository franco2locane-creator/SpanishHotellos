import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { DECK_CATALOG, DEPARTMENT_LABELS, loadDeckCards, type DeckMeta } from '@/lib/vocab/decks';
import { getDueCount } from '@/lib/db/vocab';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { Department } from '@/types';

// ── Department colour accents ─────────────────────────────────────────────────

const DEPT_COLORS: Record<Department, { bg: string; accent: string }> = {
  front_office: { bg: '#EBF3FB', accent: Colors.info },
  fnb:          { bg: '#FEF9EC', accent: Colors.warning },
  housekeeping: { bg: '#F0FDF4', accent: Colors.success },
  concierge:    { bg: '#FDF4FF', accent: '#8B5CF6' },
  events:       { bg: '#FFF7ED', accent: '#EA580C' },
  management:   { bg: '#F1F5F9', accent: '#475569' },
};

const DEPT_ICONS: Record<Department, string> = {
  front_office: '🏨', fnb: '🍽️', housekeeping: '🛏️',
  concierge: '🗝️', events: '🎊', management: '📋',
};

// ── Per-deck row ──────────────────────────────────────────────────────────────

type DeckRowProps = {
  deck: DeckMeta;
  dueCount: number | null;
  isPremium: boolean;
  onPress: () => void;
};

function DeckRow({ deck, dueCount, isPremium, onPress }: DeckRowProps) {
  const locked = !deck.isFree && !isPremium;
  const { bg, accent } = DEPT_COLORS[deck.department];

  return (
    <TouchableOpacity
      style={[styles.row, { opacity: locked ? 0.55 : 1 }]}
      onPress={locked ? undefined : onPress}
      activeOpacity={locked ? 1 : 0.8}
    >
      <View style={[styles.iconBox, { backgroundColor: bg }]}>
        <Text style={styles.icon}>{DEPT_ICONS[deck.department]}</Text>
      </View>

      <View style={styles.meta}>
        <Text style={styles.title}>{deck.title}</Text>
        <Text style={[styles.dept, { color: accent }]}>
          {DEPARTMENT_LABELS[deck.department]}
        </Text>
      </View>

      <View style={styles.right}>
        {locked ? (
          <Text style={styles.lock}>🔒</Text>
        ) : dueCount === null ? (
          <ActivityIndicator size="small" color={Colors.textMuted} />
        ) : dueCount > 0 ? (
          <View style={styles.dueBadge}>
            <Text style={styles.dueText}>{dueCount}</Text>
          </View>
        ) : (
          <Text style={styles.done}>✓</Text>
        )}
        <Text style={styles.cardCount}>{deck.cardCount} cards</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PracticeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [dueCounts, setDueCounts] = useState<Record<string, number | null>>({});

  useEffect(() => {
    if (!user) return;
    async function loadDueCounts() {
      for (const deck of DECK_CATALOG) {
        if (!deck.isFree && !user!.isPremium) continue;
        const cardIds = loadDeckCards(deck.id).map(c => c.id);
        const count = await getDueCount(user!.id, cardIds);
        setDueCounts(prev => ({ ...prev, [deck.id]: count }));
      }
    }
    loadDueCounts();
  }, [user?.id]);

  function handleDeckPress(deck: DeckMeta) {
    router.push(`/vocab/${deck.id}` as any);
  }

  const totalDue = Object.values(dueCounts).reduce<number>((s, n) => s + (n ?? 0), 0);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.heading}>Vocabulary</Text>
        {totalDue > 0 && (
          <Text style={styles.sub}>{totalDue} card{totalDue !== 1 ? 's' : ''} due today</Text>
        )}
      </View>

      <FlatList
        data={DECK_CATALOG}
        keyExtractor={d => d.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <DeckRow
            deck={item}
            dueCount={dueCounts[item.id] ?? (item.isFree || user?.isPremium ? null : -1)}
            isPremium={user?.isPremium ?? false}
            onPress={() => handleDeckPress(item)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F5F0' },
  header: { padding: Spacing.xl, paddingBottom: Spacing.md },
  heading: { fontSize: Typography.title, fontWeight: Typography.bold, color: Colors.navy },
  sub: { fontSize: Typography.body, color: Colors.gold, marginTop: 4, fontWeight: Typography.semibold },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  iconBox: {
    width: 52, height: 52, borderRadius: Radii.md,
    justifyContent: 'center', alignItems: 'center',
  },
  icon: { fontSize: 26 },
  meta: { flex: 1, gap: 2 },
  title: { fontSize: Typography.body, fontWeight: Typography.semibold, color: Colors.textPrimary },
  dept: { fontSize: Typography.caption, fontWeight: Typography.semibold },
  right: { alignItems: 'center', gap: 4 },
  lock: { fontSize: 20 },
  done: { fontSize: 20, color: Colors.success },
  dueBadge: {
    backgroundColor: Colors.gold, borderRadius: 12,
    minWidth: 24, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center',
  },
  dueText: { color: '#fff', fontSize: Typography.caption, fontWeight: Typography.bold },
  cardCount: { fontSize: Typography.caption, color: Colors.textMuted },
});
