-- ─────────────────────────────────────────────────────────────────────────────
-- mock_attempts — one row per COMPLETED mock exam (all assignments finished).
-- Per-assignment grading already lands individual rows in exam_attempts (one
-- per assignment, via the grade Edge Function); this table stores the
-- combined result — overall score, hospitality gate outcome, and a denormalised
-- per-assignment summary — so the Progress tab can show exam-readiness without
-- re-deriving it from scattered exam_attempts rows every time.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mock_attempts (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mock_id             TEXT        NOT NULL,
  level               TEXT        NOT NULL CHECK (level IN ('basic', 'intermediate')),
  combined_score      NUMERIC(5,1) NOT NULL CHECK (combined_score BETWEEN 0 AND 100),
  passed              BOOLEAN     NOT NULL,
  gate_passed         BOOLEAN     NOT NULL,
  -- Array of { assignmentType, score, checklistHit: string[], checklistTotal: {id,label}[] }
  assignment_results  JSONB       NOT NULL,
  completed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mock_attempts_user_completed_idx
  ON public.mock_attempts (user_id, completed_at DESC);

ALTER TABLE public.mock_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mock_attempts: select own"
  ON public.mock_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "mock_attempts: insert own"
  ON public.mock_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
