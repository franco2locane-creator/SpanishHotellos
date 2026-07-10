import type { CourseLevel, Department, VocabCard, VocabDeck } from '@/types';

// ── Deck catalogue ────────────────────────────────────────────────────────────
//
// Every deck here corresponds 1:1 to a real content/vocab/*.json file — see
// scripts/validate-content.ts's `expectedVocab` list, which is the source of
// truth this catalogue must stay in sync with.

export type DeckMeta = {
  id: string;
  title: string;
  department: Department;
  isFree: boolean;
  courseLevel: CourseLevel | 'both';
  /** Approximate card count shown before content loads. */
  cardCount: number;
};

export const DECK_CATALOG: DeckMeta[] = [
  { id: 'front-office-basics',           title: 'Front Office Basics',       department: 'front_office', isFree: true,  courseLevel: 'both',         cardCount: 40 },
  { id: 'personal-presentation-routines', title: 'Personal Presentation',     department: 'management',  isFree: false, courseLevel: 'both',         cardCount: 40 },
  { id: 'checkin-hotel-info',            title: 'Check-In & Hotel Info',     department: 'front_office', isFree: false, courseLevel: 'both',         cardCount: 40 },
  { id: 'numbers-prices-times',          title: 'Numbers, Prices & Times',   department: 'front_office', isFree: false, courseLevel: 'both',         cardCount: 40 },
  { id: 'restaurant-service-steps',      title: 'Restaurant Service',        department: 'fnb',         isFree: false, courseLevel: 'intermediate', cardCount: 40 },
  { id: 'describing-selling-hotel',      title: 'Describing & Selling the Hotel', department: 'management', isFree: false, courseLevel: 'intermediate', cardCount: 40 },
  { id: 'complaints-apologies',          title: 'Complaints & Apologies',    department: 'front_office', isFree: false, courseLevel: 'intermediate', cardCount: 40 },
  { id: 'polite-refusals',               title: 'Polite Refusals',           department: 'front_office', isFree: false, courseLevel: 'intermediate', cardCount: 40 },
  { id: 'job-interview-placement',       title: 'Job Interview & Placement', department: 'management',  isFree: false, courseLevel: 'intermediate', cardCount: 40 },
  { id: 'food-drink-cooking',            title: 'Food, Drink & Cooking',     department: 'fnb',         isFree: false, courseLevel: 'intermediate', cardCount: 40 },
];

export const DEPARTMENT_LABELS: Record<Department, string> = {
  front_office: 'Front Office',
  fnb:          'Food & Beverage',
  housekeeping: 'Housekeeping',
  concierge:    'Concierge',
  events:       'Events',
  management:   'Management',
};

// ── Loader ────────────────────────────────────────────────────────────────────

const DECK_MODULES: Record<string, () => VocabCard[]> = {
  'front-office-basics':            () => require('@/content/vocab/front-office-basics.json') as VocabCard[],
  'personal-presentation-routines': () => require('@/content/vocab/personal-presentation-routines.json') as VocabCard[],
  'checkin-hotel-info':             () => require('@/content/vocab/checkin-hotel-info.json') as VocabCard[],
  'numbers-prices-times':           () => require('@/content/vocab/numbers-prices-times.json') as VocabCard[],
  'restaurant-service-steps':       () => require('@/content/vocab/restaurant-service-steps.json') as VocabCard[],
  'describing-selling-hotel':       () => require('@/content/vocab/describing-selling-hotel.json') as VocabCard[],
  'complaints-apologies':           () => require('@/content/vocab/complaints-apologies.json') as VocabCard[],
  'polite-refusals':                () => require('@/content/vocab/polite-refusals.json') as VocabCard[],
  'job-interview-placement':        () => require('@/content/vocab/job-interview-placement.json') as VocabCard[],
  'food-drink-cooking':             () => require('@/content/vocab/food-drink-cooking.json') as VocabCard[],
};

/** Load card definitions for a deck. Returns [] for non-existent/locked decks. */
export function loadDeckCards(deckId: string): VocabCard[] {
  return DECK_MODULES[deckId]?.() ?? [];
}

export function loadDeck(deckId: string): VocabDeck | null {
  const meta = DECK_CATALOG.find(d => d.id === deckId);
  if (!meta) return null;
  const cards = loadDeckCards(deckId);
  return { ...meta, cards, description: `${cards.length} essential hotel terms` };
}

/** Decks visible to a given course level — 'both' decks always included. */
export function decksForLevel(level: CourseLevel): DeckMeta[] {
  return DECK_CATALOG.filter(d => d.courseLevel === 'both' || d.courseLevel === level);
}

// ── Cloze helper (used on flashcard front) ────────────────────────────────────

/** Replace first occurrence of termEs in the example sentence with ____. */
export function buildCloze(sentence: string, termEs: string): string {
  const escaped = termEs.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return sentence.replace(new RegExp(escaped, 'i'), '____');
}
