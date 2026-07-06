import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import ExamHeader from './ExamHeader';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';
import type { MonologueTopic } from '@/lib/mockExam/content';
import type { WireMessage } from '@/lib/api/roleplay';

type Phase = 'prep' | 'speaking' | 'done';

type Props = {
  topic: MonologueTopic;
  onComplete: (messages: WireMessage[], durationSeconds: number) => void;
  onExit: () => void;
};

export default function MonologueCard({ topic, onComplete, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('prep');
  const [prepLeft, setPrepLeft] = useState(120);
  const [speakLeft, setSpeakLeft] = useState(180);
  const speakingRef = useRef(false);
  const startRef = useRef(0);
  const partsRef = useRef<string[]>([]);
  const currentRef = useRef('');

  // Prep countdown
  useEffect(() => {
    if (phase !== 'prep') return;
    const t = setInterval(() => setPrepLeft(p => Math.max(p - 1, 0)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (prepLeft === 0 && phase === 'prep') beginSpeaking();
  }, [prepLeft, phase]);

  // Speaking countdown
  useEffect(() => {
    if (phase !== 'speaking') return;
    const t = setInterval(() => setSpeakLeft(p => Math.max(p - 1, 0)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (speakLeft === 0 && phase === 'speaking') finishSpeaking();
  }, [speakLeft, phase]);

  // Looping STT: accumulate transcript across sessions
  useSpeechRecognitionEvent('result', e => {
    currentRef.current = e.results?.[0]?.transcript ?? '';
  });

  useSpeechRecognitionEvent('end', () => {
    if (!speakingRef.current) return;
    if (currentRef.current) { partsRef.current.push(currentRef.current); currentRef.current = ''; }
    ExpoSpeechRecognitionModule.start({ lang: 'es-ES', interimResults: true });
  });

  async function beginSpeaking() {
    setPhase('speaking');
    startRef.current = Date.now();
    speakingRef.current = true;
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (perm.granted) ExpoSpeechRecognitionModule.start({ lang: 'es-ES', interimResults: true });
  }

  const finishSpeaking = useCallback(() => {
    if (phase === 'done') return;
    speakingRef.current = false;
    ExpoSpeechRecognitionModule.stop();
    setPhase('done');

    const full = [...partsRef.current, currentRef.current].filter(Boolean).join(' ');
    const duration = Math.round((Date.now() - startRef.current) / 1000) + 120;
    const messages: WireMessage[] = [
      { role: 'assistant', content: `[Tema: ${topic.topic}. Pista: ${topic.hint}]` },
      { role: 'user', content: full || '(sin respuesta)' },
    ];
    onComplete(messages, duration);
  }, [phase, topic, onComplete]);

  const secondsLeft = phase === 'prep' ? prepLeft : speakLeft;
  const phaseLabel = phase === 'prep' ? 'Preparation' : 'Speaking — recording active';

  return (
    <SafeAreaView style={styles.screen}>
      <ExamHeader
        title="Monologue"
        secondsLeft={secondsLeft}
        phaseLabel={phaseLabel}
        onExit={onExit}
      />

      <View style={styles.body}>
        {/* Topic card */}
        <View style={styles.topicCard}>
          <Text style={styles.topicLabel}>YOUR TOPIC</Text>
          <Text style={styles.topicText}>{topic.topic}</Text>
          <Text style={styles.hintLabel}>Structure hint</Text>
          <Text style={styles.hintText}>{topic.hint}</Text>
        </View>

        {phase === 'speaking' && (
          <View style={styles.recordingRow}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording in progress — speak clearly</Text>
          </View>
        )}

        {phase === 'prep' && (
          <Text style={styles.prepHint}>
            Read the topic. You have {prepLeft}s to prepare before speaking starts automatically.
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F5F0' },
  body: { flex: 1, padding: Spacing.lg, justifyContent: 'center', gap: Spacing.xl },
  topicCard: {
    backgroundColor: Colors.surface, borderRadius: Radii.xl,
    padding: Spacing.xl, gap: Spacing.sm,
    borderLeftWidth: 4, borderLeftColor: Colors.gold,
  },
  topicLabel: { fontSize: Typography.caption, fontWeight: '700', color: Colors.gold, textTransform: 'uppercase', letterSpacing: 1 },
  topicText: { fontSize: Typography.heading, fontWeight: '700', color: Colors.navy, lineHeight: 32 },
  hintLabel: { fontSize: Typography.caption, color: Colors.textMuted, marginTop: Spacing.sm },
  hintText: { fontSize: Typography.body, color: Colors.textSecondary, lineHeight: 22 },
  recordingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  recordingDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#DC2626' },
  recordingText: { fontSize: Typography.body, color: Colors.textSecondary },
  prepHint: { fontSize: Typography.body, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
