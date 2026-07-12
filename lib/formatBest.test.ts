import { formatCompletionTime, formatBestBadge, formatBestFraction } from './formatBest';

describe('formatCompletionTime', () => {
  it('returns null for null input', () => {
    expect(formatCompletionTime(null)).toBeNull();
  });
  it('formats seconds as m:ss', () => {
    expect(formatCompletionTime(161)).toBe('2:41');
    expect(formatCompletionTime(5)).toBe('0:05');
  });
});

describe('formatBestBadge', () => {
  it('includes time when present', () => {
    expect(formatBestBadge(92, 161)).toBe('Best: 92% · 2:41');
  });
  it('omits time when absent', () => {
    expect(formatBestBadge(92, null)).toBe('Best: 92%');
  });
});

describe('formatBestFraction', () => {
  it('includes time when present', () => {
    expect(formatBestFraction(4, 5, 72)).toBe('Best: 4/5 · 1:12');
  });
  it('omits time when absent', () => {
    expect(formatBestFraction(4, 5, null)).toBe('Best: 4/5');
  });
});
