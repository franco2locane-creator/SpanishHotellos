import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  handleCors,
  json,
  err,
} from '../_shared/cors.ts';
import {
  buildGradingSystemPrompt,
  buildGradingUserPrompt,
  type RubricWeights,
} from '../_shared/prompts.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

type Message = { role: 'user' | 'assistant'; content: string };

type GradeRequest = {
  scenario: {
    id: string;
    title: string;
    objectives: string[];
    rubricWeights: RubricWeights;
    format: string;
  };
  messages: Message[];
  durationSeconds: number;
};

type RubricScores = {
  fluency: number;
  vocabulary: number;
  grammar: number;
  taskCompletion: number;
  register: number;
};

// Anthropic tool use schema for structured grading output.
const submitGradeTool: Anthropic.Tool = {
  name: 'submit_grade',
  description: 'Submit the graded scores and written feedback for an exam attempt.',
  input_schema: {
    type: 'object' as const,
    required: ['scores', 'feedback', 'strongPoints', 'improvementAreas'],
    properties: {
      scores: {
        type: 'object' as const,
        required: ['fluency', 'vocabulary', 'grammar', 'taskCompletion', 'register'],
        properties: {
          fluency:        { type: 'number' as const, minimum: 0, maximum: 20 },
          vocabulary:     { type: 'number' as const, minimum: 0, maximum: 20 },
          grammar:        { type: 'number' as const, minimum: 0, maximum: 20 },
          taskCompletion: { type: 'number' as const, minimum: 0, maximum: 20 },
          register:       { type: 'number' as const, minimum: 0, maximum: 20 },
        },
      },
      feedback:         { type: 'string' as const, description: '3–4 sentences of constructive English feedback addressed to the student.' },
      strongPoints:     { type: 'array' as const, items: { type: 'string' as const }, description: '2–3 specific things the student did well.' },
      improvementAreas: { type: 'array' as const, items: { type: 'string' as const }, description: '2–3 specific areas to improve before the exam.' },
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTranscript(messages: Message[]): string {
  return messages
    .map((m) => {
      const speaker = m.role === 'user' ? 'STAFF (student)' : 'GUEST (AI)';
      return `${speaker}: ${m.content}`;
    })
    .join('\n\n');
}

function computeTotalScore(scores: RubricScores, weights: RubricWeights): number {
  const weighted =
    scores.fluency        * (weights.fluency        ?? 0.2) +
    scores.vocabulary     * (weights.vocabulary     ?? 0.2) +
    scores.grammar        * (weights.grammar        ?? 0.2) +
    scores.taskCompletion * (weights.taskCompletion ?? 0.2) +
    scores.register       * (weights.register       ?? 0.2);
  return Math.round(weighted * 10) / 10;
}

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
  let body: GradeRequest;
  try {
    body = await req.json();
  } catch {
    return err('Invalid JSON body');
  }

  const { scenario, messages, durationSeconds } = body;

  if (!scenario || !Array.isArray(messages) || messages.length < 2) {
    return err('scenario, messages (min 2), and durationSeconds are required');
  }

  // ── Call Anthropic (tool use for structured output) ─────────────────────────
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return err('AI service not configured', 503);

  const anthropic = new Anthropic({ apiKey });
  const transcript = formatTranscript(messages);

  let gradeInput: {
    scores: RubricScores;
    feedback: string;
    strongPoints: string[];
    improvementAreas: string[];
  };

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: buildGradingSystemPrompt(),
      messages: [{ role: 'user', content: buildGradingUserPrompt({ scenarioTitle: scenario.title, objectives: scenario.objectives, transcript }) }],
      tools: [submitGradeTool],
      tool_choice: { type: 'tool', name: 'submit_grade' },
    });

    const toolUse = response.content.find((b) => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      return err('AI did not return a grade', 502);
    }
    gradeInput = toolUse.input as typeof gradeInput;
  } catch (e) {
    console.error('Anthropic grading error:', e);
    return err('AI grading error', 502);
  }

  // ── Compute weighted total & persist ─────────────────────────────────────────
  const totalScore = computeTotalScore(gradeInput.scores, scenario.rubricWeights);

  const attemptPayload = {
    user_id:          user.id,
    scenario_id:      scenario.id,
    format:           scenario.format,
    duration_seconds: durationSeconds,
    scores:           gradeInput.scores,
    total_score:      totalScore,
    transcript:       transcript,
    feedback:         gradeInput.feedback,
  };

  const { data: attempt, error: insertError } = await supabase
    .from('exam_attempts')
    .insert(attemptPayload)
    .select('id, total_score, completed_at')
    .single();

  if (insertError) {
    console.error('DB insert error:', insertError);
    return err('Failed to save exam attempt', 500);
  }

  return json({
    attempt: {
      id:               attempt.id,
      scores:           gradeInput.scores,
      totalScore,
      feedback:         gradeInput.feedback,
      strongPoints:     gradeInput.strongPoints,
      improvementAreas: gradeInput.improvementAreas,
      completedAt:      attempt.completed_at,
    },
  });
});
