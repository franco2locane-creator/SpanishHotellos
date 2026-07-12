// Pure mode-rotation and distractor-generation logic for the active-recall
// flashcard screen, deliberately dependency-free so it's directly
// unit-testable. `rand` is an injectable RNG purely for deterministic tests —
// production call sites omit it and get Math.random.

export type FlashcardMode = 'mcq-es-en' | 'mcq-en-es' | 'typed-en-es' | 'listening' | 'speak';

export const FLASHCARD_MODES: FlashcardMode[] = ['mcq-es-en', 'mcq-en-es', 'typed-en-es', 'listening', 'speak'];

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * One mode per card, evenly cycling through all 5 modes so a session sees
 * each roughly equally often — re-shuffles the cycle order every 5 cards so
 * the starting mode (and each cycle's internal order) varies session to
 * session, not just which mode lands on which card index.
 */
export function assignModes(cardCount: number, rand: () => number = Math.random): FlashcardMode[] {
  if (cardCount <= 0) return [];
  const modes: FlashcardMode[] = [];
  let cycle = shuffle(FLASHCARD_MODES, rand);
  for (let i = 0; i < cardCount; i++) {
    const posInCycle = i % FLASHCARD_MODES.length;
    if (i > 0 && posInCycle === 0) cycle = shuffle(FLASHCARD_MODES, rand);
    modes.push(cycle[posInCycle]);
  }
  return modes;
}

/** A different mode than the one just failed, for a recycled card. */
export function pickRecycleMode(avoid: FlashcardMode, rand: () => number = Math.random): FlashcardMode {
  const options = FLASHCARD_MODES.filter(m => m !== avoid);
  return options[Math.floor(rand() * options.length)];
}

/**
 * `correct` + up to `count - 1` distractors, deduped and shuffled. `pool`
 * should already exclude the current card's own answer (callers pass the
 * rest of the deck). If the pool is too small to fill `count`, returns
 * fewer options rather than padding with duplicates.
 */
export function generateMcqOptions(correct: string, pool: string[], count = 4, rand: () => number = Math.random): string[] {
  const uniqueDistractorPool = Array.from(new Set(pool.filter(p => p !== correct)));
  const distractors = shuffle(uniqueDistractorPool, rand).slice(0, count - 1);
  return shuffle([correct, ...distractors], rand);
}
