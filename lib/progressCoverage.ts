import { supabase } from './supabase';
import { scenariosForLevel } from './scenarios/catalog';
import { decksForLevel, loadDeckCards, DECK_CATALOG, type DeckMeta } from './vocab/decks';
import { drillsForLevel, DRILL_CATALOG, type DrillMeta } from './grammar/drills';
import { TOTAL_MOCK_COUNT } from './mockExam/loader';
import { getDeckCoverage } from './db/vocab';
import { getGrammarDrillProgress } from './grammar/progress';
import { getVocabDeckBest } from './vocab/deckBest';
import { getDemoDrillBest } from './demoDrill/progress';
import { getScenarioBest, type ScenarioBest } from './scenarioBest';
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

const DEMO_DRILL_TYPES = ['register', 'vocabulary', 'grammar', 'fluency', 'pronunciation', 'content'] as const;

// ── Scenario coverage ───────────────────────────────────────────────────────

export type AssignmentTypeCoverage = { type: AssignmentType; completed: number; total: number };

/**
 * "Completed" = at least one exam_attempts row for that scenario id — which
 * is only ever written once a role-play is graded to its end, matching the
 * spec's completion definition. Fetches a generous but bounded set of scenario
 * ids (not just the last-20 window the trend charts use) so long-running
 * students' full coverage isn't undercounted.
 *
 * Off-level scenarios (completed under a different mockLevel, e.g. after a
 * Settings change) are counted separately and never merged into a type's
 * completed/total — mixing levels into one aggregate would corrupt it. They
 * also never feed getRecommendation/getWeakestAreas (see lib/progressRecommendation.ts).
 */
export async function getScenarioCoverage(
  userId: string,
  level: CourseLevel,
): Promise<{ coverage: AssignmentTypeCoverage[]; offLevelCompleted: number; completedIds: string[] }> {
  const { data } = await supabase
    .from('exam_attempts')
    .select('scenario_id')
    .eq('user_id', userId)
    .limit(500);
  const completedIds = new Set((data ?? []).map((r: { scenario_id: string }) => r.scenario_id));

  const levelScenarios = scenariosForLevel(level);
  const levelScenarioIds = new Set(levelScenarios.map(s => s.id));
  const coverage = COVERAGE_ASSIGNMENT_TYPES.map(type => {
    const inType = levelScenarios.filter(s => s.assignmentType === type);
    const completed = inType.filter(s => completedIds.has(s.id)).length;
    return { type, completed, total: inType.length };
  }).filter(c => c.total > 0);

  const offLevelCompleted = [...completedIds].filter(id => !levelScenarioIds.has(id)).length;
  const onLevelCompletedIds = [...completedIds].filter(id => levelScenarioIds.has(id));

  return { coverage, offLevelCompleted, completedIds: onLevelCompletedIds };
}

// ── Mock coverage ────────────────────────────────────────────────────────────

export type MockCoverage = { completed: number; total: number };

export async function getMockCoverage(
  userId: string,
  level: CourseLevel,
): Promise<{ coverage: MockCoverage; offLevelCompleted: number }> {
  const { data } = await supabase
    .from('mock_attempts')
    .select('mock_id, level')
    .eq('user_id', userId)
    .limit(50);
  const rows = (data ?? []) as { mock_id: string; level: CourseLevel }[];
  const onLevel = new Set(rows.filter(r => r.level === level).map(r => r.mock_id));
  const offLevel = new Set(rows.filter(r => r.level !== level).map(r => r.mock_id));

  return {
    coverage: { completed: onLevel.size, total: TOTAL_MOCK_COUNT / 2 },
    offLevelCompleted: offLevel.size,
  };
}

// ── Grammar coverage ─────────────────────────────────────────────────────────

export type GrammarDrillCoverage = {
  drillId: string;
  title: string;
  isFree: boolean;
  attempted: boolean;
  bestAccuracy: number | null;
  bestCompletionSeconds: number | null;
  offLevel?: boolean;
};

export async function getGrammarCoverage(userId: string, level: CourseLevel): Promise<GrammarDrillCoverage[]> {
  const onLevelDrills: DrillMeta[] = drillsForLevel(level);
  const onLevelIds = new Set(onLevelDrills.map(d => d.id));
  const offLevelDrills = DRILL_CATALOG.filter(d => !onLevelIds.has(d.id));

  const progress = await getGrammarDrillProgress(userId);
  const progressMap = new Map(progress.map(p => [p.drill_id, p]));

  const onLevel: GrammarDrillCoverage[] = onLevelDrills.map(d => {
    const p = progressMap.get(d.id);
    return {
      drillId: d.id,
      title: d.title,
      isFree: d.isFree,
      attempted: !!p,
      bestAccuracy: p?.best_accuracy ?? null,
      bestCompletionSeconds: p?.best_completion_seconds ?? null,
    };
  });

  const offLevel: GrammarDrillCoverage[] = offLevelDrills
    .filter(d => progressMap.has(d.id))
    .map(d => {
      const p = progressMap.get(d.id)!;
      return {
        drillId: d.id,
        title: d.title,
        isFree: d.isFree,
        attempted: true,
        bestAccuracy: p.best_accuracy,
        bestCompletionSeconds: p.best_completion_seconds,
        offLevel: true,
      };
    });

  return [...onLevel, ...offLevel];
}

// ── Demo drill coverage ──────────────────────────────────────────────────────

export type DemoDrillCoverage = {
  drillType: string;
  attempted: boolean;
  bestScore: number | null;
  bestCompletionSeconds: number | null;
};

