import { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import AuthInput from '@/components/auth/AuthInput';
import AuthButton from '@/components/auth/AuthButton';
import SocialAuthRow from '@/components/auth/SocialAuthRow';
import { signInWithEmail, signInWithApple } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing, Typography } from '@/lib/theme';
import strings from '@/lib/i18n';

type FormErrors = { email?: string; password?: string; general?: string };

export default function SignInScreen() {
  const router = useRouter();
  const { setUser } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'apple' | null>(null);

  function validate(): boolean {
    const next: FormErrors = {};
    if (!email.trim()) next.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email.';
    if (!password) next.password = 'Password is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleEmailSignIn() {
    if (!validate()) return;
    setIsLoading(true);
    setErrors({});
    try {
      const user = await signInWithEmail(email.trim(), password);
      setUser(user);
      router.replace('/(tabs)');
    } catch (e: unknown) {
      setErrors({ general: e instanceof Error ? e.message : 'Sign in failed.' });
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
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>Welcome back</Text>

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
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password"
            error={errors.password}
          />

          <TouchableOpacity style={styles.forgotRow}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <AuthButton
            label="Sign In"
            onPress={handleEmailSignIn}
            isLoading={isLoading}
            disabled={!!socialLoading}
          />

          <SocialAuthRow
            onApple={handleApple}
            isLoading={!!socialLoading}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/sign-up" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Sign up</Text>
              </TouchableOpacity>
            </Link>
          </View>
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
  forgotRow: { alignSelf: 'flex-end', marginBottom: Spacing.md, marginTop: -Spacing.sm },
  forgotText: { fontSize: Typography.body, color: Colors.gold, fontWeight: Typography.medium },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  footerText: { fontSize: Typography.body, color: Colors.textSecondary },
  footerLink: { fontSize: Typography.body, color: Colors.navy, fontWeight: Typography.semibold },
});
