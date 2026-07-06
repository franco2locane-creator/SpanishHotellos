import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography } from '@/lib/theme';

type Props = {
  title: string;
  secondsLeft: number;
  phaseLabel?: string;
  onExit: () => void;
};

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function ExamHeader({ title, secondsLeft, phaseLabel, onExit }: Props) {
  const urgent = secondsLeft <= 30 && secondsLeft > 0;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity onPress={onExit} hitSlop={12}>
        <Text style={styles.exit}>✕</Text>
      </TouchableOpacity>
      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {phaseLabel ? <Text style={styles.phase}>{phaseLabel}</Text> : null}
      </View>
      <Text style={[styles.timer, urgent && styles.timerUrgent]}>{fmt(secondsLeft)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.navy, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  exit: { fontSize: 20, color: '#fff' },
  center: { flex: 1, alignItems: 'center', marginHorizontal: Spacing.sm },
  title: { fontSize: Typography.body, fontWeight: '600', color: '#fff' },
  phase: { fontSize: Typography.caption, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  timer: { fontSize: Typography.heading, fontWeight: '700', color: Colors.gold, minWidth: 56, textAlign: 'right' },
  timerUrgent: { color: '#FF6B6B' },
});
