import { normalizeSpanish, isFuzzyMatch, isWholeWordFuzzyMatch, isFuzzyMatchAny } from './textMatch';

describe('normalizeSpanish', () => {
  it('lowercases, strips accents, and strips punctuation', () => {
    expect(normalizeSpanish('¿Qué Habitación?')).toBe('que habitacion');
  });
});

describe('isFuzzyMatch (drill screen — substring, sentence-tuned)', () => {
  it('matches a full sentence with 60%+ word overlap', () => {
    expect(isFuzzyMatch('la habitacion esta disponible ahora', 'La habitación está disponible ahora')).toBe(true);
  });

  it('rejects a mostly-wrong sentence', () => {
    expect(isFuzzyMatch('no se nada', 'La habitación está disponible ahora')).toBe(false);
  });

  it('is still substring-based, so a short answer can false-positive against a longer wrong input (documented tradeoff)', () => {
    // When the correct answer is short ("pan"), a wrong-but-longer input that
    // merely contains it as a substring ("pantalones") still "matches" —
    // this is exactly why vocab matching must NOT reuse this function
    // directly for single-word terms (see isWholeWordFuzzyMatch below).
    expect(isFuzzyMatch('pantalones', 'pan')).toBe(true);
    expect(isFuzzyMatch('tener', 'te')).toBe(true);
  });
});

describe('isWholeWordFuzzyMatch (vocab — strict token equality)', () => {
  it('matches an exact single-word term', () => {
    expect(isWholeWordFuzzyMatch('pantalones', 'pantalones')).toBe(true);
  });

  it('matches case/accent-insensitively', () => {
    expect(isWholeWordFuzzyMatch('RESERVA', 'reserva')).toBe(true);
    expect(isWholeWordFuzzyMatch('habitacion', 'habitación')).toBe(true);
  });

  it('does not false-positive a wrong long input against a short "pan" answer', () => {
    expect(isWholeWordFuzzyMatch('pantalones', 'pan')).toBe(false);
    expect(isWholeWordFuzzyMatch('pan', 'pantalones')).toBe(false);
  });

  it('does not false-positive a wrong long input against a short "té" answer', () => {
    expect(isWholeWordFuzzyMatch('tener', 'te')).toBe(false);
    expect(isWholeWordFuzzyMatch('tener', 'té')).toBe(false);
    expect(isWholeWordFuzzyMatch('te', 'tener')).toBe(false);
  });

  it('still supports multi-word terms at the 0.6 overlap ratio', () => {
    expect(isWholeWordFuzzyMatch('a su disposicion', 'a su disposición')).toBe(true);
    expect(isWholeWordFuzzyMatch('disposicion', 'a su disposición')).toBe(false); // 1/3 words, below 0.6
  });

  it('rejects an empty answer', () => {
    expect(isWholeWordFuzzyMatch('algo', '')).toBe(false);
  });
});

describe('isFuzzyMatchAny', () => {
  it('accepts a match against the primary term', () => {
    expect(isFuzzyMatchAny('camarero', 'camarero', 'mesero')).toBe(true);
  });

  it('accepts a match against the Latin-American variant', () => {
    expect(isFuzzyMatchAny('mesero', 'camarero', 'mesero')).toBe(true);
  });

  it('rejects a wrong long input that would substring-match a short correct term', () => {
    expect(isFuzzyMatchAny('pantalones', 'pan', undefined)).toBe(false);
  });

  it('rejects when neither variant matches', () => {
    expect(isFuzzyMatchAny('llave', 'camarero', 'mesero')).toBe(false);
  });
});
