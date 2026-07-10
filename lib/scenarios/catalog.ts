import type { CourseLevel, Department, Scenario } from '@/types';

// ── Catalogue metadata (no card content loaded until needed) ──────────────────

export type ScenarioMeta = {
  id: string;
  title: string;
  titleEs: string;
  description: string;
  department: Department;
  difficulty: 1 | 2 | 3;
  isFree: boolean;
  personaPreview: string;
  durationMinutes: number;
  courseLevels: CourseLevel[];
};

export const SCENARIO_CATALOG: ScenarioMeta[] = [
  {
    id: 'noisy-room-complaint',
    title: 'Noisy Room Complaint',
    titleEs: 'Queja por ruido',
    description: 'A tired guest has been kept awake by noise and demands a solution.',
    department: 'front_office',
    difficulty: 1,
    isFree: true,
    personaPreview: 'Mr. Anderson · British · frustrated',
    durationMinutes: 5,
    courseLevels: ['basic', 'intermediate'],
  },
  {
    id: 'restaurant-allergy-order',
    title: 'Restaurant Allergy Order',
    titleEs: 'Pedido con alergia',
    description: 'A guest with a nut allergy needs safe menu guidance before ordering.',
    department: 'fnb',
    difficulty: 2,
    isFree: true,
    personaPreview: 'Madame Dupont · French · composed',
    durationMinutes: 6,
    courseLevels: ['basic', 'intermediate'],
  },
  {
    id: 'overbooking',
    title: 'Overbooking Crisis',
    titleEs: 'Crisis de overbooking',
    description: 'The hotel is overbooked and the guest\'s reserved room is unavailable.',
    department: 'front_office',
    difficulty: 2,
    isFree: false,
    personaPreview: 'Don Ramírez · Mexican · demanding',
    durationMinutes: 7,
    courseLevels: ['intermediate'],
  },
  {
    id: 'lost-luggage',
    title: 'Lost Luggage',
    titleEs: 'Equipaje perdido',
    description: 'A distressed guest arrives after a long flight with no suitcases.',
    department: 'concierge',
    difficulty: 3,
    isFree: false,
    personaPreview: 'Ms. Kim · Korean · distressed',
    durationMinutes: 8,
    courseLevels: ['intermediate'],
  },
];

/** Scenarios visible to a given course level. */
export function scenariosForLevel(level: CourseLevel): ScenarioMeta[] {
  return SCENARIO_CATALOG.filter(s => s.courseLevels.includes(level));
}

// ── Loader ────────────────────────────────────────────────────────────────────

const SCENARIO_MODULES: Record<string, () => Scenario> = {
  'noisy-room-complaint':    () => require('@/content/scenarios/noisy-room-complaint.json') as Scenario,
  'restaurant-allergy-order': () => require('@/content/scenarios/restaurant-allergy-order.json') as Scenario,
  'overbooking':             () => require('@/content/scenarios/overbooking.json') as Scenario,
  'lost-luggage':            () => require('@/content/scenarios/lost-luggage.json') as Scenario,
};

export function loadScenario(id: string): Scenario | null {
  return SCENARIO_MODULES[id]?.() ?? null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export const DEPT_LABELS: Partial<Record<Department, string>> = {
  front_office: 'Front Office',
  fnb:          'Food & Beverage',
  concierge:    'Concierge',
  housekeeping: 'Housekeeping',
  events:       'Events',
  management:   'Management',
};

export const MOOD_ICONS: Record<string, string> = {
  friendly:   '😊',
  neutral:    '😐',
  frustrated: '😤',
  demanding:  '🧐',
  confused:   '😟',
};
