import { supabase } from '@/lib/supabase';
import { beatsBest } from '@/lib/scoreTiebreak';

export type SaveVocabDeckBestResult = {
  isNewBest: boolean;
  bestFirstTryPct: number;
  bestCompletionSeconds: number | null;
};

/**
 * "Score" for a vocab round is first-try accuracy % — the natural equivalent
 * of a pass-mark for a spaced-repetition session (mirrors lib/grammar/progress.ts's
 * upsert-max pattern; per-card SRS correctness is tracked separately and is
 * unaffected by this — this is purely the round-level replay incentive).
 */
export async function saveVocabDeckBest(
  userId: string,
  deckId: string,
  firstTryPct: number,
  completionSeconds: number | null = null,
): Promise<SaveVocabDeckBestResult> {
  const { data: existing } = await supabase
    .from('vocab_deck_best')
    .select('best_first_try_pct, best_completion_seconds, attempts')
    .eq('user_id', userId)
    .eq('deck_id', deckId)
    .maybeSingle();

  const current = existing
    ? { score: existing.best_first_try_pct, completionSeconds: existing.best_completion_seconds }
    : null;
  const candidate = { score: firstTryPct, completionSeconds };
  const isNewBest = beatsBest(candidate, current);

  const bestFirstTryPct = isNewBest ? firstTryPct : (current?.score ?? firstTryPct);
  const bestCompletionSeconds = isNewBest ? completionSeconds : (current?.completionSeconds ?? completionSeconds);
  const attempts = (existing?.attempts ?? 0) + 1;

  await supabase.from('vocab_deck_best').upsert({
    user_id: userId,
    deck_id: deckId,
    best_first_try_pct: bestFirstTryPct,
    best_completion_seconds: bestCompletionSeconds,
    attempts,
    last_attempted_at: new Date().toISOString(),
  }, { onConflict: 'user_id,deck_id' });

  return { isNewBest, bestFirstTryPct, bestCompletionSeconds };
}

export type VocabDeckBest = { bestFirstTryPct: number; bestCompletionSeconds: number | null } | null;

export async function getVocabDeckBest(userId: string, deckId: string): Promise<VocabDeckBest> {
  const { data } = await supabase
    .from('vocab_deck_best')
    .select('best_first_try_pct, best_completion_seconds')
    .eq('user_id', userId)
    .eq('deck_id', deckId)
    .maybeSingle();
  if (!data) return null;
  return { bestFirstTryPct: data.best_first_try_pct, bestCompletionSeconds: data.best_completion_seconds };
}
