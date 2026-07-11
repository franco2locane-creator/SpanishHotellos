-- ─────────────────────────────────────────────────────────────────────────────
-- grammar_drill_progress — one row per (user, drill set). Grammar drill sets
-- (app/grammar/[drillId].tsx, lib/grammar/drills.ts) are graded entirely
-- client-side via local fuzzy-match and previously wrote nothing to Supabase —
-- this is the one genuinely missing activity-tracking table; scenario, mock,
-- and vocab coverage are all derivable from tables that already exist
-- (exam_attempts, mock_attempts, local vocab_progress).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.grammar_drill_progress (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  drill_id          TEXT        NOT NULL,
  best_accuracy     NUMERIC(5,1) NOT NULL CHECK (best_accuracy BETWEEN 0 AND 100),
  attempts          INTEGER     NOT NULL DEFAULT 1 CHECK (attempts >= 1),
  last_attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, drill_id)
);

CREATE INDEX IF NOT EXISTS grammar_drill_progress_user_idx
  ON public.grammar_drill_progress (user_id);

ALTER TABLE public.grammar_drill_progress ENABLE ROW LEVEL SECURITY;

-- Full CRUD on own rows — same pattern as srs_progress (client upserts after
-- every drill completion, comparing against its own previous best client-side).
CREATE POLICY "grammar_drill_progress: select own"
  ON public.grammar_drill_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "grammar_drill_progress: insert own"
  ON public.grammar_drill_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "grammar_drill_progress: update own"
  ON public.grammar_drill_progress FOR UPDATE
  USING (auth.uid() = user_id);
