import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

// ── Filler / repair phrases ───────────────────────────────────────────────────

type Phrase = { id: string; es: string; en: string; category: string };

const PHRASES: Phrase[] = [
  // Buying time
  { id: 'p1',  es: '¿Podría repetir, por favor?',           en: 'Could you repeat that, please?',          category: 'Asking to repeat' },
  { id: 'p2',  es: 'Un momento, por favor.',                en: 'One moment, please.',                     category: 'Buying time' },
  { id: 'p3',  es: 'Permítame verificarlo.',                en: 'Allow me to check that.',                 category: 'Buying time' },
  { id: 'p4',  es: 'Déjeme consultarlo.',                   en: 'Let me look into that.',                  category: 'Buying time' },
  { id: 'p5',  es: '¿Me permite un momento?',              en: 'May I have a moment?',                    category: 'Buying time' },
  // Repair / clarification
  { id: 'p6',  es: 'Si le parece bien…',                   en: 'If that works for you…',                  category: 'Offering a solution' },
  { id: 'p7',  es: 'Voy a consultarlo con mi supervisor.',  en: 'I\'ll check with my supervisor.',          category: 'Escalating' },
  { id: 'p8',  es: 'Enseguida le soluciono.',              en: 'I\'ll sort that out right away.',          category: 'Taking action' },
  { id: 'p9',  es: 'Disculpe las molestias.',              en: 'I apologise for the inconvenience.',      category: 'Apologising' },
  { id: 'p10', es: 'Le agradezco su paciencia.',           en: 'I appreciate your patience.',             category: 'Thanking' },
  // Formal courtesies
  { id: 'p11', es: 'Por supuesto, con mucho gusto.',       en: 'Of course, with pleasure.',               category: 'Positive response' },
  { id: 'p12', es: '¿En qué más puedo ayudarle?',         en: 'Is there anything else I can help you with?', category: 'Closing' },
  { id: 'p13', es: 'Lamentamos mucho las molestias.',      en: 'We deeply regret the inconvenience.',     category: 'Apologising' },
  { id: 'p14', es: 'A su disposición.',                    en: 'At your service.',                        category: 'Formal offer' },
  { id: 'p15', es: 'Tiene usted razón, le pido disculpas.', en: 'You are right, I apologise.',            category: 'Acknowledging fault' },
  { id: 'p16', es: 'No se preocupe, lo resolvemos.',       en: 'Don\'t worry, we\'ll sort it out.',        category: 'Reassuring' },
  { id: 'p17', es: 'Ha sido un placer atenderle.',         en: 'It has been a pleasure serving you.',     category: 'Closing' },
  { id: 'p18', es: 'Que disfrute de su estancia.',        en: 'Enjoy your stay.',                        category: 'Closing' },
];

function PhraseItem({ item }: { item: Phrase }) {
  function speak() {
    Speech.speak(item.es, { language: 'es-ES', rate: 0.85 });
  }

  return (
    <TouchableOpacity style={styles.item} onPress={speak} activeOpacity={0.8}>
      <View style={styles.itemLeft}>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.esText}>{item.es}</Text>
        <Text style={styles.enText}>{item.en}</Text>
      </View>
      <View style={styles.speakBtn}>
        <Text style={styles.speakIcon}>🔊</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function PhrasesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} hitSlop={12}>
          <Text style={styles.back}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Filler & Repair Phrases</Text>
        <View style={{ width: 28 }} />
      </View>
      <Text style={styles.subtitle}>Tap any phrase to hear it spoken</Text>

      <FlatList
        data={PHRASES}
        keyExtractor={p => p.id}
        renderItem={({ item }) => <PhraseItem item={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F5F0' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.navy,
  },
  back: { fontSize: 20, color: '#fff' },
  headerTitle: { fontSize: Typography.body, fontWeight: Typography.semibold, color: '#fff' },
  subtitle: {
    fontSize: Typography.caption, color: Colors.textMuted,
    textAlign: 'center', paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: '#E8E3DC',
  },
  list: { padding: Spacing.md, paddingBottom: 40 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm, gap: Spacing.sm,
  },
  itemLeft: { flex: 1, gap: 2 },
  category: {
    fontSize: 10, fontWeight: Typography.bold, color: Colors.gold,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  esText: { fontSize: Typography.body, fontWeight: Typography.semibold, color: Colors.navy },
  enText: { fontSize: Typography.caption, color: Colors.textMuted, fontStyle: 'italic' },
  speakBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#EEF3F9', justifyContent: 'center', alignItems: 'center',
  },
  speakIcon: { fontSize: 20 },
});
