-- Cloud mirror of the local SQLite vocab_progress table.
-- SQLite (on-device) is the source of truth; this is synced via dirty-flag push.
-- Used to restore SRS state after reinstall or on a new device.

CREATE TABLE IF NOT EXISTS public.srs_progress (
  user_id          UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id          TEXT         NOT NULL,
  interval         INTEGER      NOT NULL DEFAULT 1,
  ease_factor      REAL         NOT NULL DEFAULT 2.5,
  due_date         TEXT         NOT NULL,
  repetitions      INTEGER      NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, card_id)
);

ALTER TABLE public.srs_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own srs_progress"
  ON public.srs_progress
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index to quickly fetch a user's full SRS state on pull-restore.
CREATE INDEX IF NOT EXISTS idx_srs_progress_user
  ON public.srs_progress (user_id);
