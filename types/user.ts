import type { ExamFormat } from './shared';

export type PlacementLevel = 'A2' | 'B1' | 'B2' | 'C1';

export type UserProfile = {
  id: string;                  // matches Supabase auth.users id
  school?: string;
  examFormat: ExamFormat;
  examDate?: string;           // ISO date string (YYYY-MM-DD)
  placementLevel: PlacementLevel;
  isPremium: boolean;
};

export type WeeklyMilestone = {
  weekNumber: number;
  targetScenarioIds: string[];
  targetVocabDeckIds: string[];
  description: string;
};

export type StudyPlan = {
  id: string;
  userId: string;
  examDate: string;            // ISO date string
  minutesPerDay: number;
  weeklyMilestones: WeeklyMilestone[];
  createdAt: string;
};
