import { computeReadiness, computeConsistencyScore, READINESS_WEIGHTS } from './readiness';

describe('READINESS_WEIGHTS', () => {
  it('sums to 1', () => {
    const sum = READINESS_WEIGHTS.performance + READINESS_WEIGHTS.coverage + READINESS_WEIGHTS.consistency;
    expect(sum).toBeCloseTo(1);
  });
});

describe('computeReadiness', () => {
  it('is a weighted 50/30/20 composite', () => {
    expect(computeReadiness(100, 100, 100)).toBe(100);
    expect(computeReadiness(0, 0, 0)).toBe(0);
    // 80*0.5 + 40*0.3 + 20*0.2 = 40 + 12 + 4 = 56
    expect(computeReadiness(80, 40, 20)).toBe(56);
  });

  it('performance dominates, matching the documented weight', () => {
    const highPerformance = computeReadiness(100, 0, 0);
    const highCoverage = computeReadiness(0, 100, 0);
    const highConsistency = computeReadiness(0, 0, 100);
    expect(highPerformance).toBeGreaterThan(highCoverage);
    expect(highCoverage).toBeGreaterThan(highConsistency);
  });
});

describe('computeConsistencyScore', () => {
  it('is 0 with no activity', () => {
    expect(computeConsistencyScore(0, 0)).toBe(0);
  });

  it('is 100 with a perfect week and a 14+ day streak', () => {
    expect(computeConsistencyScore(7, 14)).toBe(100);
    expect(computeConsistencyScore(7, 30)).toBe(100); // streak ratio caps at 1
  });

  it('weights the week ratio at 60% and streak at 40%', () => {
    expect(computeConsistencyScore(7, 0)).toBe(60);
    expect(computeConsistencyScore(0, 14)).toBe(40);
  });

  it('is bounded between 0 and 100', () => {
    const score = computeConsistencyScore(7, 100);
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});
