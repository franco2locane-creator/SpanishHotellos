import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, handleCors, json, err } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleCors();

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

  // Delete user data with service role
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  await admin.from('srs_progress').delete().eq('user_id', user.id);
  await admin.from('exam_attempts').delete().eq('user_id', user.id);
  await admin.from('profiles').delete().eq('id', user.id);

  const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
  if (deleteErr) return err('Failed to delete user account', 500);

  return json({ success: true });
});
