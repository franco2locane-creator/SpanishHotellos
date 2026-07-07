import { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';
import { Haptics } from '@/lib/haptics';

type Props = {
  onPressIn: () => void;
  onPressOut: () => void;
  disabled?: boolean;
  isRecording?: boolean;
  transcript?: string;
};

export default function MicButton({
  onPressIn,
  onPressOut,
  disabled = false,
  isRecording = false,
  transcript = '',
}: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Haptics.medium();
    Animated.spring(scaleAnim, { toValue: 1.12, useNativeDriver: true }).start();
    onPressIn();
  }, [onPressIn, scaleAnim]);

  const handlePressOut = useCallback(() => {
    Haptics.light();
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    onPressOut();
  }, [onPressOut, scaleAnim]);

  const hintText = isRecording ? 'Release to send' : disabled ? 'Please wait…' : 'Hold to speak';
  const a11yLabel = isRecording
    ? 'Recording — release to send your reply'
    : 'Hold to record your reply in Spanish';

  return (
    <View style={styles.wrapper}>
      {isRecording && transcript ? (
        <View style={styles.liveTranscript} accessibilityLiveRegion="polite">
          <Text style={styles.liveText} numberOfLines={2}>{transcript}</Text>
        </View>
      ) : null}

      <View style={styles.row}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            style={[styles.btn, isRecording && styles.btnRecording, disabled && styles.btnDisabled]}
            accessibilityRole="button"
            accessibilityLabel={a11yLabel}
            accessibilityState={{ disabled, busy: isRecording }}
          >
            <Text style={styles.icon}>{isRecording ? '⏹' : '🎤'}</Text>
          </Pressable>
        </Animated.View>

        <Text style={styles.hint} accessibilityElementsHidden>{hintText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  liveTranscript: {
    backgroundColor: '#EBF3FB', borderRadius: Radii.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.xl, alignSelf: 'stretch',
  },
  liveText: { fontSize: Typography.caption, color: Colors.textPrimary, fontStyle: 'italic' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  btn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.navy,
    justifyContent: 'center', alignItems: 'center',
  },
  btnRecording: { backgroundColor: Colors.error },
  btnDisabled: { backgroundColor: Colors.textMuted },
  icon: { fontSize: 30 },
  hint: { fontSize: Typography.caption, color: Colors.textMuted },
});
