import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Colors, Typography } from '@/lib/theme';
import strings from '@/lib/i18n';

const TAB_ICONS: Record<string, string> = {
  index:      '📅',
  practice:   '🗣️',
  'mock-exam': '📋',
  progress:   '📈',
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
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
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
            {TAB_ICONS[route.name] ?? '●'}
          </Text>
        ),
      })}
    >
      <Tabs.Screen name="index"     options={{ title: strings.tabs.today }} />
      <Tabs.Screen name="practice"  options={{ title: strings.tabs.practice }} />
      <Tabs.Screen name="mock-exam" options={{ title: strings.tabs.mockExam }} />
      <Tabs.Screen name="progress"  options={{ title: strings.tabs.progress }} />
    </Tabs>
  );
}
