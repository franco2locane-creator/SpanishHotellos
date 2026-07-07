import { create } from 'zustand';
import type { MockExamData } from '@/types';
import type { GradeResult } from '@/lib/api/grade';

export type AssignmentResult = {
  assignmentType: string;
  score: number;        // 0–20
  gradeResult: GradeResult;
};

type MockExamState = {
  exam: MockExamData | null;
  currentIdx: number;
  keywordNotes: string[];        // one per assignment slot
  results: (AssignmentResult | null)[];
  sessionStartMs: number;

  startExam: (exam: MockExamData) => void;
  saveKeywords: (idx: number, keywords: string) => void;
  saveResult: (idx: number, result: AssignmentResult) => void;
  advance: () => void;
  reset: () => void;
};

export const useMockExamStore = create<MockExamState>((set, get) => ({
  exam: null,
  currentIdx: 0,
  keywordNotes: [],
  results: [],
  sessionStartMs: 0,

  startExam: (exam) =>
    set({
      exam,
      currentIdx: 0,
      keywordNotes: Array(exam.assignments.length).fill(''),
      results: Array(exam.assignments.length).fill(null),
      sessionStartMs: Date.now(),
    }),

  saveKeywords: (idx, keywords) =>
    set((s) => {
      const next = [...s.keywordNotes];
      next[idx] = keywords;
      return { keywordNotes: next };
    }),

  saveResult: (idx, result) =>
    set((s) => {
      const next = [...s.results];
      next[idx] = result;
      return { results: next };
    }),

  advance: () => set((s) => ({ currentIdx: s.currentIdx + 1 })),

  reset: () =>
    set({ exam: null, currentIdx: 0, keywordNotes: [], results: [], sessionStartMs: 0 }),
}));
