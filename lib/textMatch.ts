// Shared Spanish fuzzy-matching, deliberately dependency-free so it's
// directly unit-testable and importable from the grammar drill screen
// (sentence-length spoken answers), the vocab flashcard screen
// (single/short-word typed or spoken answers), and the remedial fix drill.

import { spanishWordsToNumber } from './spanishNumbers';

export function normalizeSpanish(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

// ── Number-word <-> digit equivalence ───────────────────────────────────────

function numericValue(normalizedToken: string): number | null {
  if (/^\d+$/.test(normalizedToken)) return parseInt(normalizedToken, 10);
  return spanishWordsToNumber(normalizedToken);
}

function tokensEqual(a: string, b: string): boolean {
  if (a === b) return true;
  const av = numericValue(a);
  const bv = numericValue(b);
  return av !== null && bv !== null && av === bv;
}

// ── Dual-article / gender-suffix answer expansion ───────────────────────────

const ARTICLE_PAIRS: [string, string][] = [['el', 'la'], ['un', 'una'], ['los', 'las'], ['unos', 'unas']];

function expandGenderSuffixes(term: string): string[] {
  const matches = [...term.matchAll(/(\w+)o\/a\b/g)];
  if (matches.length === 0) return [term];
  let variants = [term];
  for (const m of matches) {
    const [full, stem] = m;
    const next: string[] = [];
    for (const v of variants) {
      next.push(v.replace(full, `${stem}o`));
      next.push(v.replace(full, `${stem}a`));
    }
    variants = next;
  }
  return variants;
}

/**
 * Expands a stored answer that uses recognized dual-form shorthand into its
 * literal acceptable forms — narrowly scoped so it doesn't touch the many
 * generic "X / Y" synonym-list entries elsewhere in vocab content (those
 * only match at the START of the string, immediately before the slash, with
 * no space — "el/la recepcionista", not "la tarjeta llave / la tarjeta...").
 *
 *  - Leading dual-article ("el/la X" -> "el X", "la X", plus the literal
 *    original): the article itself stays mandatory — a bare "X" is never
 *    in the returned set.
 *  - Trailing gender-suffix shorthand ("camarero/a" -> "camarero", "camarera"),
 *    same underlying content pattern, same mechanism, all occurrences expanded.
 */
export function answerVariants(term: string): string[] {
  const withArticleVariants = new Set<string>([term]);

  const articleMatch = term.match(/^(\w+)\/(\w+)\s+(.+)$/);
  if (articleMatch) {
    const [, left, right, rest] = articleMatch;
    const isKnownPair = ARTICLE_PAIRS.some(([l, r]) => l === left.toLowerCase() && r === right.toLowerCase());
    if (isKnownPair) {
      withArticleVariants.add(`${left} ${rest}`);
      withArticleVariants.add(`${right} ${rest}`);
    }
  }

  const allVariants = new Set<string>();
  for (const v of withArticleVariants) {
    for (const expanded of expandGenderSuffixes(v)) allVariants.add(expanded);
  }
  return [...allVariants];
}

// ── Comparators ──────────────────────────────────────────────────────────────

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
 * for multi-word terms. Number words and digits are treated as equal tokens
 * ("15" matches "quince"), and a whole-phrase compound number ("32" vs
 * "treinta y dos") short-circuits to a full match.
 */
export function isWholeWordFuzzyMatch(input: string, answer: string): boolean {
  const normInput = normalizeSpanish(input);
  const normAnswer = normalizeSpanish(answer);

  const inputNum = numericValue(normInput);
  const answerNum = numericValue(normAnswer);
  if (inputNum !== null && answerNum !== null && inputNum === answerNum) return true;

  const inputTokens = normInput.split(' ').filter(Boolean);
  const answerTokens = normAnswer.split(' ').filter(Boolean);
  if (!answerTokens.length) return false;
  const matches = answerTokens.filter(w => inputTokens.some(it => tokensEqual(it, w)));
  return matches.length / answerTokens.length >= 0.6;
}

/** True if input whole-word-matches any accepted variant of term or its Latin-American variant. */
export function isFuzzyMatchAny(input: string, term: string, termLatam?: string): boolean {
  const candidates = [...answerVariants(term), ...(termLatam ? answerVariants(termLatam) : [])];
  return candidates.some(c => isWholeWordFuzzyMatch(input, c));
}

/**
 * Exact-match counterpart for grammar drills, where conjugation precision
 * matters and the lenient word-overlap ratio would be too forgiving (a
 * single wrong verb form in an otherwise-correct sentence could still hit
 * 60% overlap). Same variant expansion and number equivalence as above,
 * but requires a full-string match per variant, not a partial overlap.
 */
export function isExactMatchAny(input: string, answer: string): boolean {
  const normInput = normalizeSpanish(input);
  const inputNum = numericValue(normInput);
  for (const variant of answerVariants(answer)) {
    const normVariant = normalizeSpanish(variant);
    if (normInput === normVariant) return true;
    const variantNum = numericValue(normVariant);
    if (inputNum !== null && variantNum !== null && inputNum === variantNum) return true;
  }
  return false;
}
