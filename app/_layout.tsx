import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { buildInitialUser } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import {
  configurePurchases, loginPurchaseUser, logoutPurchaseUser,
} from '@/lib/purchases';

// Configure RevenueCat once at module load time (before any component mounts).
configurePurchases();

export default function RootLayout() {
  const { user, isLoading, setUser, setLoading, setPremium } = useAuthStore();
  const { loadDevOverride } = usePurchaseStore();
  const router = useRouter();
  const segments = useSegments();

  // Load dev override from AsyncStorage on startup.
  useEffect(() => { loadDevOverride(); }, []);

  // Sync RevenueCat login state with auth state.
  useEffect(() => {
    if (!user) {
      logoutPurchaseUser();
    } else {
      loginPurchaseUser(user.id).then(isActive => {
        if (isActive !== user.isPremium) setPremium(isActive);
      });
    }
  }, [user?.id]);

  // Hydrate session on cold start, then subscribe to future changes.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const authUser = await buildInitialUser(session.user);
        setUser(authUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const authUser = await buildInitialUser(session.user);
          setUser(authUser);
        } else {
          setUser(null);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  // Redirect based on auth state and onboarding progress.
  useEffect(() => {
    if (isLoading) return;
    const segment = segments[0] as string | undefined;
    const inOnboarding = segment === 'onboarding';
    const inTabs = segment === '(tabs)';
    const inAuth = segment === '(auth)';

    if (!user) {
      // Legacy (auth) screens are still allowed; everything else → onboarding welcome.
      if (!inOnboarding && !inAuth) router.replace('/onboarding');
      return;
    }

    if (user.onboardingStep === 'complete') {
      // Only redirect to tabs from auth/onboarding entry points.
      // All other routes (roleplay, vocab, drill, exam, etc.) are valid.
      if (inOnboarding || inAuth || !segment) router.replace('/(tabs)');
      return;
    }

    // Authenticated but onboarding incomplete — keep them in the onboarding group.
    if (!inOnboarding) {
      router.replace(`/onboarding/${user.onboardingStep}` as any);
    }
  }, [user, isLoading, segments]);

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="vocab" />
        <Stack.Screen name="roleplay" />
        <Stack.Screen name="feedback" />
        <Stack.Screen name="drill" />
        <Stack.Screen name="exam" />
        <Stack.Screen name="paywall" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="phrases" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
