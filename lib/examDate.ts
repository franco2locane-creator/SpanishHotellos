// Pure exam-date math, deliberately dependency-free (no Supabase/AsyncStorage
// imports) so it can be imported from lib/premiumGating.ts and tested without
// pulling in native-module side effects.

export function getDaysUntilExam(examDate?: string): number | null {
  if (!examDate) return null;
  const diff = Date.parse(examDate) - Date.now();
  return Math.ceil(diff / 86400000);
}

export function isFinalWeek(examDate?: string): boolean {
  const days = getDaysUntilExam(examDate);
  return days !== null && days >= 0 && days <= 7;
}

/**
 * Monday-first ISO date strings (YYYY-MM-DD) for the calendar week containing
 * `now`, entirely in UTC (via getUTCDay/Date.UTC) to match lib/today.ts's
 * todayISO() convention rather than mixing in local-time day-of-week math.
 */
export function getWeekDates(now: Date = new Date()): string[] {
  const utcDayOfWeek = now.getUTCDay(); // 0=Sun..6=Sat
  const mondayOffsetDays = (utcDayOfWeek + 6) % 7;
  const mondayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - mondayOffsetDays);
  return Array.from({ length: 7 }, (_, i) => new Date(mondayMs + i * 86400000).toISOString().slice(0, 10));
}
