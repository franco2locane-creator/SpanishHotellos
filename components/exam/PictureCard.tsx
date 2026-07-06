import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import ExamHeader from './ExamHeader';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';
import type { PhotoScene } from '@/lib/mockExam/content';
import type { WireMessage } from '@/lib/api/roleplay';

type Phase = 'view' | 'speaking' | 'done';

type Props = {
  photo: PhotoScene;
  onComplete: (messages: WireMessage[], durationSeconds: number) => void;
  onExit: () => void;
};

export default function PictureCard({ photo, onComplete, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('view');
  const [viewLeft, setViewLeft] = useState(30);
  const [speakLeft, setSpeakLeft] = useState(120);
  const speakingRef = useRef(false);
  const startRef = useRef(0);
  const partsRef = useRef<string[]>([]);
  const currentRef = useRef('');

  useEffect(() => {
    if (phase !== 'view') return;
    const t = setInterval(() => setViewLeft(p => Math.max(p - 1, 0)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (viewLeft === 0 && phase === 'view') beginSpeaking();
  }, [viewLeft, phase]);

  useEffect(() => {
    if (phase !== 'speaking') return;
    const t = setInterval(() => setSpeakLeft(p => Math.max(p - 1, 0)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (speakLeft === 0 && phase === 'speaking') finishSpeaking();
  }, [speakLeft, phase]);

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
    const duration = Math.round((Date.now() - startRef.current) / 1000) + 30;
    const messages: WireMessage[] = [
      { role: 'assistant', content: `[Fotografía: ${photo.scene}. Escena: ${photo.details}]` },
      { role: 'user', content: full || '(sin respuesta)' },
    ];
    onComplete(messages, duration);
  }, [phase, photo, onComplete]);

  const secondsLeft = phase === 'view' ? viewLeft : speakLeft;
  const phaseLabel = phase === 'view' ? 'Study the scene' : 'Speaking — describe what you see';

  return (
    <SafeAreaView style={styles.screen}>
      <ExamHeader title="Picture Description" secondsLeft={secondsLeft} phaseLabel={phaseLabel} onExit={onExit} />

      <View style={styles.body}>
        {/* Photo card */}
        <View style={[styles.photoCard, { backgroundColor: photo.bgColor }]}>
          <Text style={styles.emoji}>{photo.emoji}</Text>
          <Text style={styles.scene}>{photo.scene}</Text>
          <Text style={styles.details}>{photo.details}</Text>
        </View>

        <Text style={styles.instruction}>
          {phase === 'view'
            ? 'Study this scene carefully. Speaking begins automatically in ' + viewLeft + 's.'
            : 'Describe what you see: people, objects, atmosphere, and what might happen next.'}
        </Text>

        {phase === 'speaking' && (
          <View style={styles.recordingRow}>
            <View style={styles.dot} />
            <Text style={styles.recordingText}>Recording — speak in Spanish</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F5F0' },
  body: { flex: 1, padding: Spacing.lg, justifyContent: 'center', gap: Spacing.lg },
  photoCard: {
    borderRadius: Radii.xl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: '#E8E3DC',
  },
  emoji: { fontSize: 64 },
  scene: { fontSize: Typography.heading, fontWeight: '700', color: Colors.navy, textAlign: 'center' },
  details: { fontSize: Typography.body, color: Colors.textSecondary, lineHeight: 22, textAlign: 'center' },
  instruction: { fontSize: Typography.body, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  recordingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#DC2626' },
  recordingText: { fontSize: Typography.body, color: Colors.textSecondary },
});
