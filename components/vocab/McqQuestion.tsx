import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Haptics } from '@/lib/haptics';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

type Props = {
  promptLabel: string;
  prompt: string;
  options: string[];
  correct: string;
  onAnswer: (correct: boolean) => void;
};

const ADVANCE_DELAY_MS = 900;

export default function McqQuestion({ promptLabel, prompt, options, correct, onAnswer }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSelected(null);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [prompt]);

  function handleSelect(option: string) {
    if (selected !== null) return;
    setSelected(option);
    const ok = option === correct;
    if (ok) Haptics.success(); else Haptics.error();
    timerRef.current = setTimeout(() => onAnswer(ok), ADVANCE_DELAY_MS);
  }

  const showResult = selected !== null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.promptLabel}>{promptLabel}</Text>
      <Text style={styles.prompt}>{prompt}</Text>
      <View style={styles.options}>
        {options.map(opt => {
          const isSelected = selected === opt;
          const isCorrectOpt = opt === correct;
          const bg = showResult ? (isCorrectOpt ? '#D1FAE5' : isSelected ? '#FEE2E2' : Colors.surface) : Colors.surface;
          const borderColor = showResult
            ? (isCorrectOpt ? Colors.success : isSelected ? Colors.error : '#E8E3DC')
            : '#E8E3DC';
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.option, { backgroundColor: bg, borderColor }]}
              onPress={() => handleSelect(opt)}
              disabled={showResult}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={opt}
              accessibilityState={{ disabled: showResult }}
            >
              <Text style={styles.optionText}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
  options: { gap: Spacing.sm },
  option: {
    borderRadius: Radii.md, borderWidth: 2, paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg, ...Shadows.sm,
  },
  optionText: { fontSize: Typography.body, fontWeight: Typography.medium, color: Colors.navy, textAlign: 'center' },
});
