import * as fs from 'fs';
import * as path from 'path';

// ── Helpers ───────────────────────────────────────────────────────────────────

let errors = 0;
let warnings = 0;

function fail(msg: string) {
  console.error(`  ✗ ${msg}`);
  errors++;
}

function warn(msg: string) {
  console.warn(`  ⚠ ${msg}`);
  warnings++;
}

function ok(msg: string) {
  console.log(`  ✓ ${msg}`);
}

function readJson(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

// ── Mock exam validation ───────────────────────────────────────────────────────

const VALID_LEVELS = ['basic', 'intermediate'];
const VALID_SOURCES = ['transcribed', 'generated'];
const VALID_TYPES = [
  'personal_presentation', 'checkin', 'restaurant',
  'hotel_presentation', 'job_interview', 'complaint', 'saying_no',
];

const REQUIRED_FIELDS_BY_TYPE: Record<string, string[]> = {
  personal_presentation: ['topics', 'assessorQuestions'],
  checkin: ['hotelName', 'hotelCity', 'timeOfDay', 'reservations', 'walkIn', 'hotelInfo', 'checkoutTime', 'checklist'],
  restaurant: ['restaurantName', 'hotelName', 'hotelCity', 'timeOfDay', 'reservations', 'noTableSituation', 'dishOfDay', 'checklist'],
  hotel_presentation: ['hotelName', 'hotelCity', 'sloganCompletion', 'architectureStyle', 'featuredRoom', 'shuttlePriceEuros', 'extraFacility', 'targetAudience', 'guestQuestions', 'checklist'],
  job_interview: ['hotelName', 'hotelCity', 'position', 'context', 'assessorQuestions', 'checklist'],
  complaint: ['hotelName', 'hotelCity', 'timeOfDay', 'complaintScenario', 'guestName', 'problemDetails', 'resolutionOptions', 'checklist'],
  saying_no: ['hotelName', 'hotelCity', 'timeOfDay', 'requestContext', 'reasonForNo', 'alternatives', 'checklist'],
};

function validateMock(filePath: string) {
  const name = path.basename(filePath);
  console.log(`\nMock: ${name}`);

  let data: any;
  try {
    data = readJson(filePath);
  } catch (e) {
    fail(`invalid JSON: ${e}`);
    return;
  }

  if (!data.id || typeof data.id !== 'string') fail('missing or invalid .id');
  else ok(`.id = "${data.id}"`);

  if (!VALID_LEVELS.includes(data.level)) fail(`invalid .level "${data.level}" (expected: ${VALID_LEVELS.join(', ')})`);
  else ok(`.level = "${data.level}"`);

  if (typeof data.number !== 'number') fail('missing or non-numeric .number');
  else ok(`.number = ${data.number}`);

  if (!VALID_SOURCES.includes(data.source)) fail(`invalid .source "${data.source}"`);
  else ok(`.source = "${data.source}"`);

  if (!Array.isArray(data.assignments) || data.assignments.length === 0) {
    fail('missing or empty .assignments array');
    return;
  }
  ok(`.assignments count = ${data.assignments.length}`);

  const expectedFirst = 'personal_presentation';
  const firstType = data.assignments[0]?.type;
  if (firstType !== expectedFirst) {
    warn(`first assignment type is "${firstType}", expected "${expectedFirst}"`);
  }

  data.assignments.forEach((a: any, i: number) => {
    const prefix = `assignment[${i}]`;

    if (!VALID_TYPES.includes(a.type)) {
      fail(`${prefix}.type "${a.type}" is not a recognised assignment type`);
      return;
    }

    if (typeof a.number !== 'number') fail(`${prefix}.number must be a number`);
    if (a.prepTimeSecs !== 120) warn(`${prefix}.prepTimeSecs is ${a.prepTimeSecs}, expected 120`);
    if (a.maxKeywords !== 5) warn(`${prefix}.maxKeywords is ${a.maxKeywords}, expected 5`);

    if (!a.data || typeof a.data !== 'object') {
      fail(`${prefix}.data is missing`);
      return;
    }

    const required = REQUIRED_FIELDS_BY_TYPE[a.type] ?? [];
    for (const field of required) {
      if (!(field in a.data)) {
        fail(`${prefix}.data is missing required field ".${field}" for type "${a.type}"`);
      }
    }

    // Type-specific checks
    if (a.type === 'personal_presentation') {
      if (!Array.isArray(a.data.topics) || a.data.topics.length !== 3) {
        fail(`${prefix}.data.topics must be an array of exactly 3 strings`);
      }
      if (!Array.isArray(a.data.assessorQuestions) || a.data.assessorQuestions.length < 4) {
        fail(`${prefix}.data.assessorQuestions must have at least 4 questions`);
      }
    }

    if (a.type === 'checkin') {
      if (!Array.isArray(a.data.reservations) || a.data.reservations.length < 2) {
        fail(`${prefix}.data.reservations must have at least 2 entries`);
      }
      if (!Array.isArray(a.data.checklist) || a.data.checklist.length < 6) {
        fail(`${prefix}.data.checklist must have at least 6 items`);
      }
    }

    if (a.type === 'restaurant') {
      const dish = a.data.dishOfDay;
      if (!dish || !dish.name || !dish.ingredients || !dish.cookingMethod || !dish.flavourTexture) {
        fail(`${prefix}.data.dishOfDay must have name, ingredients, cookingMethod, flavourTexture`);
      }
    }

    if (a.type === 'hotel_presentation') {
      if (!Array.isArray(a.data.guestQuestions) || a.data.guestQuestions.length < 3) {
        fail(`${prefix}.data.guestQuestions must have at least 3 questions`);
      }
      const room = a.data.featuredRoom;
      if (!room || !room.type || !Array.isArray(room.furniture) || !room.bathroomFeature) {
        fail(`${prefix}.data.featuredRoom must have type, furniture[], bathroomFeature`);
      }
      if (typeof a.data.shuttlePriceEuros !== 'number') {
        fail(`${prefix}.data.shuttlePriceEuros must be a number`);
      }
    }

    ok(`${prefix} (type="${a.type}") validated`);
  });
}

// ── Vocab deck validation ─────────────────────────────────────────────────────

const VALID_DEPARTMENTS = ['front_office', 'fnb', 'housekeeping', 'concierge', 'events', 'management'];
const REQUIRED_CARD_FIELDS = ['id', 'termEs', 'termEn', 'exampleSentence', 'department', 'isFree'];

function validateVocabDeck(filePath: string) {
  const name = path.basename(filePath);
  console.log(`\nVocab: ${name}`);

  let cards: any[];
  try {
    cards = readJson(filePath) as any[];
  } catch (e) {
    fail(`invalid JSON: ${e}`);
    return;
  }

  if (!Array.isArray(cards)) {
    fail('vocab file must be a JSON array');
    return;
  }

  if (cards.length < 30) warn(`only ${cards.length} cards — aim for 40`);
  else ok(`${cards.length} cards`);

  const ids = new Set<string>();
  cards.forEach((card: any, i: number) => {
    for (const field of REQUIRED_CARD_FIELDS) {
      if (!(field in card)) {
        fail(`card[${i}] missing required field ".${field}"`);
      }
    }

    if (ids.has(card.id)) {
      fail(`duplicate card id "${card.id}"`);
    } else {
      ids.add(card.id);
    }

    if (card.department && !VALID_DEPARTMENTS.includes(card.department)) {
      fail(`card[${i}] has invalid department "${card.department}"`);
    }

    if (typeof card.isFree !== 'boolean') {
      fail(`card[${i}] .isFree must be boolean`);
    }
  });

  if (errors === 0) ok('all cards valid');
}

// ── Main ─────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const MOCKS_DIR = path.join(ROOT, 'content', 'mocks');
const VOCAB_DIR = path.join(ROOT, 'content', 'vocab');

console.log('\n=== Validating mock exam JSON files ===');

// Expected: basic-1..basic-10, int-1..int-10
const expectedMocks: string[] = [];
for (let i = 1; i <= 10; i++) expectedMocks.push(`basic-${i}.json`);
for (let i = 1; i <= 10; i++) expectedMocks.push(`int-${i}.json`);

const mockFiles = fs.readdirSync(MOCKS_DIR).filter(f => f.endsWith('.json'));
for (const expected of expectedMocks) {
  if (!mockFiles.includes(expected)) {
    console.log(`\nMock: ${expected}`);
    fail(`file not found: ${path.join(MOCKS_DIR, expected)}`);
  }
}

for (const file of mockFiles.sort()) {
  validateMock(path.join(MOCKS_DIR, file));
}

console.log('\n=== Validating vocab deck JSON files ===');

const expectedVocab = [
  'front-office-basics.json',
  'personal-presentation-routines.json',
  'checkin-hotel-info.json',
  'restaurant-service-steps.json',
  'food-drink-cooking.json',
  'describing-selling-hotel.json',
  'complaints-apologies.json',
  'polite-refusals.json',
  'job-interview-placement.json',
  'numbers-prices-times.json',
];

const vocabFiles = fs.readdirSync(VOCAB_DIR).filter(f => f.endsWith('.json'));
for (const expected of expectedVocab) {
  if (!vocabFiles.includes(expected)) {
    console.log(`\nVocab: ${expected}`);
    fail(`file not found`);
  }
}

for (const file of vocabFiles.sort()) {
  validateVocabDeck(path.join(VOCAB_DIR, file));
}

// ── Summary ────────────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(50));
console.log(`Result: ${errors} error(s), ${warnings} warning(s)`);

if (errors > 0) {
  console.error(`\n✗ Content validation FAILED (${errors} errors)`);
  process.exit(1);
} else {
  console.log(`\n✓ Content validation PASSED`);
  process.exit(0);
}
