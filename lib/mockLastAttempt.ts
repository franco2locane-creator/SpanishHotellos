import { supabase } from '@/lib/supabase';

export type MockAssignmentResult = {
  assignmentType: string;
  score: number | null;
  gatePassed: boolean | null;
  examAttemptId: string | null;
};

export type MockAttemptSummary = {
  combinedScore: number;
  passed: boolean;
  gatePassed: boolean;
  completedAt: string;
  assignmentResults: MockAssignmentResult[];
};

/** Most recent completed attempt for this mock — powers the mock-exam list's "Last attempt" link. */
export async function getLastMockAttempt(userId: string, mockId: string): Promise<MockAttemptSummary | null> {
  const { data } = await supabase
    .from('mock_attempts')
    .select('combined_score, passed, gate_passed, completed_at, assignment_results')
    .eq('user_id', userId)
    .eq('mock_id', mockId)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    combinedScore: data.combined_score,
    passed: data.passed,
    gatePassed: data.gate_passed,
    completedAt: data.completed_at,
    assignmentResults: data.assignment_results ?? [],
  };
}

export type AssignmentFullFeedback = {
  detail: Record<string, { score: number; examples: string[]; note: string }>;
  topThingsFix: { label: string; drillType: string }[];
  feedback: string;
};

/** Fetches the saved full breakdown for one assignment's linked exam_attempts row. */
export async function getAssignmentFullFeedback(examAttemptId: string): Promise<AssignmentFullFeedback | null> {
  const { data } = await supabase
    .from('exam_attempts')
    .select('full_feedback')
    .eq('id', examAttemptId)
    .maybeSingle();
  return (data?.full_feedback as AssignmentFullFeedback) ?? null;
}
