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

  // Redirect based on auth state whenever user or route group changes.
  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = (segments[0] as string) === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
