import { useRouter } from 'expo-router';
import { useFeedbackStore } from '@/stores/feedbackStore';
import { getLastScenarioAttempt } from '@/lib/scenarioBest';

/**
 * Fetches the most recent saved feedback for a scenario and navigates to the
 * existing /feedback/[attemptId] screen — shared by practice.tsx's
 * "Last feedback" link and Progress's scenario activity list, so the two
 * surfaces never fork this logic.
 */
export function useViewScenarioFeedback() {
  const router = useRouter();
  const { setResult } = useFeedbackStore();

  return async function viewLastFeedback(userId: string, scenarioId: string): Promise<void> {
    const result = await getLastScenarioAttempt(userId, scenarioId);
    if (!result) return;
    setResult(result, undefined, false);
    router.push(`/feedback/${result.attemptId}` as any);
  };
}
