import type { Department, CourseLevel } from './shared';

// SM-2 spaced-repetition data stored per card per user.
export type SrsData = {
  interval: number;      // days until next review
  easeFactor: number;    // SM-2 E-factor, initialised to 2.5
  dueDate: string;       // ISO date string (YYYY-MM-DD)
  repetitions: number;   // count of consecutive successful reviews
};

export type VocabCard = {
  id: string;
  termEs: string;
  termEsLatam?: string;    // Latin American variant when vocabulary genuinely differs
  termEn: string;
  exampleSentence: string; // full sentence in Spanish
  audioHint?: string;      // IPA or pronunciation note for tricky words
  department: Department;
  isFree: boolean;
  /** Every card in a deck shares its deck's level — kept per-card so content
   *  JSON stays self-describing without a wrapper object. */
  courseLevel: CourseLevel | 'both';
  srsData?: SrsData;       // undefined = card not yet introduced to this user
};

export type VocabDeck = {
  id: string;
  title: string;
  description: string;
  department: Department;
  isFree: boolean;
  courseLevel: CourseLevel | 'both';
  cards: VocabCard[];
};
