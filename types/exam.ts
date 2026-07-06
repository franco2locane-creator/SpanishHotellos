import type { ExamFormat, RubricScore, RubricWeights } from './shared';

// A configured exam shell — the template before the student starts.
export type MockExam = {
  id: string;
  scenarioId: string;
  format: ExamFormat;
  durationMinutes: number;
  rubricWeights: RubricWeights;
};

// A completed exam — persisted to Supabase after grading.
export type ExamAttempt = {
  id: string;
  userId: string;
  scenarioId: string;
  format: ExamFormat;
  durationSeconds: number;
  scores: RubricScore;       // 0–20 per criterion
  totalScore: number;        // weighted average 0–20, rounded to 1 dp
  transcript: string;        // full STT transcript of student's speech
  feedback: string;          // AI-generated English feedback from Edge Function
  completedAt: string;       // ISO datetime string
};
