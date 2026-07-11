// Pure guided-daily-session step logic, deliberately dependency-free (no
// Supabase/AsyncStorage/zustand imports) so it can be tested directly —
// stores/guidedSessionStore.ts wraps this with actual state + toggleTile().

export type GuidedStepId = 'vocab' | 'scenario' | 'drill';
export const GUIDED_STEP_ORDER: GuidedStepId[] = ['vocab', 'scenario', 'drill'];

export type GuidedNextRoute =
  | { screen: 'transition'; next: GuidedStepId }
  | { screen: 'complete' };

/** Where the guided flow should go next, given the current step index. */
export function guidedNextRoute(currentIndex: number): GuidedNextRoute {
  if (currentIndex >= GUIDED_STEP_ORDER.length) return { screen: 'complete' };
  return { screen: 'transition', next: GUIDED_STEP_ORDER[currentIndex] };
}
