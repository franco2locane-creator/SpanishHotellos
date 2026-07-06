import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { sendRolePlayTurn, type WireMessage } from '@/lib/api/roleplay';
import MicButton from '@/components/roleplay/MicButton';
import ChatBubble from '@/components/roleplay/ChatBubble';
import ExamHeader from './ExamHeader';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';
import type { Scenario } from '@/types';

const MAX_TURNS = 8;
const TOTAL_SECONDS = 480;
const SPEED_RATE: Record<string, number> = { slow: 0.7, normal: 0.9, fast: 1.1 };
const GARBAGE_REPLY = 'No le he entendido bien, ¿puede repetirlo?';

type Turn = { role: 'guest' | 'student'; text: string };
type Phase = 'idle' | 'guest_speaking' | 'student_turn' | 'recording' | 'sending' | 'done';

type Props = {
  scenario: Scenario;
  onComplete: (messages: WireMessage[], durationSeconds: number) => void;
  onExit: () => void;
};

export default function GuidedExam({ scenario, onComplete, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [started, setStarted] = useState(false);
  const startRef = useRef(Date.now());
  const wireRef = useRef<WireMessage[]>([]);
  const liveRef = useRef('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => {
      setSecondsLeft(p => {
        if (p <= 1) { finishSession(); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [started]);

  useSpeechRecognitionEvent('result', e => {
    liveRef.current = e.results?.[0]?.transcript ?? '';
  });
  useSpeechRecognitionEvent('end', () => {
    if (phase === 'recording') handleStudentFinished(liveRef.current);
  });

  function speakGuest(text: string) {
    setPhase('guest_speaking');
    Speech.speak(text, {
      language: 'es-ES',
      rate: SPEED_RATE[scenario.guestPersona.speakingSpeed ?? 'normal'],
      onDone: () => setPhase('student_turn'),
      onError: () => setPhase('student_turn'),
    });
  }

  function appendTurn(turn: Turn) {
    setTurns(prev => [...prev, turn]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }

  function startSession() {
    setStarted(true);
    startRef.current = Date.now();
    wireRef.current = [];
    appendTurn({ role: 'guest', text: scenario.openingLine });
    speakGuest(scenario.openingLine);
  }

  function finishSession() {
    Speech.stop();
    ExpoSpeechRecognitionModule.stop();
    setPhase('done');
    onComplete(wireRef.current, Math.round((Date.now() - startRef.current) / 1000));
  }

  async function handleMicPressIn() {
    if (phase !== 'student_turn') return;
    liveRef.current = '';
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) return;
    ExpoSpeechRecognitionModule.start({ lang: 'es-ES', interimResults: true });
    setPhase('recording');
  }

  function handleMicPressOut() {
    if (phase === 'recording') ExpoSpeechRecognitionModule.stop();
  }

  const handleStudentFinished = useCallback(async (raw: string) => {
    const text = raw.trim();
    const isGarbage = text.length < 3;
    appendTurn({ role: 'student', text: isGarbage ? '(unclear)' : text });

    if (isGarbage) {
      appendTurn({ role: 'guest', text: GARBAGE_REPLY });
      speakGuest(GARBAGE_REPLY);
      return;
    }

    setPhase('sending');
    wireRef.current.push({ role: 'user', content: text });

    const history = [...wireRef.current];
    try {
      const result = await sendRolePlayTurn({ scenario, messages: history });
      wireRef.current.push({ role: 'assistant', content: result.guestReply });
      appendTurn({ role: 'guest', text: result.guestReply });

      const studentCount = turns.filter(t => t.role === 'student').length + 1;
      if (result.sessionShouldEnd || studentCount >= MAX_TURNS) {
        finishSession();
      } else {
        speakGuest(result.guestReply);
      }
    } catch {
      setPhase('student_turn'); // no retry in exam mode
    }
  }, [scenario, turns]);

  return (
    <SafeAreaView style={styles.screen}>
      <ExamHeader title={scenario.title} secondsLeft={secondsLeft} phaseLabel="Exam conditions" onExit={onExit} />

      <ScrollView ref={scrollRef} style={styles.chat} contentContainerStyle={styles.chatContent} showsVerticalScrollIndicator={false}>
        {turns.map((t, i) => (
          <ChatBubble key={i} role={t.role} text={t.text} speakingSpeed={t.role === 'guest' ? scenario.guestPersona.speakingSpeed : undefined} />
        ))}
        {phase === 'sending' && (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color={Colors.navy} />
            <Text style={styles.typingText}>Guest is responding…</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {phase === 'idle' ? (
          <TouchableOpacity style={styles.startBtn} onPress={startSession}>
            <Text style={styles.startBtnText}>Start exam</Text>
          </TouchableOpacity>
        ) : (phase === 'student_turn' || phase === 'recording') ? (
          <MicButton
            onPressIn={handleMicPressIn}
            onPressOut={handleMicPressOut}
            isRecording={phase === 'recording'}
            transcript=""  // exam mode: no transcript shown
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F5F0' },
  chat: { flex: 1 },
  chatContent: { paddingVertical: Spacing.md },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  typingText: { fontSize: Typography.caption, color: Colors.textMuted, fontStyle: 'italic' },
  footer: { paddingBottom: Spacing.lg, alignItems: 'center', backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: '#E8E3DC' },
  startBtn: { marginTop: Spacing.md, backgroundColor: Colors.navy, borderRadius: Radii.lg, paddingHorizontal: 32, paddingVertical: Spacing.md },
  startBtnText: { color: '#fff', fontWeight: '600', fontSize: Typography.body },
});
