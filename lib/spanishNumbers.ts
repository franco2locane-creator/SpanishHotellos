// Spanish digit <-> word-form number conversion, 0-9999 — covers hotel-context
// numbers (room counts, prices, quantities, years). Pure and dependency-free.
// Used by lib/textMatch.ts to treat "15" and "quince" as equivalent tokens.

const ONES_WORDS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const TEENS_WORDS = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
const TWENTIES_WORDS = ['veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const TENS_WORDS: Record<number, string> = { 30: 'treinta', 40: 'cuarenta', 50: 'cincuenta', 60: 'sesenta', 70: 'setenta', 80: 'ochenta', 90: 'noventa' };
const HUNDREDS_WORDS: Record<number, string> = { 100: 'cien', 200: 'doscientos', 300: 'trescientos', 400: 'cuatrocientos', 500: 'quinientos', 600: 'seiscientos', 700: 'setecientos', 800: 'ochocientos', 900: 'novecientos' };

function twoDigitsToWords(n: number): string {
  if (n < 10) return ONES_WORDS[n];
  if (n < 20) return TEENS_WORDS[n - 10];
  if (n < 30) return TWENTIES_WORDS[n - 20];
  const tens = Math.floor(n / 10) * 10;
  const ones = n % 10;
  return ones === 0 ? TENS_WORDS[tens] : `${TENS_WORDS[tens]} y ${ONES_WORDS[ones]}`;
}

function threeDigitsToWords(n: number): string {
  if (n < 100) return twoDigitsToWords(n);
  const hundreds = Math.floor(n / 100) * 100;
  const rest = n % 100;
  if (rest === 0) return HUNDREDS_WORDS[hundreds];
  const hWord = hundreds === 100 ? 'ciento' : HUNDREDS_WORDS[hundreds];
  return `${hWord} ${twoDigitsToWords(rest)}`;
}

/** 0-9999 only — sufficient for hotel-context numbers; throws outside that range. */
export function numberToSpanishWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 9999) {
    throw new Error(`numberToSpanishWords: ${n} out of supported range 0-9999`);
  }
  if (n === 0) return 'cero';
  if (n < 1000) return threeDigitsToWords(n);
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const thousandsWord = thousands === 1 ? 'mil' : `${twoDigitsToWords(thousands)} mil`;
  return rest === 0 ? thousandsWord : `${thousandsWord} ${threeDigitsToWords(rest)}`;
}

// Accent-stripped keys — callers normalize input the same way (see lib/textMatch.ts).
const WORD_VALUES: Record<string, number> = {
  cero: 0, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
  veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400,
  quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900,
  mil: 1000,
};

/**
 * Parses an already-normalized (lowercase, accent-stripped) Spanish number
 * phrase into its numeric value. Returns null if any token isn't a
 * recognized number word — so a plain word like "reserva" never silently
 * resolves to some coincidental value.
 */
export function spanishWordsToNumber(normalized: string): number | null {
  const tokens = normalized.split(' ').filter(w => w && w !== 'y');
  if (tokens.length === 0) return null;
  if (tokens.some(t => !(t in WORD_VALUES))) return null;

  let total = 0;
  let current = 0;
  for (const t of tokens) {
    const v = WORD_VALUES[t];
    if (v === 1000) {
      total += (current === 0 ? 1 : current) * 1000;
      current = 0;
    } else {
      current += v;
    }
  }
  return total + current;
}
