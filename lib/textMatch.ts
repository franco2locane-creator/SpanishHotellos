// Shared Spanish fuzzy-matching, deliberately dependency-free so it's
// directly unit-testable and importable from both the grammar drill screen
// (sentence-length spoken answers) and the vocab flashcard screen
// (single/short-word typed or spoken answers).

export function normalizeSpanish(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

/**
 * Drill screen's original algorithm: substring containment. Accepts if 60%
 * of the answer's words appear as substrings of the input. Tuned for
 * sentence-length spoken answers, where a stray substring match is diluted
 * across many words — do NOT reuse this for single/short-word terms (see
 * isWholeWordFuzzyMatch below).
 */
export function isFuzzyMatch(input: string, answer: string): boolean {
  const a = normalizeSpanish(input);
  const b = normalizeSpanish(answer);
  const wordsB = b.split(' ').filter(Boolean);
  if (!wordsB.length) return false;
  const matches = wordsB.filter(w => a.includes(w));
  return matches.length / wordsB.length >= 0.6;
}

/**
 * Stricter variant for vocab: tokenizes the input into whole words and
 * requires exact token equality (not substring), so short terms don't
 * false-positive against unrelated longer words that merely contain them
 * as a substring — e.g. "pan" must not match "pantalones", and "té" must
 * not match "tener" once accents are stripped. Same 0.6 word-overlap ratio
 * for multi-word terms.
 */
export function isWholeWordFuzzyMatch(input: string, answer: string): boolean {
  const inputTokens = new Set(normalizeSpanish(input).split(' ').filter(Boolean));
  const answerTokens = normalizeSpanish(answer).split(' ').filter(Boolean);
  if (!answerTokens.length) return false;
  const matches = answerTokens.filter(w => inputTokens.has(w));
  return matches.length / answerTokens.length >= 0.6;
}

/** True if input whole-word-matches term or its Latin-American variant. */
export function isFuzzyMatchAny(input: string, term: string, termLatam?: string): boolean {
  return isWholeWordFuzzyMatch(input, term) || (!!termLatam && isWholeWordFuzzyMatch(input, termLatam));
}
