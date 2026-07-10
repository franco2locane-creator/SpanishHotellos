import { supabase } from '@/lib/supabase';
import type { Scenario } from '@/types';
import { toApiCallError, ApiCallError } from './apiError';
import { checkFunctionsVersion } from './functionsVersion';

// ── Shared types ──────────────────────────────────────────────────────────────

export type WireMessage = { role: 'user' | 'assistant'; content: string };

export { ApiCallError };

// ── roleplay — single conversation turn ───────────────────────────────────────

type RolePlayTurnArgs = {
  scenario: Scenario;
  messages: WireMessage[];
};

export type RolePlayTurnResult = {
  guestReply: string;
  objectivesCompleted: string[];
  sessionShouldEnd: boolean;
  _version?: string;
};

export async function sendRolePlayTurn(
  args: RolePlayTurnArgs,
): Promise<RolePlayTurnResult> {
  // messages[0] must be role:'user' — the Edge Function rejects anything else.
  // The opening line lives in the system prompt, not in this array.
  if (__DEV__ && args.messages[0]?.role !== 'user') {
    console.warn('[roleplay] messages[0].role is not "user" — the Edge Function will reject this request.', args.messages);
  }

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

  if (error) throw await toApiCallError(error);
  if (!data) throw new ApiCallError('Empty response from roleplay function', 'server');
  checkFunctionsVersion('roleplay', data._version);
  return data;
}
