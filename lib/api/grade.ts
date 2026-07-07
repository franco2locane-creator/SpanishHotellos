import { supabase } from '@/lib/supabase';
import type { Scenario, ExamFormat, ScenarioObjective, AssignmentType } from '@/types';
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

// ── Mock exam grading (simplified args) ───────────────────────────────────────

const DEFAULT_WEIGHTS = { fluency: 0.2, vocabulary: 0.2, grammar: 0.2, taskCompletion: 0.2, register: 0.2 };

type AttemptPayload = {
  id: string; totalScore: number; completedAt: string;
  numericScores: GradeResult['numericScores'];
  detail: GradeDetail; topThingsFix: FixItem[]; feedback: string;
};

export async function gradeExamSession(args: {
  title: string;
  objectives: ScenarioObjective[];
  format: ExamFormat;
  messages: WireMessage[];
  durationSeconds: number;
}): Promise<GradeResult> {
  const { data, error } = await supabase.functions.invoke<{ attempt: AttemptPayload }>('grade', {
    body: {
      scenario: {
        id: `mock-${args.format}`,
        title: args.title,
        objectives: args.objectives,
        rubricWeights: DEFAULT_WEIGHTS,
        format: args.format,
      },
      messages: args.messages,
      durationSeconds: args.durationSeconds,
    },
  });

  if (error) throw new Error(error.message ?? 'Grade function error');

  const a = data!.attempt;
  return {
    attemptId: a.id, totalScore: a.totalScore, completedAt: a.completedAt,
    numericScores: a.numericScores, detail: a.detail,
    topThingsFix: a.topThingsFix, feedback: a.feedback,
  };
}

// ── Mock assignment grading ───────────────────────────────────────────────────

export async function gradeMockAssignment(args: {
  assignmentType: AssignmentType;
  mockId: string;
  assignmentIdx: number;
  objectives: ScenarioObjective[];
  messages: WireMessage[];
  durationSeconds: number;
}): Promise<GradeResult> {
  const { data, error } = await supabase.functions.invoke<{ attempt: AttemptPayload }>('grade', {
    body: {
      scenario: {
        id: `mock-${args.mockId}-${args.assignmentType}-${args.assignmentIdx}`,
        title: args.assignmentType,
        objectives: args.objectives,
        rubricWeights: DEFAULT_WEIGHTS,
        format: 'roleplay',
      },
      messages: args.messages,
      durationSeconds: args.durationSeconds,
      allowTu: args.assignmentType === 'personal_presentation',
    },
  });

  if (error) throw new Error(error.message ?? 'Grade function error');

  const a = data!.attempt;
  return {
    attemptId: a.id, totalScore: a.totalScore, completedAt: a.completedAt,
    numericScores: a.numericScores, detail: a.detail,
    topThingsFix: a.topThingsFix, feedback: a.feedback,
  };
}
