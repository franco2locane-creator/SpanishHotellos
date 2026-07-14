// Pure recommendation logic for the Progress tab's "Do This Next" and
// "Weakest Areas" cards, deliberately dependency-free (like lib/readiness.ts)
// so it's directly unit-testable — callers pass in already-fetched data.

import { canAccessScenario, canAccessDeck, canAccessGrammarDrillSet } from './premiumGating';
import { trendDirection } from './trend';
import type { AssignmentTypeCoverage, CoverageSummary, DeckCoverage, GrammarDrillCoverage } from './progressCoverage';
import type { StudyPlanData } from './today';
import type { ScenarioMeta } from './scenarios/catalog';
import type { DeckMeta } from './vocab/decks';
import type { DrillMeta } from './grammar/drills';
import type { RubricCriterion } from '@/types';

/** Alias matching the tab's own criterion-key shape, kept separate so this
 *  pure lib doesn't import from components/. */
type CriterionKey = RubricCriterion;

const ASSIGNMENT_TYPE_LABELS: Record<string, string> = {
  checkin: 'Check-in',
  restaurant: 'Restaurant',
  hotel_presentation: 'Hotel Presentation',
  saying_no: 'Saying No',
  complaint: 'Complaint',
  job_interview: 'Job Interview',
};

const CRITERION_LABELS: Record<CriterionKey, string> = {
  fluency: 'Fluency', vocabulary: 'Vocabulary', grammar: 'Grammar',
  pronunciation: 'Pronunciation', content: 'Content',
};

// ── Do This Next ──────────────────────────────────────────────────────────────

export type Recommendation = {
  kind: 'scenario' | 'vocab' | 'grammar' | 'drill';
  title: string;
  subtitle: string;
  route: string;
};

export type RecommendationInput = {
  coverage: CoverageSummary;
  studyPlan: StudyPlanData | null;
  scenarios: ScenarioMeta[];
  decks: DeckMeta[];
  drills: DrillMeta[];
  isPremium: boolean;
};

function weakestIncompleteType(coverage: AssignmentTypeCoverage[]): AssignmentTypeCoverage[] {
  return [...coverage]
    .filter(c => c.completed < c.total)
    .sort((a, b) => a.completed / a.total - b.completed / b.total);
}

export function getRecommendation(input: RecommendationInput): Recommendation | null {
  const { coverage, studyPlan, scenarios, decks, drills, isPremium } = input;

  // 1. Weakest scenario-coverage type with an accessible, NOT-yet-completed
  // scenario. coverage.completedScenarioIds (built two passes ago) lets this
  // exclude scenarios the student has already done individually — without
  // it, a type with room left (completed < total) could still recommend one
  // specific scenario that's already mastered, just because a catalog-order
  // pick didn't check per-scenario completion.
  const completedScenarioIds = new Set(coverage.completedScenarioIds);
  for (const type of weakestIncompleteType(coverage.scenarios)) {
    const candidates = scenarios
      .filter(s => s.assignmentType === type.type && canAccessScenario(s, isPremium) && !completedScenarioIds.has(s.id));
    const pick = candidates[0];
    if (pick) {
      return {
        kind: 'scenario',
        title: `Practice: ${ASSIGNMENT_TYPE_LABELS[type.type] ?? type.type}`,
        subtitle: `${type.completed}/${type.total} ${ASSIGNMENT_TYPE_LABELS[type.type] ?? type.type} scenarios completed`,
        route: `/roleplay/${pick.id}`,
      };
    }
  }

  // 2. Weakest accessible vocab deck. Off-level decks (practiced under a
  // different mockLevel — see lib/progressCoverage.ts) are visible in
  // Coverage but never actionable as current-level advice.
  const weakDecks = [...coverage.vocab]
    .filter(d => !d.offLevel)
    .filter(d => d.total > 0 && d.learned < d.total)
    .filter(d => canAccessDeck({ isFree: d.isFree }, isPremium))
    .sort((a, b) => a.learned / a.total - b.learned / b.total);
  if (weakDecks.length) {
    const d = weakDecks[0];
    const meta = decks.find(m => m.id === d.deckId);
    return {
      kind: 'vocab',
      title: `Review: ${d.title}`,
      subtitle: `${d.learned}/${d.total} terms learned`,
      route: `/vocab/${meta?.id ?? d.deckId}`,
    };
  }

  // 3. Weakest accessible grammar drill not yet attempted (off-level excluded, same reasoning as vocab above).
  const unattempted = coverage.grammar
    .filter(g => !g.offLevel)
    .filter((g): g is GrammarDrillCoverage => !g.attempted)
    .filter(g => canAccessGrammarDrillSet({ isFree: g.isFree }, isPremium));
  if (unattempted.length) {
    const g = unattempted[0];
    return {
      kind: 'grammar',
      title: `Grammar: ${g.title}`,
      subtitle: 'Not attempted yet',
      route: `/grammar/${g.drillId}`,
    };
  }

  // 4. Coverage complete — fall back to weakest performance criterion.
  if (studyPlan?.weakestCriterion) {
    const c = studyPlan.weakestCriterion as CriterionKey;
    return {
      kind: 'drill',
      title: `Drill: ${CRITERION_LABELS[c] ?? c}`,
      subtitle: 'Your weakest scored criterion',
      route: `/drill/${c}`,
    };
  }

  return null;
}

