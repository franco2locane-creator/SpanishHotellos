import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import type { AuthUser } from '@/types';
import type { User } from '@supabase/supabase-js';

// ── Profile fetch ─────────────────────────────────────────────────────────────

// Exported for use in root layout's onAuthStateChange handler.
export async function buildInitialUser(user: User): Promise<AuthUser> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium, onboarding_completed_at, exam_date, exam_format')
    .eq('id', user.id)
    .maybeSingle();

  let onboardingStep: AuthUser['onboardingStep'];
  if (profile?.onboarding_completed_at) {
    onboardingStep = 'complete';
  } else if (profile?.exam_date) {
    onboardingStep = 'placement';
  } else {
    onboardingStep = 'exam-setup';
  }

  return {
    id: user.id,
    email: user.email ?? null,
    isPremium: profile?.is_premium ?? false,
    onboardingStep,
    examFormat: (profile?.exam_format ?? 'guided_dialogue') as AuthUser['examFormat'],
    examDate: profile?.exam_date ?? undefined,
  };
}

// ── Email / password ──────────────────────────────────────────────────────────

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return buildInitialUser(data.user);
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error('Sign-up succeeded but no user returned.');
  return buildInitialUser(data.user);
}

export async function sendPasswordReset(email: string): Promise<void> {
  const redirectTo = Linking.createURL('/reset-password');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

// ── Apple sign-in (iOS only) ──────────────────────────────────────────────────

export async function signInWithApple(): Promise<AuthUser> {
  // Dynamically import to avoid crashing on Android/web where the module
  // isn't available.
  const AppleAuth = await import('expo-apple-authentication');

  const credential = await AppleAuth.signInAsync({
    requestedScopes: [
      AppleAuth.AppleAuthenticationScope.FULL_NAME,
      AppleAuth.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple sign-in did not return an identity token.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;
  if (!data.user) throw new Error('No user after Apple sign-in.');
  return buildInitialUser(data.user);
}

// ── Google OAuth (PKCE via WebBrowser) ───────────────────────────────────────

export async function signInWithGoogle(): Promise<void> {
  const redirectTo = Linking.createURL('/');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('No OAuth URL returned from Supabase.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === 'success' && result.url) {
    const parsed = Linking.parse(result.url);
    const code = parsed.queryParams?.code as string | undefined;
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
    }
  }
  // onAuthStateChange in _layout handles the session update.
}

// ── Sign out ──────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ── Session hydration (called once on app start) ──────────────────────────────

export async function getInitialUser(): Promise<AuthUser | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  return buildInitialUser(session.user);
}
