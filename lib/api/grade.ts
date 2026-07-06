import { supabase } from '@/lib/supabase';
import type { Scenario } from '@/types';
import type { WireMessage } from './roleplay';

// ── Types returned by the grade Edge Function ─────────────────────────────────

export type CriterionDetail = {
  score: number;
  examples: string[];
  note: string;
};

export type RegisterDetail = CriterionDetail & { tuForms: string[] };

export type GradeDetail = {
  fluency: CriterionDetail;
  vocabulary: CriterionDetail;
  grammar: CriterionDetail;
  taskCompletion: CriterionDetail;
  register: RegisterDetail;
};

export type FixItem = {
  label: string;
  drillType: 'register' | 'vocabulary' | 'grammar' | 'fluency' | 'taskCompletion';
};

export type GradeResult = {
  attemptId: string;
  totalScore: number;       // 0–20 weighted average; display as ×5 out of 100
  completedAt: string;
  numericScores: { fluency: number; vocabulary: number; grammar: number; taskCompletion: number; register: number };
  detail: GradeDetail;
  topThingsFix: FixItem[];
  feedback: string;
};

// ── Client ────────────────────────────────────────────────────────────────────

export async function gradeSession(args: {
  scenario: Scenario;
  messages: WireMessage[];
  durationSeconds: number;
}): Promise<GradeResult> {
  const { data, error } = await supabase.functions.invoke<{ attempt: {
    id: string;
    totalScore: number;
    completedAt: string;
    numericScores: GradeResult['numericScores'];
    detail: GradeDetail;
    topThingsFix: FixItem[];
    feedback: string;
  } }>('grade', {
    body: {
      scenario: {
        id:            args.scenario.id,
        title:         args.scenario.title,
        objectives:    args.scenario.objectives,
        rubricWeights: args.scenario.rubricWeights,
        format:        'roleplay',
      },
      messages: args.messages,
      durationSeconds: args.durationSeconds,
    },
  });

  if (error) throw new Error(error.message ?? 'Grade function error');

  const a = data!.attempt;
  return {
    attemptId:    a.id,
    totalScore:   a.totalScore,
    completedAt:  a.completedAt,
    numericScores: a.numericScores,
    detail:       a.detail,
    topThingsFix: a.topThingsFix,
    feedback:     a.feedback,
  };
}
