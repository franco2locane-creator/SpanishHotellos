import { getDaysUntilExam, isFinalWeek, getWeekDates } from './examDate';

describe('getDaysUntilExam / isFinalWeek', () => {
  it('returns null with no exam date', () => {
    expect(getDaysUntilExam(undefined)).toBeNull();
  });

  it('isFinalWeek is false with no exam date', () => {
    expect(isFinalWeek(undefined)).toBe(false);
  });
});

describe('getWeekDates', () => {
  it('returns 7 consecutive dates, Monday first', () => {
    // 2026-07-16 is a Thursday (UTC)
    const thursday = new Date('2026-07-16T12:00:00Z');
    const week = getWeekDates(thursday);
    expect(week).toEqual([
      '2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16',
      '2026-07-17', '2026-07-18', '2026-07-19',
    ]);
  });

  it('a Monday maps to itself as the first date', () => {
    const monday = new Date('2026-07-13T00:00:01Z');
    const week = getWeekDates(monday);
    expect(week[0]).toBe('2026-07-13');
    expect(week).toHaveLength(7);
  });

  it('a Sunday maps to the preceding Monday as the first date', () => {
    const sunday = new Date('2026-07-19T23:00:00Z');
    const week = getWeekDates(sunday);
    expect(week[0]).toBe('2026-07-13');
    expect(week[6]).toBe('2026-07-19');
  });

  it('spans a month boundary correctly', () => {
    // Week of Monday 2026-07-27 runs into August (Sat/Sun 2026-08-01/02).
    const week = getWeekDates(new Date('2026-07-30T12:00:00Z'));
    expect(week[0]).toBe('2026-07-27');
    expect(week).toContain('2026-08-01');
    expect(week).toContain('2026-08-02');
  });
});
