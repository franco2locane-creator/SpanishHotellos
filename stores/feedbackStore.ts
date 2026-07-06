import { create } from 'zustand';
import type { GradeResult } from '@/lib/api/grade';

type FeedbackStore = {
  result: GradeResult | null;
  setResult: (r: GradeResult) => void;
  clear: () => void;
};

export const useFeedbackStore = create<FeedbackStore>((set) => ({
  result: null,
  setResult: (result) => set({ result }),
  clear: () => set({ result: null }),
}));
