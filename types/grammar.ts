import type { CourseLevel } from './shared';

export type GrammarTopic =
  | 'presente_regular'
  | 'presente_irregular'
  | 'imperativo_usted'
  | 'preterito_vs_indefinido'
  | 'ser_estar'
  | 'hay'
  | 'reflexivos'
  | 'gustar';

export type GrammarQuestion = {
  id: string;
  /** Spanish sentence with the target verb blanked out, e.g. "Yo ___ (hablar) español." */
  prompt: string;
  /** Accepted answer, lowercase, no accents required on the student's typed input. */
  answer: string;
  hint: string;
};

export type GrammarDrillSet = {
  id: string;
  title: string;
  titleEs: string;
  topic: GrammarTopic;
  courseLevel: CourseLevel | 'both';
  isFree: boolean;
  questions: GrammarQuestion[];
};
