import { create } from 'zustand';
import { toggleTile } from '@/lib/today';
import { GUIDED_STEP_ORDER } from '@/lib/guidedSession';

export { GUIDED_STEP_ORDER, guidedNextRoute } from '@/lib/guidedSession';
export type { GuidedStepId, GuidedNextRoute } from '@/lib/guidedSession';

export type GuidedStepParams = {
  deckId: string;
  scenarioId: string;
  drillType: string;
};

type GuidedSessionState = {
  active: boolean;
  currentIndex: number;
  params: GuidedStepParams;

  start: (params: GuidedStepParams) => void;
  /** Marks the current step done (via the existing toggleTile) and moves on. */
  advance: () => Promise<void>;
  /** Moves on WITHOUT marking the step done — a skipped step never counts toward day-complete. */
  skip: () => void;
  reset: () => void;
};

const EMPTY_PARAMS: GuidedStepParams = { deckId: '', scenarioId: '', drillType: '' };

export const useGuidedSessionStore = create<GuidedSessionState>((set, get) => ({
  active: false,
  currentIndex: 0,
  params: EMPTY_PARAMS,

  start: (params) => set({ active: true, currentIndex: 0, params }),

  advance: async () => {
    const { currentIndex } = get();
    const stepId = GUIDED_STEP_ORDER[currentIndex];
    if (stepId) await toggleTile(stepId);
    set({ currentIndex: currentIndex + 1 });
  },

  skip: () => set(s => ({ currentIndex: s.currentIndex + 1 })),

  reset: () => set({ active: false, currentIndex: 0, params: EMPTY_PARAMS }),
}));
