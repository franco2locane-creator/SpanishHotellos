import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, handleCors, json, err } from '../_shared/cors.ts';

// ── Request shape ────────────────────────────────────────────────────────────

type RequestBody = {
  action?: 'award' | 'ensure_profile';
  nickname?: string;
  /** Client-reported current streak (post-increment), used only to compute
   *  the deterministic bonus below — the once-per-day dedup (the property
   *  that actually matters for abuse) is enforced server-side regardless. */
  streak?: number;
};

type LeaderboardRow = {
  user_id: string;
  nickname: string;
  school: string;
  weekly_points: number;
  alltime_points: number;
  week_key: string;
  last_award_date: string | null;
};

// ── Scoring ───────────────────────────────────────────────────────────────────

const BASE_POINTS = 10;
const STREAK_CONTINUATION_BONUS = 5;
const MILESTONE_BONUS: Record<number, number> = { 7: 20, 14: 50, 30: 100 };

function computePoints(streak: number): number {
  const bonus = (streak >= 2 ? STREAK_CONTINUATION_BONUS : 0) + (MILESTONE_BONUS[streak] ?? 0);
  return BASE_POINTS + bonus;
}

// ── Nickname validation ───────────────────────────────────────────────────────

const PROFANITY_BLOCKLIST = [
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'nigger', 'faggot', 'whore', 'slut',
  'puta', 'mierda', 'cabron', 'joder', 'coño', 'polla', 'gilipollas',
];

function isNicknameValid(nickname: string): boolean {
  const trimmed = nickname.trim();
  if (trimmed.length < 2 || trimmed.length > 20) return false;
  const lower = trimmed.toLowerCase();
  return !PROFANITY_BLOCKLIST.some(bad => lower.includes(bad));
}

function placeholderNickname(userId: string): string {
  return `Hotelero${userId.slice(0, 4)}`;
}

// ── Europe/Amsterdam date math ─────────────────────────────────────────────────

/** YYYY-MM-DD for "now" in Europe/Amsterdam local time. */
function amsterdamDateISO(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const y = parts.find(p => p.type === 'year')!.value;
  const m = parts.find(p => p.type === 'month')!.value;
  const d = parts.find(p => p.type === 'day')!.value;
  return `${y}-${m}-${d}`;
}

/** Monday date (YYYY-MM-DD) of the Europe/Amsterdam week containing "now". */
function amsterdamMondayKey(now: Date = new Date()): string {
  const [y, m, d] = amsterdamDateISO(now).split('-').map(Number);
  const asUtcMidnight = Date.UTC(y, m - 1, d);
  const dow = new Date(asUtcMidnight).getUTCDay(); // 0=Sun..6=Sat
  const mondayOffsetDays = (dow + 6) % 7;
  return new Date(asUtcMidnight - mondayOffsetDays * 86400000).toISOString().slice(0, 10);
}

// ── Rank ──────────────────────────────────────────────────────────────────────

async function computeRank(
  admin: SupabaseClient, school: string, points: number, column: 'weekly_points' | 'alltime_points',
): Promise<number> {
  const { count } = await admin
    .from('leaderboard_entries')
    .select('user_id', { count: 'exact', head: true })
    .eq('school', school)
    .gt(column, points);
  return (count ?? 0) + 1;
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return handleCors();
  if (req.method !== 'POST') return err('Method not allowed', 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return err('Missing Authorization header', 401);

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await anonClient.auth.getUser();
  if (authError || !user) return err('Unauthorized', 401);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return err('Invalid JSON body');
  }

  if (body.action !== 'award' && body.action !== 'ensure_profile') {
    return err('action must be "award" or "ensure_profile"');
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const todayAmsterdam = amsterdamDateISO();
  const weekKey = amsterdamMondayKey();

  const { data: existing } = await admin
    .from('leaderboard_entries')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle<LeaderboardRow>();

  // Lazy weekly reset — applies to both actions.
  const weeklyPointsBeforeAction = existing && existing.week_key === weekKey ? existing.weekly_points : 0;

  // ── ensure_profile: create/update the nickname (first leaderboard visit,
  // or an explicit rename), 0 points if this is a brand-new row. ──────────────
  if (body.action === 'ensure_profile') {
    let nickname = existing?.nickname ?? placeholderNickname(user.id);
    if (body.nickname) {
      if (!isNicknameValid(body.nickname)) {
        return err('Nickname must be 2-20 characters and appropriate.', 400);
      }
      nickname = body.nickname.trim();
    }

    let school = existing?.school;
    if (!school) {
      const { data: profile } = await admin.from('profiles').select('school').eq('id', user.id).maybeSingle();
      school = profile?.school || 'Other';
    }

    const { data: saved, error } = await admin
      .from('leaderboard_entries')
      .upsert({
        user_id: user.id,
        nickname,
        school,
        weekly_points: weeklyPointsBeforeAction,
        alltime_points: existing?.alltime_points ?? 0,
        week_key: weekKey,
        last_award_date: existing?.last_award_date ?? null,
      }, { onConflict: 'user_id' })
      .select()
      .single<LeaderboardRow>();

    if (error || !saved) return err('Could not save leaderboard profile.', 500);

    return json({
      nickname: saved.nickname,
      school: saved.school,
      weeklyPoints: saved.weekly_points,
      alltimePoints: saved.alltime_points,
    });
  }

  // ── award: called once from the day-complete celebration screen. ───────────
  const streak = Math.max(1, Math.floor(body.streak ?? 1));

  if (existing?.last_award_date === todayAmsterdam) {
    // Already awarded today (should only happen on a client retry/race) —
    // no-op, return the current totals rather than erroring.
    const weeklyRank = await computeRank(admin, existing.school, existing.weekly_points, 'weekly_points');
    return json({
      pointsAwarded: 0,
      alreadyAwardedToday: true,
      weeklyPoints: existing.weekly_points,
      alltimePoints: existing.alltime_points,
      nickname: existing.nickname,
      school: existing.school,
      weeklyRank,
    });
  }

  const pointsAwarded = computePoints(streak);
  const nickname = existing?.nickname ?? placeholderNickname(user.id);

  let school = existing?.school;
  if (!school) {
    const { data: profile } = await admin.from('profiles').select('school').eq('id', user.id).maybeSingle();
    school = profile?.school || 'Other';
  }

  const newWeeklyPoints = weeklyPointsBeforeAction + pointsAwarded;
  const newAlltimePoints = (existing?.alltime_points ?? 0) + pointsAwarded;

  const { data: saved, error } = await admin
    .from('leaderboard_entries')
    .upsert({
      user_id: user.id,
      nickname,
      school,
      weekly_points: newWeeklyPoints,
      alltime_points: newAlltimePoints,
      week_key: weekKey,
      last_award_date: todayAmsterdam,
    }, { onConflict: 'user_id' })
    .select()
    .single<LeaderboardRow>();

  if (error || !saved) return err('Could not award points.', 500);

  const weeklyRank = await computeRank(admin, school, newWeeklyPoints, 'weekly_points');

  return json({
    pointsAwarded,
    alreadyAwardedToday: false,
    weeklyPoints: newWeeklyPoints,
    alltimePoints: newAlltimePoints,
    nickname,
    school,
    weeklyRank,
  });
});
