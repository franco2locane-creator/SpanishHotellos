import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import { Haptics } from '@/lib/haptics';
import { isFuzzyMatchAny } from '@/lib/textMatch';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

type Props = {
  prompt: string;
  correctTerm: string;
  correctTermLatam?: string;
  onAnswer: (correct: boolean) => void;
};

const ADVANCE_DELAY_MS = 900;

export default function TypedQuestion({ prompt, correctTerm, correctTermLatam, onAnswer }: Props) {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue('');
    setResult(null);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [prompt]);

  function submit() {
    if (result !== null || !value.trim()) return;
    Keyboard.dismiss();
    const ok = isFuzzyMatchAny(value, correctTerm, correctTermLatam);
    setResult(ok);
    if (ok) Haptics.success(); else Haptics.error();
    timerRef.current = setTimeout(() => onAnswer(ok), ADVANCE_DELAY_MS);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.promptLabel}>EN → ES</Text>
      <Text style={styles.prompt}>{prompt}</Text>
      <TextInput
        style={[
          styles.input,
          result === true && styles.inputCorrect,
          result === false && styles.inputWrong,
        ]}
        value={value}
        onChangeText={setValue}
        editable={result === null}
        placeholder="Type the Spanish term…"
        placeholderTextColor={Colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={submit}
        accessibilityLabel="Type your answer"
      />
      {result === null ? (
        <TouchableOpacity
          style={[styles.checkBtn, !value.trim() && styles.checkBtnDisabled]}
          onPress={submit}
          disabled={!value.trim()}
          accessibilityRole="button"
          accessibilityLabel="Check answer"
        >
          <Text style={styles.checkBtnText}>Check</Text>
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
  wrap: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  promptLabel: {
    fontSize: Typography.caption, fontWeight: Typography.semibold, color: Colors.gold,
    textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center',
  },
  prompt: {
    fontSize: Typography.heading, fontWeight: Typography.bold, color: Colors.navy,
    textAlign: 'center', marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 2, borderColor: '#E8E3DC', borderRadius: Radii.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: Typography.bodyLarge, color: Colors.navy, backgroundColor: Colors.surface, ...Shadows.sm,
  },
  inputCorrect: { borderColor: Colors.success, backgroundColor: '#D1FAE5' },
  inputWrong: { borderColor: Colors.error, backgroundColor: '#FEE2E2' },
  checkBtn: {
    backgroundColor: Colors.navy, borderRadius: Radii.md,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  checkBtnDisabled: { opacity: 0.4 },
  checkBtnText: { color: '#fff', fontWeight: Typography.bold, fontSize: Typography.body },
  resultText: { fontSize: Typography.body, fontWeight: Typography.semibold, textAlign: 'center' },
});
