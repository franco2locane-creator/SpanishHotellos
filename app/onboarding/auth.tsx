import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import AuthInput from '@/components/auth/AuthInput';
import AuthButton from '@/components/auth/AuthButton';
import SocialAuthRow from '@/components/auth/SocialAuthRow';
import { signInWithEmail, signUpWithEmail, signInWithApple } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing, Typography } from '@/lib/theme';

type Mode = 'signup' | 'signin';
type FormErrors = { email?: string; password?: string; confirm?: string; general?: string };

export default function OnboardingAuth() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  // Advance to the right step once auth completes.
  useEffect(() => {
    if (!user) return;
    if (user.onboardingStep === 'complete') {
      router.replace('/(tabs)');
    } else {
      router.replace(`/onboarding/${user.onboardingStep}` as any);
    }
  }, [user?.id]);

  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'apple' | null>(null);

  function validate(): boolean {
    const e: FormErrors = {};
    if (!email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email.';
    if (!password) e.password = 'Password is required.';
    else if (mode === 'signup' && password.length < 8) e.password = 'Minimum 8 characters.';
    if (mode === 'signup' && password !== confirm) e.confirm = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setIsLoading(true);
    setErrors({});
    try {
      const fn = mode === 'signup' ? signUpWithEmail : signInWithEmail;
      const user = await fn(email.trim(), password);
      setUser(user);
      router.replace('/onboarding/exam-setup');
    } catch (e: unknown) {
      setErrors({ general: e instanceof Error ? e.message : 'Authentication failed.' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApple() {
    setSocialLoading('apple');
    try {
      const user = await signInWithApple();
      setUser(user);
      router.replace('/onboarding/exam-setup');
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('canceled')) return;
      setErrors({ general: e instanceof Error ? e.message : 'Apple sign-in failed.' });
    } finally {
      setSocialLoading(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{mode === 'signup' ? 'Create account' : 'Welcome back'}</Text>

          <View style={styles.toggle}>
            {(['signup', 'signin'] as Mode[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
                onPress={() => { setMode(m); setErrors({}); }}
              >
                <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                  {m === 'signup' ? 'Sign up' : 'Sign in'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {errors.general ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          ) : null}

          <AuthInput label="Email" value={email} onChangeText={setEmail}
            placeholder="you@school.edu" keyboardType="email-address"
            autoComplete="email" error={errors.email} />
          <AuthInput label="Password" value={password} onChangeText={setPassword}
            placeholder="••••••••" secureTextEntry
            autoComplete={mode === 'signup' ? 'new-password' : 'password'} error={errors.password} />
          {mode === 'signup' && (
            <AuthInput label="Confirm password" value={confirm} onChangeText={setConfirm}
              placeholder="••••••••" secureTextEntry autoComplete="new-password" error={errors.confirm} />
          )}

          <AuthButton
            label={mode === 'signup' ? 'Create account' : 'Sign in'}
            onPress={handleSubmit}
            isLoading={isLoading}
            disabled={!!socialLoading}
          />

          <SocialAuthRow onApple={handleApple} isLoading={!!socialLoading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.xxl },
  title: { fontSize: Typography.display, fontWeight: Typography.bold, color: Colors.navy, marginBottom: Spacing.lg },
  toggle: { flexDirection: 'row', backgroundColor: Colors.surfaceAlt, borderRadius: 10, padding: 4, marginBottom: Spacing.lg },
  toggleBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: 8, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: Colors.surface },
  toggleText: { fontSize: Typography.body, color: Colors.textSecondary, fontWeight: Typography.medium },
  toggleTextActive: { color: Colors.navy, fontWeight: Typography.semibold },
  errorBanner: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: Spacing.md, marginBottom: Spacing.md },
  errorText: { color: Colors.error, fontSize: Typography.body },
});
