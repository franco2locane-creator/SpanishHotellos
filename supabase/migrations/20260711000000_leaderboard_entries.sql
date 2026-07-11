-- ─────────────────────────────────────────────────────────────────────────────
-- leaderboard_entries — one row per user, consistency-based points earned
-- exclusively from completing the daily guided session (see
-- supabase/functions/award-daily-points). Exam/mock/practice scores never
-- appear here — this table is intentionally public-readable and score-free.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.leaderboard_entries (
  user_id         UUID        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  nickname        TEXT        NOT NULL CHECK (char_length(nickname) BETWEEN 2 AND 20),
  school          TEXT        NOT NULL DEFAULT 'Other',
  weekly_points   INTEGER     NOT NULL DEFAULT 0 CHECK (weekly_points >= 0),
  alltime_points  INTEGER     NOT NULL DEFAULT 0 CHECK (alltime_points >= 0),
  -- Monday date (YYYY-MM-DD) of the Europe/Amsterdam week weekly_points last
  -- applied to. award-daily-points resets weekly_points to 0 lazily whenever
  -- this no longer matches the current week — no cron job needed.
  week_key        TEXT        NOT NULL,
  -- Europe/Amsterdam calendar date (YYYY-MM-DD) of the last successful point
  -- award — enforces at most one award per user per day, server-side.
  last_award_date DATE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leaderboard_school_weekly_idx
  ON public.leaderboard_entries (school, weekly_points DESC);
CREATE INDEX IF NOT EXISTS leaderboard_school_alltime_idx
  ON public.leaderboard_entries (school, alltime_points DESC);
CREATE INDEX IF NOT EXISTS leaderboard_weekly_idx
  ON public.leaderboard_entries (weekly_points DESC);
CREATE INDEX IF NOT EXISTS leaderboard_alltime_idx
  ON public.leaderboard_entries (alltime_points DESC);

-- Reuses the set_updated_at() trigger function already defined in
-- 20260706000000_initial_schema.sql.
DROP TRIGGER IF EXISTS set_leaderboard_entries_updated_at ON public.leaderboard_entries;
CREATE TRIGGER set_leaderboard_entries_updated_at
  BEFORE UPDATE ON public.leaderboard_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Row-Level Security ────────────────────────────────────────────────────────
-- Public SELECT — contains nothing sensitive (no exam/mock/practice scores).
-- Deliberately no INSERT/UPDATE/DELETE policy for anon/authenticated roles:
-- the only write path is award-daily-points' service-role client, which
-- bypasses RLS entirely.

ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leaderboard_entries: public select"
  ON public.leaderboard_entries FOR SELECT
  USING (true);
