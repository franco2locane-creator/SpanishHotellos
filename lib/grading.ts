// Pure grading helpers — duplicated from supabase/functions/grade/index.ts
// so they can be imported and tested without Deno globals.
//
// Register/formality is NOT one of the scored criteria — it's a separate
// pass/fail hospitality gate (see HospitalityGate below), evaluated on
// hospitality assignments only, never on personal_presentation.

export type RubricWeights = {
  fluency?: number;
  vocabulary?: number;
  grammar?: number;
  pronunciation?: number;
  content?: number;
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
  pronunciation: CriterionDetail;
  content: CriterionDetail;
};

export type NumericScores = {
  fluency: number;
  vocabulary: number;
  grammar: number;
  pronunciation: number;
  content: number;
};

export type HospitalityGate = {
  applicable: boolean;   // false for personal_presentation
  passed: boolean;
  tuForms: string[];
  note: string;
};

export function extractNumericScores(scores: GradeScores): NumericScores {
  return {
    fluency:      scores.fluency.score,
    vocabulary:   scores.vocabulary.score,
    grammar:      scores.grammar.score,
    pronunciation: scores.pronunciation.score,
    content:      scores.content.score,
  };
}

export function computeTotalScore(numeric: NumericScores, weights: RubricWeights): number {
  const weighted =
    numeric.fluency      * (weights.fluency      ?? 0.2) +
    numeric.vocabulary   * (weights.vocabulary   ?? 0.2) +
    numeric.grammar      * (weights.grammar      ?? 0.2) +
    numeric.pronunciation * (weights.pronunciation ?? 0.2) +
    numeric.content      * (weights.content      ?? 0.2);
  return Math.round(weighted * 10) / 10;
}
