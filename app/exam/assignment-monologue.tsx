import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, AppState, type AppStateStatus,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { loadMock } from '@/lib/mockExam/loader';
import { useMockExamStore } from '@/stores/mockExamStore';
import { gradeMockAssignment } from '@/lib/api/grade';
import { setRecordingMode, setPlaybackMode } from '@/lib/audioSession';
import { Haptics } from '@/lib/haptics';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { PersonalPresentationData } from '@/types';

const SPEAK_SECONDS = 120;

type Phase = 'pick_topic' | 'countdown' | 'recording' | 'grading' | 'done' | 'error' | 'interrupted';

export default function AssignmentMonologue() {
  const { mockId, assignmentIdx: idxStr } = useLocalSearchParams<{ mockId: string; assignmentIdx: string }>();
  const router = useRouter();
  const { exam, saveResult, advance } = useMockExamStore();

  const idx = parseInt(idxStr ?? '0', 10);
  const currentMock = exam ?? loadMock(mockId ?? '');
  const assignment = currentMock?.assignments[idx];
  const data = assignment?.type === 'personal_presentation' ? assignment.data as PersonalPresentationData : null;

  const [phase, setPhase] = useState<Phase>('pick_topic');
  const phaseRef = useRef<Phase>('pick_topic');
  const [topicIdx, setTopicIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(SPEAK_SECONDS);
  const secondsLeftRef = useRef(SPEAK_SECONDS);
  const [transcript, setTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveRef = useRef('');
  const sessionStartRef = useRef(0);

  function updatePhase(p: Phase) {
    phaseRef.current = p;
    setPhase(p);
  }

  // Phone-call / interrupt detection — pauses timer and voids recording attempt
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if ((nextState === 'background' || nextState === 'inactive') && (phaseRef.current === 'recording' || phaseRef.current === 'countdown')) {
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
      handleGrade(liveRef.current);
    }
  });

  function startCountdown() {
    updatePhase('countdown');
    secondsLeftRef.current = SPEAK_SECONDS;
    setSecondsLeft(SPEAK_SECONDS);
    timerRef.current = setInterval(() => {
      secondsLeftRef.current -= 1;
      setSecondsLeft(secondsLeftRef.current);
      if (secondsLeftRef.current <= 0) {
        clearInterval(timerRef.current!);
        beginRecording();
      }
    }, 1000);
  }

  async function beginRecording() {
    sessionStartRef.current = Date.now();
    liveRef.current = '';
    setTranscript('');
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (perm.granted) {
      await setRecordingMode();
      ExpoSpeechRecognitionModule.start({ lang: 'es-ES', interimResults: true });
    }
    updatePhase('recording');
    secondsLeftRef.current = SPEAK_SECONDS;
    setSecondsLeft(SPEAK_SECONDS);

    timerRef.current = setInterval(() => {
      secondsLeftRef.current -= 1;
      setSecondsLeft(secondsLeftRef.current);
      if (secondsLeftRef.current <= 0) {
        clearInterval(timerRef.current!);
        stopRecording();
        handleGrade(liveRef.current);
      }
    }, 1000);
  }

  function stopRecording() {
    clearInterval(timerRef.current!);
    ExpoSpeechRecognitionModule.stop();
    setPlaybackMode();
  }

  function handleFinishEarly() {
    stopRecording();
    handleGrade(liveRef.current);
  }

  async function handleGrade(raw: string) {
    if (!assignment || !currentMock) return;
    updatePhase('grading');
    const durationSeconds = Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 1000));

    const topics = data?.topics ?? [];
    const objectives = topics.map((t, i) => ({ id: `topic-${i}`, label: t }));
    const messages = [{ role: 'user' as const, content: raw || '(no speech detected)' }];

    try {
      const gradeResult = await gradeMockAssignment({
        assignmentType: 'personal_presentation',
        mockId: currentMock.id,
        assignmentIdx: idx,
        objectives,
        messages,
        durationSeconds,
      });

      saveResult(idx, { assignmentType: 'personal_presentation', score: gradeResult.totalScore, gradeResult });
      Haptics.success();
      updatePhase('done');
    } catch {
      updatePhase('error');
      setErrorMsg('Grading failed. You can still continue.');
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
          <TouchableOpacity style={styles.startBtn} onPress={() => { liveRef.current = ''; setTranscript(''); updatePhase('pick_topic'); }}>
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
          <Text style={styles.centerText}>Analysing your presentation.</Text>
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

  if (phase === 'error') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.errText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>Continue anyway</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'pick_topic') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Presentación personal</Text>
          <Text style={styles.headerSub}>Choose one topic — you have 2 minutes to present it.</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          {data.topics.map((topic, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.topicCard, topicIdx === i && styles.topicCardSelected]}
              onPress={() => setTopicIdx(i)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ selected: topicIdx === i }}
              accessibilityLabel={topic}
            >
              <Text style={[styles.topicText, topicIdx === i && styles.topicTextSelected]}>{topic}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.startBtn}
            onPress={startCountdown}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Start 2-minute presentation"
          >
            <Text style={styles.startBtnText}>Start 2-minute presentation</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Presentación personal</Text>
        <Text style={styles.headerSub} numberOfLines={2}>{data.topics[topicIdx]}</Text>
      </View>

      <View style={styles.center}>
        <Text
          style={[styles.bigTimer, secondsLeft <= 30 && styles.timerWarning]}
          accessibilityLabel={`${mm} minutes ${ss} seconds remaining`}
          accessibilityLiveRegion={secondsLeft <= 30 ? 'polite' : 'none'}
        >
          {mm}:{ss}
        </Text>
        <Text style={styles.phaseLabel}>
          {phase === 'countdown' ? 'Get ready…' : 'Speak now'}
        </Text>

        {phase === 'recording' && (
          <>
            <View style={styles.micPulse} accessibilityLabel="Recording in progress">
              <Text style={styles.micEmoji}>🎙</Text>
            </View>
            {transcript ? (
              <View style={styles.liveBox} accessibilityLiveRegion="polite">
                <Text style={styles.liveText} numberOfLines={4}>{transcript}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={styles.finishBtn}
              onPress={handleFinishEarly}
              accessibilityRole="button"
              accessibilityLabel="Finish presentation early"
            >
              <Text style={styles.finishBtnText}>Finish early</Text>
            </TouchableOpacity>
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
  scroll: { padding: Spacing.lg, paddingBottom: 60 },
  topicCard: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg,
    marginBottom: Spacing.md, borderWidth: 2, borderColor: Colors.border, ...Shadows.sm,
  },
  topicCardSelected: { borderColor: Colors.navy, backgroundColor: '#EEF3F9' },
  topicText: { fontSize: Typography.body, color: Colors.textPrimary, lineHeight: 24 },
  topicTextSelected: { color: Colors.navy, fontWeight: Typography.semibold },
  startBtn: { backgroundColor: Colors.navy, borderRadius: Radii.lg, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  startBtnText: { color: '#fff', fontWeight: Typography.bold, fontSize: Typography.body },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.lg, padding: Spacing.xl },
  bigTimer: { fontSize: 72, fontWeight: Typography.bold, color: Colors.navy, letterSpacing: 2 },
  timerWarning: { color: Colors.error },
  phaseLabel: { fontSize: Typography.body, color: Colors.textSecondary },
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
