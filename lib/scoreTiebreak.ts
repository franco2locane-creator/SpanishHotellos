// Shared "personal best" comparison rule for every replayable exercise type:
// higher score wins; equal score, faster (lower) completion time wins.
// Pure and dependency-free so it's directly unit-testable.

export type BestResult = { score: number; completionSeconds: number | null };

export function beatsBest(candidate: BestResult, current: BestResult | null): boolean {
  if (!current) return true;
  if (candidate.score > current.score) return true;
  if (candidate.score < current.score) return false;
  // Equal score: an untimed candidate can never be confirmed faster, so it
  // never overtakes an equal-score best (timed or not).
  if (candidate.completionSeconds == null) return false;
  if (current.completionSeconds == null) return true;
  return candidate.completionSeconds < current.completionSeconds;
}
