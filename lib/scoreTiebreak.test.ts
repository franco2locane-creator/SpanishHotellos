import { beatsBest } from './scoreTiebreak';

describe('beatsBest', () => {
  it('anything beats no prior best', () => {
    expect(beatsBest({ score: 0, completionSeconds: null }, null)).toBe(true);
  });

  it('higher score always wins regardless of time', () => {
    expect(beatsBest({ score: 90, completionSeconds: 500 }, { score: 80, completionSeconds: 10 })).toBe(true);
  });

  it('lower score never wins regardless of time', () => {
    expect(beatsBest({ score: 70, completionSeconds: 1 }, { score: 80, completionSeconds: 500 })).toBe(false);
  });

  it('equal score: faster completion time wins', () => {
    expect(beatsBest({ score: 80, completionSeconds: 90 }, { score: 80, completionSeconds: 120 })).toBe(true);
    expect(beatsBest({ score: 80, completionSeconds: 150 }, { score: 80, completionSeconds: 120 })).toBe(false);
  });

  it('equal score, candidate has no time: never overtakes', () => {
    expect(beatsBest({ score: 80, completionSeconds: null }, { score: 80, completionSeconds: 120 })).toBe(false);
    expect(beatsBest({ score: 80, completionSeconds: null }, { score: 80, completionSeconds: null })).toBe(false);
  });

  it('equal score, candidate timed but current untimed: candidate wins (more info)', () => {
    expect(beatsBest({ score: 80, completionSeconds: 120 }, { score: 80, completionSeconds: null })).toBe(true);
  });
});
