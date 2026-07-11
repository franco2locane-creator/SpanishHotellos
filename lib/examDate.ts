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
