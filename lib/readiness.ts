// Pure readiness-composite math, deliberately dependency-free (like
// lib/examDate.ts and lib/guidedSession.ts) so it's directly unit-testable.
//
// Readiness v2 is a weighted composite of three dimensions, so it moves with
// every kind of practice — not only after a graded mock exam. Weights are
// documented here, in this one place, and nowhere else:

export const READINESS_WEIGHTS = {
  performance: 0.5,
  coverage: 0.3,
  consistency: 0.2,
} as const;

/**
 * @param performance 0-100 — avg mock score if any mocks exist, else avg
 *   recent exam_attempts score (x5), else 0 (honestly "no evidence yet",
 *   not hidden — callers should treat a fully-absent performance signal as
 *   a cold-start case and not show the composite at all; see ReadinessCard).
 * @param coverage 0-100 — average of the 4 coverage-dimension percentages
 *   (scenarios/vocab/grammar/mocks), from lib/progressCoverage.ts.
 * @param consistency 0-100 — see computeConsistencyScore().
 */
export function computeReadiness(performance: number, coverage: number, consistency: number): number {
  return Math.round(
    performance * READINESS_WEIGHTS.performance +
    coverage * READINESS_WEIGHTS.coverage +
    consistency * READINESS_WEIGHTS.consistency
  );
}

/**
 * 60% this week's completion ratio (of the 7-day dot row) + 40% streak
 * length, capped at a 14-day streak for full marks. Bounded 0-100.
 */
export function computeConsistencyScore(daysCompletedThisWeek: number, streak: number): number {
  const weekRatio = Math.min(1, daysCompletedThisWeek / 7);
  const streakRatio = Math.min(1, streak / 14);
  return Math.round(weekRatio * 60 + streakRatio * 40);
}
