import { supabase } from '@/lib/supabase';
import { beatsBest } from '@/lib/scoreTiebreak';

export type AttemptDetailItem = { prompt: string; given: string; correct: boolean; correctAnswer: string };

export type SaveGrammarDrillResult = {
  isNewBest: boolean;
  bestAccuracy: number;
  bestCompletionSeconds: number | null;
};

/**
 * Reads the existing best (if any) and upserts the score-then-time winner
 * (see lib/scoreTiebreak.ts), incrementing attempts. `lastAttemptDetail`, if
 * given, overwrites the stored per-question detail for the LATEST attempt
 * only (not appended — matches the "only the latest attempt's feedback needs
 * to be kept" requirement).
 */
export async function saveGrammarDrillProgress(
  userId: string,
  drillId: string,
  accuracy: number,
  completionSeconds: number | null = null,
  lastAttemptDetail?: unknown,
): Promise<SaveGrammarDrillResult> {
  const { data: existing } = await supabase
    .from('grammar_drill_progress')
    .select('best_accuracy, best_completion_seconds, attempts')
    .eq('user_id', userId)
    .eq('drill_id', drillId)
    .maybeSingle();

  const current = existing
    ? { score: existing.best_accuracy, completionSeconds: existing.best_completion_seconds }
    : null;
  const candidate = { score: accuracy, completionSeconds };
  const isNewBest = beatsBest(candidate, current);

  const bestAccuracy = isNewBest ? accuracy : (current?.score ?? accuracy);
  const bestCompletionSeconds = isNewBest ? completionSeconds : (current?.completionSeconds ?? completionSeconds);
  const attempts = (existing?.attempts ?? 0) + 1;

  await supabase.from('grammar_drill_progress').upsert({
    user_id: userId,
    drill_id: drillId,
    best_accuracy: bestAccuracy,
    best_completion_seconds: bestCompletionSeconds,
    attempts,
    last_attempted_at: new Date().toISOString(),
    ...(lastAttemptDetail !== undefined ? { last_attempt_detail: lastAttemptDetail } : {}),
  }, { onConflict: 'user_id,drill_id' });

  return { isNewBest, bestAccuracy, bestCompletionSeconds };
}

export type GrammarDrillProgressRow = {
  drill_id: string;
  best_accuracy: number;
  best_completion_seconds: number | null;
  attempts: number;
};

/** All of the user's grammar drill progress rows — used to compute coverage. */
export async function getGrammarDrillProgress(userId: string): Promise<GrammarDrillProgressRow[]> {
  const { data } = await supabase
    .from('grammar_drill_progress')
    .select('drill_id, best_accuracy, best_completion_seconds, attempts')
    .eq('user_id', userId);
  return (data as GrammarDrillProgressRow[]) ?? [];
}

export type GrammarDrillBest = { bestAccuracy: number; bestCompletionSeconds: number | null } | null;

/** Single-drill lookup for list-card badges (DrillRow) and entry-screen banners. */
export async function getGrammarDrillBest(userId: string, drillId: string): Promise<GrammarDrillBest> {
  const { data } = await supabase
    .from('grammar_drill_progress')
    .select('best_accuracy, best_completion_seconds')
    .eq('user_id', userId)
    .eq('drill_id', drillId)
    .maybeSingle();
  if (!data) return null;
  return { bestAccuracy: data.best_accuracy, bestCompletionSeconds: data.best_completion_seconds };
}

/** Per-question detail from the latest attempt only — for the "Last attempt" view. */
export async function getGrammarDrillLastAttempt(userId: string, drillId: string): Promise<AttemptDetailItem[]> {
  const { data } = await supabase
    .from('grammar_drill_progress')
    .select('last_attempt_detail')
    .eq('user_id', userId)
    .eq('drill_id', drillId)
    .maybeSingle();
  return (data?.last_attempt_detail as AttemptDetailItem[]) ?? [];
}
