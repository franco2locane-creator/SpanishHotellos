import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/authStore';
import { getLeaderboard, type LeaderboardEntry, type LeaderboardPeriod } from '@/lib/leaderboard';
import { ensureLeaderboardProfile } from '@/lib/api/leaderboard';
import { ApiCallError } from '@/lib/api/apiError';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/lib/theme';

const NICKNAME_SET_KEY = '@sp4h_leaderboard_nickname_set';
type SchoolScope = 'mine' | 'global';

function Row({ entry, rank, isMe, period }: { entry: LeaderboardEntry; rank: number; isMe: boolean; period: LeaderboardPeriod }) {
  const points = period === 'weekly' ? entry.weekly_points : entry.alltime_points;
  return (
    <View style={[styles.row, isMe && styles.rowMe]}>
      <Text style={[styles.rank, isMe && styles.rankMe]}>{rank}</Text>
      <Text style={[styles.nickname, isMe && styles.nicknameMe]} numberOfLines={1}>
        {entry.nickname}{isMe ? ' (you)' : ''}
      </Text>
      <Text style={[styles.points, isMe && styles.pointsMe]}>🔥 {points}</Text>
    </View>
  );
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const [scope, setScope] = useState<SchoolScope>('mine');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myProfile, setMyProfile] = useState<{ nickname: string; school: string } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [needsNickname, setNeedsNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [savingNickname, setSavingNickname] = useState(false);
  const [nicknameError, setNicknameError] = useState('');

  // Ensure a leaderboard row exists; prompt for a nickname on first-ever visit.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [profile, alreadySet] = await Promise.all([
        ensureLeaderboardProfile(),
        AsyncStorage.getItem(NICKNAME_SET_KEY),
      ]);
      setMyProfile({ nickname: profile.nickname, school: profile.school });
      if (!alreadySet) {
        setNicknameInput('');
        setNeedsNickname(true);
      }
      setLoadingProfile(false);
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!myProfile) return;
    setLoadingEntries(true);
    const schoolFilter = scope === 'mine' ? myProfile.school : null;
    getLeaderboard(schoolFilter, period, 50)
      .then(setEntries)
      .finally(() => setLoadingEntries(false));
  }, [period, scope, myProfile?.school]);

  async function handleSaveNickname() {
    const trimmed = nicknameInput.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      setNicknameError('Nickname must be 2–20 characters.');
      return;
    }
    setSavingNickname(true);
    setNicknameError('');
    try {
      const profile = await ensureLeaderboardProfile(trimmed);
      setMyProfile({ nickname: profile.nickname, school: profile.school });
      await AsyncStorage.setItem(NICKNAME_SET_KEY, '1');
      setNeedsNickname(false);
    } catch (e) {
      const apiError = e instanceof ApiCallError ? e : null;
      setNicknameError(apiError?.message ?? 'Could not save nickname. Please try again.');
    } finally {
      setSavingNickname(false);
    }
  }

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator style={{ flex: 1 }} color={Colors.gold} />
      </SafeAreaView>
    );
  }

  if (needsNickname) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.nicknameWrap}>
          <Text style={styles.nicknameEmoji}>🏆</Text>
          <Text style={styles.nicknameTitle}>Pick your leaderboard name</Text>
          <Text style={styles.nicknameSub}>Shown to classmates — no scores, just consistency points.</Text>
          <TextInput
            style={styles.nicknameInput}
            value={nicknameInput}
            onChangeText={setNicknameInput}
            placeholder="e.g. Carlos_FrontOffice"
            placeholderTextColor={Colors.textMuted}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {nicknameError ? <Text style={styles.nicknameError}>{nicknameError}</Text> : null}
          <TouchableOpacity
            style={[styles.saveBtn, savingNickname && { opacity: 0.6 }]}
            onPress={handleSaveNickname}
            disabled={savingNickname}
          >
            {savingNickname
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Join the leaderboard</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isColdStart = scope === 'mine' && !loadingEntries && entries.length < 3;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} hitSlop={12}>
          <Text style={styles.back}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, period === 'weekly' && styles.tabActive]}
          onPress={() => setPeriod('weekly')}
        >
          <Text style={[styles.tabText, period === 'weekly' && styles.tabTextActive]}>This Week</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, period === 'alltime' && styles.tabActive]}
          onPress={() => setPeriod('alltime')}
        >
          <Text style={[styles.tabText, period === 'alltime' && styles.tabTextActive]}>All Time</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pillRow}>
        <TouchableOpacity
          style={[styles.pill, scope === 'mine' && styles.pillActive]}
          onPress={() => setScope('mine')}
        >
          <Text style={[styles.pillText, scope === 'mine' && styles.pillTextActive]}>My School</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pill, scope === 'global' && styles.pillActive]}
          onPress={() => setScope('global')}
        >
          <Text style={[styles.pillText, scope === 'global' && styles.pillTextActive]}>Global</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loadingEntries ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={Colors.navy} />
        ) : (
          <>
            {isColdStart && (
              <View style={styles.coldStartCard}>
                <Text style={styles.coldStartText}>
                  Only a few students from {myProfile?.school} have joined so far — invite your classmates to fill out the board.
                </Text>
                <TouchableOpacity onPress={() => setScope('global')}>
                  <Text style={styles.coldStartLink}>View the Global board →</Text>
                </TouchableOpacity>
              </View>
            )}

            {entries.length === 0 ? (
              <Text style={styles.emptyText}>No one on this board yet — be the first.</Text>
            ) : (
              entries.map((e, i) => (
                <Row key={e.user_id} entry={e} rank={i + 1} isMe={e.user_id === user?.id} period={period} />
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F5F0' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  back: { fontSize: 20, color: Colors.navy },
  headerTitle: { fontSize: Typography.heading, fontWeight: '700', color: Colors.navy },
  tabRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.sm },
  tab: {
    flex: 1, borderRadius: Radii.full, paddingVertical: Spacing.sm, alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  tabActive: { backgroundColor: Colors.navy },
  tabText: { fontSize: Typography.caption, fontWeight: '700', color: Colors.textSecondary },
  tabTextActive: { color: '#fff' },
  pillRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md },
  pill: {
    borderRadius: Radii.full, paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderWidth: 1, borderColor: '#E0DAD0',
  },
  pillActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  pillText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  pillTextActive: { color: '#fff' },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 60 },
  coldStartCard: {
    backgroundColor: '#FFF8EC', borderRadius: Radii.lg, padding: Spacing.md,
    marginBottom: Spacing.md, gap: 6, borderWidth: 1, borderColor: '#F0E4C8',
  },
  coldStartText: { fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  coldStartLink: { fontSize: Typography.caption, fontWeight: '700', color: Colors.gold },
  emptyText: { fontSize: Typography.body, color: Colors.textMuted, textAlign: 'center', marginTop: 40 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radii.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: 6,
  },
  rowMe: { backgroundColor: '#FFF8EC', borderWidth: 1.5, borderColor: Colors.gold },
  rank: { width: 28, fontSize: Typography.body, fontWeight: '700', color: Colors.textMuted },
  rankMe: { color: Colors.gold },
  nickname: { flex: 1, fontSize: Typography.body, fontWeight: '600', color: Colors.navy },
  nicknameMe: { fontWeight: '800' },
  points: { fontSize: Typography.body, fontWeight: '700', color: Colors.textSecondary },
  pointsMe: { color: Colors.gold },
  nicknameWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  nicknameEmoji: { fontSize: 56 },
  nicknameTitle: { fontSize: Typography.heading, fontWeight: '800', color: Colors.navy, textAlign: 'center' },
  nicknameSub: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  nicknameInput: {
    borderWidth: 1.5, borderColor: Colors.border ?? '#E0DAD0', borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: Typography.body,
    backgroundColor: '#fff', color: Colors.navy, width: '100%',
  },
  nicknameError: { fontSize: Typography.caption, color: Colors.error, textAlign: 'center' },
  saveBtn: {
    backgroundColor: Colors.gold, borderRadius: Radii.lg,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, marginTop: Spacing.sm,
    minWidth: 200, alignItems: 'center', ...Shadows.sm,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.body },
});
