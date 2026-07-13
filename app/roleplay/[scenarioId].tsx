import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, AppState, TextInput, Platform,
  type AppStateStatus,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useAuthStore } from '@/stores/authStore';
import { useFeedbackStore } from '@/stores/feedbackStore';
import { loadScenario } from '@/lib/scenarios/catalog';
import { sendRolePlayTurn, type WireMessage } from '@/lib/api/roleplay';
import { gradeSession } from '@/lib/api/grade';
import { ApiCallError } from '@/lib/api/apiError';
import { getScenarioBest } from '@/lib/scenarioBest';
import { beatsBest } from '@/lib/scoreTiebreak';
import { resumeKey, saveResumeState, loadResumeState, clearResumeState } from '@/lib/exerciseResume';
import { setRecordingMode, setPlaybackMode } from '@/lib/audioSession';
import { Haptics } from '@/lib/haptics';
import { guidedNextRoute } from '@/lib/guidedSession';
import { useGuidedSessionStore } from '@/stores/guidedSessionStore';
import ChatBubble from '@/components/roleplay/ChatBubble';
import ObjectivesChecklist from '@/components/roleplay/ObjectivesChecklist';
import MicButton from '@/components/roleplay/MicButton';
import GuidedStepHeader from '@/components/today/GuidedStepHeader';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';

const MAX_TURNS = 12;
const GARBAGE_REPLY = 'No le he entendido bien, ¿puede repetirlo?';
const SPEED_RATE: Record<string, number> = { slow: 0.7, normal: 0.9, fast: 1.1 };

type Turn = { role: 'guest' | 'student'; text: string };

type Phase =
  | 'idle'
  | 'guest_speaking'
  | 'student_turn'
  | 'recording'
  | 'sending'
  | 'error'
  | 'grading'
  | 'grading_error'
  | 'done'
  | 'interrupted';

const ACTIVE_PHASES: Phase[] = ['guest_speaking', 'student_turn', 'recording', 'sending'];

// Full turn-by-turn resume, cross-session only — a live in-session interrupt
// (AppState background/return within the same mount) resumes straight from
// memory, no storage round-trip needed; this blob exists so a KILLED app can
// pick the same conversation back up. Two-tier staleness: within the hard
// cap, offer resume; past it, the persona context and elapsed-time metric
// are both meaningless, so discard and offer only a fresh start.
const RESUME_HARD_CAP_MS = 48 * 60 * 60 * 1000;

type ResumeBlob = {
  turns: Turn[];
  completedIds: string[];
  wireHistory: WireMessage[];
  startedAt: number;
};

