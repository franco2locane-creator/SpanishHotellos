import { View, Text, StyleSheet, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';

type Props = {
  onApple: () => void;
  isLoading?: boolean;
};

// Google sign-in is intentionally not offered in v1: Apple guideline 4.8 requires
// Sign in with Apple whenever a third-party login is offered, and Google's own
// OAuth chain isn't configured yet. Returns in v1.1.
export default function SocialAuthRow({ onApple, isLoading = false }: Props) {
  // Apple Sign In is iOS-only and requires a native module not available on web/Android.
  if (Platform.OS !== 'ios') return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.buttons} pointerEvents={isLoading ? 'none' : 'auto'}>
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={Radii.md}
          style={[styles.socialBtn, styles.appleBtn, isLoading && styles.disabled]}
          onPress={onApple}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: Spacing.md,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerLabel: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
  },
  buttons: {
    gap: Spacing.sm,
  },
  socialBtn: {
    height: 52,
    borderRadius: Radii.md,
  },
  appleBtn: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
});
