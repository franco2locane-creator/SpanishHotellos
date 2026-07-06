import { View, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { Link } from 'expo-router';
import AuthButton from '@/components/auth/AuthButton';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>S4H</Text>
        </View>
        <Text style={styles.appName}>Spanish4Hoteleros</Text>
        <Text style={styles.tagline}>
          Master hotel Spanish.{'\n'}Pass your oral exam.
        </Text>
      </View>

      {/* Feature pills */}
      <View style={styles.pills}>
        {['AI role-play', 'Real rubrics', 'Spaced repetition'].map((f) => (
          <View key={f} style={styles.pill}>
            <Text style={styles.pillText}>{f}</Text>
          </View>
        ))}
      </View>

      {/* CTAs */}
      <View style={styles.ctas}>
        <Link href="/(auth)/sign-up" asChild>
          <AuthButton label="Get Started — It's Free" onPress={() => {}} style={styles.primaryCta} />
        </Link>

        <Link href="/(auth)/sign-in" asChild>
          <AuthButton label="Sign In" onPress={() => {}} variant="ghost" style={styles.ghostCta} />
        </Link>
      </View>

      <Text style={styles.legalNote}>
        Free to download · €9.99 one-time unlock for full access
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.navy,
    paddingHorizontal: Spacing.lg,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  logoMark: {
    width: 80,
    height: 80,
    borderRadius: Radii.xl,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  logoText: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: Colors.navy,
    letterSpacing: 1,
  },
  appName: {
    fontSize: Typography.title,
    fontWeight: Typography.bold,
    color: Colors.textOnDark,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: Typography.subtitle,
    color: Colors.goldLight,
    textAlign: 'center',
    lineHeight: Typography.subtitle * Typography.lineHeightNormal,
    fontWeight: Typography.regular,
  },
  pills: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    flexWrap: 'wrap',
  },
  pill: {
    borderWidth: 1,
    borderColor: Colors.navyLight,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.navyLight,
  },
  pillText: {
    fontSize: Typography.caption,
    color: Colors.goldLight,
    fontWeight: Typography.medium,
  },
  ctas: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  primaryCta: {
    backgroundColor: Colors.gold,
  },
  ghostCta: {
    borderWidth: 1.5,
    borderColor: Colors.navyLight,
    borderRadius: 12,
  },
  legalNote: {
    textAlign: 'center',
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
});
