-- ─────────────────────────────────────────────────────────────────────────────
-- Spanish4Hoteleros — initial schema
-- ─────────────────────────────────────────────────────────────────────────────
-- Constraints on enum columns are enforced with CHECK so the app can evolve
-- enums without a Postgres ALTER TYPE + migration lock. The valid sets mirror
-- the TypeScript union types in types/.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── profiles ─────────────────────────────────────────────────────────────────
-- One row per auth user. Created by a trigger on auth.users INSERT.

CREATE TABLE IF NOT EXISTS public.profiles (
  id               UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school           TEXT,
  exam_format      TEXT        NOT NULL DEFAULT 'guided_dialogue'
                               CHECK (exam_format IN (
                                 'monologue', 'guided_dialogue',
                                 'picture_description', 'spontaneous_qa'
                               )),
  exam_date        DATE,
  placement_level  TEXT        NOT NULL DEFAULT 'B1'
                               CHECK (placement_level IN ('A2','B1','B2','C1')),
  is_premium       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create a profile row whenever a new user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Keep updated_at current automatically.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── exam_attempts ─────────────────────────────────────────────────────────────
-- Immutable once inserted — grading is final. Only soft-delete via RLS.

CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scenario_id      TEXT        NOT NULL,
  format           TEXT        NOT NULL
                               CHECK (format IN (
                                 'monologue', 'guided_dialogue',
                                 'picture_description', 'spontaneous_qa'
                               )),
  duration_seconds INTEGER     NOT NULL CHECK (duration_seconds > 0),
  -- scores is a JSON object: { fluency, vocabulary, grammar, taskCompletion, register }
  -- each value is 0–20 (integer or one decimal place)
  scores           JSONB       NOT NULL,
  total_score      NUMERIC(4,1) NOT NULL CHECK (total_score BETWEEN 0 AND 20),
  transcript       TEXT        NOT NULL DEFAULT '',
  feedback         TEXT        NOT NULL DEFAULT '',
  completed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS exam_attempts_user_id_idx
  ON public.exam_attempts (user_id, completed_at DESC);

-- ── srs_progress ─────────────────────────────────────────────────────────────
-- One row per (user, card). Upserted after every review session sync.
-- The authoritative source of SRS state is local SQLite; this table is the
-- cloud backup and the source for cross-device restore.

CREATE TABLE IF NOT EXISTS public.srs_progress (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_id           TEXT        NOT NULL,
  interval          INTEGER     NOT NULL DEFAULT 1 CHECK (interval >= 0),
  ease_factor       NUMERIC(4,2) NOT NULL DEFAULT 2.50
                                CHECK (ease_factor >= 1.3),
  due_date          DATE        NOT NULL DEFAULT CURRENT_DATE,
  repetitions       INTEGER     NOT NULL DEFAULT 0 CHECK (repetitions >= 0),
  last_reviewed_at  TIMESTAMPTZ,
  UNIQUE (user_id, card_id)
);

CREATE INDEX IF NOT EXISTS srs_progress_user_due_idx
  ON public.srs_progress (user_id, due_date);

-- ── Row-Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.srs_progress  ENABLE ROW LEVEL SECURITY;

-- profiles: each user owns exactly one row (their own)
CREATE POLICY "profiles: select own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: insert own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- exam_attempts: insert own; read own; no update/delete (results are immutable)
CREATE POLICY "exam_attempts: select own"
  ON public.exam_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "exam_attempts: insert own"
  ON public.exam_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- srs_progress: full CRUD on own rows (sync can insert or update)
CREATE POLICY "srs_progress: select own"
  ON public.srs_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "srs_progress: insert own"
  ON public.srs_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "srs_progress: update own"
  ON public.srs_progress FOR UPDATE
  USING (auth.uid() = user_id);
