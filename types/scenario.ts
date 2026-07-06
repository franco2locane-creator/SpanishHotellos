import type { Department, ExamFormat, RubricWeights } from './shared';

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
};

export type Scenario = {
  id: string;
  title: string;
  titleEs: string;
  department: Department;
  difficulty: Difficulty;
  examFormats: ExamFormat[];
  guestPersona: GuestPersona;
  /** What the student must accomplish to achieve full task completion marks. */
  objectives: string[];
  /** The AI guest's opening utterance in Spanish — sets register and context. */
  openingLine: string;
  rubricWeights: RubricWeights;
  isFree: boolean;
  durationMinutes: number;
};
