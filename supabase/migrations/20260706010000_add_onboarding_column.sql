-- Add onboarding_completed_at so the app can distinguish a fresh profile
-- (auto-created by trigger with all defaults) from one that has finished the
-- placement test. NULL = onboarding in-progress.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
