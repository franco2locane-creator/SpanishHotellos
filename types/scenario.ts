import type { Department, ExamFormat, RubricWeights, CourseLevel } from './shared';

export type Difficulty = 1 | 2 | 3;

export type GuestMood =
  | 'friendly'
  | 'neutral'
  | 'frustrated'
  | 'demanding'
  | 'confused';

export type SpeakingSpeed = 'slow' | 'normal' | 'fast';

export type GuestPersona = {
  name: string;
  nationality: string;
  mood: GuestMood;
  speakingSpeed: SpeakingSpeed;
  /** Short description shown in the scenario picker card. */
  description: string;
};

/** A trackable objective with a stable ID used by the edge function. */
export type ScenarioObjective = {
  id: string;
  label: string;
};

export type Scenario = {
  id: string;
  title: string;
  titleEs: string;
  description: string;
  department: Department;
  difficulty: Difficulty;
  examFormats: ExamFormat[];
  guestPersona: GuestPersona;
  /** What the student must accomplish. IDs are used by the edge function for tracking. */
  objectives: ScenarioObjective[];
  /** Situation context given to Claude in the system prompt. */
  systemContext: string;
  /** The AI guest's opening utterance in Spanish — sets register and context. */
  openingLine: string;
  rubricWeights: RubricWeights;
  isFree: boolean;
  durationMinutes: number;
  /** Which course levels this scenario is appropriate for. */
  courseLevels: CourseLevel[];
};
