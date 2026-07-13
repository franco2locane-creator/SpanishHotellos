-- ─────────────────────────────────────────────────────────────────────────────
-- Saved "last attempt" feedback — previously the grade Edge Function computed
-- a full breakdown (per-criterion examples/notes, hospitality gate,
-- top-things-to-fix) but only ever persisted bare numeric scores; the rest
-- lived in an in-memory store cleared on unmount. full_feedback keeps the
-- whole GradeResult payload so a scenario/mock attempt's feedback can be
-- re-viewed later without regrading. wasResumed (embedded inside
-- full_feedback, not a separate column — see app/roleplay/[scenarioId].tsx)
-- flags roleplay attempts restored from a resume blob; not read anywhere
-- yet, exists so Progress can weight heavily-interrupted attempts later.
--
-- Grammar/demo drills are graded deterministically client-side, so their
-- "last attempt" detail is a plain JSONB array overwritten each attempt
-- (not appended — only the latest attempt's feedback needs to be kept).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.exam_attempts
  ADD COLUMN IF NOT EXISTS full_feedback JSONB;

ALTER TABLE public.grammar_drill_progress
  ADD COLUMN IF NOT EXISTS last_attempt_detail JSONB NOT NULL DEFAULT '[]';

ALTER TABLE public.demo_drill_progress
  ADD COLUMN IF NOT EXISTS last_attempt_detail JSONB NOT NULL DEFAULT '[]';
