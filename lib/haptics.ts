import * as ExpoHaptics from 'expo-haptics';
import { Platform } from 'react-native';

const native = Platform.OS !== 'web';

export const Haptics = {
  light:   () => { if (native) ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light); },
  medium:  () => { if (native) ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium); },
  success: () => { if (native) ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success); },
  warning: () => { if (native) ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning); },
  error:   () => { if (native) ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error); },
};
