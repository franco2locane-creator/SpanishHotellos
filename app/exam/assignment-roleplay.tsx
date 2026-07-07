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
import { loadMock, assignmentToScenario } from '@/lib/mockExam/loader';
import { useMockExamStore } from '@/stores/mockExamStore';
import { sendRolePlayTurn, type WireMessage } from '@/lib/api/roleplay';
import { gradeMockAssignment } from '@/lib/api/grade';
import { useAuthStore } from '@/stores/authStore';
import { setRecordingMode, setPlaybackMode } from '@/lib/audioSession';
import { Haptics } from '@/lib/haptics';
import ChatBubble from '@/components/roleplay/ChatBubble';
import MicButton from '@/components/roleplay/MicButton';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';

const MAX_TURNS = 14;
const SPEED_RATE: Record<string, number> = { slow: 0.7, normal: 0.9, fast: 1.1 };

type Turn = { role: 'guest' | 'student'; text: string };
type Phase = 'idle' | 'guest_speaking' | 'student_turn' | 'recording' | 'sending' | 'grading' | 'error' | 'done' | 'interrupted';

const ACTIVE_PHASES: Phase[] = ['guest_speaking', 'student_turn', 'recording', 'sending'];

export default function AssignmentRoleplay() {
  const { mockId, assignmentIdx: idxStr } = useLocalSearchParams<{ mockId: string; assignmentIdx: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { exam, saveResult, advance, currentIdx } = useMockExamStore();

  const idx = parseInt(idxStr ?? '0', 10);
  const currentMock = exam ?? loadMock(mockId ?? '');
  const assignment = currentMock?.assignments[idx];
  const scenario = assignment && assignment.type !== 'personal_presentation'
    ? assignmentToScenario(assignment, mockId ?? '', user?.isPremium ?? false)
    : null;

  const [phase, setPhase] = useState<Phase>('idle');
  const phaseRef = useRef<Phase>('idle');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const wireHistoryRef = useRef<WireMessage[]>([]);
  const sessionStartRef = useRef(Date.now());
  const liveRef = useRef('');
  const scrollRef = useRef<ScrollView>(null);

  function updatePhase(p: Phase) {
    phaseRef.current = p;
    setPhase(p);
  }

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

  useSpeechRecognitionEvent('result', (e) => {
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
      language: 'es-ES', rate,
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
  }

  const handleStudentFinished = useCallback(async (raw: string) => {
    if (!scenario || !assignment) return;
    const text = raw.trim();
    const isGarbage = text.length < 3;
    const displayText = isGarbage ? '(unclear)' : text;

    appendTurn({ role: 'student', text: displayText });

    if (isGarbage) {
      const reply = 'No le he entendido bien, ¿puede repetirlo?';
      appendTurn({ role: 'guest', text: reply });
      speakGuest(reply);
      return;
    }

    updatePhase('sending');

    const wireHistory: WireMessage[] = [];
    for (const t of turns) {
      wireHistory.push({ role: t.role === 'student' ? 'user' : 'assistant', content: t.text });
    }
    wireHistory.push({ role: 'user', content: text });
    wireHistoryRef.current = wireHistory;

    try {
      const result = await sendRolePlayTurn({ scenario, messages: wireHistory });
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
  }, [scenario, turns, assignment]);

  async function triggerGrading(messages: WireMessage[]) {
    if (!assignment || !currentMock) return;
    updatePhase('grading');
    const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);

    try {
      const objectives = scenario?.objectives ?? [];
      const gradeResult = await gradeMockAssignment({
        assignmentType: assignment.type,
        mockId: currentMock.id,
        assignmentIdx: idx,
        objectives,
        messages,
        durationSeconds: Math.max(durationSeconds, 1),
      });

      saveResult(idx, { assignmentType: assignment.type, score: gradeResult.totalScore, gradeResult });
      Haptics.success();
      updatePhase('done');
    } catch {
      updatePhase('error');
      setErrorMsg('Grading failed. You can still continue to the next assignment.');
    }
  }

  function handleNext() {
    advance();
    if (!currentMock) return;
    const nextIdx = idx + 1;
    if (nextIdx >= currentMock.assignments.length) {
      router.replace('/exam/mock-summary' as any);
    } else {
      router.replace(`/exam/prep?mockId=${currentMock.id}&assignmentIdx=${nextIdx}` as any);
    }
  }

  if (!assignment || !scenario) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.errText}>Assignment not found.</Text>
      </SafeAreaView>
    );
  }

  if (phase === 'interrupted') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>📵</Text>
          <Text style={styles.centerTitle}>Exam paused</Text>
          <Text style={styles.centerText}>
            Something interrupted your exam — this attempt has been voided fairly. No penalties. Take a breath and retry when you're ready.
          </Text>
          <TouchableOpacity style={styles.nextBtn} onPress={() => { setTurns([]); wireHistoryRef.current = []; updatePhase('idle'); }}>
            <Text style={styles.nextBtnText}>Retry this assignment</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'grading') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.centerTitle}>Grading assignment…</Text>
          <Text style={styles.centerText}>Analysing your Spanish across all five criteria.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'done') {
    const result = useMockExamStore.getState().results[idx];
    const scoreDisplay = result ? Math.round(result.score * 5) : '—';
    const isLast = idx >= (currentMock?.assignments.length ?? 1) - 1;

    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.scoreEmoji}>{Number(scoreDisplay) >= 60 ? '✓' : '○'}</Text>
          <Text style={styles.centerTitle}>Assignment complete</Text>
          <Text style={styles.scoreLabel}>{scoreDisplay} / 100</Text>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>{isLast ? 'See results' : 'Next assignment'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>{scenario.title}</Text>
        <Text style={styles.turnCount}>
          {turns.filter(t => t.role === 'student').length} / {MAX_TURNS / 2}
        </Text>
      </View>

      <ScrollView ref={scrollRef} style={styles.chat} contentContainerStyle={styles.chatContent} showsVerticalScrollIndicator={false}>
        {turns.map((t, i) => (
          <ChatBubble key={i} role={t.role} text={t.text}
            speakingSpeed={t.role === 'guest' ? scenario.guestPersona.speakingSpeed : undefined} />
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
            accessibilityLabel="Start the assignment"
          >
            <Text style={styles.startBtnText}>Start</Text>
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
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.navy,
  },
  headerTitle: { flex: 1, color: '#fff', fontWeight: Typography.semibold, fontSize: Typography.body },
  turnCount: { fontSize: Typography.caption, color: 'rgba(255,255,255,0.7)' },
  chat: { flex: 1 },
  chatContent: { paddingVertical: Spacing.md },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  typingText: { fontSize: Typography.caption, color: Colors.textMuted, fontStyle: 'italic' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FEE2E2', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  errorBannerText: { flex: 1, fontSize: Typography.caption, color: Colors.error },
  retryBtn: { backgroundColor: Colors.error, borderRadius: Radii.sm, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  retryText: { color: '#fff', fontSize: Typography.caption, fontWeight: Typography.semibold },
  footer: { paddingBottom: Spacing.lg, alignItems: 'center', backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: '#E8E3DC' },
  startBtn: { marginTop: Spacing.md, backgroundColor: Colors.navy, borderRadius: Radii.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  startBtnText: { color: '#fff', fontWeight: Typography.semibold, fontSize: Typography.body },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.lg, padding: Spacing.xl },
  centerTitle: { fontSize: Typography.heading, fontWeight: Typography.bold, color: Colors.navy, textAlign: 'center' },
  centerText: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  scoreEmoji: { fontSize: 56 },
  scoreLabel: { fontSize: 40, fontWeight: Typography.bold, color: Colors.gold },
  nextBtn: { backgroundColor: Colors.navy, borderRadius: Radii.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  nextBtnText: { color: '#fff', fontWeight: Typography.semibold, fontSize: Typography.body },
  errText: { padding: Spacing.xl, color: Colors.error },
});
