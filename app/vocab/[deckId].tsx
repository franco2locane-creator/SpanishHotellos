import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { loadDeck } from '@/lib/vocab/decks';
import {
  getDueCardIds, getCardProgress, upsertCardProgress, logReview, syncDirtyToSupabase,
} from '@/lib/db/vocab';
import { nextSrsState, INITIAL_SRS, type SrsGrade } from '@/lib/srs';
import { assignModes, pickRecycleMode, generateMcqOptions, type FlashcardMode } from '@/lib/vocab/flashcardModes';
import { guidedNextRoute } from '@/lib/guidedSession';
import { useGuidedSessionStore } from '@/stores/guidedSessionStore';
import McqQuestion from '@/components/vocab/McqQuestion';
import TypedQuestion from '@/components/vocab/TypedQuestion';
import ListeningQuestion from '@/components/vocab/ListeningQuestion';
import SpeakQuestion from '@/components/vocab/SpeakQuestion';
import WrongAnswerReveal from '@/components/vocab/WrongAnswerReveal';
import SessionDots, { type DotState } from '@/components/vocab/SessionDots';
import GuidedStepHeader from '@/components/today/GuidedStepHeader';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';
import type { VocabCard, SrsData } from '@/types';

const GUIDED_SESSION_LIMIT = 15;
/** How many later positions a wrong card is pushed back before it recycles. */
const RECYCLE_OFFSET = 3;

type QueueItem = { card: VocabCard; mode: FlashcardMode };

// ── Round summary ─────────────────────────────────────────────────────────────

type SummaryProps = {
  correctFirstTry: number;
  neededRetries: number;
  longestStreak: number;
  deckTitle: string;
  onDone: () => void;
};

