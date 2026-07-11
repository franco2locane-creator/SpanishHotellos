import { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { usePremium } from '@/hooks/usePremium';
import { canAccessDemoDrill } from '@/lib/premiumGating';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { FixItem } from '@/lib/api/grade';

// ── Drill content ─────────────────────────────────────────────────────────────

type DrillQuestion = { prompt: string; answer: string; hint: string };

const DRILLS: Record<FixItem['drillType'], { title: string; instruction: string; questions: DrillQuestion[] }> = {
  register: {
    title: 'Register Drill — Usted Transformations',
    instruction: 'Say the same phrase in formal (usted) register',
    questions: [
      { prompt: '¿Qué quieres?', answer: '¿Qué quiere usted?', hint: 'quiere → usted' },
      { prompt: '¿Puedes firmar aquí?', answer: '¿Puede firmar aquí?', hint: 'puede → usted' },
      { prompt: 'Tu habitación está lista.', answer: 'Su habitación está lista.', hint: 'Su → usted possessive' },
      { prompt: '¿Necesitas algo más?', answer: '¿Necesita algo más?', hint: 'necesita → usted' },
      { prompt: 'Te ayudo ahora.', answer: 'Le ayudo ahora.', hint: 'Le → indirect usted' },
    ],
  },
  vocabulary: {
    title: 'Vocabulary Drill — Hospitality Terms',
    instruction: 'Say the Spanish hospitality phrase for the prompt',
    questions: [
      { prompt: '"At your disposal" (formal offer)', answer: 'a su disposición', hint: 'a su disposición' },
      { prompt: '"No charge / complimentary"', answer: 'sin ningún cargo', hint: 'sin ningún cargo' },
      { prompt: '"Right away / immediately"', answer: 'enseguida', hint: 'enseguida' },
      { prompt: '"We apologise for the inconvenience"', answer: 'disculpe las molestias', hint: 'disculpe las molestias' },
      { prompt: '"Let me check that for you"', answer: 'permítame verificarlo', hint: 'permítame verificarlo' },
    ],
  },
  grammar: {
    title: 'Grammar Drill — Verb Conjugation',
    instruction: 'Say the sentence with the correct verb form',
    questions: [
      { prompt: 'The room (ser) available now. → "La habitación ___"', answer: 'La habitación está disponible ahora', hint: 'estar para state' },
      { prompt: 'We (poder) move you to another room. → "Nosotros ___"', answer: 'Podemos trasladarle a otra habitación', hint: 'podemos' },
      { prompt: 'I (ir) to check immediately. → "Voy ___"', answer: 'Voy a verificarlo de inmediato', hint: 'ir a + infinitive' },
      { prompt: 'Yesterday the guest (pedir) extra towels. → "El huésped ___"', answer: 'El huésped pidió toallas adicionales', hint: 'pidió – pretérito' },
      { prompt: 'Please (tener) your ID ready. → "Por favor ___"', answer: 'Por favor tenga su identificación lista', hint: 'tenga – subjuntivo/imperativo' },
    ],
  },
  fluency: {
    title: 'Fluency Drill — Rapid Response',
    instruction: 'Respond in Spanish without pausing',
    questions: [
      { prompt: 'Guest says: "Quiero hacer el check-out." Say the full professional response.', answer: 'Por supuesto, en seguida le atiendo. ¿Me permite su tarjeta de habitación?', hint: 'Include: confirmation + request' },
      { prompt: 'Guest says: "La calefacción no funciona." Say the full professional response.', answer: 'Disculpe las molestias. Voy a enviar a mantenimiento de inmediato.', hint: 'Include: apology + action' },
      { prompt: 'Guest asks: "¿A qué hora es el desayuno?" Give the complete answer.', answer: 'El desayuno se sirve de siete a diez de la mañana en el restaurante de la planta baja.', hint: 'Include: hours + location' },
      { prompt: 'Guest says: "Perdí mi llave." Say the full professional response.', answer: 'No se preocupe. Puedo hacerle una copia ahora mismo con su identificación.', hint: 'Include: reassurance + solution' },
      { prompt: 'Guest asks: "¿Tienen aparcamiento?" Give the complete answer.', answer: 'Sí, disponemos de aparcamiento en el sótano. El precio es de diez euros por noche.', hint: 'Include: yes/no + details' },
    ],
  },
  pronunciation: {
    title: 'Pronunciation Drill — Tricky Sounds',
    instruction: 'Say each phrase clearly, focusing on the marked sound',
    questions: [
      { prompt: 'Practise the rolled RR: "Le recomiendo la habitación con terraza."', answer: 'Le recomiendo la habitación con terraza', hint: 'rr in "recomiendo" and "terraza"' },
      { prompt: 'Practise the soft J: "El equipaje llegará enseguida, señor jefe."', answer: 'El equipaje llegará enseguida, señor jefe', hint: 'j in "equipaje" and "jefe"' },
      { prompt: 'Practise the Ñ: "Mañana por la mañana servimos el baño y la piscina."', answer: 'Mañana por la mañana servimos el baño y la piscina', hint: 'ñ in "mañana" and "baño"' },
      { prompt: 'Practise linking words smoothly: "¿Le importaría esperar un momento, por favor?"', answer: 'Le importaría esperar un momento, por favor', hint: 'no pauses between words' },
      { prompt: 'Practise the double L: "La llave de la habitación está en el bolsillo."', answer: 'La llave de la habitación está en el bolsillo', hint: 'll in "llave" and "bolsillo"' },
    ],
  },
  content: {
    title: 'Content Drill — Complete the Task',
    instruction: 'Say the key phrase that accomplishes the task step',
    questions: [
      { prompt: 'Task: Apologise to a frustrated guest professionally.', answer: 'Disculpe las molestias que le hemos causado. Le pido sinceras disculpas.', hint: 'Two sentences: disculpe + le pido' },
      { prompt: 'Task: Offer a room upgrade as compensation.', answer: 'Permítame ofrecerle una habitación superior sin coste adicional.', hint: 'permítame + ofrecerle + sin coste' },
      { prompt: 'Task: Confirm a guest\'s reservation details.', answer: 'Tiene una reserva para dos noches en habitación doble con desayuno incluido.', hint: 'nights + room type + board' },
      { prompt: 'Task: Transfer a call professionally.', answer: 'Le paso con el departamento correspondiente. Un momento, por favor.', hint: 'Le paso + Un momento' },
      { prompt: 'Task: Close the interaction warmly.', answer: 'Ha sido un placer atenderle. Que disfrute de su estancia.', hint: 'Ha sido un placer + disfrute' },
    ],
  },
};

// ── Fuzzy match ───────────────────────────────────────────────────────────────

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

function isCorrect(spoken: string, answer: string): boolean {
  const a = normalize(spoken);
  const b = normalize(answer);
  // Accept if 60% of answer words appear in spoken output.
  const wordsB = b.split(' ').filter(Boolean);
  const matches = wordsB.filter(w => a.includes(w));
  return matches.length / wordsB.length >= 0.6;
}

// ── Screen ────────────────────────────────────────────────────────────────────

type Phase = 'ready' | 'recording' | 'result' | 'done';

export default function DrillScreen() {
  const { drillType } = useLocalSearchParams<{ drillType: string }>();
  const router = useRouter();
  const isPremium = usePremium();

  const config = DRILLS[drillType as FixItem['drillType']];
  const locked = !!drillType && !canAccessDemoDrill(drillType, isPremium);
  const [qi, setQi] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [spoken, setSpoken] = useState('');
  const [correct, setCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const liveRef = useRef('');

  useSpeechRecognitionEvent('result', e => {
    liveRef.current = e.results?.[0]?.transcript ?? '';
    setSpoken(liveRef.current);
  });

  useSpeechRecognitionEvent('end', () => {
    if (phase === 'recording') evaluate(liveRef.current);
  });

  function evaluate(raw: string) {
    const q = config.questions[qi];
    const ok = isCorrect(raw, q.answer);
    setCorrect(ok);
    if (ok) setScore(s => s + 1);
    setSpoken(raw);
    setPhase('result');
  }

  const startRecording = useCallback(async () => {
    liveRef.current = '';
    setSpoken('');
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) return;
    ExpoSpeechRecognitionModule.start({ lang: 'es-ES', interimResults: true });
    setPhase('recording');
  }, []);

  function stopRecording() {
    ExpoSpeechRecognitionModule.stop();
  }

  function next() {
    if (qi + 1 >= config.questions.length) {
      setPhase('done');
    } else {
      setQi(q => q + 1);
      setPhase('ready');
      setSpoken('');
    }
  }

  function speakHint() {
    Speech.speak(config.questions[qi].answer, { language: 'es-ES', rate: 0.85 });
  }

  if (!config) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={{ padding: Spacing.xl, color: Colors.error }}>Unknown drill type.</Text>
      </SafeAreaView>
    );
  }

  if (locked) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.doneBlock}>
          <Text style={styles.doneEmoji}>🔒</Text>
          <Text style={styles.doneTitle}>Premium drill</Text>
          <Text style={styles.doneSub}>Unlock every daily drill with Spanish4Hoteleros Premium.</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.push('/paywall' as any)}>
            <Text style={styles.doneBtnText}>Unlock — €9.99</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const q = config.questions[qi];
  const progress = qi / config.questions.length;

  if (phase === 'done') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.doneBlock}>
          <Text style={styles.doneEmoji}>{score === config.questions.length ? '🎉' : '💪'}</Text>
          <Text style={styles.doneTitle}>{score}/{config.questions.length} correct</Text>
          <Text style={styles.doneSub}>
            {score === config.questions.length
              ? 'Perfect! Keep drilling daily until it\'s automatic.'
              : 'Good effort. Come back tomorrow to reinforce this skill.'}
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)}>
            <Text style={styles.doneBtnText}>Back to Feedback</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} hitSlop={12}>
          <Text style={styles.back}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{config.title}</Text>
        <Text style={styles.counter}>{qi + 1}/{config.questions.length}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.instruction}>{config.instruction}</Text>
        <Text style={styles.prompt}>{q.prompt}</Text>

        {phase === 'result' && (
          <View style={[styles.resultBox, { backgroundColor: correct ? '#F0FDF4' : '#FEF2F2' }]}>
            <Text style={{ color: correct ? '#16A34A' : '#DC2626', fontWeight: Typography.bold, fontSize: Typography.body }}>
              {correct ? '✓ Correct!' : '✗ Not quite'}
            </Text>
            {!correct && spoken ? (
              <Text style={styles.spokenText}>You said: "{spoken}"</Text>
            ) : null}
            <Text style={styles.answerLabel}>Model answer:</Text>
            <Text style={styles.answerText}>{q.answer}</Text>
          </View>
        )}

        {phase === 'ready' && (
          <TouchableOpacity style={styles.hintBtn} onPress={speakHint}>
            <Text style={styles.hintText}>🔊 Listen to model answer</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Controls */}
      <View style={styles.footer}>
        {phase === 'ready' && (
          <TouchableOpacity style={styles.micBtn} onPress={startRecording} activeOpacity={0.85}>
            <Text style={styles.micIcon}>🎙️</Text>
            <Text style={styles.micLabel}>Hold to speak</Text>
          </TouchableOpacity>
        )}
        {phase === 'recording' && (
          <TouchableOpacity style={[styles.micBtn, styles.micBtnActive]} onPress={stopRecording} activeOpacity={0.85}>
            <ActivityIndicator color="#fff" />
            <Text style={[styles.micLabel, { color: '#fff' }]}>
              {spoken || 'Listening…'}
            </Text>
          </TouchableOpacity>
        )}
        {phase === 'result' && (
          <TouchableOpacity style={styles.nextBtn} onPress={next}>
            <Text style={styles.nextBtnText}>
              {qi + 1 < config.questions.length ? 'Next →' : 'Finish'}
            </Text>
          </TouchableOpacity>
        )}
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
  counter: { fontSize: Typography.caption, color: 'rgba(255,255,255,0.7)' },
  progressBg: { height: 4, backgroundColor: '#E8E3DC' },
  progressFill: { height: '100%', backgroundColor: Colors.gold },
  card: {
    margin: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radii.xl,
    padding: Spacing.xl, gap: Spacing.lg, ...Shadows.md, flex: 1,
  },
  instruction: { fontSize: Typography.caption, color: Colors.textMuted, textAlign: 'center', fontStyle: 'italic' },
  prompt: { fontSize: Typography.heading, fontWeight: Typography.semibold, color: Colors.navy, textAlign: 'center', lineHeight: 28 },
  resultBox: { borderRadius: Radii.md, padding: Spacing.md, gap: 6 },
  spokenText: { fontSize: Typography.caption, color: Colors.textSecondary, fontStyle: 'italic' },
  answerLabel: { fontSize: Typography.caption, color: Colors.textMuted, marginTop: 4 },
  answerText: { fontSize: Typography.body, color: Colors.navy, fontWeight: Typography.semibold },
  hintBtn: { alignSelf: 'center' },
  hintText: { fontSize: Typography.caption, color: Colors.textMuted },
  footer: { paddingBottom: Spacing.xl, paddingHorizontal: Spacing.lg, alignItems: 'center' },
  micBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radii.xl,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, ...Shadows.sm,
    borderWidth: 2, borderColor: Colors.navy,
  },
  micBtnActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  micIcon: { fontSize: 24 },
  micLabel: { fontSize: Typography.body, color: Colors.navy, fontWeight: Typography.semibold },
  nextBtn: {
    backgroundColor: Colors.gold, borderRadius: Radii.lg,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, width: '100%', alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontWeight: Typography.bold, fontSize: Typography.body },
  doneBlock: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: Spacing.lg },
  doneEmoji: { fontSize: 64 },
  doneTitle: { fontSize: 32, fontWeight: Typography.bold, color: Colors.navy },
  doneSub: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  doneBtn: {
    marginTop: Spacing.lg, backgroundColor: Colors.navy, borderRadius: Radii.lg,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  doneBtnText: { color: '#fff', fontWeight: Typography.semibold, fontSize: Typography.body },
});
