import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, AppState, type AppStateStatus,
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
import { setRecordingMode, setPlaybackMode } from '@/lib/audioSession';
import { Haptics } from '@/lib/haptics';
import ChatBubble from '@/components/roleplay/ChatBubble';
import ObjectivesChecklist from '@/components/roleplay/ObjectivesChecklist';
import MicButton from '@/components/roleplay/MicButton';
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
  | 'done'
  | 'interrupted';

const ACTIVE_PHASES: Phase[] = ['guest_speaking', 'student_turn', 'recording', 'sending'];

export default function RoleplayScreen() {
  const { scenarioId } = useLocalSearchParams<{ scenarioId: string }>();
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
  const sessionStartRef = useRef<number>(Date.now());
  const liveRef = useRef('');
  const wireHistoryRef = useRef<WireMessage[]>([]);
  const scrollRef = useRef<ScrollView>(null);

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

    updatePhase('sending');
    wireHistoryRef.current.push({ role: 'user', content: text });

    const wireHistory: WireMessage[] = [];
    for (const t of turns) {
      wireHistory.push({ role: t.role === 'student' ? 'user' : 'assistant', content: t.text });
    }
    wireHistory.push({ role: 'user', content: text });

    try {
      const result = await sendRolePlayTurn({ scenario, messages: wireHistory });

      setCompletedIds(prev => {
        const next = new Set(prev);
        result.objectivesCompleted.forEach(id => next.add(id));
        return next;
      });

      appendTurn({ role: 'guest', text: result.guestReply });
      wireHistoryRef.current.push({ role: 'assistant', content: result.guestReply });

      const totalTurns = turns.length + 2;
      if (result.sessionShouldEnd || totalTurns >= MAX_TURNS) {
        await triggerGrading([...wireHistoryRef.current]);
      } else {
        speakGuest(result.guestReply);
      }
    } catch {
      setErrorMsg('Connection issue. Check your signal and try again.');
      updatePhase('error');
    }
  }, [scenario, turns, user]);

  async function triggerGrading(messages: WireMessage[]) {
    if (!scenario || !user) { updatePhase('done'); return; }
    updatePhase('grading');
    const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);

    try {
      const gradeResult = await gradeSession({ scenario, messages, durationSeconds });
      Haptics.success();
      setResult(gradeResult);
      router.replace(`/feedback/${gradeResult.attemptId}` as any);
    } catch {
      updatePhase('done');
    }
  }

  if (!scenario) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.errText}>Scenario not found.</Text>
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
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: Spacing.sm }}>
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
          <Text style={styles.gradingText}>Analysing fluency, vocabulary, grammar, task completion and register.</Text>
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
          <TouchableOpacity style={styles.startBtn} onPress={() => router.back()}>
            <Text style={styles.startBtnText}>Back to Practice</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
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
          <TouchableOpacity onPress={() => updatePhase('student_turn')} style={styles.retryBtn}>
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
        ) : (phase === 'student_turn' || phase === 'recording') ? (
          <MicButton
            onPressIn={handleMicPressIn}
            onPressOut={handleMicPressOut}
            isRecording={phase === 'recording'}
            transcript={liveTranscript}
          />
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
