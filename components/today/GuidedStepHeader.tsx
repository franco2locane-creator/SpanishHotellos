import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GUIDED_STEP_ORDER } from '@/lib/guidedSession';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';

type Props = {
  /** 0-based index of the step currently in progress. */
  currentStepIndex: number;
  onSkip: () => void;
};

/** Persistent "Step N of 3" header + progress bar shown on each guided-session screen. */
export default function GuidedStepHeader({ currentStepIndex, onSkip }: Props) {
  const total = GUIDED_STEP_ORDER.length;
  const pct = Math.min(100, Math.round((currentStepIndex / total) * 100));

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>Step {currentStepIndex + 1} of {total}</Text>
        <TouchableOpacity onPress={onSkip} hitSlop={8} accessibilityRole="button" accessibilityLabel="Skip this step">
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xs, backgroundColor: Colors.navy },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: Typography.caption, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.8 },
  skip: { fontSize: Typography.caption, fontWeight: '600', color: 'rgba(255,255,255,0.7)', textDecorationLine: 'underline' },
  barBg: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2, backgroundColor: Colors.gold },
});
