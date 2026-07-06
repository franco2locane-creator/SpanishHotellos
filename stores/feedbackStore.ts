import { create } from 'zustand';
import type { GradeResult } from '@/lib/api/grade';

type FeedbackStore = {
  result: GradeResult | null;
  passMark: number | null;   // null = practice (no pass/fail badge); set for mock exams
  setResult: (r: GradeResult, passMark?: number) => void;
  clear: () => void;
};

export const useFeedbackStore = create<FeedbackStore>((set) => ({
  result: null,
  passMark: null,
  setResult: (result, passMark) => set({ result, passMark: passMark ?? null }),
  clear: () => set({ result: null, passMark: null }),
}));
