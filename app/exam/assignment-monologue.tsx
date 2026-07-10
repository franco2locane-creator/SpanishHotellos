import { useState, useEffect, useRef } from 'react';
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
import { loadMock } from '@/lib/mockExam/loader';
import { useMockExamStore } from '@/stores/mockExamStore';
import { gradeMockAssignment } from '@/lib/api/grade';
import { ApiCallError } from '@/lib/api/apiError';
import { useAuthStore } from '@/stores/authStore';
import { setRecordingMode, setPlaybackMode } from '@/lib/audioSession';
import { Haptics } from '@/lib/haptics';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { PersonalPresentationData } from '@/types';
import type { WireMessage } from '@/lib/api/roleplay';

const SPEAK_SECONDS = 120;
const FOLLOW_UP_SECONDS = 30;
const FOLLOW_UP_COUNT = 2;

type Phase =
  | 'ready' | 'recording'
  | 'follow_up_speaking' | 'follow_up_recording'
  | 'grading' | 'done' | 'grading_error' | 'interrupted';

/** Picks follow-up questions favouring topics the monologue didn't already mention. */
function pickFollowUps(transcript: string, questions: string[], count: number): string[] {
  const t = transcript.toLowerCase();
  const scored = questions.map(q => {
    const keywords = q.toLowerCase().replace(/[¿?.,]/g, '').split(/\s+/).filter(w => w.length > 4);
    const mentioned = keywords.some(k => t.includes(k));
    return { q, mentioned };
  });
  const unmentioned = scored.filter(s => !s.mentioned).map(s => s.q);
  const mentioned = scored.filter(s => s.mentioned).map(s => s.q);
  return [...unmentioned, ...mentioned].slice(0, count);
}

