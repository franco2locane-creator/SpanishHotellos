import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Speech from 'expo-speech';
import { stripSpanishArticle } from '@/lib/vocab/decks';
import McqQuestion from './McqQuestion';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

type Props = {
  termEs: string;
  options: string[];
  correct: string;
  onAnswer: (correct: boolean) => void;
};

/** Audio-only prompt + the same 4-option MCQ UI as mcq-es-en — the target
 *  (English meaning) is identical, only how the prompt is delivered differs. */
export default function ListeningQuestion({ termEs, options, correct, onAnswer }: Props) {
  function play() {
    Speech.speak(stripSpanishArticle(termEs), { language: 'es-ES', rate: 0.85 });
  }

  useEffect(() => {
    play();
    // Re-play only when the term changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termEs]);

  return (
    <View>
      <TouchableOpacity
        style={styles.replayBtn}
        onPress={play}
        accessibilityRole="button"
        accessibilityLabel="Replay audio"
      >
        <Text style={styles.replayIcon}>🔊</Text>
        <Text style={styles.replayText}>Tap to replay</Text>
      </TouchableOpacity>
      <McqQuestion
        promptLabel="LISTENING"
        prompt="What does this mean?"
        options={options}
        correct={correct}
        onAnswer={onAnswer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  replayBtn: {
    alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radii.xl,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, marginBottom: Spacing.lg,
    borderWidth: 2, borderColor: Colors.navy, ...Shadows.sm,
  },
  replayIcon: { fontSize: 24 },
  replayText: { fontSize: Typography.body, fontWeight: Typography.semibold, color: Colors.navy },
});
