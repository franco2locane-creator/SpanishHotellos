import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Colors, Typography } from '@/lib/theme';
import strings from '@/lib/i18n';

function TabIcon({ focused, name }: { focused: boolean; name: string }) {
  // Placeholder — replace with proper icons (e.g. @expo/vector-icons) later
  return null;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: {
          backgroundColor: Colors.tabBackground,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarLabelStyle: {
          fontSize: Typography.caption,
          fontWeight: Typography.medium,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: strings.tabs.today }}
      />
      <Tabs.Screen
        name="practice"
        options={{ title: strings.tabs.practice }}
      />
      <Tabs.Screen
        name="mock-exam"
        options={{ title: strings.tabs.mockExam }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: strings.tabs.progress }}
      />
    </Tabs>
  );
}
