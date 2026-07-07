import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { supabase } from '@/lib/supabase';
import { assessPlacement } from '@/lib/api/placement';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';

// ── Constants ─────────────────────────────────────────────────────────────────

const QUESTIONS = [
  { es: 'Preséntate.', en: 'Introduce yourself.' },
  { es: 'Describe tu hotel ideal.', en: 'Describe your ideal hotel.' },
  { es: 'Un cliente se queja del ruido. ¿Qué le dices?', en: 'A guest complains about noise. What do you say?' },
];

// ── Screen ────────────────────────────────────────────────────────────────────

export default function Placement() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [qIdx, setQIdx] = useState(0);
  const [transcripts, setTranscripts] = useState(['', '', '']);
  const [liveText, setLiveText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [micGranted, setMicGranted] = useState<boolean | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const liveTextRef = useRef('');
  const qIdxRef = useRef(0);
  useEffect(() => { qIdxRef.current = qIdx; }, [qIdx]);

  // ── Permission check ─────────────────────────────────────────────────────────

  useEffect(() => {
    ExpoSpeechRecognitionModule.requestPermissionsAsync().then(({ granted }) => {
      setMicGranted(granted);
    });
  }, []);

  // ── Speech recognition events ─────────────────────────────────────────────

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    liveTextRef.current = text;
    setLiveText(text);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsRecording(false);
    const final = liveTextRef.current;
    if (final) {
      setTranscripts((prev) => {
        const next = [...prev];
        next[qIdxRef.current] = final;
        return next;
      });
    }
    setLiveText('');
    liveTextRef.current = '';
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.error('Speech error:', event.error);
    setIsRecording(false);
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  function toggleRecording() {
    if (isRecording) {
      ExpoSpeechRecognitionModule.stop();
    } else {
      setLiveText('');
      liveTextRef.current = '';
      ExpoSpeechRecognitionModule.start({ lang: 'es-ES', interimResults: true });
      setIsRecording(true);
    }
  }

  function currentAnswered(): boolean {
    return micGranted === false
      ? typedAnswer.trim().length > 0
      : transcripts[qIdx].length > 0;
  }

  function handleNext() {
    if (micGranted === false) {
      const next = [...transcripts];
      next[qIdx] = typedAnswer.trim();
      setTranscripts(next);
      setTypedAnswer('');
    }
    setQIdx((i) => i + 1);
    setLiveText('');
  }

  async function handleSubmit() {
    let final = [...transcripts];
    if (micGranted === false) final[qIdx] = typedAnswer.trim();

    if (!user) {
      Alert.alert('Session expired', 'Please sign in again to continue.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { level, justification } = await assessPlacement(
        final as [string, string, string],
      );

      const { data: profile } = await supabase
        .from('profiles')
        .select('exam_date')
        .eq('id', user.id)
        .maybeSingle();

      await supabase
        .from('profiles')
        .update({
          placement_level: level,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      // Do NOT call setOnboardingComplete() here — it would trigger the routing
      // effect to redirect to tabs before we can show the result screen.
      // The result screen's CTA calls it right before replacing to tabs.
      router.replace({
        pathname: '/onboarding/result',
        params: { level, justification, examDate: profile?.exam_date ?? '' },
      } as any);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not complete assessment.';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const q = QUESTIONS[qIdx];
  const isLast = qIdx === QUESTIONS.length - 1;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.step}>Step 2 of 3 — Placement test</Text>
        <View style={styles.progress}>
          {QUESTIONS.map((_, i) => (
            <View key={i} style={[styles.dot, i <= qIdx && styles.dotActive]} />
          ))}
        </View>

        <Text style={styles.qNumber}>Question {qIdx + 1} of {QUESTIONS.length}</Text>
        <Text style={styles.qEs}>{q.es}</Text>
        <Text style={styles.qEn}>{q.en}</Text>

        {micGranted === null && <ActivityIndicator style={{ marginVertical: Spacing.lg }} color={Colors.navy} />}

        {micGranted === true && (
          <>
            <TouchableOpacity
              style={[styles.micBtn, isRecording && styles.micBtnActive]}
              onPress={toggleRecording}
              disabled={isSubmitting}
            >
              <Text style={styles.micIcon}>{isRecording ? '⏹' : '🎙'}</Text>
              <Text style={styles.micLabel}>{isRecording ? 'Tap to stop' : 'Tap to speak'}</Text>
            </TouchableOpacity>

            {(liveText || transcripts[qIdx]) ? (
              <View style={styles.transcriptBox}>
                <Text style={styles.transcriptText}>
                  {isRecording ? liveText : transcripts[qIdx]}
                </Text>
              </View>
            ) : null}
          </>
        )}

        {micGranted === false && (
          <>
            <Text style={styles.fallbackNote}>Microphone unavailable — type your answer:</Text>
            <TextInput
              style={styles.textFallback}
              placeholder="Type your answer in Spanish…"
              value={typedAnswer}
              onChangeText={setTypedAnswer}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.nextBtn, !currentAnswered() && styles.nextBtnDisabled]}
          onPress={isLast ? handleSubmit : handleNext}
          disabled={!currentAnswered() || isSubmitting}
        >
          {isSubmitting
            ? <ActivityIndicator color={Colors.textOnDark} />
            : <Text style={styles.nextText}>{isLast ? 'Get my level' : 'Next question'}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  step: { fontSize: Typography.caption, color: Colors.gold, fontWeight: Typography.semibold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm },
  progress: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.navy },
  qNumber: { fontSize: Typography.body, color: Colors.textMuted, marginBottom: Spacing.xs },
  qEs: { fontSize: Typography.heading, fontWeight: Typography.bold, color: Colors.navy, marginBottom: Spacing.sm },
  qEn: { fontSize: Typography.body, color: Colors.textSecondary, marginBottom: Spacing.xl, fontStyle: 'italic' },
  micBtn: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center', width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.surface, borderWidth: 3, borderColor: Colors.border, marginBottom: Spacing.lg },
  micBtnActive: { borderColor: Colors.error, backgroundColor: '#FEF2F2' },
  micIcon: { fontSize: 40 },
  micLabel: { fontSize: Typography.caption, color: Colors.textMuted, marginTop: Spacing.xs },
  transcriptBox: { borderRadius: Radii.md, backgroundColor: Colors.surfaceAlt, padding: Spacing.md, marginBottom: Spacing.lg, minHeight: 80 },
  transcriptText: { fontSize: Typography.body, color: Colors.textPrimary, lineHeight: 24 },
  fallbackNote: { fontSize: Typography.body, color: Colors.textSecondary, marginBottom: Spacing.sm },
  textFallback: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: Spacing.md, fontSize: Typography.body, backgroundColor: Colors.surface, marginBottom: Spacing.lg, minHeight: 120 },
  nextBtn: { backgroundColor: Colors.navy, borderRadius: Radii.md, paddingVertical: Spacing.md, alignItems: 'center' },
  nextBtnDisabled: { opacity: 0.4 },
  nextText: { color: Colors.textOnDark, fontSize: Typography.bodyLarge, fontWeight: Typography.semibold },
});
