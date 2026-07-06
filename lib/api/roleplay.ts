import { supabase } from '@/lib/supabase';
import type { Scenario, ExamAttempt } from '@/types';

// ── Shared types ──────────────────────────────────────────────────────────────

export type WireMessage = { role: 'user' | 'assistant'; content: string };

// ── roleplay — single conversation turn ───────────────────────────────────────

type RolePlayTurnArgs = {
  scenario: Scenario;
  messages: WireMessage[];
};

export type RolePlayTurnResult = {
  guestReply: string;
  objectivesCompleted: string[];
  sessionShouldEnd: boolean;
};

export async function sendRolePlayTurn(
  args: RolePlayTurnArgs,
): Promise<RolePlayTurnResult> {
  const { data, error } = await supabase.functions.invoke<RolePlayTurnResult>(
    'roleplay',
    {
      body: {
        scenario: {
          id:            args.scenario.id,
          title:         args.scenario.title,
          isFree:        args.scenario.isFree,
          difficulty:    args.scenario.difficulty,
          guestPersona:  args.scenario.guestPersona,
          objectives:    args.scenario.objectives,
          systemContext: args.scenario.systemContext,
          openingLine:   args.scenario.openingLine,
          rubricWeights: args.scenario.rubricWeights,
        },
        messages: args.messages,
      },
    },
  );

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Empty response from roleplay function');
  return data;
}

// ── grade — grade full transcript and persist ExamAttempt ─────────────────────

type GradeAttemptArgs = {
  scenario: Pick<Scenario, 'id' | 'title' | 'objectives' | 'rubricWeights' | 'examFormats'>;
  format: Scenario['examFormats'][number];
  messages: WireMessage[];
  durationSeconds: number;
};

type GradeAttemptResult = {
  attempt: Pick<ExamAttempt, 'id' | 'scores' | 'totalScore' | 'feedback' | 'completedAt'> & {
    strongPoints: string[];
    improvementAreas: string[];
  };
};

export async function gradeAttempt(
  args: GradeAttemptArgs,
): Promise<GradeAttemptResult> {
  const { data, error } = await supabase.functions.invoke<GradeAttemptResult>(
    'grade',
    {
      body: {
        scenario: {
          id:            args.scenario.id,
          title:         args.scenario.title,
          objectives:    args.scenario.objectives,
          rubricWeights: args.scenario.rubricWeights,
          format:        args.format,
        },
        messages:        args.messages,
        durationSeconds: args.durationSeconds,
      },
    },
  );

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Empty response from grade function');
  return data;
}