/** Fixed set of 6 demo drill types — no course-level split, no catalog to union against. */
export async function getDemoDrillCoverage(userId: string): Promise<DemoDrillCoverage[]> {
  return Promise.all(DEMO_DRILL_TYPES.map(async (drillType): Promise<DemoDrillCoverage> => {
    const best = await getDemoDrillBest(userId, drillType);
    return {
      drillType,
      attempted: best !== null,
      bestScore: best?.bestScore ?? null,
      bestCompletionSeconds: best?.bestCompletionSeconds ?? null,
    };
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
  bestFirstTryPct: number | null;
  bestCompletionSeconds: number | null;
  offLevel?: boolean;
};

async function computeDeckCoverage(
  userId: string,
  deck: DeckMeta,
  isPremium: boolean,
  offLevel: boolean,
): Promise<DeckCoverage | null> {
  if (!deck.isFree && !isPremium) {
    return offLevel ? null : {
      deckId: deck.id, title: deck.title, isFree: deck.isFree,
      seen: 0, learned: 0, mastered: 0, total: deck.cardCount,
      bestFirstTryPct: null, bestCompletionSeconds: null,
    };
  }
  const cardIds = loadDeckCards(deck.id).map(c => c.id);
  const stats = await getDeckCoverage(userId, cardIds);
  if (offLevel && stats.seen === 0) return null;

  const best = await getVocabDeckBest(userId, deck.id);
  return {
    deckId: deck.id, title: deck.title, isFree: deck.isFree,
    ...stats, total: deck.cardCount,
    bestFirstTryPct: best?.bestFirstTryPct ?? null,
    bestCompletionSeconds: best?.bestCompletionSeconds ?? null,
    ...(offLevel ? { offLevel: true } : {}),
  };
}

export async function getVocabCoverage(userId: string, level: CourseLevel, isPremium: boolean): Promise<DeckCoverage[]> {
  const onLevelDecks = decksForLevel(level);
  const onLevelIds = new Set(onLevelDecks.map(d => d.id));
  const offLevelDecks = DECK_CATALOG.filter(d => !onLevelIds.has(d.id));

  const [onLevel, offLevel] = await Promise.all([
    Promise.all(onLevelDecks.map(deck => computeDeckCoverage(userId, deck, isPremium, false))),
    Promise.all(offLevelDecks.map(deck => computeDeckCoverage(userId, deck, isPremium, true))),
  ]);

  return [...onLevel, ...offLevel].filter((d): d is DeckCoverage => d !== null);
}

// ── Aggregate percentage (feeds the readiness composite's coverage term) ─────

function pct(completed: number, total: number): number {
  return total > 0 ? (completed / total) * 100 : 0;
}

export type CoverageSummary = {
  scenarios: AssignmentTypeCoverage[];
  offLevelScenariosCompleted: number;
  completedScenarioIds: string[];
  mocks: MockCoverage;
  offLevelMocksCompleted: number;
  grammar: GrammarDrillCoverage[];
  vocab: DeckCoverage[];
  demoDrills: DemoDrillCoverage[];
  /** Simple average of the 5 coverage percentages, 0-100 — the readiness composite's coverage term. */
  overallPct: number;
};

export type ScenarioActivity = { scenarioId: string; best: ScenarioBest };

/** Per-scenario best score for every completed (on-level) scenario — reuses
 *  getScenarioBest (lib/scenarioBest.ts), not forked, per-scenario detail
 *  behind Progress's aggregate ScenarioCoverageCard. */
export async function getScenarioActivity(userId: string, scenarioIds: string[]): Promise<ScenarioActivity[]> {
  return Promise.all(scenarioIds.map(async scenarioId => ({
    scenarioId,
    best: await getScenarioBest(userId, scenarioId),
  })));
}

export async function getCoverageSummary(userId: string, level: CourseLevel, isPremium: boolean): Promise<CoverageSummary> {
  const [scenarioResult, mockResult, grammar, vocab, demoDrills] = await Promise.all([
    getScenarioCoverage(userId, level),
    getMockCoverage(userId, level),
    getGrammarCoverage(userId, level),
    getVocabCoverage(userId, level, isPremium),
    getDemoDrillCoverage(userId),
  ]);

  const onLevelGrammar = grammar.filter(g => !g.offLevel);
  const onLevelVocab = vocab.filter(d => !d.offLevel);

  const scenarioPct = pct(
    scenarioResult.coverage.reduce((s, c) => s + c.completed, 0),
    scenarioResult.coverage.reduce((s, c) => s + c.total, 0),
  );
  const mockPct = pct(mockResult.coverage.completed, mockResult.coverage.total);
  const grammarPct = pct(onLevelGrammar.filter(g => g.attempted).length, onLevelGrammar.length);
  const vocabPct = pct(
    onLevelVocab.reduce((s, d) => s + d.learned, 0),
    onLevelVocab.reduce((s, d) => s + d.total, 0),
  );
  // demoDrills are intentionally excluded here — they no longer have their own
  // Progress section, but getDemoDrillCoverage/demoDrills stay computed below
  // so getRecommendation/getWeakestAreas can still surface a weak signal.
  const overallPct = (scenarioPct + mockPct + grammarPct + vocabPct) / 4;

  return {
    scenarios: scenarioResult.coverage,
    offLevelScenariosCompleted: scenarioResult.offLevelCompleted,
    completedScenarioIds: scenarioResult.completedIds,
    mocks: mockResult.coverage,
    offLevelMocksCompleted: mockResult.offLevelCompleted,
    grammar,
    vocab,
    demoDrills,
    overallPct,
  };
}
