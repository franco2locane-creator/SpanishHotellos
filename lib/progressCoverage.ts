import { supabase } from './supabase';
import { scenariosForLevel } from './scenarios/catalog';
import { decksForLevel, loadDeckCards, type DeckMeta } from './vocab/decks';
import { drillsForLevel, type DrillMeta } from './grammar/drills';
import { TOTAL_MOCK_COUNT } from './mockExam/loader';
import { getDeckCoverage } from './db/vocab';
import { getGrammarDrillProgress } from './grammar/progress';
import type { AssignmentType, CourseLevel } from '@/types';

/**
 * Scenario coverage is grouped by these 6 assignment types — the same set the
 * guided daily session's Step 2 rotates through (lib/guidedSession.ts).
 * personal_presentation is excluded: it's a monologue format with no
 * standalone practice content, not a role-play (see the Today-tab redesign).
 */
const COVERAGE_ASSIGNMENT_TYPES: AssignmentType[] = [
  'checkin', 'restaurant', 'hotel_presentation', 'saying_no', 'complaint', 'job_interview',
];

// ── Scenario coverage ───────────────────────────────────────────────────────

export type AssignmentTypeCoverage = { type: AssignmentType; completed: number; total: number };

/**
 * "Completed" = at least one exam_attempts row for that scenario id — which
 * is only ever written once a role-play is graded to its end, matching the
 * spec's completion definition. Fetches a generous but bounded set of scenario
 * ids (not just the last-20 window the trend charts use) so long-running
 * students' full coverage isn't undercounted.
 */
export async function getScenarioCoverage(userId: string, level: CourseLevel): Promise<AssignmentTypeCoverage[]> {
  const { data } = await supabase
    .from('exam_attempts')
    .select('scenario_id')
    .eq('user_id', userId)
    .limit(500);
  const completedIds = new Set((data ?? []).map((r: { scenario_id: string }) => r.scenario_id));

  const levelScenarios = scenariosForLevel(level);
  return COVERAGE_ASSIGNMENT_TYPES.map(type => {
    const inType = levelScenarios.filter(s => s.assignmentType === type);
    const completed = inType.filter(s => completedIds.has(s.id)).length;
    return { type, completed, total: inType.length };
  }).filter(c => c.total > 0);
}

// ── Mock coverage ────────────────────────────────────────────────────────────

export type MockCoverage = { completed: number; total: number };

export async function getMockCoverage(userId: string, level: CourseLevel): Promise<MockCoverage> {
  const { data } = await supabase
    .from('mock_attempts')
    .select('mock_id')
    .eq('user_id', userId)
    .eq('level', level)
    .limit(50);
  const distinct = new Set((data ?? []).map((r: { mock_id: string }) => r.mock_id));
  return { completed: distinct.size, total: TOTAL_MOCK_COUNT / 2 };
}

// ── Grammar coverage ─────────────────────────────────────────────────────────

export type GrammarDrillCoverage = {
  drillId: string;
  title: string;
  isFree: boolean;
  attempted: boolean;
  bestAccuracy: number | null;
};

export async function getGrammarCoverage(userId: string, level: CourseLevel): Promise<GrammarDrillCoverage[]> {
  const drills: DrillMeta[] = drillsForLevel(level);
  const progress = await getGrammarDrillProgress(userId);
  const progressMap = new Map(progress.map(p => [p.drill_id, p.best_accuracy]));

  return drills.map(d => ({
    drillId: d.id,
    title: d.title,
    isFree: d.isFree,
    attempted: progressMap.has(d.id),
    bestAccuracy: progressMap.get(d.id) ?? null,
  }));
}

// ── Vocab coverage ───────────────────────────────────────────────────────────

export type DeckCoverage = {
  deckId: string;
  title: string;
  isFree: boolean;
  seen: number;
  learned: number;
  mastered: number;
  total: number;
};

export async function getVocabCoverage(userId: string, level: CourseLevel, isPremium: boolean): Promise<DeckCoverage[]> {
  const decks: DeckMeta[] = decksForLevel(level);
  return Promise.all(decks.map(async (deck): Promise<DeckCoverage> => {
    if (!deck.isFree && !isPremium) {
      return { deckId: deck.id, title: deck.title, isFree: deck.isFree, seen: 0, learned: 0, mastered: 0, total: deck.cardCount };
    }
    const cardIds = loadDeckCards(deck.id).map(c => c.id);
    const stats = await getDeckCoverage(userId, cardIds);
    return { deckId: deck.id, title: deck.title, isFree: deck.isFree, ...stats, total: deck.cardCount };
  }));
}

// ── Aggregate percentage (feeds the readiness composite's coverage term) ─────

function pct(completed: number, total: number): number {
  return total > 0 ? (completed / total) * 100 : 0;
}

export type CoverageSummary = {
  scenarios: AssignmentTypeCoverage[];
  mocks: MockCoverage;
  grammar: GrammarDrillCoverage[];
  vocab: DeckCoverage[];
  /** Simple average of the 4 coverage percentages, 0-100 — the readiness composite's coverage term. */
  overallPct: number;
};

export async function getCoverageSummary(userId: string, level: CourseLevel, isPremium: boolean): Promise<CoverageSummary> {
  const [scenarios, mocks, grammar, vocab] = await Promise.all([
    getScenarioCoverage(userId, level),
    getMockCoverage(userId, level),
    getGrammarCoverage(userId, level),
    getVocabCoverage(userId, level, isPremium),
  ]);

  const scenarioPct = pct(
    scenarios.reduce((s, c) => s + c.completed, 0),
    scenarios.reduce((s, c) => s + c.total, 0),
  );
  const mockPct = pct(mocks.completed, mocks.total);
  const grammarPct = pct(grammar.filter(g => g.attempted).length, grammar.length);
  const vocabPct = pct(
    vocab.reduce((s, d) => s + d.learned, 0),
    vocab.reduce((s, d) => s + d.total, 0),
  );

  const overallPct = (scenarioPct + mockPct + grammarPct + vocabPct) / 4;

  return { scenarios, mocks, grammar, vocab, overallPct };
}
