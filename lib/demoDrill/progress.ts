import { supabase } from '@/lib/supabase';
import { beatsBest } from '@/lib/scoreTiebreak';

export type SaveDemoDrillResult = {
  isNewBest: boolean;
  bestScore: number;
  bestCompletionSeconds: number | null;
};

/**
 * Demo drills (app/drill/[drillType].tsx) had zero persistence before this —
 * mirrors lib/grammar/progress.ts's upsert-max pattern exactly.
 * `lastAttemptDetail`, if given, overwrites the stored per-question detail
 * for the latest attempt only.
 */
export async function saveDemoDrillProgress(
  userId: string,
  drillType: string,
  score: number,
  completionSeconds: number | null = null,
  lastAttemptDetail?: unknown,
): Promise<SaveDemoDrillResult> {
  const { data: existing } = await supabase
    .from('demo_drill_progress')
    .select('best_score, best_completion_seconds, attempts')
    .eq('user_id', userId)
    .eq('drill_type', drillType)
    .maybeSingle();

  const current = existing
    ? { score: existing.best_score, completionSeconds: existing.best_completion_seconds }
    : null;
  const candidate = { score, completionSeconds };
  const isNewBest = beatsBest(candidate, current);

  const bestScore = isNewBest ? score : (current?.score ?? score);
  const bestCompletionSeconds = isNewBest ? completionSeconds : (current?.completionSeconds ?? completionSeconds);
  const attempts = (existing?.attempts ?? 0) + 1;

  await supabase.from('demo_drill_progress').upsert({
    user_id: userId,
    drill_type: drillType,
    best_score: bestScore,
    best_completion_seconds: bestCompletionSeconds,
    attempts,
    last_attempted_at: new Date().toISOString(),
    ...(lastAttemptDetail !== undefined ? { last_attempt_detail: lastAttemptDetail } : {}),
  }, { onConflict: 'user_id,drill_type' });

  return { isNewBest, bestScore, bestCompletionSeconds };
}

export type DemoDrillBest = { bestScore: number; bestCompletionSeconds: number | null } | null;

export async function getDemoDrillBest(userId: string, drillType: string): Promise<DemoDrillBest> {
  const { data } = await supabase
    .from('demo_drill_progress')
    .select('best_score, best_completion_seconds')
    .eq('user_id', userId)
    .eq('drill_type', drillType)
    .maybeSingle();
  if (!data) return null;
  return { bestScore: data.best_score, bestCompletionSeconds: data.best_completion_seconds };
}
