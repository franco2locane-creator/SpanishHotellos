import { create } from 'zustand';
import type { GradeResult } from '@/lib/api/grade';

type FeedbackStore = {
  result: GradeResult | null;
  passMark: number | null;   // null = practice (no pass/fail badge); set for mock exams
  isNewBest: boolean;        // practice scenarios only — mocks are excluded from replay incentive
  setResult: (r: GradeResult, passMark?: number, isNewBest?: boolean) => void;
  clear: () => void;
};

export const useFeedbackStore = create<FeedbackStore>((set) => ({
  result: null,
  passMark: null,
  isNewBest: false,
  setResult: (result, passMark, isNewBest) => set({ result, passMark: passMark ?? null, isNewBest: isNewBest ?? false }),
  clear: () => set({ result: null, passMark: null, isNewBest: false }),
}));
