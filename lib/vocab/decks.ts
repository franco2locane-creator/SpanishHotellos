import type { Department, VocabCard, VocabDeck } from '@/types';

// ── Deck catalogue ────────────────────────────────────────────────────────────

export type DeckMeta = {
  id: string;
  title: string;
  department: Department;
  isFree: boolean;
  /** Approximate card count shown before content loads. */
  cardCount: number;
};

export const DECK_CATALOG: DeckMeta[] = [
  { id: 'front-office-basics', title: 'Front Office Basics', department: 'front_office', isFree: true, cardCount: 40 },
  { id: 'fnb-essentials',      title: 'Food & Beverage',     department: 'fnb',          isFree: false, cardCount: 35 },
  { id: 'housekeeping',        title: 'Housekeeping',         department: 'housekeeping', isFree: false, cardCount: 30 },
  { id: 'concierge',           title: 'Concierge & Guests',  department: 'concierge',    isFree: false, cardCount: 28 },
  { id: 'events',              title: 'Events & Banquets',   department: 'events',       isFree: false, cardCount: 25 },
  { id: 'management',          title: 'Hotel Management',    department: 'management',   isFree: false, cardCount: 25 },
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
  'front-office-basics': () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    (require('@/content/vocab/front-office-basics.json') as VocabCard[]),
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

// ── Cloze helper (used on flashcard front) ────────────────────────────────────

/** Replace first occurrence of termEs in the example sentence with ____. */
export function buildCloze(sentence: string, termEs: string): string {
  const escaped = termEs.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return sentence.replace(new RegExp(escaped, 'i'), '____');
}
