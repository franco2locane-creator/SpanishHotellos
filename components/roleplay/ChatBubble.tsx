import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Speech from 'expo-speech';
import { Colors, Spacing, Typography, Radii } from '@/lib/theme';

export type BubbleRole = 'guest' | 'student';

type Props = {
  role: BubbleRole;
  text: string;
  speakingSpeed?: 'slow' | 'normal' | 'fast';
};

const SPEED_RATE: Record<string, number> = { slow: 0.7, normal: 0.9, fast: 1.1 };

export default function ChatBubble({ role, text, speakingSpeed = 'normal' }: Props) {
  const isGuest = role === 'guest';

  function handleSpeak() {
    Speech.speak(text, { language: 'es-ES', rate: SPEED_RATE[speakingSpeed] });
  }

  return (
    <View style={[styles.row, isGuest ? styles.rowGuest : styles.rowStudent]}>
      {isGuest && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
      )}

      <View style={[styles.bubble, isGuest ? styles.bubbleGuest : styles.bubbleStudent]}>
        <Text style={[styles.text, isGuest ? styles.textGuest : styles.textStudent]}>
          {text}
        </Text>

        {isGuest && (
          <TouchableOpacity onPress={handleSpeak} style={styles.speakBtn} hitSlop={10}>
            <Text style={styles.speakIcon}>🔊</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: Spacing.xs, paddingHorizontal: Spacing.md },
  rowGuest: { justifyContent: 'flex-start' },
  rowStudent: { justifyContent: 'flex-end' },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#E8F0FB', justifyContent: 'center', alignItems: 'center',
    marginRight: Spacing.xs,
  },
  avatarText: { fontSize: 16 },
  bubble: { maxWidth: '78%', borderRadius: Radii.lg, padding: Spacing.md },
  bubbleGuest: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4 },
  bubbleStudent: { backgroundColor: Colors.navy, borderBottomRightRadius: 4 },
  text: { fontSize: Typography.body, lineHeight: 22 },
  textGuest: { color: Colors.textPrimary },
  textStudent: { color: '#FFFFFF' },
  speakBtn: { alignSelf: 'flex-end', marginTop: Spacing.xs },
  speakIcon: { fontSize: 16 },
});
