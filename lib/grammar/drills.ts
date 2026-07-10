import type { CourseLevel, GrammarDrillSet } from '@/types';

// ── Catalogue metadata ──────────────────────────────────────────────────────

export type DrillMeta = {
  id: string;
  title: string;
  titleEs: string;
  courseLevel: CourseLevel | 'both';
  isFree: boolean;
  questionCount: number;
};

export const DRILL_CATALOG: DrillMeta[] = [
  { id: 'presente-regular',        title: 'Present Tense — Regular Verbs',    titleEs: 'Presente — verbos regulares',    courseLevel: 'both',         isFree: true,  questionCount: 10 },
  { id: 'presente-irregular',      title: 'Present Tense — Irregular Verbs',  titleEs: 'Presente — verbos irregulares',  courseLevel: 'both',         isFree: false, questionCount: 10 },
  { id: 'imperativo-usted',        title: 'Formal Commands — Usted/Ustedes',  titleEs: 'Imperativo — usted/ustedes',     courseLevel: 'both',         isFree: false, questionCount: 10 },
  { id: 'preterito-vs-indefinido', title: 'Present Perfect vs. Simple Past',  titleEs: 'Pretérito perfecto vs. indefinido', courseLevel: 'intermediate', isFree: false, questionCount: 10 },
  { id: 'ser-estar',               title: 'Ser vs. Estar',                    titleEs: 'Ser vs. estar',                  courseLevel: 'both',         isFree: false, questionCount: 10 },
  { id: 'hay',                     title: 'Hay / Haber',                      titleEs: 'Hay',                            courseLevel: 'both',         isFree: false, questionCount: 10 },
  { id: 'reflexivos',              title: 'Reflexive Verbs',                  titleEs: 'Verbos reflexivos',              courseLevel: 'both',         isFree: false, questionCount: 10 },
  { id: 'gustar',                  title: 'Gustar-Type Verbs',                titleEs: 'Verbos como gustar',             courseLevel: 'both',         isFree: false, questionCount: 10 },
];

// ── Loader ────────────────────────────────────────────────────────────────────

const DRILL_MODULES: Record<string, () => GrammarDrillSet> = {
  'presente-regular':        () => require('@/content/grammar/presente-regular.json'),
  'presente-irregular':      () => require('@/content/grammar/presente-irregular.json'),
  'imperativo-usted':        () => require('@/content/grammar/imperativo-usted.json'),
  'preterito-vs-indefinido': () => require('@/content/grammar/preterito-vs-indefinido.json'),
  'ser-estar':                () => require('@/content/grammar/ser-estar.json'),
  'hay':                      () => require('@/content/grammar/hay.json'),
  'reflexivos':                () => require('@/content/grammar/reflexivos.json'),
  'gustar':                    () => require('@/content/grammar/gustar.json'),
};

export function loadDrillSet(id: string): GrammarDrillSet | null {
  return DRILL_MODULES[id]?.() ?? null;
}

/** Drill sets visible to a given course level — 'both' sets always included. */
export function drillsForLevel(level: CourseLevel): DrillMeta[] {
  return DRILL_CATALOG.filter(d => d.courseLevel === 'both' || d.courseLevel === level);
}
