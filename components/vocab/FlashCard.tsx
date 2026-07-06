import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Speech from 'expo-speech';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import { buildCloze } from '@/lib/vocab/decks';
import type { VocabCard } from '@/types';

type Props = {
  card: VocabCard;
  revealed: boolean;
  onReveal: () => void;
};

export default function FlashCard({ card, revealed, onReveal }: Props) {
  function speakSpanish() {
    Speech.speak(card.termEs.replace('el/la ', '').replace(/^(el|la|los|las) /, ''), {
      language: 'es-ES',
      rate: 0.85,
    });
  }

  const cloze = buildCloze(card.exampleSentence, card.termEs);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={!revealed ? onReveal : undefined}
      activeOpacity={revealed ? 1 : 0.85}
    >
      {!revealed ? (
        // ── Front ──────────────────────────────────────────────────────────
        <View style={styles.face}>
          <Text style={styles.badge}>EN → ES</Text>
          <Text style={styles.termEn}>{card.termEn}</Text>
          <Text style={styles.clozeSentence}>{cloze}</Text>
          <Text style={styles.tapHint}>Tap to reveal</Text>
        </View>
      ) : (
        // ── Back ───────────────────────────────────────────────────────────
        <View style={styles.face}>
          <View style={styles.termRow}>
            <Text style={styles.termEs}>{card.termEs}</Text>
            <TouchableOpacity onPress={speakSpanish} style={styles.speakerBtn} hitSlop={12}>
              <Text style={styles.speakerIcon}>🔊</Text>
            </TouchableOpacity>
          </View>

          {card.termEsLatam ? (
            <Text style={styles.latam}>LATAM: {card.termEsLatam}</Text>
          ) : null}

          <Text style={styles.example}>{card.exampleSentence}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    marginHorizontal: Spacing.lg,
    minHeight: 260,
    justifyContent: 'center',
    ...Shadows.md,
  },
  face: { gap: Spacing.md },
  badge: {
    fontSize: Typography.caption,
    fontWeight: Typography.semibold,
    color: Colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  termEn: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: Colors.navy,
  },
  clozeSentence: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  tapHint: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  termEs: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: Colors.navy,
    flex: 1,
  },
  speakerBtn: {
    padding: Spacing.xs,
  },
  speakerIcon: { fontSize: 26 },
  latam: {
    fontSize: Typography.body,
    color: Colors.info,
    fontStyle: 'italic',
  },
  example: {
    fontSize: Typography.body,
    color: Colors.textPrimary,
    lineHeight: 24,
    marginTop: Spacing.sm,
  },
});
