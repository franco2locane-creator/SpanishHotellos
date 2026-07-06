import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, handleCors, json, err } from '../_shared/cors.ts';
import {
  buildGuestSystemPrompt,
  type GuestPersona,
  type ScenarioObjective,
  type RubricWeights,
} from '../_shared/prompts.ts';

// ── Request / response shapes ─────────────────────────────────────────────────

type WireMessage = { role: 'user' | 'assistant'; content: string };

type RolePlayRequest = {
  scenario: {
    id: string;
    title: string;
    isFree: boolean;
    difficulty: 1 | 2 | 3;
    guestPersona: GuestPersona;
    objectives: ScenarioObjective[];
    systemContext: string;
    openingLine: string;
    rubricWeights: RubricWeights;
  };
  messages: WireMessage[];
};

type GuestResponseInput = {
  guestReply: string;
  objectivesCompleted: string[];
  sessionShouldEnd: boolean;
};

// ── Tool definition for structured output ─────────────────────────────────────

const GUEST_RESPONSE_TOOL: Anthropic.Tool = {
  name: 'guest_response',
  description: 'Respond in character as the hotel guest and track which student objectives are now complete.',
  input_schema: {
    type: 'object' as const,
    properties: {
      guestReply: {
        type: 'string',
        description: 'Your in-character Spanish response (2–4 sentences).',
      },
      objectivesCompleted: {
        type: 'array',
        items: { type: 'string' },
        description: 'IDs of objectives the student just accomplished. Empty array if none.',
      },
      sessionShouldEnd: {
        type: 'boolean',
        description: 'True only when all objectives are complete OR the conversation has a natural farewell.',
      },
    },
    required: ['guestReply', 'objectivesCompleted', 'sessionShouldEnd'],
  },
};

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return handleCors();
  if (req.method !== 'POST') return err('Method not allowed', 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return err('Missing Authorization header', 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return err('Unauthorized', 401);

  let body: RolePlayRequest;
  try {
    body = await req.json();
  } catch {
    return err('Invalid JSON body');
  }

  const { scenario, messages } = body;

  if (!scenario || !Array.isArray(messages) || messages.length === 0) {
    return err('scenario and messages are required');
  }
  if (messages[0].role !== 'user') {
    return err('First message must be from the student (role: "user")');
  }

  // Entitlement check for premium scenarios.
  if (!scenario.isFree) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile?.is_premium) {
      return err('Premium scenario — unlock full access to continue.', 403);
    }
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return err('AI service not configured', 503);

  const anthropic = new Anthropic({ apiKey });

  const systemPrompt = buildGuestSystemPrompt({
    scenarioTitle: scenario.title,
    guestPersona: scenario.guestPersona,
    objectives: scenario.objectives,
    openingLine: scenario.openingLine,
    systemContext: scenario.systemContext,
    difficulty: scenario.difficulty,
  });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: systemPrompt,
      tools: [GUEST_RESPONSE_TOOL],
      tool_choice: { type: 'tool', name: 'guest_response' },
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const toolBlock = response.content.find((b) => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return err('Unexpected response format from AI', 502);
    }

    const result = toolBlock.input as GuestResponseInput;

    return json({
      guestReply: result.guestReply,
      objectivesCompleted: result.objectivesCompleted ?? [],
      sessionShouldEnd: result.sessionShouldEnd ?? false,
    });
  } catch (e) {
    console.error('Anthropic API error:', e);
    return err('AI service error', 502);
  }
});
