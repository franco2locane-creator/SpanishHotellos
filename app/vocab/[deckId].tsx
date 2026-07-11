import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useAuthStore } from '@/stores/authStore';
import { loadDeck } from '@/lib/vocab/decks';
import {
  getDueCardIds, getCardProgress, upsertCardProgress, logReview, syncDirtyToSupabase,
} from '@/lib/db/vocab';
import { nextSrsState, INITIAL_SRS, type SrsGrade } from '@/lib/srs';
import { guidedNextRoute } from '@/lib/guidedSession';
import { useGuidedSessionStore } from '@/stores/guidedSessionStore';
import FlashCard from '@/components/vocab/FlashCard';
import ReviewControls from '@/components/vocab/ReviewControls';
import GuidedStepHeader from '@/components/today/GuidedStepHeader';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';
import type { VocabCard, SrsData } from '@/types';

const GUIDED_SESSION_LIMIT = 15;

// ── Fuzzy match for speak-it mode ─────────────────────────────────────────────

function normalise(s: string) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/^(el|la|los|las|de|un|una)\s+/g, '')
    .replace(/[^a-z0-9 ]/g, '').trim();
}

function isFuzzyMatch(heard: string, term: string): boolean {
  const a = normalise(heard);
  const b = normalise(term);
  if (a === b) return true;
  if (b.split(' ').some(w => a.includes(w) && w.length > 3)) return true;
  return false;
}

// ── Session summary ───────────────────────────────────────────────────────────

type SummaryProps = {
  reviewed: number;
  correct: number;
  deckTitle: string;
  onDone: () => void;
};

