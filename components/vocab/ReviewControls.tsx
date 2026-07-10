import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';
import { Haptics } from '@/lib/haptics';
import type { SrsGrade } from '@/lib/srs';

type GradeConfig = {
  grade: SrsGrade;
  label: string;
  sublabel: string;
  color: string;
  bg: string;
  a11y: string;
};

// Two-button UI mapping to SM-2 grades under the hood: fail -> Again (0),
// success -> Good (2). Hard/Easy (1/3) stay valid in nextSrsState() but
// aren't exposed here — this keeps the review flow fast and unambiguous.
const GRADES: GradeConfig[] = [
  { grade: 0, label: 'No lo sabía', sublabel: 'review again soon', color: Colors.error,   bg: '#FEE2E2', a11y: 'No lo sabía — review again soon' },
  { grade: 2, label: 'Lo sabía',    sublabel: '~6 days',            color: Colors.success, bg: '#D1FAE5', a11y: 'Lo sabía — review in about 6 days' },
];

type Props = {
  onGrade: (grade: SrsGrade) => void;
  disabled?: boolean;
};

export default function ReviewControls({ onGrade, disabled = false }: Props) {
  function handleGrade(grade: SrsGrade) {
    if (grade >= 2) Haptics.success();
    else Haptics.error();
    onGrade(grade);
  }

  return (
    <View style={styles.row}>
      {GRADES.map(({ grade, label, sublabel, color, bg, a11y }) => (
        <TouchableOpacity
          key={grade}
          style={[styles.btn, { backgroundColor: bg, borderColor: color }]}
          onPress={() => handleGrade(grade)}
          disabled={disabled}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={a11y}
          accessibilityState={{ disabled }}
        >
          <Text style={[styles.label, { color }]}>{label}</Text>
          <Text style={[styles.sub, { color }]}>{sublabel}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  btn: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  label: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
  },
  sub: {
    fontSize: Typography.caption,
    opacity: 0.8,
    marginTop: 2,
  },
});
