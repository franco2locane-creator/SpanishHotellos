import { normalizeSpanish, isFuzzyMatch, isWholeWordFuzzyMatch, isFuzzyMatchAny, answerVariants, isExactMatchAny } from './textMatch';

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

describe('number-word <-> digit equivalence', () => {
  it('accepts a digit answer matched by its Spanish word form', () => {
    expect(isWholeWordFuzzyMatch('15', 'quince')).toBe(true);
    expect(isWholeWordFuzzyMatch('quince', '15')).toBe(true);
  });

  it('accepts a compound number in either digit or word form', () => {
    expect(isWholeWordFuzzyMatch('32', 'treinta y dos')).toBe(true);
    expect(isWholeWordFuzzyMatch('treinta y dos', '32')).toBe(true);
  });

  it('still rejects an unrelated wrong number', () => {
    expect(isWholeWordFuzzyMatch('15', 'veinte')).toBe(false);
    expect(isWholeWordFuzzyMatch('quince', 'veinte')).toBe(false);
  });

  it('isExactMatchAny also accepts digit/word equivalence', () => {
    expect(isExactMatchAny('15', 'quince')).toBe(true);
    expect(isExactMatchAny('treinta y dos', '32')).toBe(true);
    expect(isExactMatchAny('16', 'quince')).toBe(false);
  });
});

describe('answerVariants', () => {
  it('expands a leading dual-article answer, keeping the article mandatory', () => {
    const variants = answerVariants('el/la recepcionista');
    expect(variants).toContain('el recepcionista');
    expect(variants).toContain('la recepcionista');
    expect(variants).toContain('el/la recepcionista');
    expect(variants).not.toContain('recepcionista');
  });

  it('expands a trailing gender-suffix shorthand', () => {
    const variants = answerVariants('camarero/a');
    expect(variants).toContain('camarero');
    expect(variants).toContain('camarera');
  });

  it('expands a compound dual-article + gender-suffix answer into all combinations', () => {
    const variants = answerVariants('el/la camarero/a');
    expect(variants).toContain('el camarero');
    expect(variants).toContain('la camarera');
  });

  it('leaves an unrecognized generic "/"-list entry untouched', () => {
    const variants = answerVariants('la tarjeta llave / la tarjeta de habitación');
    expect(variants).toEqual(['la tarjeta llave / la tarjeta de habitación']);
  });

  it('a bare noun without the article never validates against a dual-article answer', () => {
    expect(isFuzzyMatchAny('recepcionista', 'el/la recepcionista')).toBe(false);
    expect(isFuzzyMatchAny('el recepcionista', 'el/la recepcionista')).toBe(true);
    expect(isFuzzyMatchAny('la recepcionista', 'el/la recepcionista')).toBe(true);
  });
});
