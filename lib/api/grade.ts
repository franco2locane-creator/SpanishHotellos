import { supabase } from '@/lib/supabase';
import type { Scenario, ExamFormat, ScenarioObjective, AssignmentType, CourseLevel, HospitalityGateResult } from '@/types';
import type { WireMessage } from './roleplay';

// ── Types returned by the grade Edge Function ─────────────────────────────────

export type CriterionDetail = {
  score: number;
  examples: string[];
  note: string;
};

export type GradeDetail = {
  fluency: CriterionDetail;
  vocabulary: CriterionDetail;
  grammar: CriterionDetail;
  pronunciation: CriterionDetail;
  content: CriterionDetail;
};

export type FixItem = {
  label: string;
  drillType: 'register' | 'vocabulary' | 'grammar' | 'fluency' | 'pronunciation' | 'content';
};

export type GradeResult = {
  attemptId: string;
  totalScore: number;       // 0–20 weighted average; display as ×5 out of 100
  completedAt: string;
  numericScores: { fluency: number; vocabulary: number; grammar: number; pronunciation: number; content: number };
  detail: GradeDetail;
  hospitalityGate: HospitalityGateResult;
  topThingsFix: FixItem[];
  feedback: string;
};

type AttemptPayload = {
  id: string; totalScore: number; completedAt: string;
  numericScores: GradeResult['numericScores'];
  detail: GradeDetail; hospitalityGate: HospitalityGateResult;
  topThingsFix: FixItem[]; feedback: string;
};

function toGradeResult(a: AttemptPayload): GradeResult {
  return {
    attemptId:       a.id,
    totalScore:      a.totalScore,
    completedAt:     a.completedAt,
    numericScores:   a.numericScores,
    detail:          a.detail,
    hospitalityGate: a.hospitalityGate,
    topThingsFix:    a.topThingsFix,
    feedback:        a.feedback,
  };
}

// ── Client ────────────────────────────────────────────────────────────────────

export async function gradeSession(args: {
  scenario: Scenario;
  messages: WireMessage[];
  durationSeconds: number;
  level: CourseLevel;
}): Promise<GradeResult> {
  const { data, error } = await supabase.functions.invoke<{ attempt: AttemptPayload }>('grade', {
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
      level: args.level,
    },
  });

  if (error) throw new Error(error.message ?? 'Grade function error');
  return toGradeResult(data!.attempt);
}

// ── Mock exam grading (simplified args) ───────────────────────────────────────

const DEFAULT_WEIGHTS = { fluency: 0.2, vocabulary: 0.2, grammar: 0.2, pronunciation: 0.2, content: 0.2 };

export async function gradeExamSession(args: {
  title: string;
  objectives: ScenarioObjective[];
  format: ExamFormat;
  messages: WireMessage[];
  durationSeconds: number;
  level: CourseLevel;
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
      level: args.level,
    },
  });

  if (error) throw new Error(error.message ?? 'Grade function error');
  return toGradeResult(data!.attempt);
}

// ── Mock assignment grading ───────────────────────────────────────────────────

export async function gradeMockAssignment(args: {
  assignmentType: AssignmentType;
  mockId: string;
  assignmentIdx: number;
  objectives: ScenarioObjective[];
  messages: WireMessage[];
  durationSeconds: number;
  level: CourseLevel;
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
      level: args.level,
    },
  });

  if (error) throw new Error(error.message ?? 'Grade function error');
  return toGradeResult(data!.attempt);
}
