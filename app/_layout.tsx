import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { buildInitialUser } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';

export default function RootLayout() {
  const { user, isLoading, setUser, setLoading } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

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
      if (!inTabs) router.replace('/(tabs)');
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
      </Stack>
    </>
  );
}
