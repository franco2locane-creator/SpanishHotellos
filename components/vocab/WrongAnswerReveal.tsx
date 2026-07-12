import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Speech from 'expo-speech';
import { stripSpanishArticle } from '@/lib/vocab/decks';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { VocabCard } from '@/types';

type Props = {
  card: VocabCard;
  onContinue: () => void;
};

export default function WrongAnswerReveal({ card, onContinue }: Props) {
  function play() {
    Speech.speak(stripSpanishArticle(card.termEs), { language: 'es-ES', rate: 0.85 });
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.notQuite}>✗ Not quite</Text>
      <View style={styles.termRow}>
        <Text style={styles.termEs}>{card.termEs}</Text>
        <TouchableOpacity onPress={play} style={styles.speakerBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel="Play pronunciation">
          <Text style={styles.speakerIcon}>🔊</Text>
        </TouchableOpacity>
      </View>
      {card.termEsLatam ? <Text style={styles.latam}>LATAM: {card.termEsLatam}</Text> : null}
      <Text style={styles.example}>{card.exampleSentence}</Text>
      <TouchableOpacity
        style={styles.continueBtn}
        onPress={onContinue}
        accessibilityRole="button"
        accessibilityLabel="Continue"
      >
        <Text style={styles.continueBtnText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surface, borderRadius: Radii.xl, padding: Spacing.xl,
    marginHorizontal: Spacing.lg, gap: Spacing.sm, ...Shadows.md,
  },
  notQuite: { fontSize: Typography.body, fontWeight: Typography.bold, color: Colors.error },
  termRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.xs },
  termEs: { fontSize: Typography.heading, fontWeight: Typography.bold, color: Colors.navy, flex: 1 },
  speakerBtn: { padding: Spacing.xs },
  speakerIcon: { fontSize: 26 },
  latam: { fontSize: Typography.body, color: Colors.info, fontStyle: 'italic' },
  example: { fontSize: Typography.body, color: Colors.textPrimary, lineHeight: 24, marginTop: Spacing.sm },
  continueBtn: {
    backgroundColor: Colors.navy, borderRadius: Radii.lg,
    paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md,
  },
  continueBtnText: { color: '#fff', fontWeight: Typography.bold, fontSize: Typography.body },
});
