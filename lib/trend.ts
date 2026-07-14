// Pure recent-vs-prior average trend comparison, shared by Weakest Areas'
// per-criterion "trending down" flag (lib/progressRecommendation.ts) and
// Progress's one-line overall readiness trend sentence. Dependency-free.

export type TrendDirection = 'up' | 'down' | 'steady';

/**
 * Compares the average of the most recent `windowSize` values against the
 * `windowSize` values before them. Needs at least 2*windowSize data points —
 * returns 'steady' if there isn't enough history yet. A 5% relative change
 * threshold avoids flip-flopping between 'up'/'down' on noise-level deltas.
 */
export function trendDirection(values: number[], windowSize = 3): TrendDirection {
  if (values.length < windowSize * 2) return 'steady';
  const recent = values.slice(-windowSize);
  const prior = values.slice(-windowSize * 2, -windowSize);
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const recentAvg = avg(recent);
  const priorAvg = avg(prior);
  if (priorAvg === 0) return recentAvg > 0 ? 'up' : 'steady';
  const relativeDelta = (recentAvg - priorAvg) / priorAvg;
  if (relativeDelta > 0.05) return 'up';
  if (relativeDelta < -0.05) return 'down';
  return 'steady';
}

/** One-line copy for the trend line shown under ReadinessCard on Progress. */
export function trendSentence(direction: TrendDirection): string {
  if (direction === 'up') return 'Trending up over your recent sessions';
  if (direction === 'down') return 'Trending down over your recent sessions';
  return 'Steady over your recent sessions';
}
