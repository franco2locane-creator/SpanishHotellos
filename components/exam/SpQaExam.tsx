import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import ExamHeader from './ExamHeader';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';
import type { QaQuestion } from '@/lib/mockExam/content';
import type { WireMessage } from '@/lib/api/roleplay';

const Q_SECONDS = 30;

type QPhase = 'intro' | 'ready' | 'recording' | 'next';

type Props = {
  questions: QaQuestion[];
  onComplete: (messages: WireMessage[], durationSeconds: number) => void;
  onExit: () => void;
};

export default function SpQaExam({ questions, onComplete, onExit }: Props) {
  const [qi, setQi] = useState(0);
  const [qPhase, setQPhase] = useState<QPhase>('intro');
  const [timeLeft, setTimeLeft] = useState(Q_SECONDS);
  const [totalLeft, setTotalLeft] = useState(questions.length * Q_SECONDS);
  const startRef = useRef(Date.now());
  const answersRef = useRef<string[]>(Array(questions.length).fill(''));
  const currentRef = useRef('');

  // Total countdown
  useEffect(() => {
    const t = setInterval(() => setTotalLeft(p => Math.max(p - 1, 0)), 1000);
    return () => clearInterval(t);
  }, []);

  // Per-question countdown (active when recording)
  useEffect(() => {
    if (qPhase !== 'recording') return;
    setTimeLeft(Q_SECONDS);
    const t = setInterval(() => setTimeLeft(p => Math.max(p - 1, 0)), 1000);
    return () => clearInterval(t);
  }, [qi, qPhase]);

  useEffect(() => {
    if (timeLeft === 0 && qPhase === 'recording') stopAndAdvance();
  }, [timeLeft, qPhase]);

  useSpeechRecognitionEvent('result', e => {
    currentRef.current = e.results?.[0]?.transcript ?? '';
  });

  useSpeechRecognitionEvent('end', () => {
    if (qPhase === 'recording') stopAndAdvance();
  });

  function speakQuestion(q: QaQuestion) {
    Speech.speak(q.question, { language: 'es-ES', rate: 0.85 });
  }

  async function startRecording() {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) return;
    currentRef.current = '';
    ExpoSpeechRecognitionModule.start({ lang: 'es-ES', interimResults: true });
    setQPhase('recording');
  }

  const stopAndAdvance = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
    answersRef.current[qi] = currentRef.current;
    currentRef.current = '';

    if (qi + 1 >= questions.length) {
      finish();
    } else {
      setQi(i => i + 1);
      setQPhase('next');
    }
  }, [qi, questions.length]);

  function finish() {
    setQPhase('next');
    const messages: WireMessage[] = [];
    questions.forEach((q, i) => {
      messages.push({ role: 'assistant', content: q.question });
      messages.push({ role: 'user', content: answersRef.current[i] || '(sin respuesta)' });
    });
    onComplete(messages, Math.round((Date.now() - startRef.current) / 1000));
  }

  const q = questions[qi];

  if (qPhase === 'intro') {
    return (
      <SafeAreaView style={styles.screen}>
        <ExamHeader title="Spontaneous Q&A" secondsLeft={totalLeft} onExit={onExit} />
        <View style={styles.body}>
          <Text style={styles.introTitle}>6 rapid questions</Text>
          <Text style={styles.introSub}>
            The examiner will ask a question in Spanish. You have 30 seconds to answer each one.
            Tap "Ready for Q1" when you are prepared.
          </Text>
          <TouchableOpacity style={styles.readyBtn} onPress={() => { setQPhase('ready'); speakQuestion(q); }}>
            <Text style={styles.readyBtnText}>Ready for Q1</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ExamHeader
        title={`Q${qi + 1} of ${questions.length}`}
        secondsLeft={qPhase === 'recording' ? timeLeft : totalLeft}
        phaseLabel={qPhase === 'recording' ? 'Answer now' : undefined}
        onExit={onExit}
      />

      <View style={styles.body}>
        <View style={styles.questionCard}>
          <Text style={styles.questionLabel}>EXAMINER ASKS:</Text>
          <Text style={styles.questionText}>{q.question}</Text>
          <TouchableOpacity onPress={() => speakQuestion(q)} style={styles.speakBtn}>
            <Text style={styles.speakBtnText}>🔊 Repeat question</Text>
          </TouchableOpacity>
        </View>

        {qPhase === 'ready' && (
          <TouchableOpacity style={styles.recordBtn} onPress={startRecording}>
            <Text style={styles.recordBtnText}>🎙️  Start answering</Text>
          </TouchableOpacity>
        )}

        {qPhase === 'recording' && (
          <View style={styles.recordingRow}>
            <View style={styles.dot} />
            <Text style={styles.recordingText}>Recording — answer in Spanish ({timeLeft}s remaining)</Text>
          </View>
        )}

        {qPhase === 'next' && (
          <View style={styles.nextRow}>
            <ActivityIndicator color={Colors.navy} />
            <Text style={styles.nextText}>Next question…</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F5F0' },
  body: { flex: 1, padding: Spacing.lg, justifyContent: 'center', gap: Spacing.lg },
  introTitle: { fontSize: Typography.heading, fontWeight: '700', color: Colors.navy, textAlign: 'center' },
  introSub: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  readyBtn: { backgroundColor: Colors.navy, borderRadius: Radii.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  readyBtnText: { color: '#fff', fontWeight: '600', fontSize: Typography.body },
  questionCard: {
    backgroundColor: Colors.surface, borderRadius: Radii.xl, padding: Spacing.xl, gap: Spacing.md,
    borderLeftWidth: 4, borderLeftColor: Colors.navy,
  },
  questionLabel: { fontSize: Typography.caption, fontWeight: '700', color: Colors.navy, textTransform: 'uppercase', letterSpacing: 1 },
  questionText: { fontSize: Typography.heading, color: Colors.textPrimary, lineHeight: 30 },
  speakBtn: { alignSelf: 'flex-start' },
  speakBtnText: { fontSize: Typography.caption, color: Colors.textMuted },
  recordBtn: { backgroundColor: Colors.gold, borderRadius: Radii.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  recordBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.body },
  recordingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#DC2626' },
  recordingText: { fontSize: Typography.body, color: Colors.textSecondary },
  nextRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  nextText: { fontSize: Typography.body, color: Colors.textMuted },
});
