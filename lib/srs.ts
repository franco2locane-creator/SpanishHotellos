import type { SrsData } from '@/types';

// ── Public grades (4-button UI) ───────────────────────────────────────────────

/** 0=Again  1=Hard  2=Good  3=Easy */
export type SrsGrade = 0 | 1 | 2 | 3;

export const GRADE_LABELS: Record<SrsGrade, string> = {
  0: 'Again',
  1: 'Hard',
  2: 'Good',
  3: 'Easy',
};

// ── Date helpers ──────────────────────────────────────────────────────────────

export function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isDue(dueDate: string, today: string = isoToday()): boolean {
  return dueDate <= today;
}

// ── SM-2 constants ────────────────────────────────────────────────────────────

// Map our 4-button grades to SM-2's 0–5 scale.
const SM2_GRADE: Record<SrsGrade, number> = {
  0: 0, // Again  — complete failure
  1: 3, // Hard   — correct with significant difficulty
  2: 4, // Good   — correct after hesitation
  3: 5, // Easy   — perfect recall
};

const MIN_EF = 1.3;
const INITIAL_EF = 2.5;

export const INITIAL_SRS: SrsData = {
  interval: 0,
  easeFactor: INITIAL_EF,
  repetitions: 0,
  dueDate: isoToday(),
};

// ── Core SM-2 algorithm ───────────────────────────────────────────────────────

/**
 * Returns the next SRS state after a review.
 *
 * Follows the SM-2 specification:
 *   https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-of-learning
 *
 * @param current  The card's SRS state before this review.
 * @param grade    The user's self-reported recall quality (0–3).
 * @param today    ISO date string of the review day (injectable for testing).
 */
export function nextSrsState(
  current: SrsData,
  grade: SrsGrade,
  today: string = isoToday(),
): SrsData {
  const smGrade = SM2_GRADE[grade];
  let { interval, easeFactor, repetitions } = current;

  if (smGrade < 3) {
    // Failed — restart the learning steps.
    repetitions = 0;
    interval = 0; // due again today
  } else {
    // Passed — advance the schedule.
    switch (repetitions) {
      case 0: interval = 1; break;
      case 1: interval = 6; break;
      default: interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  // EF update applies on every review (including failures — penalises hard cards).
  const efDelta = 0.1 - (5 - smGrade) * (0.08 + (5 - smGrade) * 0.02);
  easeFactor = parseFloat(Math.max(MIN_EF, easeFactor + efDelta).toFixed(4));

  return {
    interval,
    easeFactor,
    repetitions,
    dueDate: addDays(today, interval),
  };
}
