import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useAuthStore } from '@/stores/authStore';
import { usePremium } from '@/hooks/usePremium';
import { loadDrillSet, DRILL_CATALOG } from '@/lib/grammar/drills';
import { saveGrammarDrillProgress, getGrammarDrillLastAttempt, type AttemptDetailItem } from '@/lib/grammar/progress';
import { resumeKey, saveResumeState, loadResumeState, clearResumeState } from '@/lib/exerciseResume';
import { isExactMatchAny } from '@/lib/textMatch';
import { Haptics } from '@/lib/haptics';
import LastAttemptPanel from '@/components/LastAttemptPanel';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { GrammarQuestion } from '@/types';

type Phase = 'question' | 'result' | 'done';

type ResumeBlob = {
  queueIds: string[];
  correctFirstTry: number;
  seenIds: string[];
  startedAt: number;
};

export default function GrammarDrillScreen() {
  const { drillId } = useLocalSearchParams<{ drillId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const isPremium = usePremium();

  const drillMeta = DRILL_CATALOG.find(d => d.id === drillId);
  const drillSet = useMemo(() => loadDrillSet(drillId ?? ''), [drillId]);
  const locked = drillMeta ? !drillMeta.isFree && !isPremium : false;

  const [queue, setQueue] = useState<GrammarQuestion[]>([]);
  const [phase, setPhase] = useState<Phase>('question');
  const [typedAnswer, setTypedAnswer] = useState('');
  const [spokenText, setSpokenText] = useState('');
  const [micActive, setMicActive] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [correctFirstTry, setCorrectFirstTry] = useState(0);
  const [totalAsked, setTotalAsked] = useState(0);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [isNewBest, setIsNewBest] = useState(false);
  const [resumeChecked, setResumeChecked] = useState(false);
  const [resumePrompt, setResumePrompt] = useState<ResumeBlob | null>(null);
  const savedRef = useRef(false);
  const startedAtRef = useRef(Date.now());
  const attemptDetailRef = useRef<Array<{ prompt: string; given: string; correct: boolean; correctAnswer: string }>>([]);
  const [lastAttempt, setLastAttempt] = useState<AttemptDetailItem[]>([]);
  const [showLastAttempt, setShowLastAttempt] = useState(false);

  useEffect(() => {
    if (!user || !drillMeta) return;
    getGrammarDrillLastAttempt(user.id, drillMeta.id).then(setLastAttempt).catch(() => {});
  }, [user?.id, drillMeta?.id]);

  useEffect(() => {
    if (!drillSet || !user) return;
    let cancelled = false;
    loadResumeState<ResumeBlob>(resumeKey('grammar', user.id, drillSet.id)).then(blob => {
      if (cancelled) return;
      if (blob && blob.queueIds.length > 0) {
        setResumePrompt(blob);
      } else {
        setQueue([...drillSet.questions]);
        setResumeChecked(true);
      }
    });
    return () => { cancelled = true; };
  }, [drillSet, user?.id]);

  function resumeSession(blob: ResumeBlob) {
    if (!drillSet) return;
    const restoredQueue = blob.queueIds
      .map(id => drillSet.questions.find(q => q.id === id))
      .filter((q): q is GrammarQuestion => !!q);
    setQueue(restoredQueue);
    setCorrectFirstTry(blob.correctFirstTry);
    setSeenIds(new Set(blob.seenIds));
    startedAtRef.current = blob.startedAt;
    setResumePrompt(null);
    setResumeChecked(true);
  }

  function startFresh() {
    if (!drillSet || !user) return;
    clearResumeState(resumeKey('grammar', user.id, drillSet.id));
    setQueue([...drillSet.questions]);
    startedAtRef.current = Date.now();
    setResumePrompt(null);
    setResumeChecked(true);
  }

  // Auto-save after every question resolution — cleared once the drill is done.
  useEffect(() => {
    if (!resumeChecked || !user || !drillSet || phase === 'done' || queue.length === 0) return;
    const blob: ResumeBlob = {
      queueIds: queue.map(q => q.id),
      correctFirstTry,
      seenIds: [...seenIds],
      startedAt: startedAtRef.current,
    };
    saveResumeState(resumeKey('grammar', user.id, drillSet.id), blob);
  }, [resumeChecked, user?.id, drillSet, queue, correctFirstTry, seenIds, phase]);

  // Persist best accuracy once, the first time this session reaches 'done'.
  useEffect(() => {
    if (phase !== 'done' || savedRef.current || !user || !drillMeta || !drillSet) return;
    savedRef.current = true;
    const accuracy = (correctFirstTry / drillSet.questions.length) * 100;
    const completionSeconds = Math.round((Date.now() - startedAtRef.current) / 1000);
    saveGrammarDrillProgress(user.id, drillMeta.id, accuracy, completionSeconds, attemptDetailRef.current)
      .then(result => setIsNewBest(result.isNewBest))
      .catch(() => {});
    clearResumeState(resumeKey('grammar', user.id, drillMeta.id));
  }, [phase, user, drillMeta, drillSet, correctFirstTry]);

  useSpeechRecognitionEvent('result', e => {
    setSpokenText(e.results?.[0]?.transcript ?? '');
  });
  useSpeechRecognitionEvent('end', () => setMicActive(false));

  if (!drillMeta || !drillSet) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.errText}>Drill not found.</Text>
      </SafeAreaView>
    );
  }

  if (locked) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>🔒</Text>
          <Text style={styles.centerTitle}>Premium drill</Text>
          <Text style={styles.centerText}>Unlock all grammar drills with Spanish4Hoteleros Premium.</Text>
          <TouchableOpacity style={styles.nextBtn} onPress={() => router.push('/paywall' as any)}>
            <Text style={styles.nextBtnText}>Unlock — €9.99</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (resumePrompt) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>⏸️</Text>
          <Text style={styles.centerTitle}>Pick up where you left off?</Text>
          <Text style={styles.centerText}>
            You were {resumePrompt.correctFirstTry}/{drillSet.questions.length} correct with {resumePrompt.queueIds.length} question{resumePrompt.queueIds.length === 1 ? '' : 's'} left.
          </Text>
          <TouchableOpacity style={styles.nextBtn} onPress={() => resumeSession(resumePrompt)}>
            <Text style={styles.nextBtnText}>Resume</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.startOverBtn} onPress={startFresh}>
            <Text style={styles.startOverBtnText}>Start over</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!resumeChecked) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator style={{ flex: 1 }} color={Colors.navy} />
      </SafeAreaView>
    );
  }

  const q = queue[0];

  async function toggleMic() {
    if (micActive) {
      ExpoSpeechRecognitionModule.stop();
      setMicActive(false);
      return;
    }
    setSpokenText('');
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) return;
    ExpoSpeechRecognitionModule.start({ lang: 'es-ES', interimResults: true });
    setMicActive(true);
  }

  function submitAnswer() {
    const given = typedAnswer.trim() || spokenText.trim();
    if (!given || !q) return;
    if (micActive) ExpoSpeechRecognitionModule.stop();

    const ok = isExactMatchAny(given, q.answer);
    setCorrect(ok);
    setTotalAsked(n => n + 1);
    attemptDetailRef.current.push({ prompt: q.prompt, given, correct: ok, correctAnswer: q.answer });

    if (ok) {
      Haptics.success();
      if (!seenIds.has(q.id)) setCorrectFirstTry(n => n + 1);
    } else {
      Haptics.error();
    }
    setSeenIds(prev => new Set(prev).add(q.id));
    setPhase('result');
  }

  function next() {
    setTypedAnswer('');
    setSpokenText('');

    setQueue(prev => {
      const [current, ...rest] = prev;
      // Wrong answers recycle to the back of the queue; correct ones drop out.
      const nextQueue = correct ? rest : [...rest, current];
      if (nextQueue.length === 0) setPhase('done');
      else setPhase('question');
      return nextQueue;
    });
  }

  if (phase === 'done') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Text style={{ fontSize: 56 }}>{correctFirstTry === drillSet.questions.length ? '🎉' : '💪'}</Text>
          <Text style={styles.centerTitle}>{correctFirstTry}/{drillSet.questions.length} correct on first try</Text>
          {isNewBest && <Text style={styles.newBest}>🏆 New personal best!</Text>}
          <Text style={styles.centerText}>
            {correctFirstTry === drillSet.questions.length
              ? 'Perfect run! Come back tomorrow to keep it sharp.'
              : 'Good work — the ones you missed came back until you got them right.'}
          </Text>
          <TouchableOpacity style={styles.nextBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/grammar' as any)}>
            <Text style={styles.nextBtnText}>Back to Gramática</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/grammar' as any)} hitSlop={12}>
          <Text style={styles.back}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{drillMeta.title}</Text>
        <Text style={styles.counter}>{queue.length} left</Text>
      </View>

      {totalAsked === 0 && lastAttempt.length > 0 && (
        <TouchableOpacity onPress={() => setShowLastAttempt(v => !v)} style={styles.lastAttemptToggle}>
          <Text style={styles.lastAttemptToggleText}>{showLastAttempt ? 'Hide' : 'View'} last attempt</Text>
        </TouchableOpacity>
      )}
      {totalAsked === 0 && showLastAttempt && <LastAttemptPanel items={lastAttempt} />}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.card}>
          <Text style={styles.prompt}>{q?.prompt}</Text>

          {phase === 'result' && (
            <View style={[styles.resultBox, { backgroundColor: correct ? '#F0FDF4' : '#FEF2F2' }]}>
              <Text style={{ color: correct ? '#16A34A' : '#DC2626', fontWeight: Typography.bold, fontSize: Typography.body }}>
                {correct ? '✓ Correct!' : '✗ Not quite — this one will come back around'}
              </Text>
              <Text style={styles.answerLabel}>Correct answer:</Text>
              <Text style={styles.answerText}>{q?.answer}</Text>
              <Text style={styles.hintText}>{q?.hint}</Text>
            </View>
          )}

          {phase === 'question' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Type your answer…"
                placeholderTextColor={Colors.textMuted}
                value={typedAnswer}
                onChangeText={setTypedAnswer}
                onSubmitEditing={submitAnswer}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />

              <TouchableOpacity
                style={[styles.micBtn, micActive && styles.micBtnActive]}
                onPress={toggleMic}
              >
                <Text style={styles.micBtnText}>{micActive ? `⏹ Stop — "${spokenText}"` : '🎤 Or speak it'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.footer}>
          {phase === 'question' ? (
            <TouchableOpacity
              style={[styles.submitBtn, !(typedAnswer.trim() || spokenText.trim()) && styles.submitBtnDisabled]}
              onPress={submitAnswer}
              disabled={!(typedAnswer.trim() || spokenText.trim())}
            >
              <Text style={styles.submitBtnText}>Check</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.submitBtn} onPress={next}>
              <Text style={styles.submitBtnText}>Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F5F0' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.navy,
  },
  back: { fontSize: 20, color: '#fff' },
  headerTitle: { flex: 1, textAlign: 'center', color: '#fff', fontWeight: Typography.semibold, fontSize: Typography.body, marginHorizontal: Spacing.sm },
  counter: { fontSize: Typography.caption, color: 'rgba(255,255,255,0.7)' },
  lastAttemptToggle: { alignSelf: 'center', paddingVertical: Spacing.xs },
  lastAttemptToggleText: { fontSize: Typography.caption, color: Colors.info, fontWeight: Typography.medium },
  card: {
    margin: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radii.xl,
    padding: Spacing.xl, gap: Spacing.lg, ...Shadows.md, flex: 1,
  },
  prompt: { fontSize: Typography.heading, fontWeight: Typography.semibold, color: Colors.navy, textAlign: 'center', lineHeight: 30 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: Typography.body, color: Colors.textPrimary, backgroundColor: '#fff',
  },
  micBtn: { alignSelf: 'center', backgroundColor: Colors.surfaceAlt, borderRadius: Radii.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  micBtnActive: { backgroundColor: Colors.error },
  micBtnText: { fontSize: Typography.caption, color: Colors.textSecondary, fontWeight: Typography.medium },
  resultBox: { borderRadius: Radii.md, padding: Spacing.md, gap: 6 },
  answerLabel: { fontSize: Typography.caption, color: Colors.textMuted, marginTop: 4 },
  answerText: { fontSize: Typography.body, color: Colors.navy, fontWeight: Typography.semibold },
  hintText: { fontSize: Typography.caption, color: Colors.textSecondary, fontStyle: 'italic' },
  footer: { paddingBottom: Spacing.xl, paddingHorizontal: Spacing.lg },
  submitBtn: { backgroundColor: Colors.navy, borderRadius: Radii.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontWeight: Typography.bold, fontSize: Typography.body },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.lg, padding: Spacing.xl },
  centerTitle: { fontSize: Typography.heading, fontWeight: Typography.bold, color: Colors.navy, textAlign: 'center' },
  centerText: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  newBest: { fontSize: Typography.body, fontWeight: Typography.bold, color: Colors.gold },
  nextBtn: { backgroundColor: Colors.navy, borderRadius: Radii.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  nextBtnText: { color: '#fff', fontWeight: Typography.semibold, fontSize: Typography.body },
  startOverBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm },
  startOverBtnText: { color: Colors.textMuted, fontWeight: Typography.medium, fontSize: Typography.body, textDecorationLine: 'underline' },
  errText: { padding: Spacing.xl, color: Colors.error },
});
