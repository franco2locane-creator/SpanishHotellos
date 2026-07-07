import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';

type Props = {
  onApple: () => void;
  onGoogle: () => void;
  isLoading?: boolean;
};

export default function SocialAuthRow({ onApple, onGoogle, isLoading = false }: Props) {
  // Social auth (Apple / Google OAuth) requires native modules not available on web.
  if (Platform.OS === 'web') return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.buttons}>
        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={Radii.md}
            style={[styles.socialBtn, styles.appleBtn]}
            onPress={onApple}
          />
        )}

        <TouchableOpacity
          style={[styles.socialBtn, styles.googleBtn]}
          onPress={onGoogle}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.googleLabel}>G  Continue with Google</Text>
        </TouchableOpacity>
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
  googleBtn: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLabel: {
    fontSize: Typography.body,
    fontWeight: Typography.medium,
    color: Colors.textPrimary,
  },
});
