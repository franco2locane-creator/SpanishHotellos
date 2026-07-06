import { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import AuthInput from '@/components/auth/AuthInput';
import AuthButton from '@/components/auth/AuthButton';
import SocialAuthRow from '@/components/auth/SocialAuthRow';
import { signUpWithEmail, signInWithApple, signInWithGoogle } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing, Typography } from '@/lib/theme';

type FormErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
};

export default function SignUpScreen() {
  const router = useRouter();
  const { setUser } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'apple' | 'google' | null>(null);

  function validate(): boolean {
    const next: FormErrors = {};
    if (!email.trim()) next.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email.';
    if (!password) next.password = 'Password is required.';
    else if (password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleEmailSignUp() {
    if (!validate()) return;
    setIsLoading(true);
    setErrors({});
    try {
      const user = await signUpWithEmail(email.trim(), password);
      setUser(user);
      router.replace('/(tabs)');
    } catch (e: unknown) {
      setErrors({ general: e instanceof Error ? e.message : 'Sign up failed.' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApple() {
    setSocialLoading('apple');
    try {
      const user = await signInWithApple();
      setUser(user);
      router.replace('/(tabs)');
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('canceled')) return;
      setErrors({ general: e instanceof Error ? e.message : 'Apple sign in failed.' });
    } finally {
      setSocialLoading(null);
    }
  }

  async function handleGoogle() {
    setSocialLoading('google');
    setErrors({});
    try {
      await signInWithGoogle();
    } catch (e: unknown) {
      setErrors({ general: e instanceof Error ? e.message : 'Google sign in failed.' });
    } finally {
      setSocialLoading(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Free to start — unlock everything for €9.99</Text>

          {errors.general ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errors.general}</Text>
            </View>
          ) : null}

          <AuthInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@school.edu"
            keyboardType="email-address"
            autoComplete="email"
            error={errors.email}
          />
          <AuthInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="8+ characters"
            secureTextEntry
            autoComplete="new-password"
            error={errors.password}
          />
          <AuthInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="new-password"
            error={errors.confirmPassword}
          />

          <AuthButton
            label="Create Account"
            onPress={handleEmailSignUp}
            isLoading={isLoading}
            disabled={!!socialLoading}
          />

          <SocialAuthRow
            onApple={handleApple}
            onGoogle={handleGoogle}
            isLoading={!!socialLoading}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/sign-in" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Sign in</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <Text style={styles.terms}>
            By continuing you agree to our Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.xl },
  title: {
    fontSize: Typography.display,
    fontWeight: Typography.bold,
    color: Colors.navy,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorBannerText: { color: Colors.error, fontSize: Typography.body },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  footerText: { fontSize: Typography.body, color: Colors.textSecondary },
  footerLink: { fontSize: Typography.body, color: Colors.navy, fontWeight: Typography.semibold },
  terms: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
