import { assignModes, pickRecycleMode, generateMcqOptions, FLASHCARD_MODES, type FlashcardMode } from './flashcardModes';

/** Deterministic LCG so mode-assignment tests aren't flaky. */
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

describe('assignModes', () => {
  it('returns one mode per card', () => {
    expect(assignModes(0)).toEqual([]);
    expect(assignModes(7, seededRand(1))).toHaveLength(7);
  });

  it('cycles through all 5 modes evenly across a full cycle', () => {
    const modes = assignModes(FLASHCARD_MODES.length, seededRand(42));
    expect(new Set(modes).size).toBe(FLASHCARD_MODES.length);
    for (const m of FLASHCARD_MODES) expect(modes).toContain(m);
  });

  it('covers all 5 modes over a 15-card session (multiple cycles)', () => {
    const modes = assignModes(15, seededRand(7));
    const counts = new Map<FlashcardMode, number>();
    for (const m of modes) counts.set(m, (counts.get(m) ?? 0) + 1);
    for (const m of FLASHCARD_MODES) expect(counts.get(m)).toBe(3); // 15 / 5 = 3 exactly
  });

  it('is deterministic for a given rand function', () => {
    const a = assignModes(10, seededRand(99));
    const b = assignModes(10, seededRand(99));
    expect(a).toEqual(b);
  });
});

describe('pickRecycleMode', () => {
  it('never returns the avoided mode', () => {
    for (const avoid of FLASHCARD_MODES) {
      for (let seed = 0; seed < 50; seed++) {
        expect(pickRecycleMode(avoid, seededRand(seed))).not.toBe(avoid);
      }
    }
  });

  it('only ever returns a valid mode', () => {
    const picked = pickRecycleMode('mcq-es-en', seededRand(3));
    expect(FLASHCARD_MODES).toContain(picked);
  });
});

describe('generateMcqOptions', () => {
  const pool = ['la reserva', 'el equipaje', 'la llave', 'el desayuno', 'la factura', 'el pasillo'];

  it('always includes the correct answer', () => {
    const opts = generateMcqOptions('la reserva', pool, 4, seededRand(5));
    expect(opts).toContain('la reserva');
  });

  it('returns the requested count when the pool is large enough', () => {
    const opts = generateMcqOptions('la reserva', pool, 4, seededRand(5));
    expect(opts).toHaveLength(4);
  });

  it('never duplicates an option', () => {
    const opts = generateMcqOptions('la reserva', pool, 4, seededRand(11));
    expect(new Set(opts).size).toBe(opts.length);
  });

  it('excludes the correct answer from the distractor pool even if present in pool', () => {
    const opts = generateMcqOptions('la reserva', [...pool, 'la reserva'], 4, seededRand(2));
    expect(opts.filter(o => o === 'la reserva')).toHaveLength(1);
  });

  it('degrades gracefully when the pool is smaller than requested count', () => {
    const smallPool = ['el equipaje'];
    const opts = generateMcqOptions('la reserva', smallPool, 4, seededRand(1));
    expect(opts).toHaveLength(2); // correct + the one distractor available
    expect(opts).toContain('la reserva');
    expect(opts).toContain('el equipaje');
  });
});
