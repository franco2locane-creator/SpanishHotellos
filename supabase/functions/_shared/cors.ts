import { FUNCTIONS_VERSION } from './version.ts';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handleCors = (): Response =>
  new Response('ok', { status: 200, headers: corsHeaders });

// Every response (success or error) carries _version so the client can log
// it and flag a stale deploy immediately instead of guessing later.
export const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify({ ...(data as object), _version: FUNCTIONS_VERSION }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

export const err = (message: string, status = 400): Response =>
  json({ error: message }, status);
