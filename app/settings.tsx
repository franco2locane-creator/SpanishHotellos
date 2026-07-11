import { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { usePremium } from '@/hooks/usePremium';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';
import type { MockLevel } from '@/types';

function parseDate(dd: string, mm: string, yyyy: string): string | null {
  const d = parseInt(dd, 10);
  const m = parseInt(mm, 10);
  const y = parseInt(yyyy, 10);
  if (!d || !m || !y || d < 1 || d > 31 || m < 1 || m > 12 || y < 2024) return null;
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (isNaN(Date.parse(iso))) return null;
  return iso;
}

function isoToParts(iso?: string): { dd: string; mm: string; yyyy: string } {
  if (!iso) return { dd: '', mm: '', yyyy: '' };
  const [y, m, d] = iso.split('-');
  return { dd: d ?? '', mm: m ?? '', yyyy: y ?? '' };
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, setExamDate, setMockLevel } = useAuthStore();
  const isPremium = usePremium();

  const initial = isoToParts(user?.examDate);
  const [day, setDay] = useState(initial.dd);
  const [month, setMonth] = useState(initial.mm);
  const [year, setYear] = useState(initial.yyyy);
  const [mockLevel, setMockLevelLocal] = useState<MockLevel>(user?.mockLevel ?? 'basic');
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  async function handleSave() {
    if (!user) return;
    const examDate = parseDate(day, month, year);
    if (!examDate) {
      Alert.alert('Invalid date', 'Please enter a valid exam date (DD / MM / YYYY).');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ exam_date: examDate, mock_level: mockLevel })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      Alert.alert('Error', 'Could not save changes. Please try again.');
      return;
    }
    setExamDate(examDate);
    setMockLevel(mockLevel);
    Alert.alert('Saved', 'Your settings have been updated.');
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive', onPress: async () => {
          setSigningOut(true);
          await supabase.auth.signOut();
          // onAuthStateChange in _layout.tsx handles the redirect
        },
      },
    ]);
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and all your data — scores, vocab progress, everything. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete my account',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              const { error } = await supabase.functions.invoke('delete-account', {});
              if (error) throw error;
              await supabase.auth.signOut();
            } catch {
              setDeletingAccount(false);
              Alert.alert('Error', 'Could not delete your account. Please try again or contact support.');
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} hitSlop={12}>
          <Text style={styles.back}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Account */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Email</Text>
          <Text style={styles.fieldValue}>{user?.email ?? '—'}</Text>
          {isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumText}>✓ Premium</Text>
            </View>
          )}
        </View>

        {/* Exam date */}
        <Text style={styles.sectionLabel}>Exam date</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Update your exam date</Text>
          <View style={styles.dateRow}>
            <TextInput
              style={styles.dateInput}
              placeholder="DD"
              keyboardType="number-pad"
              maxLength={2}
              value={day}
              onChangeText={setDay}
            />
            <Text style={styles.dateSep}>/</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="MM"
              keyboardType="number-pad"
              maxLength={2}
              value={month}
              onChangeText={setMonth}
            />
            <Text style={styles.dateSep}>/</Text>
            <TextInput
              style={[styles.dateInput, styles.yearInput]}
              placeholder="YYYY"
              keyboardType="number-pad"
              maxLength={4}
              value={year}
              onChangeText={setYear}
            />
          </View>
        </View>

        {/* Mock level */}
        <Text style={styles.sectionLabel}>Course year</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Which year are you in?</Text>
          <View style={styles.levelRow}>
            {(['basic', 'intermediate'] as MockLevel[]).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.levelOption, mockLevel === opt && styles.levelOptionSelected]}
                onPress={() => setMockLevelLocal(opt)}
                activeOpacity={0.8}
              >
                <Text style={[styles.levelText, mockLevel === opt && styles.levelTextSelected]}>
                  {opt === 'basic' ? '1st year\nBasic' : '2nd year\nIntermediate'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save changes</Text>}
        </TouchableOpacity>

        {/* Sign out */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          activeOpacity={0.85}
          disabled={signingOut}
        >
          {signingOut
            ? <ActivityIndicator size="small" color={Colors.error} />
            : <Text style={styles.signOutText}>Sign out</Text>}
        </TouchableOpacity>

        {/* Delete account — App Store requirement */}
        <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>Danger zone</Text>
        <TouchableOpacity
          style={[styles.signOutBtn, styles.deleteBtn, deletingAccount && styles.saveBtnDisabled]}
          onPress={handleDeleteAccount}
          activeOpacity={0.85}
          disabled={deletingAccount}
          accessibilityRole="button"
          accessibilityLabel="Delete account permanently"
        >
          {deletingAccount
            ? <ActivityIndicator size="small" color={Colors.error} />
            : <Text style={styles.deleteText}>Delete account</Text>}
        </TouchableOpacity>

        <Text style={styles.version}>Spanish4Hoteleros · com.spanish4hoteleros.app</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.navy,
  },
  back: { fontSize: 20, color: '#fff' },
  headerTitle: { fontSize: Typography.body, fontWeight: Typography.semibold, color: '#fff' },
  content: { padding: Spacing.lg, paddingBottom: 60 },
  sectionLabel: {
    fontSize: Typography.caption, fontWeight: Typography.bold, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm, marginTop: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: Spacing.lg, gap: Spacing.sm, ...Shadows.sm,
  },
  fieldLabel: { fontSize: Typography.caption, color: Colors.textMuted, marginBottom: 2 },
  fieldValue: { fontSize: Typography.body, color: Colors.textPrimary, fontWeight: Typography.medium },
  premiumBadge: {
    alignSelf: 'flex-start', backgroundColor: Colors.gold, borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 3, marginTop: 4,
  },
  premiumText: { fontSize: 11, color: '#fff', fontWeight: Typography.bold },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dateInput: {
    width: 60, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radii.sm, padding: Spacing.sm,
    fontSize: Typography.body, textAlign: 'center', backgroundColor: Colors.background,
  },
  yearInput: { width: 80 },
  dateSep: { fontSize: Typography.title, color: Colors.textMuted },
  levelRow: { flexDirection: 'row', gap: Spacing.md, marginTop: 4 },
  levelOption: {
    flex: 1, borderRadius: Radii.md, borderWidth: 2, borderColor: Colors.border,
    padding: Spacing.md, alignItems: 'center', backgroundColor: Colors.background,
  },
  levelOptionSelected: { borderColor: Colors.navy, backgroundColor: '#EEF3F9' },
  levelText: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  levelTextSelected: { color: Colors.navy, fontWeight: Typography.semibold },
  saveBtn: {
    backgroundColor: Colors.navy, borderRadius: Radii.lg,
    paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xl, minHeight: 50, justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: Typography.bold, fontSize: Typography.body },
  signOutBtn: {
    borderWidth: 1.5, borderColor: Colors.error, borderRadius: Radii.lg,
    paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md, minHeight: 50, justifyContent: 'center',
  },
  signOutText: { color: Colors.error, fontWeight: Typography.semibold, fontSize: Typography.body },
  deleteBtn: { borderStyle: 'dashed', marginTop: 0 },
  deleteText: { color: Colors.error, fontWeight: Typography.semibold, fontSize: Typography.body },
  version: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl },
});
