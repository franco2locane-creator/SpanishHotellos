import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { loadScenario } from '@/lib/scenarios/catalog';
import { gradeExamSession } from '@/lib/api/grade';
import { useFeedbackStore } from '@/stores/feedbackStore';
import { randomTopic, randomPhoto, randomQuestions } from '@/lib/mockExam/content';
import MonologueCard from '@/components/exam/MonologueCard';
import PictureCard from '@/components/exam/PictureCard';
import SpQaExam from '@/components/exam/SpQaExam';
import GuidedExam from '@/components/exam/GuidedExam';
import { Colors, Spacing, Typography } from '@/lib/theme';
import type { ExamFormat } from '@/types';
import type { WireMessage } from '@/lib/api/roleplay';

// ── Pre-pick random content so it doesn't change on re-renders ────────────────
const TOPIC = randomTopic();
const PHOTO = randomPhoto();
const QUESTIONS = randomQuestions(6);

// ── Exam objectives by format ─────────────────────────────────────────────────
const EXAM_OBJECTIVES: Record<ExamFormat, { id: string; label: string }[]> = {
  monologue: [
    { id: 'clarity',  label: 'Present the topic clearly and logically' },
    { id: 'vocab',    label: 'Use hospitality vocabulary precisely' },
    { id: 'duration', label: 'Speak for the full time without major pauses' },
  ],
  guided_dialogue: [],  // uses scenario objectives
  picture_description: [
    { id: 'describe', label: 'Describe people, objects and atmosphere' },
    { id: 'speculate', label: 'Speculate on what might happen next' },
    { id: 'vocab',    label: 'Use relevant hospitality vocabulary' },
  ],
  spontaneous_qa: [
    { id: 'answer',   label: 'Answer each question with a complete sentence' },
    { id: 'vocab',    label: 'Use appropriate professional vocabulary' },
    { id: 'register', label: 'Maintain formal register (usted) throughout' },
  ],
};

const EXAM_TITLES: Record<ExamFormat, string> = {
  monologue:           TOPIC.topic,
  guided_dialogue:     'Guided Dialogue Exam',
  picture_description: PHOTO.scene,
  spontaneous_qa:      'Spontaneous Q&A',
};

const PASS_MARK = 60;

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ExamSession() {
  const { format, scenarioId } = useLocalSearchParams<{ format: string; scenarioId?: string }>();
  const router = useRouter();
  const { setResult } = useFeedbackStore();
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState('');

  const examFormat = format as ExamFormat;
  const scenario = scenarioId ? loadScenario(scenarioId) : null;

  async function handleComplete(messages: WireMessage[], durationSeconds: number) {
    setGrading(true);
    setError('');
    try {
      const result = await gradeExamSession({
        title: EXAM_TITLES[examFormat],
        objectives: examFormat === 'guided_dialogue' && scenario
          ? scenario.objectives
          : EXAM_OBJECTIVES[examFormat],
        format: examFormat,
        messages,
        durationSeconds: Math.max(durationSeconds, 1),
      });
      setResult(result, PASS_MARK);
      router.replace(`/feedback/${result.attemptId}` as any);
    } catch {
      setGrading(false);
      setError('Grading failed — your session was not saved. Check your connection.');
    }
  }

  function handleExit() {
    router.back();
  }

  if (grading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.gradingTitle}>Grading your exam…</Text>
          <Text style={styles.gradingText}>Analysing your Spanish across all five criteria.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (examFormat === 'monologue') {
    return <MonologueCard topic={TOPIC} onComplete={handleComplete} onExit={handleExit} />;
  }

  if (examFormat === 'picture_description') {
    return <PictureCard photo={PHOTO} onComplete={handleComplete} onExit={handleExit} />;
  }

  if (examFormat === 'spontaneous_qa') {
    return <SpQaExam questions={QUESTIONS} onComplete={handleComplete} onExit={handleExit} />;
  }

  if (examFormat === 'guided_dialogue' && scenario) {
    return <GuidedExam scenario={scenario} onComplete={handleComplete} onExit={handleExit} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        <Text style={styles.errorText}>Invalid exam format.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F5F0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.lg, padding: Spacing.xl },
  gradingTitle: { fontSize: Typography.heading, fontWeight: '700', color: Colors.navy },
  gradingText: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  errorText: { fontSize: Typography.body, color: Colors.error, textAlign: 'center' },
});
