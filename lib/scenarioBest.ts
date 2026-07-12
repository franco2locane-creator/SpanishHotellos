import { supabase } from '@/lib/supabase';

export type ScenarioBest = { score: number; completionSeconds: number } | null;

/**
 * Roleplay scenarios have no upsert-max table on purpose — exam_attempts is
 * an append-only attempt log (Progress needs the full history). Best score
 * is a derived query instead: highest total_score, ties broken by lowest
 * duration_seconds (see lib/scoreTiebreak.ts's rule, expressed here as an
 * ORDER BY since there's no row to compare against client-side).
 *
 * Mock-exam assignment attempts write into this same table with synthetic
 * scenario_ids like "mock-basic-2-checkin-0" (see lib/api/grade.ts's
 * gradeMockAssignment) — disjoint from real SCENARIO_CATALOG ids, so scoping
 * by a real scenario_id here naturally excludes them. No extra filtering needed.
 */
export async function getScenarioBest(userId: string, scenarioId: string): Promise<ScenarioBest> {
  const { data } = await supabase
    .from('exam_attempts')
    .select('total_score, duration_seconds')
    .eq('user_id', userId)
    .eq('scenario_id', scenarioId)
    .order('total_score', { ascending: false })
    .order('duration_seconds', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { score: data.total_score, completionSeconds: data.duration_seconds };
}
