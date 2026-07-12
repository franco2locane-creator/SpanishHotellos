// Shared "Best: X · time" badge formatting for exercise list cards.
// Pure and dependency-free.

export function formatCompletionTime(seconds: number | null): string | null {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** "Best: 92% · 2:41" (or without time if none recorded). */
export function formatBestBadge(scorePct: number, completionSeconds: number | null): string {
  const time = formatCompletionTime(completionSeconds);
  return time ? `Best: ${Math.round(scorePct)}% · ${time}` : `Best: ${Math.round(scorePct)}%`;
}

/** "Best: 4/5 · 1:12" — for exercises scored as a raw count out of a small total. */
export function formatBestFraction(numerator: number, denominator: number, completionSeconds: number | null): string {
  const time = formatCompletionTime(completionSeconds);
  return time ? `Best: ${numerator}/${denominator} · ${time}` : `Best: ${numerator}/${denominator}`;
}
