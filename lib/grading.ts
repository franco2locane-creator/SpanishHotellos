// Pure grading helpers — duplicated from supabase/functions/grade/index.ts
// so they can be imported and tested without Deno globals.

export type RubricWeights = {
  fluency?: number;
  vocabulary?: number;
  grammar?: number;
  taskCompletion?: number;
  register?: number;
};

export type CriterionDetail = {
  score: number;
  examples: string[];
  note: string;
};

export type GradeScores = {
  fluency: CriterionDetail;
  vocabulary: CriterionDetail;
  grammar: CriterionDetail;
  taskCompletion: CriterionDetail;
  register: CriterionDetail & { tuForms: string[] };
};

export type NumericScores = {
  fluency: number;
  vocabulary: number;
  grammar: number;
  taskCompletion: number;
  register: number;
};

export function extractNumericScores(scores: GradeScores): NumericScores {
  return {
    fluency:        scores.fluency.score,
    vocabulary:     scores.vocabulary.score,
    grammar:        scores.grammar.score,
    taskCompletion: scores.taskCompletion.score,
    register:       scores.register.score,
  };
}

export function computeTotalScore(numeric: NumericScores, weights: RubricWeights): number {
  const weighted =
    numeric.fluency        * (weights.fluency        ?? 0.2) +
    numeric.vocabulary     * (weights.vocabulary     ?? 0.2) +
    numeric.grammar        * (weights.grammar        ?? 0.2) +
    numeric.taskCompletion * (weights.taskCompletion ?? 0.2) +
    numeric.register       * (weights.register       ?? 0.2);
  return Math.round(weighted * 10) / 10;
}
