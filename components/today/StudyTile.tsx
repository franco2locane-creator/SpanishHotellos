import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import { Haptics } from '@/lib/haptics';

type Props = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  checked: boolean;
  onPress: () => void;
  onCheck: () => void;
  accent?: string;
};

export default function StudyTile({ icon, title, subtitle, checked, onPress, onCheck, accent = Colors.navy }: Props) {
  function handleCheck() {
    if (!checked) Haptics.success();
    onCheck();
  }

  return (
    <View style={[styles.card, checked && styles.cardChecked]}>
      <TouchableOpacity
        style={styles.iconWrap}
        onPress={handleCheck}
        activeOpacity={0.8}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={checked ? `${title} — marked complete` : `Mark ${title} as complete`}
      >
        <View style={[styles.circle, { borderColor: accent }, checked && { backgroundColor: accent }]}>
          <Text style={styles.checkmark}>{checked ? '✓' : ''}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.body}
        onPress={onPress}
        activeOpacity={0.8}
        disabled={checked}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={checked ? undefined : subtitle}
        accessibilityState={{ disabled: checked }}
      >
        <Text style={styles.iconText}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, checked && styles.titleDone]}>{title}</Text>
          <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
        </View>
        {!checked && <Text style={[styles.arrow, { color: accent }]}>→</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm, gap: Spacing.sm,
  },
  cardChecked: { opacity: 0.6 },
  iconWrap: { paddingRight: 4 },
  circle: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  checkmark: { color: '#fff', fontWeight: '700', fontSize: 14 },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconText: { fontSize: 28 },
  title: { fontSize: Typography.body, fontWeight: '600', color: Colors.navy },
  titleDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  subtitle: { fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: 16, marginTop: 2 },
  arrow: { fontSize: 18, fontWeight: '600' },
});
