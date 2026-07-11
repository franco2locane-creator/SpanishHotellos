import { supabase } from '@/lib/supabase';
import { toApiCallError, ApiCallError } from './apiError';
import { checkFunctionsVersion } from './functionsVersion';

export { ApiCallError };

export type AwardResult = {
  pointsAwarded: number;
  alreadyAwardedToday: boolean;
  weeklyPoints: number;
  alltimePoints: number;
  nickname: string;
  school: string;
  weeklyRank: number;
  _version?: string;
};

/** Called once from the day-complete celebration screen. */
export async function awardDailyPoints(streak: number): Promise<AwardResult> {
  const { data, error } = await supabase.functions.invoke<AwardResult>('award-daily-points', {
    body: { action: 'award', streak },
  });
  if (error) throw await toApiCallError(error);
  if (!data) throw new ApiCallError('Empty response from award-daily-points function', 'server');
  checkFunctionsVersion('award-daily-points', data._version);
  return data;
}

export type LeaderboardProfile = {
  nickname: string;
  school: string;
  weeklyPoints: number;
  alltimePoints: number;
  _version?: string;
};

/** Creates the user's leaderboard row if missing, or renames it if `nickname` is given. */
export async function ensureLeaderboardProfile(nickname?: string): Promise<LeaderboardProfile> {
  const { data, error } = await supabase.functions.invoke<LeaderboardProfile>('award-daily-points', {
    body: { action: 'ensure_profile', nickname },
  });
  if (error) throw await toApiCallError(error);
  if (!data) throw new ApiCallError('Empty response from award-daily-points function', 'server');
  checkFunctionsVersion('award-daily-points', data._version);
  return data;
}
