import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Colors, Spacing, Typography } from '@/lib/theme';
import strings from '@/lib/i18n';

export default function TodayScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.greeting}>{strings.today.greeting}</Text>
        <Text style={styles.title}>{strings.today.title}</Text>
        <Text style={styles.subtitle}>{strings.today.subtitle}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  greeting: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    fontWeight: Typography.regular,
  },
  title: {
    fontSize: Typography.display,
    color: Colors.navy,
    fontWeight: Typography.bold,
    marginTop: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.bodyLarge,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
});
