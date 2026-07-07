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

const GRADES: GradeConfig[] = [
  { grade: 0, label: 'Again', sublabel: '<1d',  color: Colors.error,   bg: '#FEE2E2', a11y: 'Again — review in less than a day' },
  { grade: 1, label: 'Hard',  sublabel: '~1d',  color: Colors.warning, bg: '#FEF3C7', a11y: 'Hard — review in about a day' },
  { grade: 2, label: 'Good',  sublabel: '~6d',  color: Colors.success, bg: '#D1FAE5', a11y: 'Good — review in about 6 days' },
  { grade: 3, label: 'Easy',  sublabel: '+10d', color: Colors.info,    bg: '#DBEAFE', a11y: 'Easy — review in 10 or more days' },
];

type Props = {
  onGrade: (grade: SrsGrade) => void;
  disabled?: boolean;
};

export default function ReviewControls({ onGrade, disabled = false }: Props) {
  function handleGrade(grade: SrsGrade) {
    if (grade >= 2) Haptics.success();
    else if (grade === 1) Haptics.light();
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
    paddingVertical: Spacing.md,
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
