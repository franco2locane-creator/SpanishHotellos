-- Add mock_level to profiles so students can be routed to Basic or Intermediate exams.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mock_level TEXT NOT NULL DEFAULT 'basic'
    CHECK (mock_level IN ('basic', 'intermediate'));
