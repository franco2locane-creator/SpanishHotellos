import { supabase } from '@/lib/supabase';

/** Reads the existing best accuracy (if any) and upserts the max, incrementing attempts. */
export async function saveGrammarDrillProgress(userId: string, drillId: string, accuracy: number): Promise<void> {
  const { data: existing } = await supabase
    .from('grammar_drill_progress')
    .select('best_accuracy, attempts')
    .eq('user_id', userId)
    .eq('drill_id', drillId)
    .maybeSingle();

  const bestAccuracy = Math.max(existing?.best_accuracy ?? 0, accuracy);
  const attempts = (existing?.attempts ?? 0) + 1;

  await supabase.from('grammar_drill_progress').upsert({
    user_id: userId,
    drill_id: drillId,
    best_accuracy: bestAccuracy,
    attempts,
    last_attempted_at: new Date().toISOString(),
  }, { onConflict: 'user_id,drill_id' });
}

export type GrammarDrillProgressRow = { drill_id: string; best_accuracy: number; attempts: number };

/** All of the user's grammar drill progress rows — used to compute coverage. */
export async function getGrammarDrillProgress(userId: string): Promise<GrammarDrillProgressRow[]> {
  const { data } = await supabase
    .from('grammar_drill_progress')
    .select('drill_id, best_accuracy, attempts')
    .eq('user_id', userId);
  return (data as GrammarDrillProgressRow[]) ?? [];
}
