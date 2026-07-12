// Pure recommendation logic for the Progress tab's "Do This Next" and
// "Weakest Areas" cards, deliberately dependency-free (like lib/readiness.ts)
// so it's directly unit-testable — callers pass in already-fetched data.

import { canAccessScenario, canAccessDeck, canAccessGrammarDrillSet } from './premiumGating';
import type { AssignmentTypeCoverage, CoverageSummary, DeckCoverage, GrammarDrillCoverage } from './progressCoverage';
import type { StudyPlanData } from './today';
import type { ScenarioMeta } from './scenarios/catalog';
import type { DeckMeta } from './vocab/decks';
import type { DrillMeta } from './grammar/drills';
import type { RubricCriterion } from '@/types';

/** Matches components/progress/CriterionTrend.tsx's CriterionKey — kept as a
 *  separate alias here so this pure lib doesn't import from components/. */
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

  // 1. Weakest scenario-coverage type with an accessible, uncompleted scenario.
  for (const type of weakestIncompleteType(coverage.scenarios)) {
    const candidates = scenarios
      .filter(s => s.assignmentType === type.type && canAccessScenario(s, isPremium));
    // "Completed" scenarios for this type aren't individually known here — the
    // coverage summary only has counts — so prefer scenarios not present in
    // studyPlan's completed signal isn't available either; fall back to
    // catalog order and let the roleplay screen itself be a no-op re-run if
    // already completed (still valid, useful practice).
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

  // 2. Weakest accessible vocab deck.
  const weakDecks = [...coverage.vocab]
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

  // 3. Weakest accessible grammar drill not yet attempted.
  const unattempted = coverage.grammar
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
  if (!series || series.length < 6) return false;
  const vals = series.map(s => s[key]).filter(v => v > 0);
  if (vals.length < 6) return false;
  const recent = vals.slice(-3);
  const prior = vals.slice(-6, -3);
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  return avg(recent) < avg(prior);
}

export function getWeakestAreas(input: WeakestAreasInput): WeakAreaItem[] {
  const { coverage, isFull, avgScores, criterionSeries } = input;
  const candidates: Candidate[] = [];

  for (const c of coverage.scenarios) {
    if (c.completed >= c.total) continue;
    candidates.push({
      label: ASSIGNMENT_TYPE_LABELS[c.type] ?? c.type,
      detail: `${c.completed}/${c.total}`,
      route: '/(tabs)/practice',
      badness: 100 - (c.completed / c.total) * 100,
    });
  }

  for (const d of coverage.vocab) {
    if (d.total === 0 || d.learned >= d.total || (!d.isFree && !isFull)) continue;
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
