import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { isFuzzyMatchAny } from '@/lib/textMatch';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

type Props = {
  prompt: string;
  correctTerm: string;
  correctTermLatam?: string;
  onAnswer: (correct: boolean) => void;
};

const SETTLE_DELAY_MS = 800;

export default function SpeakQuestion({ prompt, correctTerm, correctTermLatam, onAnswer }: Props) {
  const [micActive, setMicActive] = useState(false);
  const [heardText, setHeardText] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const liveRef = useRef('');
  const settledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMicActive(false);
    setHeardText('');
    setResult(null);
    liveRef.current = '';
    settledRef.current = false;
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ExpoSpeechRecognitionModule.stop();
    };
  }, [prompt]);

  function settle(ok: boolean) {
    if (settledRef.current) return;
    settledRef.current = true;
    setResult(ok);
    ExpoSpeechRecognitionModule.stop();
    timerRef.current = setTimeout(() => onAnswer(ok), SETTLE_DELAY_MS);
  }

  useSpeechRecognitionEvent('result', e => {
    liveRef.current = e.results?.[0]?.transcript ?? '';
    setHeardText(liveRef.current);
    if (!settledRef.current && isFuzzyMatchAny(liveRef.current, correctTerm, correctTermLatam)) {
      settle(true);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setMicActive(false);
    if (!settledRef.current) settle(isFuzzyMatchAny(liveRef.current, correctTerm, correctTermLatam));
  });

  const startRecording = useCallback(async () => {
    liveRef.current = '';
    setHeardText('');
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) return;
    ExpoSpeechRecognitionModule.start({ lang: 'es-ES', interimResults: true });
    setMicActive(true);
  }, []);

  function stopRecording() {
    ExpoSpeechRecognitionModule.stop();
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.promptLabel}>SPEAK IT</Text>
      <Text style={styles.prompt}>{prompt}</Text>
      {result === null ? (
        <TouchableOpacity
          style={[styles.micBtn, micActive && styles.micBtnActive]}
          onPress={micActive ? stopRecording : startRecording}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={micActive ? 'Stop recording' : 'Start recording'}
        >
          {micActive ? <ActivityIndicator color="#fff" /> : <Text style={styles.micIcon}>🎙️</Text>}
          <Text style={[styles.micLabel, micActive && styles.micLabelActive]}>
            {micActive ? (heardText || 'Listening…') : 'Tap to speak'}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={[styles.resultText, { color: result ? Colors.success : Colors.error }]}>
          {result ? '✓ Correct!' : `✗ Not quite — ${correctTerm}`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing.lg, gap: Spacing.md, alignItems: 'center' },
  promptLabel: {
    fontSize: Typography.caption, fontWeight: Typography.semibold, color: Colors.gold,
    textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center',
  },
  prompt: {
    fontSize: Typography.heading, fontWeight: Typography.bold, color: Colors.navy,
    textAlign: 'center', marginBottom: Spacing.sm,
  },
  micBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radii.xl,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, ...Shadows.sm,
    borderWidth: 2, borderColor: Colors.navy,
  },
  micBtnActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  micIcon: { fontSize: 24 },
  micLabel: { fontSize: Typography.body, color: Colors.navy, fontWeight: Typography.semibold },
  micLabelActive: { color: '#fff' },
  resultText: { fontSize: Typography.body, fontWeight: Typography.semibold, textAlign: 'center' },
});
