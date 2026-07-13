import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

/** Vocab stats are SQLite-backed and structurally unavailable on web (see
 *  lib/db/vocab.ts's Platform.OS === 'web' no-ops) — shown explicitly here
 *  instead of letting those cards render a confident, permanent 0%. */
export default function WebUnavailableCard({ label }: { label: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.text}>📱 {label} available in the mobile app</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm,
  },
  text: { fontSize: Typography.caption, color: Colors.textMuted, textAlign: 'center', fontStyle: 'italic' },
});
