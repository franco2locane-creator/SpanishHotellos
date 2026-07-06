import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useAuthStore } from '@/stores/authStore';
import { loadScenario } from '@/lib/scenarios/catalog';
import { sendRolePlayTurn, type WireMessage } from '@/lib/api/roleplay';
import ChatBubble from '@/components/roleplay/ChatBubble';
import ObjectivesChecklist from '@/components/roleplay/ObjectivesChecklist';
import MicButton from '@/components/roleplay/MicButton';
import SessionSummary from '@/components/roleplay/SessionSummary';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';

const MAX_TURNS = 12;
const GARBAGE_REPLY = 'No le he entendido bien, ¿puede repetirlo?';
const SPEED_RATE: Record<string, number> = { slow: 0.7, normal: 0.9, fast: 1.1 };

type Turn = { role: 'guest' | 'student'; text: string };

// ── State machine ─────────────────────────────────────────────────────────────

type Phase =
  | 'idle'          // before session starts
  | 'guest_speaking'// TTS playing
  | 'student_turn'  // waiting for mic
  | 'recording'     // STT active
  | 'sending'       // API call in flight
  | 'error'         // network error
  | 'done';         // session complete

export default function RoleplayScreen() {
  const { scenarioId } = useLocalSearchParams<{ scenarioId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const scenario = loadScenario(scenarioId ?? '');
  const [phase, setPhase] = useState<Phase>('idle');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const liveRef = useRef('');
  const scrollRef = useRef<ScrollView>(null);

  // ── Speech recognition events ─────────────────────────────────────────────

  useSpeechRecognitionEvent('result', e => {
    const text = e.results?.[0]?.transcript ?? '';
    liveRef.current = text;
    setLiveTranscript(text);
  });

  useSpeechRecognitionEvent('end', () => {
    if (phase === 'recording') handleStudentFinished(liveRef.current);
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  function speakGuest(text: string) {
    setPhase('guest_speaking');
    const rate = SPEED_RATE[scenario?.guestPersona.speakingSpeed ?? 'normal'];
    Speech.speak(text, {
      language: 'es-ES',
      rate,
      onDone: () => setPhase('student_turn'),
      onError: () => setPhase('student_turn'),
    });
  }

  function appendTurn(turn: Turn) {
    setTurns(prev => [...prev, turn]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }

  // ── Session start ─────────────────────────────────────────────────────────

  function startSession() {
    if (!scenario) return;
    appendTurn({ role: 'guest', text: scenario.openingLine });
    speakGuest(scenario.openingLine);
  }

  // ── Mic press / release ───────────────────────────────────────────────────

  async function handleMicPressIn() {
    if (phase !== 'student_turn') return;
    liveRef.current = '';
    setLiveTranscript('');
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) return;
    ExpoSpeechRecognitionModule.start({ lang: 'es-ES', interimResults: true });
    setPhase('recording');
  }

  function handleMicPressOut() {
    if (phase !== 'recording') return;
    ExpoSpeechRecognitionModule.stop();
    // 'end' event fires → handleStudentFinished
  }

  // ── Process student utterance ─────────────────────────────────────────────

  const handleStudentFinished = useCallback(async (raw: string) => {
    if (!scenario || !user) return;
    const text = raw.trim();

    // Graceful garbage recovery — treat as empty and let the guest ask to repeat.
    const isGarbage = text.length < 3;

    appendTurn({ role: 'student', text: isGarbage ? '(unclear)' : text });

    if (isGarbage) {
      appendTurn({ role: 'guest', text: GARBAGE_REPLY });
      speakGuest(GARBAGE_REPLY);
      return;
    }

    setPhase('sending');

    // Build wire history: guest=assistant, student=user.
    // Opening line is in the system prompt; add turns from index 1 onward.
    const wireHistory: WireMessage[] = [];
    for (const t of turns) {
      wireHistory.push({ role: t.role === 'student' ? 'user' : 'assistant', content: t.text });
    }
    wireHistory.push({ role: 'user', content: text });

    try {
      const result = await sendRolePlayTurn({ scenario, messages: wireHistory });

      setCompletedIds(prev => {
        const next = new Set(prev);
        result.objectivesCompleted.forEach(id => next.add(id));
        return next;
      });

      appendTurn({ role: 'guest', text: result.guestReply });

      const totalTurns = turns.length + 2; // +student +guest just added
      if (result.sessionShouldEnd || totalTurns >= MAX_TURNS) {
        setPhase('done');
      } else {
        speakGuest(result.guestReply);
      }
    } catch {
      setErrorMsg('Connection error. Check your internet and try again.');
      setPhase('error');
    }
  }, [scenario, turns, user]);

  // ── Early returns ─────────────────────────────────────────────────────────

  if (!scenario) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.errText}>Scenario not found.</Text>
      </SafeAreaView>
    );
  }

  if (phase === 'done') {
    return (
      <SafeAreaView style={styles.screen}>
        <SessionSummary
          scenarioTitle={scenario.title}
          objectives={scenario.objectives}
          completedIds={completedIds}
          turnCount={Math.ceil(turns.filter(t => t.role === 'student').length)}
          onDone={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{scenario.title}</Text>
        <Text style={styles.turnCount}>
          {turns.filter(t => t.role === 'student').length}/{MAX_TURNS / 2}
        </Text>
      </View>

      {/* Objectives */}
      <ObjectivesChecklist objectives={scenario.objectives} completedIds={completedIds} />

      {/* Chat */}
      <ScrollView
        ref={scrollRef}
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {turns.map((t, i) => (
          <ChatBubble
            key={i}
            role={t.role}
            text={t.text}
            speakingSpeed={t.role === 'guest' ? scenario.guestPersona.speakingSpeed : undefined}
          />
        ))}
        {phase === 'sending' && (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color={Colors.navy} />
            <Text style={styles.typingText}>Guest is responding…</Text>
          </View>
        )}
      </ScrollView>

      {/* Error banner */}
      {phase === 'error' && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMsg}</Text>
          <TouchableOpacity onPress={() => setPhase('student_turn')} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Start / Mic area */}
      <View style={styles.footer}>
        {phase === 'idle' ? (
          <TouchableOpacity style={styles.startBtn} onPress={startSession}>
            <Text style={styles.startBtnText}>Start conversation</Text>
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
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.navy,
  },
  back: { fontSize: 20, color: '#fff' },
  headerTitle: { flex: 1, textAlign: 'center', color: '#fff', fontWeight: Typography.semibold, fontSize: Typography.body, marginHorizontal: Spacing.sm },
  turnCount: { fontSize: Typography.caption, color: 'rgba(255,255,255,0.7)' },
  chat: { flex: 1 },
  chatContent: { paddingVertical: Spacing.md },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  typingText: { fontSize: Typography.caption, color: Colors.textMuted, fontStyle: 'italic' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FEE2E2', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  errorBannerText: { flex: 1, fontSize: Typography.caption, color: Colors.error },
  retryBtn: { backgroundColor: Colors.error, borderRadius: Radii.sm, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  retryText: { color: '#fff', fontSize: Typography.caption, fontWeight: Typography.semibold },
  footer: { paddingBottom: Spacing.lg, alignItems: 'center', backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: '#E8E3DC' },
  startBtn: {
    marginTop: Spacing.md, backgroundColor: Colors.navy, borderRadius: Radii.lg,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  startBtnText: { color: '#fff', fontWeight: Typography.semibold, fontSize: Typography.body },
  errText: { padding: Spacing.xl, color: Colors.error },
});
