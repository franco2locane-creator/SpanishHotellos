import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';

type Props = {
  ctaLabel: string;
  onUnlock: () => void;
  /** Shows an "Sample" ribbon when the wrapped content is static demo data, not the user's own. */
  isSample?: boolean;
  children: React.ReactNode;
};

/**
 * Wraps a card in a locked-preview treatment: real (or sample) content stays
 * visible for shape/layout, dimmed under a scrim, with an unlock CTA on top.
 * Callers are responsible for masking any sensitive numeric values in the
 * children themselves (e.g. via a `masked` prop) — this component only
 * handles the visual lock chrome, not the data masking.
 */
export default function LockedOverlay({ ctaLabel, onUnlock, isSample, children }: Props) {
  return (
    <View style={styles.wrap}>
      {children}
      <View style={styles.scrim} pointerEvents="none" />
      {isSample && (
        <View style={styles.sampleRibbon} pointerEvents="none">
          <Text style={styles.sampleRibbonText}>SAMPLE</Text>
        </View>
      )}
      <TouchableOpacity
        style={styles.cta}
        onPress={onUnlock}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
      >
        <Text style={styles.ctaIcon}>🔒</Text>
        <Text style={styles.ctaText}>{ctaLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(248,245,240,0.6)', borderRadius: Radii.lg,
  },
  sampleRibbon: {
    position: 'absolute', top: Spacing.sm, right: Spacing.sm,
    backgroundColor: Colors.textMuted, borderRadius: Radii.sm,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  sampleRibbonText: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  cta: {
    position: 'absolute', left: Spacing.md, right: Spacing.md, bottom: Spacing.md,
    backgroundColor: Colors.navy, borderRadius: Radii.full,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: Spacing.sm,
  },
  ctaIcon: { fontSize: 14 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: Typography.caption },
});
