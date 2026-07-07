import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleCors, json, err } from '../_shared/cors.ts';
import {
  buildGradingSystemPrompt,
  buildGradingUserPrompt,
  type RubricWeights,
} from '../_shared/prompts.ts';

type Message = { role: 'user' | 'assistant'; content: string };

type GradeRequest = {
  scenario: {
    id: string;
    title: string;
    objectives: { id: string; label: string }[];
    rubricWeights: RubricWeights;
    format: string;
  };
  messages: Message[];
  durationSeconds: number;
  allowTu?: boolean;  // true for personal_presentation — tú-forms are acceptable
};

type CriterionDetail = {
  score: number;
  examples: string[];
  note: string;
};

type GradeInput = {
  scores: {
    fluency: CriterionDetail;
    vocabulary: CriterionDetail;
    grammar: CriterionDetail;
    taskCompletion: CriterionDetail;
    register: CriterionDetail & { tuForms: string[] };
  };
  topThingsFix: { label: string; drillType: string }[];
  feedback: string;
};

const criterionSchema = {
  type: 'object' as const,
  required: ['score', 'examples', 'note'],
  properties: {
    score: { type: 'number' as const, minimum: 0, maximum: 20 },
    examples: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: '2-3 exact quoted student phrases from the transcript.',
    },
    note: { type: 'string' as const, description: 'One sentence explaining the score.' },
  },
};

const submitGradeTool: Anthropic.Tool = {
  name: 'submit_grade',
  description: 'Submit graded scores with evidence and actionable feedback for an exam attempt.',
  input_schema: {
    type: 'object' as const,
    required: ['scores', 'topThingsFix', 'feedback'],
    properties: {
      scores: {
        type: 'object' as const,
        required: ['fluency', 'vocabulary', 'grammar', 'taskCompletion', 'register'],
        properties: {
          fluency: criterionSchema,
          vocabulary: criterionSchema,
          grammar: criterionSchema,
          taskCompletion: criterionSchema,
          register: {
            type: 'object' as const,
            required: ['score', 'examples', 'note', 'tuForms'],
            properties: {
              ...criterionSchema.properties,
              tuForms: {
                type: 'array' as const,
                items: { type: 'string' as const },
                description: 'Every tu-form used with the guest. Empty array if none found.',
              },
            },
          },
        },
      },
      topThingsFix: {
        type: 'array' as const,
        description: 'Exactly 3 prioritised, specific, actionable fixes for the student.',
        items: {
          type: 'object' as const,
          required: ['label', 'drillType'],
          properties: {
            label: { type: 'string' as const, description: 'Specific actionable fix in one sentence.' },
            drillType: {
              type: 'string' as const,
              enum: ['register', 'vocabulary', 'grammar', 'fluency', 'taskCompletion'],
            },
          },
        },
      },
      feedback: {
        type: 'string' as const,
        description: '2-3 sentences of encouraging, constructive English feedback to the student.',
      },
    },
  },
};

function formatTranscript(messages: Message[]): string {
  return messages
    .map((m) => {
      const speaker = m.role === 'user' ? 'STAFF (student)' : 'GUEST (AI)';
      return `${speaker}: ${m.content}`;
    })
    .join('\n\n');
}

function extractNumericScores(scores: GradeInput['scores']) {
  return {
    fluency:        scores.fluency.score,
    vocabulary:     scores.vocabulary.score,
    grammar:        scores.grammar.score,
    taskCompletion: scores.taskCompletion.score,
    register:       scores.register.score,
  };
}

function computeTotalScore(numeric: Record<string, number>, weights: RubricWeights): number {
  const weighted =
    numeric.fluency        * (weights.fluency        ?? 0.2) +
    numeric.vocabulary     * (weights.vocabulary     ?? 0.2) +
    numeric.grammar        * (weights.grammar        ?? 0.2) +
    numeric.taskCompletion * (weights.taskCompletion ?? 0.2) +
    numeric.register       * (weights.register       ?? 0.2);
  return Math.round(weighted * 10) / 10;
}

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

  let body: GradeRequest;
  try {
    body = await req.json();
  } catch {
    return err('Invalid JSON body');
  }

  const { scenario, messages, durationSeconds, allowTu = false } = body;
  if (!scenario || !Array.isArray(messages) || messages.length < 2) {
    return err('scenario, messages (min 2), and durationSeconds are required');
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return err('AI service not configured', 503);

  const anthropic = new Anthropic({ apiKey });
  const transcript = formatTranscript(messages);

  let gradeInput: GradeInput;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      temperature: 0.2,
      system: buildGradingSystemPrompt({ allowTu }),
      messages: [{
        role: 'user',
        content: buildGradingUserPrompt({
          scenarioTitle: scenario.title,
          objectives: scenario.objectives,
          transcript,
        }),
      }],
      tools: [submitGradeTool],
      tool_choice: { type: 'tool', name: 'submit_grade' },
    });

    const toolUse = response.content.find((b) => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      return err('AI did not return a grade', 502);
    }
    gradeInput = toolUse.input as GradeInput;
  } catch (e) {
    console.error('Anthropic grading error:', e);
    return err('AI grading error', 502);
  }

  const numericScores = extractNumericScores(gradeInput.scores);
  const totalScore = computeTotalScore(numericScores, scenario.rubricWeights);

  const { data: attempt, error: insertError } = await supabase
    .from('exam_attempts')
    .insert({
      user_id:          user.id,
      scenario_id:      scenario.id,
      format:           scenario.format,
      duration_seconds: durationSeconds,
      scores:           numericScores,
      total_score:      totalScore,
      transcript,
      feedback:         gradeInput.feedback,
    })
    .select('id, total_score, completed_at')
    .single();

  if (insertError) {
    console.error('DB insert error:', insertError);
    return err('Failed to save exam attempt', 500);
  }

  return json({
    attempt: {
      id:           attempt.id,
      totalScore,
      completedAt:  attempt.completed_at,
      numericScores,
      detail:       gradeInput.scores,
      topThingsFix: gradeInput.topThingsFix,
      feedback:     gradeInput.feedback,
    },
  });
});
