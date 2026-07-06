import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Colors, Spacing, Typography } from '@/lib/theme';
import strings from '@/lib/i18n';

export default function ProgressScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>{strings.progress.title}</Text>
        <Text style={styles.subtitle}>{strings.progress.subtitle}</Text>
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
  title: {
    fontSize: Typography.display,
    color: Colors.navy,
    fontWeight: Typography.bold,
  },
  subtitle: {
    fontSize: Typography.bodyLarge,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
});