export default function AssignmentMonologue() {
  const { mockId, assignmentIdx: idxStr } = useLocalSearchParams<{ mockId: string; assignmentIdx: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { exam, saveResult, advance, keywordNotes } = useMockExamStore();

  const idx = parseInt(idxStr ?? '0', 10);
  const currentMock = exam ?? loadMock(mockId ?? '');
  const assignment = currentMock?.assignments[idx];
  const data = assignment?.type === 'personal_presentation' ? assignment.data as PersonalPresentationData : null;
  const keywords = keywordNotes[idx] ?? '';

  const [phase, setPhase] = useState<Phase>('ready');
  const phaseRef = useRef<Phase>('ready');
  const [secondsLeft, setSecondsLeft] = useState(SPEAK_SECONDS);
  const [transcript, setTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [followUpIdx, setFollowUpIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveRef = useRef('');
  const sessionStartRef = useRef(0);
  const wireHistoryRef = useRef<WireMessage[]>([]);
  const lastGradingMessagesRef = useRef<WireMessage[]>([]);

  function updatePhase(p: Phase) {
    phaseRef.current = p;
    setPhase(p);
  }

  // Phone-call / interrupt detection — voids the attempt
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const active: Phase[] = ['recording', 'follow_up_speaking', 'follow_up_recording'];
      if ((nextState === 'background' || nextState === 'inactive') && active.includes(phaseRef.current)) {
        clearInterval(timerRef.current!);
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
    setTranscript(text);
  });

  useSpeechRecognitionEvent('end', () => {
    if (phaseRef.current === 'recording') {
      stopRecording();
      finishMonologue(liveRef.current);
    } else if (phaseRef.current === 'follow_up_recording') {
      clearInterval(timerRef.current!);
      setPlaybackMode();
      handleFollowUpAnswered(liveRef.current);
    }
  });

  async function beginRecording() {
    sessionStartRef.current = Date.now();
    wireHistoryRef.current = [];
    liveRef.current = '';
    setTranscript('');
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (perm.granted) {
      await setRecordingMode();
      ExpoSpeechRecognitionModule.start({ lang: 'es-ES', interimResults: true });
    }
    updatePhase('recording');
    setSecondsLeft(SPEAK_SECONDS);

    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          stopRecording();
          finishMonologue(liveRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function stopRecording() {
    clearInterval(timerRef.current!);
    ExpoSpeechRecognitionModule.stop();
    setPlaybackMode();
  }

  function handleFinishEarly() {
    stopRecording();
    finishMonologue(liveRef.current);
  }

  // ── Monologue done → decide follow-ups, or grade straight away ────────────

  function finishMonologue(raw: string) {
    const monologueText = raw.trim() || '(no speech detected)';
    wireHistoryRef.current = [{ role: 'user', content: monologueText }];

    const pool = data?.assessorQuestions ?? [];
    const picked = pickFollowUps(monologueText, pool, Math.min(FOLLOW_UP_COUNT, pool.length));
    if (picked.length === 0) {
      handleGrade();
      return;
    }
    setFollowUps(picked);
    setFollowUpIdx(0);
    askFollowUp(picked[0]);
  }

  function askFollowUp(question: string) {
    updatePhase('follow_up_speaking');
    Speech.speak(question, {
      language: 'es-ES', rate: 0.9,
      onDone: () => { void startFollowUpRecording(question); },
      onError: () => { void startFollowUpRecording(question); },
    });
  }

  async function startFollowUpRecording(question: string) {
    wireHistoryRef.current.push({ role: 'assistant', content: question });
    liveRef.current = '';
    setTranscript('');
    await setRecordingMode();
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (perm.granted) {
      ExpoSpeechRecognitionModule.start({ lang: 'es-ES', interimResults: true });
    }
    updatePhase('follow_up_recording');
    setSecondsLeft(FOLLOW_UP_SECONDS);
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          ExpoSpeechRecognitionModule.stop();
          setPlaybackMode();
          handleFollowUpAnswered(liveRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function handleFollowUpAnswered(raw: string) {
    wireHistoryRef.current.push({ role: 'user', content: raw.trim() || '(no speech detected)' });
    const nextIdx = followUpIdx + 1;
    if (nextIdx >= followUps.length) {
      handleGrade();
    } else {
      setFollowUpIdx(nextIdx);
      askFollowUp(followUps[nextIdx]);
    }
  }

  // ── Grading ────────────────────────────────────────────────────────────────

  async function handleGrade() {
    if (!assignment || !currentMock || !user) return;
    const messages = [...wireHistoryRef.current];
    lastGradingMessagesRef.current = messages;
    updatePhase('grading');
    const durationSeconds = Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 1000));

    const topics = data?.topics ?? [];
    const objectives = topics.map((t, i) => ({ id: `topic-${i}`, label: t }));

    try {
      const gradeResult = await gradeMockAssignment({
        assignmentType: 'personal_presentation',
        mockId: currentMock.id,
        assignmentIdx: idx,
        objectives,
        messages,
        durationSeconds,
        level: user.mockLevel,
      });

      saveResult(idx, {
        assignmentType: 'personal_presentation',
        score: gradeResult.totalScore,
        gradeResult,
        checklistHit: [],       // topic coverage isn't tracked live for a monologue — score/feedback reflect it
        checklistTotal: objectives,
      });
      Haptics.success();
      updatePhase('done');
    } catch (e) {
      const apiError = e instanceof ApiCallError ? e : null;
      setErrorMsg(apiError?.message ?? 'Something went wrong while grading. Please try again.');
      updatePhase('grading_error');
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

  useEffect(() => () => clearInterval(timerRef.current!), []);

  if (!data || !assignment) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.errText}>Assignment not found.</Text>
      </SafeAreaView>
    );
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  if (phase === 'interrupted') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>📵</Text>
          <Text style={styles.centerTitle}>Exam paused</Text>
          <Text style={styles.centerText}>
            Something interrupted your presentation — this attempt has been voided fairly. Take a breath and retry when you're ready.
          </Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => { liveRef.current = ''; setTranscript(''); updatePhase('ready'); }}>
            <Text style={styles.startBtnText}>Retry this assignment</Text>
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
          <Text style={styles.centerTitle}>Grading…</Text>
          <Text style={styles.centerText}>Analysing your presentation and follow-up answers.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'grading_error') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>⚠️</Text>
          <Text style={styles.centerTitle}>Couldn't grade this presentation</Text>
          <Text style={styles.centerText}>{errorMsg || 'Something went wrong while grading. Try again.'}</Text>
          <TouchableOpacity style={styles.nextBtn} onPress={handleGrade}>
            <Text style={styles.nextBtnText}>Retry grading</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNext} style={{ marginTop: Spacing.sm }}>
            <Text style={[styles.centerText, { textDecorationLine: 'underline' }]}>
              Skip — this assignment won't be scored
            </Text>
          </TouchableOpacity>
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
          <Text style={styles.centerTitle}>Presentación completa</Text>
          <Text style={styles.scoreLabel}>{scoreDisplay} / 100</Text>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>{isLast ? 'See results' : 'Next assignment'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'ready') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Presentación personal</Text>
          <Text style={styles.headerSub}>
            Cover all three areas below — the assessor may ask follow-up questions about
            whatever you don't mention.
          </Text>
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          {data.topics.map((topic, i) => (
            <View key={i} style={styles.topicCard}>
              <Text style={styles.topicText}>{topic}</Text>
            </View>
          ))}
          {keywords.trim().length > 0 && (
            <View style={styles.keywordBanner}>
              <Text style={styles.keywordBannerText}>📝 {keywords}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.startBtn}
            onPress={beginRecording}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Empezar"
          >
            <Text style={styles.startBtnText}>Empezar</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // recording / follow_up_speaking / follow_up_recording
  const isFollowUp = phase === 'follow_up_speaking' || phase === 'follow_up_recording';

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Presentación personal</Text>
        <Text style={styles.headerSub} numberOfLines={2}>
          {isFollowUp ? `Follow-up ${followUpIdx + 1}/${followUps.length}` : 'Cover all three topic areas'}
        </Text>
      </View>

      {keywords.trim().length > 0 && (
        <View style={styles.keywordBanner}>
          <Text style={styles.keywordBannerText} numberOfLines={1}>📝 {keywords}</Text>
        </View>
      )}

      <View style={styles.center}>
        {phase === 'follow_up_speaking' ? (
          <>
            <Text style={{ fontSize: 44 }}>🗣️</Text>
            <Text style={styles.phaseLabel}>Listen to the question…</Text>
            <Text style={styles.followUpQuestion}>{followUps[followUpIdx]}</Text>
          </>
        ) : (
          <>
            <Text
              style={[styles.bigTimer, secondsLeft <= 15 && styles.timerWarning]}
              accessibilityLabel={`${mm} minutes ${ss} seconds remaining`}
              accessibilityLiveRegion={secondsLeft <= 15 ? 'polite' : 'none'}
            >
              {mm}:{ss}
            </Text>
            <Text style={styles.phaseLabel}>
              {isFollowUp ? followUps[followUpIdx] : 'Speak now'}
            </Text>
            <View style={styles.micPulse} accessibilityLabel="Recording in progress">
              <Text style={styles.micEmoji}>🎙</Text>
            </View>
            {transcript ? (
              <View style={styles.liveBox} accessibilityLiveRegion="polite">
                <Text style={styles.liveText} numberOfLines={4}>{transcript}</Text>
              </View>
            ) : null}
            {phase === 'recording' && (
              <TouchableOpacity
                style={styles.finishBtn}
                onPress={handleFinishEarly}
                accessibilityRole="button"
                accessibilityLabel="Finish presentation early"
              >
                <Text style={styles.finishBtnText}>Finish early</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.navy, padding: Spacing.lg },
  headerTitle: { fontSize: Typography.heading, fontWeight: Typography.bold, color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: Typography.body, color: 'rgba(255,255,255,0.75)', lineHeight: 22 },
  keywordBanner: {
    backgroundColor: '#FFF8EC', paddingHorizontal: Spacing.lg, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: '#F0E4C8',
  },
  keywordBannerText: { fontSize: Typography.caption, color: Colors.gold, fontWeight: Typography.medium },
  scroll: { padding: Spacing.lg, paddingBottom: 60 },
  topicCard: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg,
    marginBottom: Spacing.md, borderWidth: 2, borderColor: Colors.border, ...Shadows.sm,
  },
  topicText: { fontSize: Typography.body, color: Colors.textPrimary, lineHeight: 24 },
  startBtn: { backgroundColor: Colors.navy, borderRadius: Radii.lg, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  startBtnText: { color: '#fff', fontWeight: Typography.bold, fontSize: Typography.body },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.lg, padding: Spacing.xl },
  bigTimer: { fontSize: 72, fontWeight: Typography.bold, color: Colors.navy, letterSpacing: 2 },
  timerWarning: { color: Colors.error },
  phaseLabel: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  followUpQuestion: { fontSize: Typography.heading, fontWeight: Typography.semibold, color: Colors.navy, textAlign: 'center', lineHeight: 28 },
  micPulse: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.error,
  },
  micEmoji: { fontSize: 44 },
  liveBox: { backgroundColor: Colors.surface, borderRadius: Radii.md, padding: Spacing.md, width: '100%' },
  liveText: { fontSize: Typography.body, color: Colors.textPrimary, lineHeight: 24 },
  finishBtn: { backgroundColor: Colors.textSecondary, borderRadius: Radii.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm },
  finishBtnText: { color: '#fff', fontWeight: Typography.medium, fontSize: Typography.body },
  centerTitle: { fontSize: Typography.heading, fontWeight: Typography.bold, color: Colors.navy, textAlign: 'center' },
  centerText: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  scoreEmoji: { fontSize: 56 },
  scoreLabel: { fontSize: 40, fontWeight: Typography.bold, color: Colors.gold },
  nextBtn: { backgroundColor: Colors.navy, borderRadius: Radii.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  nextBtnText: { color: '#fff', fontWeight: Typography.semibold, fontSize: Typography.body },
  errText: { padding: Spacing.xl, color: Colors.error, textAlign: 'center' },
});