export default function RoleplayScreen() {
  const { scenarioId, guided } = useLocalSearchParams<{ scenarioId: string; guided?: string }>();
  const isGuided = guided === '1';
  const router = useRouter();
  const { user } = useAuthStore();
  const { setResult } = useFeedbackStore();

  const scenario = loadScenario(scenarioId ?? '');
  const [phase, setPhase] = useState<Phase>('idle');
  const phaseRef = useRef<Phase>('idle');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [webInput, setWebInput] = useState('');
  const sessionStartRef = useRef<number>(Date.now());
  const liveRef = useRef('');
  const wireHistoryRef = useRef<WireMessage[]>([]);
  const lastTurnRef = useRef<{ wireHistory: WireMessage[]; turnsSoFar: number }>({ wireHistory: [], turnsSoFar: 0 });
  const scrollRef = useRef<ScrollView>(null);
  const wasResumedRef = useRef(false);
  const [resumeChecked, setResumeChecked] = useState(false);
  const [resumePrompt, setResumePrompt] = useState<ResumeBlob | null>(null);

  // ── Cross-session resume check (killed-and-relaunched app) ─────────────────
  // Guided sessions never offer resume, matching the daily-session contract.

  useEffect(() => {
    if (!user || !scenario || isGuided) { setResumeChecked(true); return; }
    let cancelled = false;
    loadResumeState<ResumeBlob>(resumeKey('roleplay', user.id, scenario.id)).then(blob => {
      if (cancelled) return;
      if (blob && blob.turns.length > 0) {
        if (Date.now() - blob.startedAt > RESUME_HARD_CAP_MS) {
          clearResumeState(resumeKey('roleplay', user.id, scenario.id));
        } else {
          setResumePrompt(blob);
        }
      }
      setResumeChecked(true);
    });
    return () => { cancelled = true; };
  }, [user?.id, scenario?.id, isGuided]);

  function resumeFromBlob(blob: ResumeBlob) {
    wasResumedRef.current = true;
    setTurns(blob.turns);
    setCompletedIds(new Set(blob.completedIds));
    wireHistoryRef.current = blob.wireHistory;
    sessionStartRef.current = blob.startedAt;
    setResumePrompt(null);
    updatePhase('student_turn');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }

  function discardResumeAndStartFresh() {
    if (user && scenario) clearResumeState(resumeKey('roleplay', user.id, scenario.id));
    setTurns([]);
    setCompletedIds(new Set());
    wireHistoryRef.current = [];
    setResumePrompt(null);
    updatePhase('idle');
  }

  // Auto-save after every turn exchange — non-guided only, cleared once graded.
  useEffect(() => {
    if (isGuided || !resumeChecked || !user || !scenario || turns.length === 0) return;
    if (['done', 'grading', 'grading_error'].includes(phase)) return;
    const blob: ResumeBlob = {
      turns,
      completedIds: [...completedIds],
      wireHistory: wireHistoryRef.current,
      startedAt: sessionStartRef.current,
    };
    saveResumeState(resumeKey('roleplay', user.id, scenario.id), blob);
  }, [isGuided, resumeChecked, user?.id, scenario?.id, turns, completedIds, phase]);

  function updatePhase(p: Phase) {
    phaseRef.current = p;
    setPhase(p);
  }

  // Phone-call / interrupt detection
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if ((nextState === 'background' || nextState === 'inactive') && ACTIVE_PHASES.includes(phaseRef.current)) {
        Speech.stop();
        ExpoSpeechRecognitionModule.stop();
        setPlaybackMode();
        updatePhase('interrupted');
      }
    });
    return () => sub.remove();
  }, []);

  useSpeechRecognitionEvent('result', e => {
    const text = e.results?.[0]?.transcript ?? '';
    liveRef.current = text;
    setLiveTranscript(text);
  });

  useSpeechRecognitionEvent('end', () => {
    if (phaseRef.current === 'recording') {
      setPlaybackMode();
      handleStudentFinished(liveRef.current);
    }
  });

  async function speakGuest(text: string) {
    await setPlaybackMode();
    updatePhase('guest_speaking');
    const rate = SPEED_RATE[scenario?.guestPersona.speakingSpeed ?? 'normal'];
    Speech.speak(text, {
      language: 'es-ES',
      rate,
      onDone: () => updatePhase('student_turn'),
      onError: () => updatePhase('student_turn'),
    });
  }

  function appendTurn(turn: Turn) {
    setTurns(prev => [...prev, turn]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }

  function startSession() {
    if (!scenario) return;
    sessionStartRef.current = Date.now();
    wireHistoryRef.current = [];
    appendTurn({ role: 'guest', text: scenario.openingLine });
    speakGuest(scenario.openingLine);
  }

  async function handleMicPressIn() {
    if (phaseRef.current !== 'student_turn') return;
    liveRef.current = '';
    setLiveTranscript('');
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) return;
    await setRecordingMode();
    ExpoSpeechRecognitionModule.start({ lang: 'es-ES', interimResults: true });
    updatePhase('recording');
  }

  function handleMicPressOut() {
    if (phaseRef.current !== 'recording') return;
    ExpoSpeechRecognitionModule.stop();
    // setPlaybackMode called in the 'end' event
  }

  function handleWebSend() {
    const text = webInput.trim();
    if (!text || phaseRef.current !== 'student_turn') return;
    setWebInput('');
    handleStudentFinished(text);
  }

  // Sends one already-built wire history to the roleplay function. Split out
  // from handleStudentFinished so a failed send can be retried verbatim —
  // without re-appending the student's turn or making them re-record.
  const sendTurnToServer = useCallback(async (wireHistory: WireMessage[], turnsSoFar: number) => {
    if (!scenario) return;
    lastTurnRef.current = { wireHistory, turnsSoFar };
    updatePhase('sending');
    setErrorMsg('');

    try {
      const result = await sendRolePlayTurn({ scenario, messages: wireHistory });

      setCompletedIds(prev => {
        const next = new Set(prev);
        result.objectivesCompleted.forEach(id => next.add(id));
        return next;
      });

      appendTurn({ role: 'guest', text: result.guestReply });
      wireHistoryRef.current = [...wireHistory, { role: 'assistant', content: result.guestReply }];

      if (result.sessionShouldEnd || turnsSoFar >= MAX_TURNS) {
        await triggerGrading([...wireHistoryRef.current]);
      } else {
        speakGuest(result.guestReply);
      }
    } catch (e) {
      const apiError = e instanceof ApiCallError ? e : null;
      setErrorMsg(apiError?.message ?? 'Something went wrong. Please try again.');
      updatePhase('error');
    }
  }, [scenario]);

  const handleStudentFinished = useCallback(async (raw: string) => {
    if (!scenario || !user) return;
    const text = raw.trim();
    const isGarbage = text.length < 3;

    appendTurn({ role: 'student', text: isGarbage ? '(unclear)' : text });

    if (isGarbage) {
      appendTurn({ role: 'guest', text: GARBAGE_REPLY });
      speakGuest(GARBAGE_REPLY);
      return;
    }

    // Build wire history: skip leading guest turns (the opening line is already
    // embedded in the system prompt and must not appear as an assistant message
    // at position 0 — the Edge Function requires messages[0].role === 'user').
    const wireHistory: WireMessage[] = [];
    let seenStudent = false;
    for (const t of turns) {
      if (t.role === 'student') seenStudent = true;
      if (!seenStudent) continue;
      wireHistory.push({ role: t.role === 'student' ? 'user' : 'assistant', content: t.text });
    }
    wireHistory.push({ role: 'user', content: text });

    await sendTurnToServer(wireHistory, turns.length + 2);
  }, [scenario, turns, user, sendTurnToServer]);

  const lastGradingMessagesRef = useRef<WireMessage[]>([]);

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
    // An interrupted/errored/edge-case exit never completed the role-play,
    // so it's a skip, not a completion, in the guided flow.
    if (isGuided) { goToNextGuidedStep(true); return; }
    router.canGoBack() ? router.back() : router.replace('/(tabs)' as any);
  }

  async function triggerGrading(messages: WireMessage[]) {
    if (!scenario || !user) { updatePhase('done'); return; }
    lastGradingMessagesRef.current = messages;
    updatePhase('grading');
    const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);

    try {
      const priorBest = await getScenarioBest(user.id, scenario.id).catch(() => null);
      const gradeResult = await gradeSession({
        scenario, messages, durationSeconds,
        level: user.mockLevel,
        wasResumed: wasResumedRef.current,
      });
      Haptics.success();
      const isNewBest = beatsBest(
        { score: gradeResult.totalScore, completionSeconds: durationSeconds },
        priorBest ? { score: priorBest.score, completionSeconds: priorBest.completionSeconds } : null,
      );
      setResult(gradeResult, undefined, isNewBest);
      if (user && scenario) clearResumeState(resumeKey('roleplay', user.id, scenario.id));
      // Guided flow: the attempt is graded and saved either way (visible later
      // in Progress) — momentum matters more than the detailed feedback screen
      // mid-session, so move straight to the next step instead of /feedback.
      if (isGuided) {
        await goToNextGuidedStep(false);
      } else {
        router.replace(`/feedback/${gradeResult.attemptId}` as any);
      }
    } catch (e) {
      const apiError = e instanceof ApiCallError ? e : null;
      setErrorMsg(apiError?.message ?? 'Something went wrong while grading. Please try again.');
      updatePhase('grading_error');
    }
  }

  if (!scenario) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.errText}>Scenario not found.</Text>
      </SafeAreaView>
    );
  }

  if (resumePrompt) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.gradingWrap}>
          <Text style={{ fontSize: 48 }}>⏸️</Text>
          <Text style={styles.gradingTitle}>Pick up this conversation?</Text>
          <Text style={styles.gradingText}>
            You were partway through {scenario.title} — {resumePrompt.turns.filter(t => t.role === 'student').length} exchange{resumePrompt.turns.filter(t => t.role === 'student').length === 1 ? '' : 's'} in.
          </Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => resumeFromBlob(resumePrompt)}>
            <Text style={styles.startBtnText}>Resume conversation</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={discardResumeAndStartFresh} style={{ marginTop: Spacing.sm }}>
            <Text style={[styles.gradingText, { textDecorationLine: 'underline' }]}>Start over instead</Text>
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

  if (phase === 'interrupted' && !isGuided && turns.length > 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.gradingWrap}>
          <Text style={{ fontSize: 48 }}>📵</Text>
          <Text style={styles.gradingTitle}>Session paused</Text>
          <Text style={styles.gradingText}>
            Something interrupted your session. Pick up right where you left off, or start fresh.
          </Text>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => resumeFromBlob({ turns, completedIds: [...completedIds], wireHistory: wireHistoryRef.current, startedAt: sessionStartRef.current })}
          >
            <Text style={styles.startBtnText}>Resume conversation</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={discardResumeAndStartFresh} style={{ marginTop: Spacing.sm }}>
            <Text style={[styles.gradingText, { textDecorationLine: 'underline' }]}>Start over instead</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={exitScreen} style={{ marginTop: Spacing.sm }}>
            <Text style={[styles.gradingText, { textDecorationLine: 'underline' }]}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'interrupted') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.gradingWrap}>
          <Text style={{ fontSize: 48 }}>📵</Text>
          <Text style={styles.gradingTitle}>Session paused</Text>
          <Text style={styles.gradingText}>
            Something interrupted your session. This attempt has been voided — no worries, it won't count against you. Retry when you're ready.
          </Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => updatePhase('idle')}>
            <Text style={styles.startBtnText}>Retry this scenario</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={exitScreen} style={{ marginTop: Spacing.sm }}>
            <Text style={[styles.gradingText, { textDecorationLine: 'underline' }]}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'grading') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.gradingWrap}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.gradingTitle}>Grading your session…</Text>
          <Text style={styles.gradingText}>Analysing fluency, vocabulary, grammar, pronunciation and content.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'grading_error') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.gradingWrap}>
          <Text style={{ fontSize: 48 }}>⚠️</Text>
          <Text style={styles.gradingTitle}>Couldn't grade this session</Text>
          <Text style={styles.gradingText}>{errorMsg || 'Something went wrong while grading. Try again.'}</Text>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => triggerGrading(lastGradingMessagesRef.current)}
          >
            <Text style={styles.startBtnText}>Retry grading</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={exitScreen} style={{ marginTop: Spacing.sm }}>
            <Text style={[styles.gradingText, { textDecorationLine: 'underline' }]}>Give up and go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'done') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.gradingWrap}>
          <Text style={{ fontSize: 48 }}>✓</Text>
          <Text style={styles.gradingTitle}>Session complete</Text>
          <TouchableOpacity style={styles.startBtn} onPress={exitScreen}>
            <Text style={styles.startBtnText}>Back to Practice</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      {isGuided && <GuidedStepHeader currentStepIndex={1} onSkip={() => goToNextGuidedStep(true)} />}

      <View style={styles.header}>
        <TouchableOpacity
          onPress={exitScreen}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close and return to practice"
        >
          <Text style={styles.back}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{scenario.title}</Text>
        <View style={styles.headerRight}>
          <Text style={styles.turnCount}>
            {turns.filter(t => t.role === 'student').length}/{MAX_TURNS / 2}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/phrases' as any)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Phrase bank"
          >
            <Text style={styles.lifebuoy}>⛟</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ObjectivesChecklist objectives={scenario.objectives} completedIds={completedIds} />

      <ScrollView
        ref={scrollRef}
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {turns.map((t, i) => (
          <ChatBubble
            key={i}
            role={t.role}
            text={t.text}
            speakingSpeed={t.role === 'guest' ? scenario.guestPersona.speakingSpeed : undefined}
          />
        ))}
        {phase === 'sending' && (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color={Colors.navy} />
            <Text style={styles.typingText}>Guest is responding…</Text>
          </View>
        )}
      </ScrollView>

      {phase === 'error' && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMsg}</Text>
          <TouchableOpacity
            onPress={() => sendTurnToServer(lastTurnRef.current.wireHistory, lastTurnRef.current.turnsSoFar)}
            style={styles.retryBtn}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.footer}>
        {phase === 'idle' ? (
          <TouchableOpacity
            style={styles.startBtn}
            onPress={startSession}
            accessibilityRole="button"
            accessibilityLabel="Start the conversation"
          >
            <Text style={styles.startBtnText}>Start conversation</Text>
          </TouchableOpacity>
        ) : (phase === 'student_turn' || phase === 'recording' || phase === 'sending') ? (
          Platform.OS === 'web' ? (
            <View style={styles.webInputRow}>
              <TextInput
                style={styles.webInput}
                placeholder="Type your reply in Spanish…"
                placeholderTextColor={Colors.textMuted}
                value={webInput}
                onChangeText={setWebInput}
                onSubmitEditing={handleWebSend}
                editable={phase === 'student_turn'}
                returnKeyType="send"
                autoCorrect={false}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.webSendBtn, (phase !== 'student_turn' || !webInput.trim()) && styles.webSendBtnDisabled]}
                onPress={handleWebSend}
                disabled={phase !== 'student_turn' || !webInput.trim()}
              >
                {phase === 'sending'
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.webSendBtnText}>Send</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <MicButton
              onPressIn={handleMicPressIn}
              onPressOut={handleMicPressOut}
              isRecording={phase === 'recording'}
              transcript={liveTranscript}
            />
          )
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F5F0' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.navy,
  },
  back: { fontSize: 20, color: '#fff' },
  headerTitle: { flex: 1, textAlign: 'center', color: '#fff', fontWeight: Typography.semibold, fontSize: Typography.body, marginHorizontal: Spacing.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  turnCount: { fontSize: Typography.caption, color: 'rgba(255,255,255,0.7)' },
  lifebuoy: { fontSize: 20, color: '#fff' },
  chat: { flex: 1 },
  chatContent: { paddingVertical: Spacing.md },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  typingText: { fontSize: Typography.caption, color: Colors.textMuted, fontStyle: 'italic' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FEE2E2', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  errorBannerText: { flex: 1, fontSize: Typography.caption, color: Colors.error },
  retryBtn: { backgroundColor: Colors.error, borderRadius: Radii.sm, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  retryText: { color: '#fff', fontSize: Typography.caption, fontWeight: Typography.semibold },
  footer: { paddingBottom: Spacing.lg, alignItems: 'center', backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: '#E8E3DC' },
  webInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, alignSelf: 'stretch',
  },
  webInput: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontSize: Typography.body, backgroundColor: '#fff', color: Colors.textPrimary,
  },
  webSendBtn: {
    backgroundColor: Colors.navy, borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, minWidth: 64, alignItems: 'center',
  },
  webSendBtnDisabled: { opacity: 0.4 },
  webSendBtnText: { color: '#fff', fontWeight: Typography.semibold, fontSize: Typography.body },
  startBtn: {
    marginTop: Spacing.md, backgroundColor: Colors.navy, borderRadius: Radii.lg,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  startBtnText: { color: '#fff', fontWeight: Typography.semibold, fontSize: Typography.body },
  errText: { padding: Spacing.xl, color: Colors.error },
  gradingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.lg, padding: Spacing.xl },
  gradingTitle: { fontSize: Typography.heading, fontWeight: Typography.bold, color: Colors.navy, textAlign: 'center' },
  gradingText: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
