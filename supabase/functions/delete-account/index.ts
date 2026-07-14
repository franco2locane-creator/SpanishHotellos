import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, handleCors, json, err } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleCors();
  if (req.method !== 'POST') return err('Method not allowed', 405);

  // Verify caller JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return err('Missing Authorization header', 401);

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: userErr } = await anonClient.auth.getUser();
  if (userErr || !user) return err('Unauthorized', 401);

  // Every user-owned table (profiles, exam_attempts, srs_progress,
  // mock_attempts, leaderboard_entries, grammar_drill_progress,
  // demo_drill_progress, vocab_deck_best) has ON DELETE CASCADE back to
  // profiles.id, which itself cascades from auth.users.id — deleting the
  // auth user is enough to remove every row without listing tables here
  // one by one. See supabase/migrations for the FK definitions.
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
  if (deleteErr) return err('Failed to delete user account', 500);

  return json({ success: true });
});
