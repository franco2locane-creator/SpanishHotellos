import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { AttemptDetailItem } from '@/lib/grammar/progress';

export default function LastAttemptPanel({ items }: { items: AttemptDetailItem[] }) {
  if (items.length === 0) return null;
  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      {items.map((item, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.icon}>{item.correct ? '✓' : '✗'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.prompt} numberOfLines={2}>{item.prompt}</Text>
            <Text style={styles.given}>You said: {item.given}</Text>
            {!item.correct && <Text style={styles.correctAnswer}>Correct: {item.correctAnswer}</Text>}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    maxHeight: 260, backgroundColor: Colors.surface, borderRadius: Radii.lg,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, ...Shadows.sm,
  },
  content: { padding: Spacing.md, gap: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  icon: { fontSize: Typography.body, width: 18 },
  prompt: { fontSize: Typography.caption, color: Colors.textSecondary },
  given: { fontSize: Typography.caption, color: Colors.textPrimary, fontStyle: 'italic', marginTop: 1 },
  correctAnswer: { fontSize: Typography.caption, color: Colors.success, marginTop: 1 },
});
