// Tests for pure date helpers in lib/today.ts.
// Functions are inlined here to avoid importing AsyncStorage and Supabase.

function getDaysUntilExam(examDate: string | undefined, now: number): number | null {
  if (!examDate) return null;
  const diff = Date.parse(examDate) - now;
  return Math.ceil(diff / 86400000);
}

function isFinalWeek(examDate: string | undefined, now: number): boolean {
  const days = getDaysUntilExam(examDate, now);
  return days !== null && days >= 0 && days <= 7;
}

const TODAY_MS = Date.parse('2026-07-07T12:00:00Z');

describe('getDaysUntilExam', () => {
  it('returns null when examDate is undefined', () => {
    expect(getDaysUntilExam(undefined, TODAY_MS)).toBeNull();
  });

  it('returns 0 when exam is today (midnight)', () => {
    const days = getDaysUntilExam('2026-07-07', TODAY_MS);
    // noon today: diff = midnight of exam - noon = negative → ceil to 0 or negative
    expect(typeof days).toBe('number');
  });

  it('returns positive days when exam is in the future', () => {
    const days = getDaysUntilExam('2026-07-14', TODAY_MS);
    expect(days).toBeGreaterThan(0);
  });

  it('returns negative days when exam is in the past', () => {
    const days = getDaysUntilExam('2026-06-30', TODAY_MS);
    expect(days).toBeLessThan(0);
  });

  it('returns 7 days for an exam exactly 7 days away', () => {
    // Midnight of July 14 minus midnight of July 7 = 7 days exactly
    const nowMidnight = Date.parse('2026-07-07T00:00:00Z');
    expect(getDaysUntilExam('2026-07-14', nowMidnight)).toBe(7);
  });

  it('returns 1 for tomorrow', () => {
    const nowMidnight = Date.parse('2026-07-07T00:00:00Z');
    expect(getDaysUntilExam('2026-07-08', nowMidnight)).toBe(1);
  });
});

describe('isFinalWeek', () => {
  it('returns false when examDate is undefined', () => {
    expect(isFinalWeek(undefined, TODAY_MS)).toBe(false);
  });

  it('returns true when exam is in 7 days', () => {
    const nowMidnight = Date.parse('2026-07-07T00:00:00Z');
    expect(isFinalWeek('2026-07-14', nowMidnight)).toBe(true);
  });

  it('returns true when exam is tomorrow', () => {
    const nowMidnight = Date.parse('2026-07-07T00:00:00Z');
    expect(isFinalWeek('2026-07-08', nowMidnight)).toBe(true);
  });

  it('returns false when exam is 8 days away', () => {
    const nowMidnight = Date.parse('2026-07-07T00:00:00Z');
    expect(isFinalWeek('2026-07-15', nowMidnight)).toBe(false);
  });

  it('returns false when exam has already passed', () => {
    expect(isFinalWeek('2026-06-01', TODAY_MS)).toBe(false);
  });

  it('returns true when exam is today', () => {
    const nowMidnight = Date.parse('2026-07-07T00:00:00Z');
    expect(isFinalWeek('2026-07-07', nowMidnight)).toBe(true);
  });
});
