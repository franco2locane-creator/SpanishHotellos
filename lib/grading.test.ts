import { extractNumericScores, computeTotalScore, type GradeScores, type NumericScores } from './grading';

function makeCriterion(score: number) {
  return { score, examples: [], note: 'test' };
}

function makeScores(
  fluency: number,
  vocabulary: number,
  grammar: number,
  taskCompletion: number,
  register: number,
): GradeScores {
  return {
    fluency:        makeCriterion(fluency),
    vocabulary:     makeCriterion(vocabulary),
    grammar:        makeCriterion(grammar),
    taskCompletion: makeCriterion(taskCompletion),
    register:       { ...makeCriterion(register), tuForms: [] },
  };
}

const EQUAL_WEIGHTS = {
  fluency: 0.2, vocabulary: 0.2, grammar: 0.2, taskCompletion: 0.2, register: 0.2,
};

describe('extractNumericScores', () => {
  it('extracts score values from each criterion', () => {
    const scores = makeScores(14, 12, 16, 18, 10);
    expect(extractNumericScores(scores)).toEqual({
      fluency: 14, vocabulary: 12, grammar: 16, taskCompletion: 18, register: 10,
    });
  });

  it('handles zero scores', () => {
    const scores = makeScores(0, 0, 0, 0, 0);
    const result = extractNumericScores(scores);
    for (const v of Object.values(result)) expect(v).toBe(0);
  });

  it('handles max scores (20 per criterion)', () => {
    const scores = makeScores(20, 20, 20, 20, 20);
    const result = extractNumericScores(scores);
    for (const v of Object.values(result)) expect(v).toBe(20);
  });
});

describe('computeTotalScore', () => {
  // Scoring: each criterion is 0–20; weights sum to 1.0; total max = 20 (display ×5 = 100)

  it('all 20s with equal weights gives 20 (maximum score)', () => {
    const numeric: NumericScores = { fluency: 20, vocabulary: 20, grammar: 20, taskCompletion: 20, register: 20 };
    expect(computeTotalScore(numeric, EQUAL_WEIGHTS)).toBe(20);
  });

  it('all zeros gives 0', () => {
    const numeric: NumericScores = { fluency: 0, vocabulary: 0, grammar: 0, taskCompletion: 0, register: 0 };
    expect(computeTotalScore(numeric, EQUAL_WEIGHTS)).toBe(0);
  });

  it('equal weights produce score equal to the arithmetic mean of criteria', () => {
    const numeric: NumericScores = { fluency: 15, vocabulary: 13, grammar: 11, taskCompletion: 17, register: 9 };
    // mean = (15+13+11+17+9) / 5 = 65/5 = 13
    expect(computeTotalScore(numeric, EQUAL_WEIGHTS)).toBeCloseTo(13, 1);
  });

  it('custom weights change the result', () => {
    const numeric: NumericScores = { fluency: 20, vocabulary: 10, grammar: 10, taskCompletion: 10, register: 10 };
    const heavyFluency = { fluency: 0.4, vocabulary: 0.15, grammar: 0.15, taskCompletion: 0.15, register: 0.15 };
    // 20*0.4 + 10*0.15*4 = 8 + 6 = 14
    expect(computeTotalScore(numeric, heavyFluency)).toBeCloseTo(14, 1);
  });

  it('defaults missing weights to 0.2', () => {
    const numeric: NumericScores = { fluency: 10, vocabulary: 10, grammar: 10, taskCompletion: 10, register: 10 };
    expect(computeTotalScore(numeric, {})).toBeCloseTo(10, 1);
  });

  it('mid-range equal scores return the same value (10 = 10)', () => {
    const numeric: NumericScores = { fluency: 10, vocabulary: 10, grammar: 10, taskCompletion: 10, register: 10 };
    expect(computeTotalScore(numeric, EQUAL_WEIGHTS)).toBeCloseTo(10, 1);
  });

  it('pass-mark scenario: mixed scores crossing 12 (= 60/100)', () => {
    // Pass mark when displayed ×5 is 60 → totalScore threshold = 12
    const passing: NumericScores = { fluency: 14, vocabulary: 12, grammar: 12, taskCompletion: 13, register: 11 };
    // (14+12+12+13+11)/5 = 62/5 = 12.4
    expect(computeTotalScore(passing, EQUAL_WEIGHTS)).toBeGreaterThanOrEqual(12);
  });

  it('rounds result to one decimal place', () => {
    const numeric: NumericScores = { fluency: 17, vocabulary: 13, grammar: 11, taskCompletion: 14, register: 16 };
    const raw = (17 + 13 + 11 + 14 + 16) / 5; // 14.2
    expect(computeTotalScore(numeric, EQUAL_WEIGHTS)).toBeCloseTo(raw, 1);
  });
});
