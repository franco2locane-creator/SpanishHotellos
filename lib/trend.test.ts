import { trendDirection, trendSentence } from './trend';

describe('trendDirection', () => {
  it('returns steady with fewer than 2*windowSize data points', () => {
    expect(trendDirection([10, 12, 14])).toBe('steady');
    expect(trendDirection([])).toBe('steady');
  });

  it('detects an upward trend', () => {
    expect(trendDirection([10, 10, 10, 15, 16, 17])).toBe('up');
  });

  it('detects a downward trend', () => {
    expect(trendDirection([17, 16, 15, 10, 10, 10])).toBe('down');
  });

  it('treats a small delta as steady, not noise', () => {
    expect(trendDirection([10, 10, 10, 10.2, 10.1, 10.3])).toBe('steady');
  });

  it('respects a custom window size', () => {
    expect(trendDirection([5, 5, 10, 10], 2)).toBe('up');
  });

  it('handles a zero prior average without dividing by zero', () => {
    expect(trendDirection([0, 0, 0, 5, 5, 5])).toBe('up');
    expect(trendDirection([0, 0, 0, 0, 0, 0])).toBe('steady');
  });
});

describe('trendSentence', () => {
  it('produces distinct copy for each direction', () => {
    expect(trendSentence('up')).toMatch(/up/i);
    expect(trendSentence('down')).toMatch(/down/i);
    expect(trendSentence('steady')).toMatch(/steady/i);
  });
});
