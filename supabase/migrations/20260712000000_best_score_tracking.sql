-- ─────────────────────────────────────────────────────────────────────────────
-- Best-score tracking for exercises that had no replay incentive: demo drills
-- (no persistence at all) and vocab decks (per-card SRS state exists, but no
-- "round" score). Grammar drills already track best_accuracy — this just adds
-- the completion-time tiebreaker column so score-then-time comparisons work
-- everywhere consistently. Roleplay scenarios deliberately get NO new table —
-- exam_attempts is an append-only attempt log; best score there is a derived
-- MAX(total_score) query (see lib/scenarioBest.ts), not an upserted row.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.grammar_drill_progress
  ADD COLUMN IF NOT EXISTS best_completion_seconds INTEGER;

CREATE TABLE IF NOT EXISTS public.demo_drill_progress (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  drill_type               TEXT        NOT NULL,
  best_score               INTEGER     NOT NULL CHECK (best_score BETWEEN 0 AND 5),
  best_completion_seconds  INTEGER,
  attempts                 INTEGER     NOT NULL DEFAULT 1 CHECK (attempts >= 1),
  last_attempted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, drill_type)
);

CREATE INDEX IF NOT EXISTS demo_drill_progress_user_idx
  ON public.demo_drill_progress (user_id);

ALTER TABLE public.demo_drill_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_drill_progress: select own"
  ON public.demo_drill_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "demo_drill_progress: insert own"
  ON public.demo_drill_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "demo_drill_progress: update own"
  ON public.demo_drill_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.vocab_deck_best (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  deck_id                  TEXT        NOT NULL,
  best_first_try_pct       NUMERIC(5,1) NOT NULL CHECK (best_first_try_pct BETWEEN 0 AND 100),
  best_completion_seconds  INTEGER,
  attempts                 INTEGER     NOT NULL DEFAULT 1 CHECK (attempts >= 1),
  last_attempted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, deck_id)
);

CREATE INDEX IF NOT EXISTS vocab_deck_best_user_idx
  ON public.vocab_deck_best (user_id);

ALTER TABLE public.vocab_deck_best ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vocab_deck_best: select own"
  ON public.vocab_deck_best FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "vocab_deck_best: insert own"
  ON public.vocab_deck_best FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vocab_deck_best: update own"
  ON public.vocab_deck_best FOR UPDATE
  USING (auth.uid() = user_id);
