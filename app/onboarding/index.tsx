import { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import AuthButton from '@/components/auth/AuthButton';
import { Colors, Spacing, Typography } from '@/lib/theme';

export default function OnboardingWelcome() {
  const { user } = useAuthStore();
  const router = useRouter();

  // If user already authenticated, advance to their onboarding step.
  useEffect(() => {
    if (!user) return;
    if (user.onboardingStep === 'complete') {
      router.replace('/(tabs)');
    } else {
      router.replace(`/onboarding/${user.onboardingStep}` as any);
    }
  }, [user]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.body}>
        <View style={styles.logoMark}>
          <Text style={styles.logoEmoji}>🏨</Text>
        </View>

        <Text style={styles.appName}>Spanish4Hoteleros</Text>

        <Text style={styles.valueProps}>
          Practice real hotel conversations with an AI guest and ace your Spanish oral exam.
        </Text>

        <View style={styles.pills}>
          {['AI role-play', 'Exam grading', 'CEFR placement', 'Study plan'].map((label) => (
            <View key={label} style={styles.pill}>
              <Text style={styles.pillText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <AuthButton
          label="Get started"
          onPress={() => router.push('/onboarding/auth')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.navy },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  logoMark: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  logoEmoji: { fontSize: 40 },
  appName: {
    fontSize: Typography.display,
    fontWeight: Typography.bold,
    color: Colors.textOnDark,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  valueProps: {
    fontSize: Typography.bodyLarge,
    color: Colors.textOnDark,
    textAlign: 'center',
    opacity: 0.85,
    lineHeight: 26,
    marginBottom: Spacing.xl,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  pill: {
    backgroundColor: 'rgba(200,151,58,0.25)',
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  pillText: { color: Colors.gold, fontSize: Typography.caption, fontWeight: Typography.medium },
  footer: { padding: Spacing.xl, paddingBottom: Spacing.xxl },
});
