import { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { ExamFormat } from '@/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const SCHOOLS = ['Vatel', 'Les Roches', 'EHL', 'Hotelschool The Hague', 'Other'] as const;

const FORMATS: { id: ExamFormat; label: string; description: string }[] = [
  { id: 'guided_dialogue', label: 'Guided Dialogue', description: 'Structured conversation with prompts' },
  { id: 'monologue', label: 'Monologue', description: 'Extended speech on a given topic' },
  { id: 'picture_description', label: 'Picture Description', description: 'Describe and discuss an image' },
  { id: 'spontaneous_qa', label: 'Spontaneous Q&A', description: 'Unprompted questions from examiner' },
];

function parseDate(dd: string, mm: string, yyyy: string): string | null {
  const d = parseInt(dd, 10);
  const m = parseInt(mm, 10);
  const y = parseInt(yyyy, 10);
  if (!d || !m || !y || d < 1 || d > 31 || m < 1 || m > 12 || y < 2024) return null;
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (isNaN(Date.parse(iso))) return null;
  return iso;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ExamSetup() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [school, setSchool] = useState('');
  const [format, setFormat] = useState<ExamFormat>('guided_dialogue');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleNext() {
    if (!school) return Alert.alert('Select your school', 'Please choose your hotel school.');
    const examDate = parseDate(day, month, year);
    if (!examDate) return Alert.alert('Invalid date', 'Please enter a valid exam date (DD / MM / YYYY).');
    if (!user) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ school, exam_format: format, exam_date: examDate })
      .eq('id', user.id);
    setIsSaving(false);

    if (error) {
      Alert.alert('Error', 'Could not save your details. Please try again.');
      return;
    }
    router.push('/onboarding/placement');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.step}>Step 1 of 3</Text>
        <Text style={styles.title}>Tell us about your exam</Text>

        {/* School */}
        <Text style={styles.label}>Your hotel school</Text>
        <View style={styles.chips}>
          {SCHOOLS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, school === s && styles.chipActive]}
              onPress={() => setSchool(s)}
            >
              <Text style={[styles.chipText, school === s && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Exam format */}
        <Text style={styles.label}>Exam format</Text>
        {FORMATS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.formatRow, format === f.id && styles.formatRowActive]}
            onPress={() => setFormat(f.id)}
          >
            <View style={[styles.radio, format === f.id && styles.radioActive]}>
              {format === f.id && <View style={styles.radioDot} />}
            </View>
            <View style={styles.formatText}>
              <Text style={[styles.formatLabel, format === f.id && styles.formatLabelActive]}>{f.label}</Text>
              <Text style={styles.formatDesc}>{f.description}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Exam date */}
        <Text style={styles.label}>Exam date</Text>
        <View style={styles.dateRow}>
          <TextInput style={styles.dateInput} placeholder="DD" keyboardType="number-pad"
            maxLength={2} value={day} onChangeText={setDay} />
          <Text style={styles.dateSep}>/</Text>
          <TextInput style={styles.dateInput} placeholder="MM" keyboardType="number-pad"
            maxLength={2} value={month} onChangeText={setMonth} />
          <Text style={styles.dateSep}>/</Text>
          <TextInput style={[styles.dateInput, styles.yearInput]} placeholder="YYYY" keyboardType="number-pad"
            maxLength={4} value={year} onChangeText={setYear} />
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} disabled={isSaving}>
          {isSaving
            ? <ActivityIndicator color={Colors.textOnDark} />
            : <Text style={styles.nextText}>Next</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  step: { fontSize: Typography.caption, color: Colors.gold, fontWeight: Typography.semibold, marginBottom: Spacing.xs, textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: Typography.heading, fontWeight: Typography.bold, color: Colors.navy, marginBottom: Spacing.lg },
  label: { fontSize: Typography.body, fontWeight: Typography.semibold, color: Colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive: { borderColor: Colors.navy, backgroundColor: Colors.navy },
  chipText: { fontSize: Typography.body, color: Colors.textSecondary },
  chipTextActive: { color: Colors.textOnDark, fontWeight: Typography.semibold },
  formatRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface, marginBottom: Spacing.sm, ...Shadows.sm },
  formatRowActive: { borderColor: Colors.navy, backgroundColor: '#EEF3F8' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, marginRight: Spacing.md, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: Colors.navy },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.navy },
  formatText: { flex: 1 },
  formatLabel: { fontSize: Typography.body, fontWeight: Typography.medium, color: Colors.textPrimary },
  formatLabelActive: { color: Colors.navy, fontWeight: Typography.semibold },
  formatDesc: { fontSize: Typography.caption, color: Colors.textMuted, marginTop: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dateInput: { width: 60, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.sm, padding: Spacing.sm, fontSize: Typography.body, textAlign: 'center', backgroundColor: Colors.surface },
  yearInput: { width: 80 },
  dateSep: { fontSize: Typography.title, color: Colors.textMuted },
  nextBtn: { marginTop: Spacing.xl, backgroundColor: Colors.navy, borderRadius: Radii.md, paddingVertical: Spacing.md, alignItems: 'center' },
  nextText: { color: Colors.textOnDark, fontSize: Typography.bodyLarge, fontWeight: Typography.semibold },
});