// ── Weakest Areas ─────────────────────────────────────────────────────────────

export type WeakAreaItem = { label: string; detail: string; route: string };

export type WeakestAreasInput = {
  coverage: CoverageSummary;
  isFull: boolean;
  /** 0-20 scale averages per criterion, same shape the tab already computes. */
  avgScores?: Record<CriterionKey, number>;
  /** Chronological (oldest→newest) per-attempt score maps, same as the tab's criterionSeries. */
  criterionSeries?: Record<CriterionKey, number>[];
};

type Candidate = { label: string; detail: string; route: string; badness: number };

function trendingDown(series: Record<CriterionKey, number>[] | undefined, key: CriterionKey): boolean {
  if (!series) return false;
  const vals = series.map(s => s[key]).filter(v => v > 0);
  return trendDirection(vals) === 'down';
}

export function getWeakestAreas(input: WeakestAreasInput): WeakAreaItem[] {
  const { coverage, isFull, avgScores, criterionSeries } = input;
  const candidates: Candidate[] = [];

  for (const c of coverage.scenarios) {
    if (c.completed >= c.total) continue;
    candidates.push({
      label: ASSIGNMENT_TYPE_LABELS[c.type] ?? c.type,
      detail: `${c.completed}/${c.total} scenarios completed`,
      route: '/(tabs)/practice',
      badness: 100 - (c.completed / c.total) * 100,
    });
  }

  for (const d of coverage.vocab) {
    if (d.offLevel || d.total === 0 || d.learned >= d.total || (!d.isFree && !isFull)) continue;
    candidates.push({
      label: d.title,
      detail: `${d.learned}/${d.total} learned`,
      route: `/vocab/${d.deckId}`,
      badness: 100 - (d.learned / d.total) * 100,
    });
  }

  if (isFull && avgScores) {
    for (const key of Object.keys(CRITERION_LABELS) as CriterionKey[]) {
      const avg = avgScores[key];
      if (!avg) continue;
      const pct = Math.round((avg / 20) * 100);
      const detail = trendingDown(criterionSeries, key)
        ? `${pct}% avg · trending down`
        : `${pct}% avg`;
      candidates.push({
        label: CRITERION_LABELS[key],
        detail,
        route: `/drill/${key}`,
        badness: 100 - pct,
      });
    }
  }

  return candidates
    .sort((a, b) => b.badness - a.badness)
    .slice(0, 3)
    .map(({ label, detail, route }) => ({ label, detail, route }));
}
