import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  corsHeaders,
  handleCors,
  json,
  err,
} from '../_shared/cors.ts';
import {
  buildGuestSystemPrompt,
  type GuestPersona,
  type RubricWeights,
} from '../_shared/prompts.ts';

// ── Request / response shapes ─────────────────────────────────────────────────

type Message = { role: 'user' | 'assistant'; content: string };

type RolePlayRequest = {
  scenario: {
    id: string;
    title: string;
    isFree: boolean;
    guestPersona: GuestPersona;
    objectives: string[];
    openingLine: string;
    rubricWeights: RubricWeights;
  };
  messages: Message[];
};

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return handleCors();
  if (req.method !== 'POST') return err('Method not allowed', 405);

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return err('Missing Authorization header', 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return err('Unauthorized', 401);

  // ── Parse body ──────────────────────────────────────────────────────────────
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

  // First turn must be from the student (user).
  if (messages[0].role !== 'user') {
    return err('First message must be from the student (role: "user")');
  }

  // ── Entitlement check ───────────────────────────────────────────────────────
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

  // ── Build prompt & call Anthropic ───────────────────────────────────────────
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    return err('AI service not configured', 503);
  }

  const anthropic = new Anthropic({ apiKey });

  const systemPrompt = buildGuestSystemPrompt({
    scenarioTitle: scenario.title,
    guestPersona: scenario.guestPersona,
    objectives: scenario.objectives,
    openingLine: scenario.openingLine,
  });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const block = response.content[0];
    if (block.type !== 'text') {
      return err('Unexpected response format from AI', 502);
    }

    return json({ reply: block.text });
  } catch (e) {
    console.error('Anthropic API error:', e);
    return err('AI service error', 502);
  }
});
