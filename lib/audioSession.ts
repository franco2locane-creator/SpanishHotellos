import { Platform } from 'react-native';

// Set iOS audio session to recording mode:
// - Activates the mic input category
// - Ducks any concurrent audio (e.g. TTS from another turn finishing)
// No-op on Android and web (Android handles mic mode automatically via SpeechRecognition).
export async function setRecordingMode(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const { setAudioModeAsync } = await import('expo-audio');
    await setAudioModeAsync({
      allowsRecording: true,
      interruptionMode: 'duckOthers',
      playsInSilentMode: true,
    });
  } catch {}
}

// Restore normal playback mode after recording ends.
export async function setPlaybackMode(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const { setAudioModeAsync } = await import('expo-audio');
    await setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: 'doNotMix',
      playsInSilentMode: true,
    });
  } catch {}
}