function SessionSummary({ reviewed, correct, deckTitle, onDone }: SummaryProps) {
  const pct = reviewed ? Math.round((correct / reviewed) * 100) : 0;
  return (
    <View style={styles.summaryWrap}>
      <Text style={styles.summaryEmoji}>{pct >= 80 ? '🌟' : pct >= 50 ? '💪' : '📚'}</Text>
      <Text style={styles.summaryTitle}>Session complete!</Text>
      <Text style={styles.summaryDeck}>{deckTitle}</Text>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{reviewed}</Text>
          <Text style={styles.statLabel}>Reviewed</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: Colors.success }]}>{correct}</Text>
          <Text style={styles.statLabel}>Correct</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{pct}%</Text>
          <Text style={styles.statLabel}>Score</Text>
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

  const [cards, setCards] = useState<VocabCard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [srsMap, setSrsMap] = useState<Record<string, SrsData>>({});
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [speakItMode, setSpeakItMode] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [heardText, setHeardText] = useState('');
  const [speakResult, setSpeakResult] = useState<'correct' | 'incorrect' | null>(null);
  const liveRef = useRef('');

  const deck = loadDeck(deckId ?? '');

  // ── Load due cards ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user || !deck) return;
    async function load() {
      const allIds = deck!.cards.map(c => c.id);
      const dueIds = isGuided
        ? await getDueCardIds(user!.id, deck!.id, allIds, GUIDED_SESSION_LIMIT)
        : await getDueCardIds(user!.id, deck!.id, allIds);
      const dueCards = dueIds.map(id => deck!.cards.find(c => c.id === id)!).filter(Boolean);
      setCards(dueCards);

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

  // ── Speak-it voice events ───────────────────────────────────────────────────

  useSpeechRecognitionEvent('result', e => {
    const text = e.results?.[0]?.transcript ?? '';
    liveRef.current = text;
    setHeardText(text);
  });

  useSpeechRecognitionEvent('end', () => {
    setMicActive(false);
    const card = cards[currentIdx];
    if (!card) return;
    const match = isFuzzyMatch(liveRef.current, card.termEs);
    setSpeakResult(match ? 'correct' : 'incorrect');
    if (match) {
      // Auto-grade Good on a successful speak-it match.
      setTimeout(() => handleGrade(2), 800);
    }
  });

  // ── Grade handler ───────────────────────────────────────────────────────────

  const handleGrade = useCallback(async (grade: SrsGrade) => {
    const card = cards[currentIdx];
    if (!card || !user) return;

    const before = srsMap[card.id] ?? INITIAL_SRS;
    const after = nextSrsState(before, grade);
    setSrsMap(prev => ({ ...prev, [card.id]: after }));

    await upsertCardProgress(user.id, card.id, deckId!, after);
    await logReview(user.id, card.id, grade, before, after);

    setReviewedCount(n => n + 1);
    if (grade >= 2) setCorrectCount(n => n + 1);

    // Advance to next card or finish session.
    if (currentIdx + 1 >= cards.length) {
      await syncDirtyToSupabase(user.id);
      setDone(true);
    } else {
      setCurrentIdx(i => i + 1);
      setRevealed(false);
      setSpeakResult(null);
      setHeardText('');
      liveRef.current = '';
    }
  }, [cards, currentIdx, srsMap, user, deckId]);

  // ── Speak-it mic toggle ─────────────────────────────────────────────────────

  async function toggleMic() {
    if (micActive) {
      ExpoSpeechRecognitionModule.stop();
      setMicActive(false);
    } else {
      setSpeakResult(null);
      setHeardText('');
      liveRef.current = '';
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) { setSpeakItMode(false); return; }
      ExpoSpeechRecognitionModule.start({ lang: 'es-ES', interimResults: true });
      setMicActive(true);
    }
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

  if (done) {
    return (
      <SafeAreaView style={styles.screen}>
        <SessionSummary
          reviewed={reviewedCount}
          correct={correctCount}
          deckTitle={deck.title}
          onDone={exitScreen}
        />
      </SafeAreaView>
    );
  }

  if (!cards.length) {
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

  const card = cards[currentIdx];
  const progress = `${currentIdx + 1} / ${cards.length}`;

  return (
    <SafeAreaView style={styles.screen}>
      {isGuided && <GuidedStepHeader currentStepIndex={0} onSkip={backOrSkip} />}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={backOrSkip} hitSlop={12}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.progressText}>{progress}</Text>
        <TouchableOpacity onPress={() => setSpeakItMode(m => !m)}>
          <Text style={[styles.speakToggle, speakItMode && styles.speakToggleOn]}>
            {speakItMode ? '🎤 ON' : '🎤'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentIdx) / cards.length) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <FlashCard card={card} revealed={revealed} onReveal={() => setRevealed(true)} />

        {/* Speak-it panel (shown after reveal) */}
        {revealed && speakItMode && (
          <View style={styles.speakPanel}>
            <TouchableOpacity
              style={[styles.micBtn, micActive && styles.micBtnActive]}
              onPress={toggleMic}
            >
              <Text style={styles.micBtnText}>
                {micActive ? '⏹ Stop' : '🎤 Speak it'}
              </Text>
            </TouchableOpacity>

            {heardText ? (
              <Text style={styles.heard}>
                Heard: "{heardText}"
              </Text>
            ) : null}

            {speakResult === 'correct' && (
              <Text style={styles.matchCorrect}>✓ Correct! Grading as Good…</Text>
            )}
            {speakResult === 'incorrect' && (
              <Text style={styles.matchWrong}>Try again or grade manually below.</Text>
            )}
          </View>
        )}

        {/* Grade buttons */}
        {revealed && (
          <ReviewControls onGrade={handleGrade} disabled={micActive} />
        )}
      </ScrollView>
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
  speakToggle: { fontSize: Typography.body, color: Colors.textMuted, fontWeight: Typography.semibold },
  speakToggleOn: { color: Colors.gold },
  progressBar: { height: 4, backgroundColor: '#E5E0DA', marginHorizontal: Spacing.lg },
  progressFill: { height: 4, backgroundColor: Colors.gold, borderRadius: 2 },
  body: { paddingTop: Spacing.xl, paddingBottom: Spacing.xxl ?? 48, gap: Spacing.xl },
  speakPanel: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  micBtn: {
    backgroundColor: Colors.navy, borderRadius: Radii.md,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  micBtnActive: { backgroundColor: Colors.error },
  micBtnText: { color: '#fff', fontWeight: Typography.semibold, fontSize: Typography.body },
  heard: { fontSize: Typography.caption, color: Colors.textSecondary, fontStyle: 'italic' },
  matchCorrect: { fontSize: Typography.body, color: Colors.success, fontWeight: Typography.semibold },
  matchWrong: { fontSize: Typography.body, color: Colors.warning },
  error: { padding: Spacing.xl, color: Colors.error, fontSize: Typography.body },
  summaryWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg },
  allDoneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  summaryEmoji: { fontSize: 64 },
  summaryTitle: { fontSize: Typography.heading, fontWeight: Typography.bold, color: Colors.navy },
  summaryDeck: { fontSize: Typography.body, color: Colors.textSecondary },
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