function RoundSummary({ correctFirstTry, neededRetries, longestStreak, deckTitle, onDone }: SummaryProps) {
  const emoji = neededRetries === 0 ? '🌟' : correctFirstTry >= neededRetries ? '💪' : '📚';
  return (
    <View style={styles.summaryWrap}>
      <Text style={styles.summaryEmoji}>{emoji}</Text>
      <Text style={styles.summaryTitle}>Round complete!</Text>
      <Text style={styles.summaryDeck}>{deckTitle}</Text>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: Colors.success }]}>{correctFirstTry}</Text>
          <Text style={styles.statLabel}>First-try</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{neededRetries}</Text>
          <Text style={styles.statLabel}>Needed retries</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: Colors.gold }]}>{longestStreak}</Text>
          <Text style={styles.statLabel}>Best streak</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.doneBtn} onPress={onDone}>
        <Text style={styles.doneBtnText}>Back to decks</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ReviewScreen() {
  const { deckId, guided } = useLocalSearchParams<{ deckId: string; guided?: string }>();
  const isGuided = guided === '1';
  const router = useRouter();
  const { user } = useAuthStore();

  const deck = loadDeck(deckId ?? '');

  const [loading, setLoading] = useState(true);
  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [srsMap, setSrsMap] = useState<Record<string, SrsData>>({});
  const [dotState, setDotState] = useState<Record<string, DotState>>({});
  const [seenFirst, setSeenFirst] = useState<Set<string>>(new Set());
  const [correctFirstTry, setCorrectFirstTry] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [phase, setPhase] = useState<'question' | 'reveal' | 'summary'>('question');
  const [revealCard, setRevealCard] = useState<VocabCard | null>(null);

  // ── Load due cards ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user || !deck) return;
    async function load() {
      const allIds = deck!.cards.map(c => c.id);
      const dueIds = isGuided
        ? await getDueCardIds(user!.id, deck!.id, allIds, GUIDED_SESSION_LIMIT)
        : await getDueCardIds(user!.id, deck!.id, allIds);
      const dueCards = dueIds.map(id => deck!.cards.find(c => c.id === id)!).filter(Boolean);
      const modes = assignModes(dueCards.length);

      setCardOrder(dueCards.map(c => c.id));
      setQueue(dueCards.map((card, i) => ({ card, mode: modes[i] })));
      setDotState(Object.fromEntries(dueCards.map(c => [c.id, 'pending' as DotState])));

      const map: Record<string, SrsData> = {};
      for (const card of dueCards) {
        const progress = await getCardProgress(user!.id, card.id);
        map[card.id] = progress ?? INITIAL_SRS;
      }
      setSrsMap(map);
      setLoading(false);
    }
    load();
  }, [user?.id, deckId]);

  const currentItem = queue[0] ?? null;

  const mcqOptions = useMemo(() => {
    if (!currentItem || !deck) return [];
    if (currentItem.mode === 'mcq-es-en' || currentItem.mode === 'listening') {
      const pool = deck.cards.filter(c => c.id !== currentItem.card.id).map(c => c.termEn);
      return generateMcqOptions(currentItem.card.termEn, pool);
    }
    if (currentItem.mode === 'mcq-en-es') {
      const pool = deck.cards.filter(c => c.id !== currentItem.card.id).map(c => c.termEs);
      return generateMcqOptions(currentItem.card.termEs, pool);
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem?.card.id, currentItem?.mode]);

  // ── Answer handling ─────────────────────────────────────────────────────────

  async function handleAnswer(correct: boolean) {
    const item = currentItem;
    if (!item || !user) return;
    const { card, mode } = item;
    const isFirst = !seenFirst.has(card.id);

    if (isFirst) {
      setSeenFirst(prev => new Set(prev).add(card.id));
      const grade: SrsGrade = correct ? 2 : 0;
      const before = srsMap[card.id] ?? INITIAL_SRS;
      const after = nextSrsState(before, grade);
      setSrsMap(prev => ({ ...prev, [card.id]: after }));
      await upsertCardProgress(user.id, card.id, deckId!, after);
      await logReview(user.id, card.id, grade, before, after);

      if (correct) {
        setCorrectFirstTry(n => n + 1);
        const nextStreak = currentStreak + 1;
        setCurrentStreak(nextStreak);
        setLongestStreak(l => Math.max(l, nextStreak));
        setDotState(prev => ({ ...prev, [card.id]: 'correct' }));
      } else {
        setCurrentStreak(0);
        setDotState(prev => ({ ...prev, [card.id]: 'retried' }));
      }
    }

    const rest = queue.slice(1);

    if (correct) {
      setQueue(rest);
      if (rest.length === 0) {
        await syncDirtyToSupabase(user.id);
        setPhase('summary');
      }
    } else {
      const insertAt = Math.min(RECYCLE_OFFSET, rest.length);
      const recycled: QueueItem = { card, mode: pickRecycleMode(mode) };
      setQueue([...rest.slice(0, insertAt), recycled, ...rest.slice(insertAt)]);
      setRevealCard(card);
      setPhase('reveal');
    }
  }

  function continueAfterReveal() {
    setRevealCard(null);
    setPhase('question');
  }

  // ── Guided-session navigation ────────────────────────────────────────────────

  async function goToNextGuidedStep(skipped: boolean) {
    const store = useGuidedSessionStore.getState();
    if (skipped) store.skip(); else await store.advance();
    const dest = guidedNextRoute(useGuidedSessionStore.getState().currentIndex);
    if (dest.screen === 'complete') {
      router.replace('/today-session/complete' as any);
    } else {
      router.replace(`/today-session/transition?next=${dest.next}` as any);
    }
  }

  function exitScreen() {
    if (isGuided) { goToNextGuidedStep(false); return; }
    router.canGoBack() ? router.back() : router.replace('/(tabs)' as any);
  }

  function backOrSkip() {
    if (isGuided) { goToNextGuidedStep(true); return; }
    router.canGoBack() ? router.back() : router.replace('/(tabs)' as any);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!deck) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.error}>Deck not found.</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator style={{ flex: 1 }} color={Colors.navy} />
      </SafeAreaView>
    );
  }

  if (phase === 'summary') {
    return (
      <SafeAreaView style={styles.screen}>
        <RoundSummary
          correctFirstTry={correctFirstTry}
          neededRetries={seenFirst.size - correctFirstTry}
          longestStreak={longestStreak}
          deckTitle={deck.title}
          onDone={exitScreen}
        />
      </SafeAreaView>
    );
  }

  if (!cardOrder.length) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.allDoneWrap}>
          <Text style={styles.summaryEmoji}>✅</Text>
          <Text style={styles.summaryTitle}>You're all caught up</Text>
          <Text style={styles.summaryDeck}>No cards due in {deck.title} — your spacing is working. Come back tomorrow to keep the streak.</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={exitScreen}>
            <Text style={styles.doneBtnText}>Back to decks</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const dotResults: DotState[] = cardOrder.map(id =>
    currentItem && id === currentItem.card.id ? 'current' : (dotState[id] ?? 'pending')
  );
  const clearedCount = cardOrder.length - queue.length;

  return (
    <SafeAreaView style={styles.screen}>
      {isGuided && <GuidedStepHeader currentStepIndex={0} onSkip={backOrSkip} />}

      <View style={styles.header}>
        <TouchableOpacity onPress={backOrSkip} hitSlop={12}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.progressText}>{Math.min(clearedCount + 1, cardOrder.length)} / {cardOrder.length}</Text>
        <View style={{ width: 60 }} />
      </View>

      <SessionDots results={dotResults} />

      {phase === 'reveal' && revealCard ? (
        <WrongAnswerReveal card={revealCard} onContinue={continueAfterReveal} />
      ) : currentItem ? (
        <View style={styles.body}>
          {currentItem.mode === 'mcq-es-en' && (
            <McqQuestion
              promptLabel="ES → EN"
              prompt={currentItem.card.termEs}
              options={mcqOptions}
              correct={currentItem.card.termEn}
              onAnswer={handleAnswer}
            />
          )}
          {currentItem.mode === 'mcq-en-es' && (
            <McqQuestion
              promptLabel="EN → ES"
              prompt={currentItem.card.termEn}
              options={mcqOptions}
              correct={currentItem.card.termEs}
              onAnswer={handleAnswer}
            />
          )}
          {currentItem.mode === 'typed-en-es' && (
            <TypedQuestion
              prompt={currentItem.card.termEn}
              correctTerm={currentItem.card.termEs}
              correctTermLatam={currentItem.card.termEsLatam}
              onAnswer={handleAnswer}
            />
          )}
          {currentItem.mode === 'listening' && (
            <ListeningQuestion
              termEs={currentItem.card.termEs}
              options={mcqOptions}
              correct={currentItem.card.termEn}
              onAnswer={handleAnswer}
            />
          )}
          {currentItem.mode === 'speak' && (
            <SpeakQuestion
              prompt={currentItem.card.termEn}
              correctTerm={currentItem.card.termEs}
              correctTermLatam={currentItem.card.termEsLatam}
              onAnswer={handleAnswer}
            />
          )}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F5F0' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  back: { fontSize: Typography.body, color: Colors.navy, fontWeight: Typography.semibold },
  progressText: { fontSize: Typography.body, color: Colors.textSecondary },
  body: { flex: 1, justifyContent: 'center', paddingBottom: Spacing.xxl },
  error: { padding: Spacing.xl, color: Colors.error, fontSize: Typography.body },
  summaryWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg },
  allDoneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  summaryEmoji: { fontSize: 64 },
  summaryTitle: { fontSize: Typography.heading, fontWeight: Typography.bold, color: Colors.navy },
  summaryDeck: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: Spacing.xl, marginVertical: Spacing.md },
  stat: { alignItems: 'center', gap: 4 },
  statVal: { fontSize: Typography.title, fontWeight: Typography.bold, color: Colors.navy },
  statLabel: { fontSize: Typography.caption, color: Colors.textMuted },
  doneBtn: {
    backgroundColor: Colors.navy, borderRadius: Radii.lg,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  doneBtnText: { color: '#fff', fontSize: Typography.body, fontWeight: Typography.semibold },
});
