import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, handleCors, json, err } from '../_shared/cors.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

type PlacementRequest = {
  transcripts: [string, string, string];
};

// ── Anthropic tool — guarantees structured output ─────────────────────────────

const assessTool: Anthropic.Tool = {
  name: 'assess_level',
  description: 'Return CEFR level and a one-sentence justification for a hotel school Spanish candidate.',
  input_schema: {
    type: 'object' as const,
    required: ['level', 'justification'],
    properties: {
      level: {
        type: 'string' as const,
        enum: ['A2', 'B1', 'B2', 'C1'],
        description: 'CEFR level: A2 basic, B1 intermediate, B2 upper-intermediate, C1 advanced.',
      },
      justification: {
        type: 'string' as const,
        description: 'One sentence explaining the level, referring to specific evidence in the transcripts.',
      },
    },
  },
};

const QUESTIONS = [
  'Preséntate.',
  'Describe tu hotel ideal.',
  'Un cliente se queja del ruido. ¿Qué le dices?',
];

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
  let body: PlacementRequest;
  try {
    body = await req.json();
  } catch {
    return err('Invalid JSON body');
  }

  const { transcripts } = body;
  if (!Array.isArray(transcripts) || transcripts.length !== 3) {
    return err('Exactly 3 transcripts are required.');
  }

  // ── Assess with Anthropic ───────────────────────────────────────────────────
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return err('AI service not configured', 503);

  const anthropic = new Anthropic({ apiKey });

  const userContent = `A hotel school student answered three spoken Spanish questions. Assess their CEFR level.

Q1 — "${QUESTIONS[0]}"
STUDENT: ${transcripts[0] || '(no response recorded)'}

Q2 — "${QUESTIONS[1]}"
STUDENT: ${transcripts[1] || '(no response recorded)'}

Q3 — "${QUESTIONS[2]}"
STUDENT: ${transcripts[2] || '(no response recorded)'}

Criteria: vocabulary range, grammar accuracy, fluency, hospitality-register appropriateness.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system:
        'You are an expert Spanish examiner for hotel school diploma programmes. ' +
        'Assess student spoken Spanish using CEFR descriptors and hospitality-context criteria.',
      messages: [{ role: 'user', content: userContent }],
      tools: [assessTool],
      tool_choice: { type: 'tool', name: 'assess_level' },
    });

    const toolUse = response.content.find((b) => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      return err('AI did not return an assessment', 502);
    }

    const { level, justification } = toolUse.input as {
      level: 'A2' | 'B1' | 'B2' | 'C1';
      justification: string;
    };

    return json({ level, justification });
  } catch (e) {
    console.error('Anthropic placement error:', e);
    return err('AI service error', 502);
  }
});
