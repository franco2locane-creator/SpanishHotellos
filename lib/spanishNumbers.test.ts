import { numberToSpanishWords, spanishWordsToNumber } from './spanishNumbers';
import { normalizeSpanish } from './textMatch';

const CASES: [number, string][] = [
  [0, 'cero'],
  [1, 'uno'],
  [5, 'cinco'],
  [10, 'diez'],
  [15, 'quince'],
  [16, 'dieciséis'],
  [19, 'diecinueve'],
  [20, 'veinte'],
  [21, 'veintiuno'],
  [25, 'veinticinco'],
  [29, 'veintinueve'],
  [30, 'treinta'],
  [32, 'treinta y dos'],
  [45, 'cuarenta y cinco'],
  [50, 'cincuenta'],
  [99, 'noventa y nueve'],
  [100, 'cien'],
  [101, 'ciento uno'],
  [125, 'ciento veinticinco'],
  [200, 'doscientos'],
  [234, 'doscientos treinta y cuatro'],
  [500, 'quinientos'],
  [999, 'novecientos noventa y nueve'],
  [1000, 'mil'],
  [1001, 'mil uno'],
  [1500, 'mil quinientos'],
  [2020, 'dos mil veinte'],
  [3000, 'tres mil'],
  [9999, 'nueve mil novecientos noventa y nueve'],
];

describe('numberToSpanishWords', () => {
  it.each(CASES)('%i -> %s', (n, expected) => {
    expect(numberToSpanishWords(n)).toBe(expected);
  });

  it('throws outside the 0-9999 range', () => {
    expect(() => numberToSpanishWords(-1)).toThrow();
    expect(() => numberToSpanishWords(10000)).toThrow();
    expect(() => numberToSpanishWords(1.5)).toThrow();
  });
});

describe('spanishWordsToNumber', () => {
  it.each(CASES)('%s -> %i', (n, words) => {
    expect(spanishWordsToNumber(normalizeSpanish(words))).toBe(n);
  });

  it('is accent/case-insensitive when fed through normalizeSpanish first', () => {
    expect(spanishWordsToNumber(normalizeSpanish('Dieciséis'))).toBe(16);
    expect(spanishWordsToNumber(normalizeSpanish('VEINTIDÓS'))).toBe(22);
  });

  it('returns null for a phrase containing an unrecognized word', () => {
    expect(spanishWordsToNumber(normalizeSpanish('quince recepcionista'))).toBeNull();
    expect(spanishWordsToNumber(normalizeSpanish('reserva'))).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(spanishWordsToNumber('')).toBeNull();
  });
});
