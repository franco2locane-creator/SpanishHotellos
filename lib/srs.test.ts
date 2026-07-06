import { nextSrsState, isDue, addDays, INITIAL_SRS } from './srs';

const TODAY = '2026-07-06';

describe('addDays', () => {
  it('adds zero days', () => expect(addDays('2026-07-06', 0)).toBe('2026-07-06'));
  it('adds positive days', () => expect(addDays('2026-07-06', 6)).toBe('2026-07-12'));
  it('crosses month boundary', () => expect(addDays('2026-07-31', 1)).toBe('2026-08-01'));
});

describe('isDue', () => {
  it('returns true when dueDate equals today', () => expect(isDue(TODAY, TODAY)).toBe(true));
  it('returns true when dueDate is in the past', () => expect(isDue('2026-07-01', TODAY)).toBe(true));
  it('returns false when dueDate is in the future', () => expect(isDue('2026-07-10', TODAY)).toBe(false));
});

describe('nextSrsState — Again (grade 0)', () => {
  it('resets repetitions to 0 and sets interval to 0', () => {
    const next = nextSrsState({ interval: 6, easeFactor: 2.5, repetitions: 2, dueDate: TODAY }, 0, TODAY);
    expect(next.repetitions).toBe(0);
    expect(next.interval).toBe(0);
    expect(next.dueDate).toBe(TODAY); // due today
  });

  it('penalises the ease factor significantly', () => {
    const next = nextSrsState(INITIAL_SRS, 0, TODAY);
    expect(next.easeFactor).toBeLessThan(2.5);
    expect(next.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('never drops EF below 1.3', () => {
    let state = { ...INITIAL_SRS };
    for (let i = 0; i < 20; i++) state = nextSrsState(state, 0, TODAY);
    expect(state.easeFactor).toBe(1.3);
  });
});

describe('nextSrsState — Hard (grade 1)', () => {
  it('first review: interval = 1, repetitions = 1', () => {
    const next = nextSrsState(INITIAL_SRS, 1, TODAY);
    expect(next.interval).toBe(1);
    expect(next.repetitions).toBe(1);
    expect(next.dueDate).toBe(addDays(TODAY, 1));
  });

  it('reduces EF by ~0.14', () => {
    const next = nextSrsState(INITIAL_SRS, 1, TODAY);
    expect(next.easeFactor).toBeCloseTo(2.36, 2);
  });
});

describe('nextSrsState — Good (grade 2)', () => {
  it('first review: interval = 1, rep = 1, EF unchanged', () => {
    const next = nextSrsState(INITIAL_SRS, 2, TODAY);
    expect(next.interval).toBe(1);
    expect(next.repetitions).toBe(1);
    expect(next.easeFactor).toBeCloseTo(2.5, 4);
  });

  it('second review: interval = 6, rep = 2', () => {
    const after1 = nextSrsState(INITIAL_SRS, 2, TODAY);
    const after2 = nextSrsState(after1, 2, TODAY);
    expect(after2.interval).toBe(6);
    expect(after2.repetitions).toBe(2);
  });

  it('third review: interval = round(6 * EF)', () => {
    const s1 = nextSrsState(INITIAL_SRS, 2, TODAY);
    const s2 = nextSrsState(s1, 2, TODAY);
    const s3 = nextSrsState(s2, 2, TODAY);
    expect(s3.interval).toBe(Math.round(6 * 2.5));
    expect(s3.interval).toBe(15);
  });
});

describe('nextSrsState — Easy (grade 3)', () => {
  it('first review: interval = 1, rep = 1, EF increases by 0.1', () => {
    const next = nextSrsState(INITIAL_SRS, 3, TODAY);
    expect(next.interval).toBe(1);
    expect(next.repetitions).toBe(1);
    expect(next.easeFactor).toBeCloseTo(2.6, 4);
  });

  it('EF grows with repeated Easy ratings', () => {
    const s1 = nextSrsState(INITIAL_SRS, 3, TODAY);
    const s2 = nextSrsState(s1, 3, TODAY);
    expect(s2.easeFactor).toBeCloseTo(2.7, 4);
  });
});

describe('nextSrsState — mixed session', () => {
  it('Good → Good → Again resets repetitions', () => {
    const s1 = nextSrsState(INITIAL_SRS, 2, TODAY);
    const s2 = nextSrsState(s1, 2, TODAY);
    const s3 = nextSrsState(s2, 0, TODAY); // Again!
    expect(s3.repetitions).toBe(0);
    expect(s3.interval).toBe(0);
  });
});
