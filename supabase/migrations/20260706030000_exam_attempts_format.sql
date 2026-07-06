-- Allow 'roleplay' as a valid exam format (role-play sessions are not
-- structured exams, but we reuse the same table for progress tracking).

ALTER TABLE public.exam_attempts
  DROP CONSTRAINT IF EXISTS exam_attempts_format_check;

ALTER TABLE public.exam_attempts
  ADD CONSTRAINT exam_attempts_format_check
  CHECK (format IN (
    'monologue', 'guided_dialogue',
    'picture_description', 'spontaneous_qa', 'roleplay'
  ));
