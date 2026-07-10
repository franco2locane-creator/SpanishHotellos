import { dailySeedIndex, dailySeededPick } from './dailySeed';

describe('dailySeedIndex', () => {
  it('is deterministic for the same inputs', () => {
    const a = dailySeedIndex(5, 'user-1', 'scenario', '2026-07-11');
    const b = dailySeedIndex(5, 'user-1', 'scenario', '2026-07-11');
    expect(a).toBe(b);
  });

  it('stays within [0, poolLength)', () => {
    for (let i = 0; i < 50; i++) {
      const idx = dailySeedIndex(7, `user-${i}`, 'drill', '2026-07-11');
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(7);
    }
  });

  it('changes across different dates (not constant)', () => {
    const indices = new Set<number>();
    for (let d = 1; d <= 28; d++) {
      const date = `2026-07-${String(d).padStart(2, '0')}`;
      indices.add(dailySeedIndex(10, 'user-1', 'scenario', date));
    }
    // With 28 distinct days over a 10-slot pool, expect real variety, not a single value.
    expect(indices.size).toBeGreaterThan(1);
  });

  it('differs by salt for the same user and date (scenario vs drill don\'t collide)', () => {
    const scenarioIdx = dailySeedIndex(10, 'user-1', 'scenario', '2026-07-11');
    const drillIdx = dailySeedIndex(10, 'user-1', 'drill', '2026-07-11');
    // Not a hard guarantee for every input, but true for this fixture — catches
    // an implementation that ignores the salt entirely.
    expect(scenarioIdx === drillIdx && scenarioIdx === dailySeedIndex(10, 'user-1', 'other-salt', '2026-07-11')).toBe(false);
  });

  it('differs by user for the same date and salt (usually)', () => {
    const indices = new Set<number>();
    for (let u = 0; u < 20; u++) {
      indices.add(dailySeedIndex(10, `user-${u}`, 'scenario', '2026-07-11'));
    }
    expect(indices.size).toBeGreaterThan(1);
  });

  it('throws on an empty pool', () => {
    expect(() => dailySeedIndex(0, 'user-1', 'scenario', '2026-07-11')).toThrow();
  });
});

describe('dailySeededPick', () => {
  it('picks an element that is actually in the pool', () => {
    const pool = ['a', 'b', 'c', 'd'];
    const pick = dailySeededPick(pool, 'user-1', 'scenario', '2026-07-11');
    expect(pool).toContain(pick);
  });

  it('is stable for the same day and flips (eventually) on other days', () => {
    const pool = ['a', 'b', 'c', 'd', 'e'];
    const today = dailySeededPick(pool, 'user-1', 'scenario', '2026-07-11');
    const sameDayAgain = dailySeededPick(pool, 'user-1', 'scenario', '2026-07-11');
    expect(sameDayAgain).toBe(today);

    let sawDifferent = false;
    for (let d = 12; d <= 21; d++) {
      const pick = dailySeededPick(pool, 'user-1', 'scenario', `2026-07-${d}`);
      if (pick !== today) sawDifferent = true;
    }
    expect(sawDifferent).toBe(true);
  });

  it('single-item pool always returns that item', () => {
    expect(dailySeededPick(['only'], 'user-1', 'scenario', '2026-07-11')).toBe('only');
  });
});
