import { supabase } from '@/lib/supabase';

export type LeaderboardEntry = {
  user_id: string;
  nickname: string;
  school: string;
  weekly_points: number;
  alltime_points: number;
};

export type LeaderboardPeriod = 'weekly' | 'alltime';

/** Public read (RLS: SELECT is open) — school = null means Global (no filter). */
export async function getLeaderboard(
  school: string | null, period: LeaderboardPeriod, limit = 50,
): Promise<LeaderboardEntry[]> {
  const column = period === 'weekly' ? 'weekly_points' : 'alltime_points';
  let query = supabase
    .from('leaderboard_entries')
    .select('user_id, nickname, school, weekly_points, alltime_points')
    .order(column, { ascending: false })
    .limit(limit);
  if (school) query = query.eq('school', school);

  const { data, error } = await query;
  if (error) throw error;
  return (data as LeaderboardEntry[]) ?? [];
}

export type LeaderboardStanding = { rank: number; school: string; points: number };

/** This week's rank within the user's own school — for the compact Today card. */
export async function getMyLeaderboardStanding(userId: string): Promise<LeaderboardStanding | null> {
  const { data: entry } = await supabase
    .from('leaderboard_entries')
    .select('school, weekly_points')
    .eq('user_id', userId)
    .maybeSingle();
  if (!entry) return null;

  const { count } = await supabase
    .from('leaderboard_entries')
    .select('user_id', { count: 'exact', head: true })
    .eq('school', entry.school)
    .gt('weekly_points', entry.weekly_points);

  return { rank: (count ?? 0) + 1, school: entry.school, points: entry.weekly_points };
}
